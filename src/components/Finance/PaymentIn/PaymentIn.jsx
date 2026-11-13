import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, Plus } from 'lucide-react'
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
import { useToast } from '@/components/common/Toast'
import { Button } from '@/components/ui/button'
import { presetRange } from '@/lib/dateRange'
import { formatINR } from '@/lib/format'
import * as paymentsService from '@/services/paymentsService'
import * as usersService from '@/services/usersService'
import { selectUser } from '@/store/authSlice'
import { fetchDistributors, selectDistributors } from '@/store/distributorsSlice'
import { buildPaymentColumns, DEFAULT_PAYMENT_VISIBILITY } from '../shared/components/PaymentsTable'
import { PaymentForm } from '../shared/components/PaymentForm'
import { paymentTotals } from '../shared/paymentModel'
import { PAYMENT_METHODS, PAYMENT_STATUSES, PAYMENT_TYPES } from '../shared/paymentTypes'

const PAGE_SIZE = 20
const config = PAYMENT_TYPES.IN
const getRowId = (row) => row.id
const today = () => new Date().toISOString().slice(0, 10)

/**
 * Finance › Payment In — money received from a distributor.
 *
 * The rule this screen is built around: **recording a payment is not the same
 * as having the money**. A cheque is handed over long before it clears, so a
 * payment is entered as Pending and the admin approves it only once it is in
 * the company's account — "हमारे खाते में पैसा आ गया, उस चैक के अगेंस्ट
 * अप्रूव करेंगे". Only then does the firm's outstanding move. A cheque that
 * bounces was never approved, so there is nothing to undo; one approved by
 * mistake is rejected, and the money goes straight back on the books.
 *
 * Anyone who took the money in may record it — the cheque reaches whoever was
 * standing there — but the Approve and Reject actions are the admin's alone.
 */
export default function PaymentIn() {
  const dispatch = useDispatch()
  const toast = useToast()
  const distributors = useSelector(selectDistributors)
  const me = useSelector(selectUser)
  const isOffice = me?.role === 'ADMIN'

  const [payments, setPayments] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [range, setRange] = useState(() => ({ preset: 'thisMonth', ...presetRange('thisMonth') }))
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const [userId, setUserId] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })
  const [columnVisibility, setColumnVisibility] = useState(DEFAULT_PAYMENT_VISIBILITY)
  const [notice, setNotice] = useState(null)

  // { payment, errors, editingId }
  const [drawer, setDrawer] = useState(null)
  const [bills, setBills] = useState([])
  const [account, setAccount] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { payments: rows } = await paymentsService.listPayments({ limit: 300 })
      setPayments(rows)
      setError(null)
    } catch (e) {
      setError(paymentsService.errorFrom(e).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    dispatch(fetchDistributors())
    load()
    // Who can have collected: the office and the people in the field, never a
    // distributor login — they are the ones paying.
    usersService
      .listUsers({ limit: 300 })
      .then(({ users: rows }) => setUsers((rows ?? []).filter((row) => row.role !== 'DISTRIBUTOR')))
      .catch(() => setUsers([]))
  }, [dispatch, load])

  const firmById = useMemo(() => Object.fromEntries(distributors.map((row) => [row.id, row])), [distributors])
  const partyOptions = useMemo(
    () => distributors.filter((row) => row.isActive !== false).map((row) => ({ value: row.id, label: row.name, hint: row.state })),
    [distributors],
  )
  const userOptions = useMemo(() => users.map((row) => ({ value: row.id, label: row.name, hint: row.role })), [users])

  /**
   * The list the shared table expects. It was written against the mock shape,
   * and Payment Out still uses it, so the API's rows are translated here
   * rather than the table being rewritten under a screen that is not ready.
   */
  const rows = useMemo(
    () =>
      payments.map((row) => ({
        ...row,
        date: row.at,
        party: firmById[row.distributorId] ?? { name: row.distributorName, mobile: row.distributorMobile },
        totals: { amount: row.amount },
        collectorName: row.collectedByName || '—',
        allocations: row.allocations.map((a) => ({ ...a, docId: a.invoiceId, number: a.invoiceNo })),
      })),
    [payments, firmById],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (row.date < range.start || row.date > range.end) return false
      if (status && row.status !== status) return false
      if (method && row.method !== method) return false
      if (userId && row.collectedById !== userId) return false
      if (!q) return true
      return (
        row.number.toLowerCase().includes(q) ||
        (row.party?.name ?? '').toLowerCase().includes(q) ||
        (row.comment ?? '').toLowerCase().includes(q) ||
        (row.reference ?? '').toLowerCase().includes(q) ||
        row.allocations.some((a) => a.number.toLowerCase().includes(q))
      )
    })
  }, [rows, range, status, method, userId, search])

  // Only money that is really ours. A pending payment is a piece of paper.
  const banked = filtered.filter((row) => row.status === 'APPROVED').reduce((sum, row) => sum + row.amount, 0)
  const waiting = filtered.filter((row) => row.status === 'PENDING').reduce((sum, row) => sum + row.amount, 0)

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize))
  const page = pagination.pageIndex < pageCount ? pagination : { ...pagination, pageIndex: pageCount - 1 }
  const hasFilters = Boolean(search || status || method || userId)

  /* ── the drawer ───────────────────────────────────────────────────── */

  const draft = drawer?.payment

  const openCreate = async () => {
    const number = await paymentsService.nextPaymentNo(today()).catch(() => '')
    setBills([])
    setAccount(null)
    setDrawer({
      editingId: null,
      errors: {},
      payment: {
        number,
        date: today(),
        partyId: '',
        collectedBy: me?.id ?? '',
        method: 'CASH',
        reference: '',
        comment: '',
        documents: [],
        allocations: [],
        otherPayment: '',
        discount: '',
      },
    })
  }

  const openEdit = (row) => {
    if (row.status === 'APPROVED') {
      toast({ tone: 'danger', title: `${row.number} is approved — reject it first to change it.` })
      return
    }
    setDrawer({
      editingId: row.id,
      errors: {},
      payment: {
        number: row.number,
        date: row.at,
        partyId: row.distributorId,
        collectedBy: row.collectedById,
        method: row.method,
        reference: row.reference,
        comment: row.comment,
        documents: row.documents ?? [],
        allocations: row.allocations.map((a) => ({ docId: a.invoiceId, number: a.invoiceNo, amount: String(a.amount) })),
        otherPayment: row.otherPayment ? String(row.otherPayment) : '',
        discount: row.discount ? String(row.discount) : '',
      },
    })
  }

  // The firm's unpaid bills, and what they owe. Asked of the server, because
  // what is still due depends on every other payment, not just this one.
  useEffect(() => {
    if (!draft?.partyId) {
      setBills([])
      setAccount(null)
      return
    }
    let alive = true
    paymentsService
      .duesFor(draft.partyId, drawer?.editingId ?? undefined)
      .then((data) => {
        if (!alive) return
        setBills(data.bills ?? [])
        setAccount(data.account ?? null)
      })
      .catch(() => {
        if (!alive) return
        setBills([])
        setAccount(null)
      })
    return () => {
      alive = false
    }
  }, [draft?.partyId, drawer?.editingId])

  /** What the drawer's bill list wants: number, date, total and what is left. */
  const openBills = useMemo(
    () =>
      bills
        .filter((bill) => bill.due > 0.01 || draft?.allocations.some((a) => a.docId === bill.id))
        .map((bill) => ({ id: bill.id, number: bill.invoiceNo, date: bill.invoiceDate, total: bill.total, due: bill.due })),
    [bills, draft?.allocations],
  )

  const setField = (field, value) =>
    setDrawer((d) => ({
      ...d,
      payment: { ...d.payment, [field]: value, ...(field === 'partyId' ? { allocations: [] } : {}) },
      errors: { ...d.errors, [field]: undefined },
    }))

  const allocate = (bill, value) =>
    setDrawer((d) => {
      if (bill === 'ALL') {
        const allocations = openBills.map((row) => ({ docId: row.id, number: row.number, amount: String(row.due) }))
        return { ...d, payment: { ...d.payment, allocations }, errors: { ...d.errors, allocations: undefined, amount: undefined } }
      }
      const rest = d.payment.allocations.filter((a) => a.docId !== bill.id)
      const allocations = value === '' ? rest : [...rest, { docId: bill.id, number: bill.number, amount: value }]
      return { ...d, payment: { ...d.payment, allocations }, errors: { ...d.errors, allocations: undefined, amount: undefined } }
    })

  const save = async () => {
    const found = {}
    if (!draft.partyId) found.partyId = 'Choose who this payment is from.'
    if (!draft.date) found.date = 'Choose a date.'
    if (!draft.number?.trim()) found.number = 'Enter a payment number.'
    if (draft.method === 'CHEQUE' && !draft.reference?.trim()) found.reference = 'Enter the cheque number.'
    if (paymentTotals(draft).amount <= 0) found.amount = 'Enter an amount, or settle at least one bill.'
    if (Object.keys(found).length) return setDrawer((d) => ({ ...d, errors: found }))

    const payload = {
      number: draft.number.trim(),
      distributorId: draft.partyId,
      at: draft.date,
      collectedById: draft.collectedBy || undefined,
      method: draft.method,
      reference: draft.reference?.trim() ?? '',
      comment: draft.comment?.trim() ?? '',
      documents: draft.documents ?? [],
      otherPayment: Number(draft.otherPayment) || 0,
      discount: Number(draft.discount) || 0,
      allocations: draft.allocations
        .filter((a) => Number(a.amount) > 0)
        .map((a) => ({ invoiceId: a.docId, amount: Number(a.amount) })),
    }

    setSaving(true)
    try {
      const saved = drawer.editingId
        ? await paymentsService.updatePayment(drawer.editingId, payload)
        : await paymentsService.createPayment(payload)
      setDrawer(null)
      await load()
      setNotice({
        tone: 'success',
        message: drawer.editingId
          ? `${saved.number} updated — ${formatINR(saved.amount)}.`
          : `${saved.number} recorded — ${formatINR(saved.amount)}. It moves nothing until the office approves it.`,
      })
    } catch (e) {
      const { message, details } = paymentsService.errorFrom(e)
      setDrawer((d) => ({ ...d, errors: { ...details, amount: details.amount ?? (details.allocations ? undefined : message) } }))
      toast({ tone: 'danger', title: message })
    } finally {
      setSaving(false)
    }
  }

  /* ── approving ────────────────────────────────────────────────────── */

  const setStatusOf = async (row, next) => {
    try {
      await paymentsService.setPaymentStatus(row.id, next)
      await load()
      const said = {
        APPROVED: `${row.number} approved — ${formatINR(row.amount)} is off what they owe.`,
        REJECTED: `${row.number} rejected — ${formatINR(row.amount)} is back on what they owe.`,
        PENDING: `${row.number} is waiting for approval again.`,
      }[next]
      setNotice({ tone: next === 'REJECTED' ? 'warning' : 'success', message: said })
    } catch (e) {
      toast({ tone: 'danger', title: paymentsService.errorFrom(e).message })
    }
  }

  const removePayment = async (row) => {
    try {
      await paymentsService.deletePayment(row.id)
      await load()
      setNotice({ tone: 'success', message: `${row.number} deleted.` })
    } catch (e) {
      toast({ tone: 'danger', title: paymentsService.errorFrom(e).message })
    }
  }

  const columns = useMemo(
    () =>
      buildPaymentColumns({
        onEdit: openEdit,
        // Approving is what finally makes the money real, so it is the
        // office's alone. Everyone else may record and look.
        onSetStatus: isOffice ? setStatusOf : null,
        onDelete: removePayment,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOffice, payments],
  )

  useEffect(() => setPagination((p) => ({ ...p, pageIndex: 0 })), [range, status, method, userId, search])

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title={config.title} subtitle={`${filtered.length} ${filtered.length === 1 ? 'payment' : 'payments'} in this view`}>
        <span className="inline-flex h-11 items-center rounded-lg bg-mint-pale px-3.5 text-sm font-semibold text-forest">
          Banked: <span className="ml-1.5 font-mono">{formatINR(banked)}</span>
        </span>
        {waiting > 0 && (
          <span
            id="payment-awaiting"
            className="inline-flex h-11 items-center rounded-lg bg-amber-50 px-3.5 text-sm font-semibold text-amber-700"
          >
            Awaiting approval: <span className="ml-1.5 font-mono">{formatINR(waiting)}</span>
          </span>
        )}
        <Button size="lg" className="h-11" onClick={openCreate}>
          <Plus data-icon="inline-start" /> {config.createLabel}
        </Button>
      </PageHeader>

      {error && <Notice tone="danger">{error}</Notice>}
      {notice && (
        <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.message}
        </Notice>
      )}

      <section className="overflow-hidden rounded-2xl border border-mint-pale bg-white">
        <div className="space-y-3 border-b border-mint-pale p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput value={search} onChange={setSearch} placeholder="Search payment no., distributor, bill" className="sm:w-80" />
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
            <SearchSelect aria-label="Filter by user" placeholder="Select user" clearable options={userOptions} value={userId} onChange={setUserId} />
          </div>
        </div>

        <p className="border-b border-mint-pale px-4 py-2.5 text-xs text-ink-muted">
          A payment changes what a distributor owes only once the office approves it — for a cheque, once it has cleared into the
          company&apos;s account.
        </p>

        {loading && !payments.length ? (
          <div className="grid min-h-60 place-items-center" role="status" aria-label="Loading payments">
            <span className="size-8 animate-spin rounded-full border-3 border-mint border-t-green-deep" />
          </div>
        ) : (
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
                icon={ArrowDownLeft}
                title={hasFilters ? 'No payments match these filters' : 'No payments in this period'}
                description={hasFilters ? 'Try a different search, or clear the filters.' : config.emptyText}
              >
                {hasFilters ? (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setSearch('')
                      setStatus('')
                      setMethod('')
                      setUserId('')
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button size="lg" onClick={openCreate}>
                    <Plus data-icon="inline-start" /> {config.createLabel}
                  </Button>
                )}
              </EmptyState>
            }
          />
        )}
      </section>

      <FormDrawer
        open={Boolean(drawer)}
        onOpenChange={(open) => !open && setDrawer(null)}
        title={drawer?.editingId ? 'Edit payment' : 'Create payment'}
        description="Recorded now, counted once the office approves it."
        onSubmit={save}
        saving={saving}
      >
        {drawer && (
          <>
            {account && (
              <div id="payment-account" className="mb-4 grid grid-cols-2 gap-3 rounded-2xl border border-mint-pale bg-bg p-4 sm:grid-cols-4">
                <Figure label="Billed" value={account.billed} />
                <Figure label="Credit notes" value={account.credited} />
                <Figure label="Received" value={account.received} />
                <Figure label="Outstanding" value={account.outstanding} strong />
              </div>
            )}
            <PaymentForm
              config={config}
              payment={drawer.payment}
              set={setField}
              errors={drawer.errors}
              partyOptions={partyOptions}
              userOptions={userOptions}
              bills={openBills}
              onAllocate={allocate}
            />
          </>
        )}
      </FormDrawer>
    </div>
  )
}

/** One figure on the firm's account strip at the top of the drawer. */
function Figure({ label, value, strong }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={`font-mono text-sm tabular-nums ${strong ? 'font-extrabold text-green-deep' : 'font-semibold text-black'}`}>
        {formatINR(value)}
      </p>
    </div>
  )
}
