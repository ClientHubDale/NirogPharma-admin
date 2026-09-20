import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { DataTable } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { FormDrawer } from '@/components/data/FormDrawer'
import { Notice } from '@/components/data/Notice'
import { PageHeader } from '@/components/data/PageHeader'
import { Pagination } from '@/components/data/Pagination'
import { SearchInput } from '@/components/data/SearchInput'
import { DateRangeFilter } from '@/components/form/DateRangeFilter'
import { SearchSelect } from '@/components/form/SearchSelect'
import { partyOptionFor } from '@/components/Transactions/components/BillToCard'
import { SALES_USER_OPTIONS, SALES_USERS_BY_ID } from '@/components/Transactions/salesUsers'
import { docTotals } from '@/components/Transactions/transactionModel'
import { Button } from '@/components/ui/button'
import { presetRange } from '@/lib/dateRange'
import { formatINR } from '@/lib/format'
import { selectCities, selectRoutes } from '@/store/geographySlice'
import { selectParties } from '@/store/partiesSlice'
import { paymentDeleted, paymentPatched, paymentRestored, paymentSaved, selectAllPayments, selectPayments } from '@/store/paymentsSlice'
import { docPatched, selectDocs } from '@/store/transactionsSlice'
import { buildPaymentColumns, DEFAULT_PAYMENT_VISIBILITY } from './components/PaymentsTable'
import { PaymentForm } from './components/PaymentForm'
import { billDue, emptyPayment, nextPaymentNumber, paymentTotals, validatePayment } from './paymentModel'
import { PAYMENT_METHODS, PAYMENT_STATUSES, PAYMENT_TYPES } from './paymentTypes'

const PAGE_SIZE = 20
const getRowId = (p) => p.id

/** Finance › Payment In / Payment Out — one list plus the "Create payment" drawer. */
export default function PaymentListPage({ type }) {
  const config = PAYMENT_TYPES[type]
  const dispatch = useDispatch()
  const payments = useSelector(selectPayments(type))
  const allPayments = useSelector(selectAllPayments)
  const parties = useSelector(selectParties(config.partyType))
  const bills = useSelector(selectDocs(config.billType))
  const routes = useSelector(selectRoutes)
  const cities = useSelector(selectCities)

  const partiesById = useMemo(() => Object.fromEntries(parties.map((p) => [p.id, p])), [parties])
  const cityOf = useMemo(() => {
    const cityById = Object.fromEntries(cities.map((c) => [c.id, c.name]))
    const routeCity = Object.fromEntries(routes.map((r) => [r.id, cityById[r.cityId]]))
    return (p) => routeCity[p.routeId] ?? ''
  }, [routes, cities])
  const partyOptions = useMemo(() => parties.filter((p) => p.status === 'ACTIVE').map((p) => partyOptionFor(p, cityOf)), [parties, cityOf])

  const [range, setRange] = useState(() => ({ preset: 'thisMonth', ...presetRange('thisMonth') }))
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const [userId, setUserId] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })
  const [columnVisibility, setColumnVisibility] = useState(DEFAULT_PAYMENT_VISIBILITY)
  const [notice, setNotice] = useState(null)
  const [drawer, setDrawer] = useState(null) // { payment, errors, editingId }
  const [saving, setSaving] = useState(false)

  const rows = useMemo(
    () =>
      payments.map((p) => ({
        ...p,
        party: partiesById[p.partyId],
        totals: paymentTotals(p),
        collectorName: SALES_USERS_BY_ID[p.collectedBy]?.name ?? '—',
      })),
    [payments, partiesById],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (r.date < range.start || r.date > range.end) return false
      if (status && r.status !== status) return false
      if (method && r.method !== method) return false
      if (userId && r.collectedBy !== userId) return false
      if (!q) return true
      return (
        r.number.toLowerCase().includes(q) ||
        r.party?.name.toLowerCase().includes(q) ||
        r.comment?.toLowerCase().includes(q) ||
        r.reference?.toLowerCase().includes(q) ||
        r.allocations.some((a) => a.number.toLowerCase().includes(q))
      )
    })
  }, [rows, range, status, method, userId, search])

  const grandTotal = filtered.filter((r) => r.status !== 'REJECTED').reduce((s, r) => s + r.totals.amount, 0)
  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize))
  const page = pagination.pageIndex < pageCount ? pagination : { ...pagination, pageIndex: pageCount - 1 }
  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }))
  const hasFilters = Boolean(search || status || method || userId)

  /* ── the drawer ── */

  const openCreate = () =>
    setDrawer({
      editingId: null,
      errors: {},
      payment: emptyPayment({ type, partyType: config.partyType, number: nextPaymentNumber(allPayments, config.prefix, new Date().toISOString().slice(0, 10)) }),
    })
  const openEdit = (p) => setDrawer({ editingId: p.id, errors: {}, payment: { ...p, allocations: p.allocations.map((a) => ({ ...a })) } })

  const draft = drawer?.payment
  /** The party's bills with something still due (plus any this payment already settles). */
  const openBills = useMemo(() => {
    if (!draft?.partyId) return []
    return bills
      .filter((b) => b.partyId === draft.partyId && b.status !== 'CANCELLED' && b.status !== 'REJECTED')
      .map((b) => {
        const total = docTotals(b).total
        const own = Number(draft.allocations.find((a) => a.docId === b.id)?.amount) || 0
        const originalOwn = drawer.editingId ? Number(payments.find((p) => p.id === drawer.editingId)?.allocations.find((a) => a.docId === b.id)?.amount) || 0 : 0
        return { id: b.id, type: b.type, number: b.number, date: b.date, total, due: billDue(b, total, originalOwn), own }
      })
      .filter((b) => b.due > 0.01 || b.own > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [bills, draft?.partyId, draft?.allocations, drawer?.editingId, payments])

  const setField = (field, value) =>
    setDrawer((d) => ({
      ...d,
      payment: { ...d.payment, [field]: value, ...(field === 'partyId' ? { allocations: [] } : {}) },
      errors: { ...d.errors, [field]: undefined },
    }))

  const allocate = (bill, value) => {
    setDrawer((d) => {
      if (bill === 'ALL') {
        // Spread the amount already entered (or each bill's due) oldest first.
        const allocations = openBills.map((b) => ({ docId: b.id, docType: b.type, number: b.number, amount: String(b.due) }))
        return { ...d, payment: { ...d.payment, allocations }, errors: { ...d.errors, allocations: undefined, amount: undefined } }
      }
      const rest = d.payment.allocations.filter((a) => a.docId !== bill.id)
      const allocations = value === '' ? rest : [...rest, { docId: bill.id, docType: bill.type, number: bill.number, amount: value }]
      return { ...d, payment: { ...d.payment, allocations }, errors: { ...d.errors, allocations: undefined, amount: undefined } }
    })
  }

  const save = async () => {
    const dues = Object.fromEntries(openBills.map((b) => [b.id, b.due]))
    const found = validatePayment(draft, { party: partiesById[draft.partyId], payments: allPayments, editingId: drawer.editingId, dues })
    if (Object.keys(found).some((k) => found[k])) return setDrawer((d) => ({ ...d, errors: found }))

    setSaving(true)
    await new Promise((r) => setTimeout(r, 350)) // mock network
    const id = drawer.editingId ?? `pay-${Date.now()}`
    const saved = {
      ...draft,
      id,
      allocations: draft.allocations.filter((a) => Number(a.amount) > 0).map((a) => ({ ...a, amount: Number(a.amount) })),
      otherPayment: Number(draft.otherPayment) || 0,
      discount: Number(draft.discount) || 0,
    }
    // Keep the bill's Due column in step with what this payment settles.
    const before = drawer.editingId ? (payments.find((p) => p.id === drawer.editingId)?.allocations ?? []) : []
    const billIds = new Set([...before.map((a) => a.docId), ...saved.allocations.map((a) => a.docId)])
    for (const docId of billIds) {
      const bill = bills.find((b) => b.id === docId)
      if (!bill) continue
      const delta = (saved.allocations.find((a) => a.docId === docId)?.amount ?? 0) - (before.find((a) => a.docId === docId)?.amount ?? 0)
      if (delta) dispatch(docPatched({ type: bill.type, id: docId, changes: { received: Math.max(0, (bill.received ?? 0) + delta) } }))
    }
    dispatch(paymentSaved({ payment: saved }))
    setSaving(false)
    setDrawer(null)
    setNotice({ tone: 'success', message: `${saved.number} ${drawer.editingId ? 'updated' : 'saved'} — ${formatINR(paymentTotals(saved).amount)}.` })
  }

  const removePayment = (p) => {
    const index = payments.findIndex((x) => x.id === p.id)
    const { party: _p, totals: _t, collectorName: _c, ...raw } = p
    for (const a of raw.allocations) {
      const bill = bills.find((b) => b.id === a.docId)
      if (bill) dispatch(docPatched({ type: bill.type, id: a.docId, changes: { received: Math.max(0, (bill.received ?? 0) - a.amount) } }))
    }
    dispatch(paymentDeleted({ id: p.id }))
    setNotice({
      tone: 'success',
      message: `${p.number} deleted.`,
      undo: () => {
        for (const a of raw.allocations) {
          const bill = bills.find((b) => b.id === a.docId)
          if (bill) dispatch(docPatched({ type: bill.type, id: a.docId, changes: { received: (bill.received ?? 0) + a.amount } }))
        }
        dispatch(paymentRestored({ payment: raw, index }))
        setNotice({ tone: 'success', message: `${p.number} restored.` })
      },
    })
  }

  const columns = useMemo(
    () =>
      buildPaymentColumns({
        onEdit: openEdit,
        onSetStatus: (p, next) => {
          dispatch(paymentPatched({ id: p.id, changes: { status: next } }))
          setNotice({ tone: 'success', message: `${p.number} marked ${PAYMENT_STATUSES.find((s) => s.value === next)?.label.toLowerCase()}.` })
        },
        onDelete: removePayment,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, payments, bills],
  )

  useEffect(() => resetPage(), [range, status, method, userId, search]) // eslint-disable-line react-hooks/exhaustive-deps

  const Icon = config.icon
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title={config.title} subtitle={`${filtered.length} ${filtered.length === 1 ? 'payment' : 'payments'} in this view`}>
        <span className="inline-flex h-11 items-center rounded-lg bg-mint-pale px-3.5 text-sm font-semibold text-forest">
          Total: <span className="ml-1.5 font-mono">{formatINR(grandTotal)}</span>
        </span>
        <Button size="lg" className="h-11" onClick={openCreate}>
          <Plus data-icon="inline-start" /> {config.createLabel}
        </Button>
      </PageHeader>

      {notice && (
        <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.message}
          {notice.undo && (
            <button type="button" onClick={notice.undo} className="ml-2 font-semibold underline underline-offset-4">Undo</button>
          )}
        </Notice>
      )}

      <section className="overflow-hidden rounded-2xl border border-mint-pale bg-white">
        <div className="space-y-3 border-b border-mint-pale p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput value={search} onChange={setSearch} placeholder="Search payment no., party, bill" className="sm:w-80" />
            <Pagination
              pageIndex={page.pageIndex}
              pageSize={page.pageSize}
              total={filtered.length}
              onPageChange={(pageIndex) => setPagination((p) => ({ ...p, pageIndex }))}
              className="justify-between sm:ml-auto sm:justify-end"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DateRangeFilter value={range} onChange={setRange} />
            <SearchSelect aria-label="Filter by status" placeholder="Select status" clearable searchable={false} options={PAYMENT_STATUSES} value={status} onChange={setStatus} />
            <SearchSelect aria-label="Filter by payment type" placeholder="Select type" clearable searchable={false} options={PAYMENT_METHODS} value={method} onChange={setMethod} />
            <SearchSelect aria-label="Filter by user" placeholder="Select user" clearable options={SALES_USER_OPTIONS} value={userId} onChange={setUserId} />
          </div>
        </div>
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={getRowId}
          pagination={page}
          onPaginationChange={setPagination}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          onRowClick={openEdit}
          empty={
            <EmptyState
              icon={Icon}
              title={hasFilters ? 'No payments match these filters' : 'No payments in this period'}
              description={hasFilters ? 'Try a different search, or clear the filters.' : config.emptyText}
            >
              {hasFilters ? (
                <Button variant="outline" size="lg" onClick={() => { setSearch(''); setStatus(''); setMethod(''); setUserId('') }}>Clear filters</Button>
              ) : (
                <Button size="lg" onClick={openCreate}>
                  <Plus data-icon="inline-start" /> {config.createLabel}
                </Button>
              )}
            </EmptyState>
          }
        />
      </section>

      <FormDrawer
        open={Boolean(drawer)}
        onOpenChange={(open) => !open && setDrawer(null)}
        title={drawer?.editingId ? 'Edit payment' : 'Create payment'}
        description={config.title}
        onSubmit={save}
        saving={saving}
      >
        {drawer && (
          <PaymentForm
            config={config}
            payment={draft}
            set={setField}
            errors={drawer.errors}
            partyOptions={partyOptions}
            userOptions={SALES_USER_OPTIONS}
            bills={openBills}
            onAllocate={allocate}
          />
        )}
      </FormDrawer>
    </div>
  )
}
