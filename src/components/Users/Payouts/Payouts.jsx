import { useMemo, useState } from 'react'
import { BadgeIndianRupee, FileSpreadsheet } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { DataTable } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { FormDrawer } from '@/components/data/FormDrawer'
import { Notice } from '@/components/data/Notice'
import { PageHeader } from '@/components/data/PageHeader'
import { Pagination } from '@/components/data/Pagination'
import { SearchInput } from '@/components/data/SearchInput'
import { SearchSelect } from '@/components/form/SearchSelect'
import { selectParties } from '@/store/partiesSlice'
import { Button } from '@/components/ui/button'
import { formatINR } from '@/lib/format'
import { buildWorkbook, downloadWorkbook } from '@/lib/xlsx'
import { selectAttendance } from '@/store/attendanceSlice'
import { payoutSaved, selectPayouts } from '@/store/payoutsSlice'
import { selectOffice } from '@/store/settingsSlice'
import { selectDocs } from '@/store/transactionsSlice'
import { selectUsers } from '@/store/usersSlice'
import { PayoutEditor } from './components/PayoutEditor'
import { buildPayoutColumns } from './components/PayoutsTable'
import {
  calculatePayout,
  cleanAdjustments,
  emptyPayout,
  hasEdits,
  monthLabel,
  PAYOUT_LINES,
  PAYOUT_STATUS,
  PAYOUT_STATUSES,
  payoutTotals,
  validatePayout,
} from './payoutModel'

const thisMonth = () => new Date().toISOString().slice(0, 7)

/**
 * User › Payouts — each field user's monthly bill (salary + TA/DA + incentive),
 * worked out from attendance and their secondary sales, and correctable by the
 * admin when the calculation is wrong.
 */
export default function Payouts() {
  const dispatch = useDispatch()
  const users = useSelector(selectUsers)
  const attendance = useSelector(selectAttendance)
  const office = useSelector(selectOffice)
  const orders = useSelector(selectDocs('SALES_ORDER'))
  const invoices = useSelector(selectDocs('SALES_INVOICE'))
  const customers = useSelector(selectParties('CUSTOMER'))
  const saved = useSelector(selectPayouts)

  const [month, setMonth] = useState(thisMonth)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [drawer, setDrawer] = useState(null) // { draft, errors, calculated, user }
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  const partiesById = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers])
  const sales = useMemo(() => [...orders, ...invoices], [orders, invoices])

  /** One row per field user: the calculation, the admin's changes, the totals. */
  const rows = useMemo(
    () =>
      users
        .filter((user) => user.role !== 'ADMIN')
        .map((user) => {
          const calculated = calculatePayout({ user, month, attendance, office, sales, parties: partiesById })
          const payout = saved[`${user.id}:${month}`] ?? emptyPayout(user.id, month)
          return { id: payout.id, user, calculated, payout, totals: payoutTotals(calculated, payout), edited: hasEdits(calculated, payout) }
        }),
    [users, month, attendance, office, sales, partiesById, saved],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (status && row.payout.status !== status) return false
      return !q || `${row.user.name} ${row.user.designation}`.toLowerCase().includes(q)
    })
  }, [rows, search, status])

  const payable = filtered.reduce((sum, row) => sum + row.totals.net, 0)
  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize))
  const page = pagination.pageIndex < pageCount ? pagination : { ...pagination, pageIndex: pageCount - 1 }
  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }))

  const openEdit = (row) =>
    setDrawer({
      user: row.user,
      calculated: row.calculated,
      errors: {},
      draft: { ...row.payout, overrides: { ...row.payout.overrides }, adjustments: row.payout.adjustments.map((a) => ({ ...a })) },
    })

  const save = async (nextStatus) => {
    const draft = { ...drawer.draft, ...(nextStatus && { status: nextStatus }) }
    const found = validatePayout(draft, { calculated: drawer.calculated })
    if (Object.keys(found).some((k) => found[k])) return setDrawer((d) => ({ ...d, draft, errors: found }))
    setSaving(true)
    await new Promise((r) => setTimeout(r, 300)) // mock network
    // Keep only the lines that really differ from the calculation.
    const overrides = {}
    for (const { key } of PAYOUT_LINES) {
      const value = draft.overrides?.[key]
      if (value != null && value !== '' && Number(value) !== drawer.calculated[key]) overrides[key] = Number(value)
    }
    const payout = { ...draft, overrides, adjustments: cleanAdjustments(draft.adjustments), reason: draft.reason.trim() }
    dispatch(payoutSaved({ payout }))
    setSaving(false)
    setDrawer(null)
    const net = payoutTotals(drawer.calculated, payout).net
    setNotice({
      tone: 'success',
      message: `${drawer.user.name}'s ${monthLabel(month)} payout ${nextStatus ? `${PAYOUT_STATUS[nextStatus].label.toLowerCase()} at` : 'saved —'} ${formatINR(net)}${
        Object.keys(overrides).length ? ' (figures corrected).' : '.'
      }`,
    })
  }

  const setStatusOf = (row, next) => {
    const payout = { ...row.payout, status: next, ...(next === 'PAID' && !row.payout.paidOn ? { paidOn: new Date().toISOString().slice(0, 10) } : {}) }
    dispatch(payoutSaved({ payout }))
    setNotice({ tone: 'success', message: `${row.user.name}'s payout marked ${PAYOUT_STATUS[next].label.toLowerCase()}.` })
  }

  const columns = useMemo(() => buildPayoutColumns({ onEdit: openEdit, onSetStatus: setStatusOf }), []) // eslint-disable-line react-hooks/exhaustive-deps

  const exportPayouts = async () => {
    const wb = await buildWorkbook({
      sheetName: 'Payouts',
      columns: [
        { key: 'user', header: 'User', width: 26, required: true },
        { key: 'days', header: 'Present days', width: 13 },
        { key: 'distance', header: 'Distance (km)', width: 14, numFmt: '0.0' },
        { key: 'salary', header: 'Salary', width: 13, numFmt: '0.00' },
        { key: 'ta', header: 'TA', width: 12, numFmt: '0.00' },
        { key: 'da', header: 'DA', width: 12, numFmt: '0.00' },
        { key: 'incentive', header: 'Incentive', width: 13, numFmt: '0.00' },
        { key: 'adjustments', header: 'Adjustments', width: 13, numFmt: '0.00' },
        { key: 'net', header: 'Net payable', width: 14, numFmt: '0.00' },
        { key: 'status', header: 'Status', width: 12 },
        { key: 'reason', header: 'Reason for change', width: 34 },
      ],
      rows: filtered.map((row) => ({
        user: row.user.name,
        days: `${row.calculated.presentDays}/${row.calculated.workingDays}`,
        distance: row.calculated.distanceKm,
        salary: row.totals.salary,
        ta: row.totals.ta,
        da: row.totals.da,
        incentive: row.totals.incentive,
        adjustments: row.totals.bonuses - row.totals.deductions,
        net: row.totals.net,
        status: PAYOUT_STATUS[row.payout.status].label,
        reason: row.payout.reason ?? '',
      })),
    })
    await downloadWorkbook(`nirog-payouts-${month}.xlsx`, wb)
    setNotice({ tone: 'success', message: `Exported ${filtered.length} payouts for ${monthLabel(month)}.` })
  }

  const locked = drawer?.draft.status === 'PAID'

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title="Payouts" subtitle={`Salary, TA/DA and incentive for ${monthLabel(month)}`}>
        <span className="inline-flex h-11 items-center rounded-lg bg-mint-pale px-3.5 text-sm font-semibold text-forest">
          Total payable: <span className="ml-1.5 font-mono">{formatINR(payable)}</span>
        </span>
        <Button variant="outline" size="lg" className="h-11" onClick={exportPayouts} disabled={!filtered.length}>
          <FileSpreadsheet data-icon="inline-start" /> Export
        </Button>
      </PageHeader>

      {notice && (
        <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.message}
        </Notice>
      )}

      <section className="overflow-hidden rounded-2xl border border-mint-pale bg-white">
        <div className="flex flex-col gap-3 border-b border-mint-pale p-4 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={(v) => { setSearch(v); resetPage() }} placeholder="Search staff" className="sm:w-64" />
          <input
            type="month"
            aria-label="Payout month"
            value={month}
            max={thisMonth()}
            onChange={(e) => { setMonth(e.target.value || thisMonth()); resetPage() }}
            className="h-11 rounded-lg border border-mint bg-white px-3.5 text-sm font-medium text-black outline-none focus:border-green-fresh focus:ring-3 focus:ring-ring/25"
          />
          <SearchSelect
            aria-label="Filter by status"
            placeholder="Select status"
            clearable
            searchable={false}
            options={PAYOUT_STATUSES}
            value={status}
            onChange={(v) => { setStatus(v); resetPage() }}
            className="sm:w-48"
          />
          <Pagination
            pageIndex={page.pageIndex}
            pageSize={page.pageSize}
            total={filtered.length}
            onPageChange={(pageIndex) => setPagination((p) => ({ ...p, pageIndex }))}
            className="justify-between sm:ml-auto sm:justify-end"
          />
        </div>
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(row) => row.id}
          pagination={page}
          onPaginationChange={setPagination}
          onRowClick={openEdit}
          empty={
            <EmptyState
              icon={BadgeIndianRupee}
              title={search || status ? 'No payouts match' : 'No staff to pay this month'}
              description="Payouts are worked out from attendance, distance travelled and each person's secondary sales. Set their salary and rates under Users."
            />
          }
        />
      </section>

      <FormDrawer
        open={Boolean(drawer)}
        onOpenChange={(open) => !open && setDrawer(null)}
        title="Payout bill"
        description={drawer ? `${drawer.user.name} · ${monthLabel(month)}` : ''}
        onSubmit={() => save()}
        saving={saving}
        saveLabel={locked ? 'Save (paid — unlock to edit)' : 'Save'}
      >
        {drawer && (
          <>
            <PayoutEditor
              draft={drawer.draft}
              calculated={drawer.calculated}
              user={drawer.user}
              errors={drawer.errors}
              locked={locked}
              onChange={(field, value) => setDrawer((d) => ({ ...d, draft: { ...d.draft, [field]: value }, errors: { ...d.errors, [field]: undefined } }))}
            />
            <div className="mt-5 flex flex-wrap gap-2">
              {drawer.draft.status !== 'APPROVED' && (
                <Button type="button" variant="outline" size="lg" onClick={() => save('APPROVED')}>Approve</Button>
              )}
              {drawer.draft.status !== 'PAID' && (
                <Button type="button" variant="outline" size="lg" onClick={() => save('PAID')}>Mark paid</Button>
              )}
              {drawer.draft.status !== 'DRAFT' && (
                <Button type="button" variant="outline" size="lg" onClick={() => save('DRAFT')}>Move to draft</Button>
              )}
            </div>
          </>
        )}
      </FormDrawer>
    </div>
  )
}
