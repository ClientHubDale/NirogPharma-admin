import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, CalendarClock, Plus } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { Modal } from '@/components/common/Modal'
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
import * as creditNotesService from '@/services/creditNotesService'
import * as paymentsService from '@/services/paymentsService'
import * as usersService from '@/services/usersService'
import { selectUser } from '@/store/authSlice'
import { fetchDistributors, selectDistributors } from '@/store/distributorsSlice'
import { selectRoutes } from '@/store/geographySlice'
import { buildPaymentColumns, DEFAULT_PAYMENT_VISIBILITY } from '../shared/components/PaymentsTable'
import { PaymentForm } from '../shared/components/PaymentForm'
import { paymentTotals, spreadOldestFirst } from '../shared/paymentModel'
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
  /**
   * The beats, offered as suggestions on the Area box. They come from the
   * Routes screens, which have no tables behind them yet — so this is a
   * hint, not a list to pick from, and anything may be typed.
   */
  const routes = useSelector(selectRoutes)
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
  /// Goods they sent back, shown beside what they owe — "उसका क्रेडिट नोट भी".
  const [notes, setNotes] = useState([])
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

  /**
   * Cheques whose day has come and that nobody has banked yet — "उस डेट पे
   * रिमाइंडर आना चाहिए" (18:25). Read off every payment loaded rather than
   * the filtered view: a cheque that came due last month is exactly the one
   * this month's filter would hide.
   */
  const chequesDue = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return payments.filter((row) => row.method === 'CHEQUE' && row.status === 'PENDING' && row.chequeDate && row.chequeDate <= today)
  }, [payments])
  const [onlyCheques, setOnlyCheques] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (row.date < range.start || row.date > range.end) return false
      if (status && row.status !== status) return false
      if (method && row.method !== method) return false
      // The filter follows whoever the payment counts towards, which is the
      // only thing targets are read by now.
      if (userId && row.managerId !== userId && row.executiveId !== userId) return false
      if (onlyCheques && !chequesDue.some((one) => one.id === row.id)) return false
      if (!q) return true
      return (
        row.number.toLowerCase().includes(q) ||
        (row.party?.name ?? '').toLowerCase().includes(q) ||
        (row.comment ?? '').toLowerCase().includes(q) ||
        (row.reference ?? '').toLowerCase().includes(q) ||
        row.allocations.some((a) => a.number.toLowerCase().includes(q))
      )
    })
  }, [rows, range, status, method, userId, search, onlyCheques, chequesDue])

  // Only money that is really ours. A pending payment is a piece of paper.
  const banked = filtered.filter((row) => row.status === 'APPROVED').reduce((sum, row) => sum + row.amount, 0)
  const waiting = filtered.filter((row) => row.status === 'PENDING').reduce((sum, row) => sum + row.amount, 0)

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize))
  const page = pagination.pageIndex < pageCount ? pagination : { ...pagination, pageIndex: pageCount - 1 }
  const hasFilters = Boolean(search || status || method || userId)

  /* ── the drawer ───────────────────────────────────────────────────── */

  const draft = drawer?.payment

  /**
   * Numbers run per firm now — "जिस पार्टी की पेमेंट डाले उसकी number of
   * payment दे" — so the drawer cannot offer one until the party is chosen.
   */
  const openCreate = async () => {
    const number = ''
    setBills([])
    setAccount(null)
    setDrawer({
      editingId: null,
      errors: {},
      payment: {
        number,
        date: today(),
        partyId: '',
        managerId: '',
        executiveId: '',
        method: 'CASH',
        reference: '',
        chequeDate: '',
        chequeFront: null,
        chequeBack: null,
        area: '',
        comment: '',
        documents: [],
        allocations: [],
        otherPayment: '',
        otherNote: '',
        discount: '',
        /// Typed at the top of Settle bills, spread over the bills, then gone.
        spread: '',
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
        managerId: row.managerId ?? '',
        executiveId: row.executiveId ?? '',
        method: row.method,
        reference: row.reference,
        chequeDate: row.chequeDate ?? '',
        chequeFront: row.chequeFront ?? null,
        chequeBack: row.chequeBack ?? null,
        area: row.area ?? '',
        comment: row.comment,
        documents: row.documents ?? [],
        allocations: row.allocations.map((a) => ({ docId: a.invoiceId, number: a.invoiceNo, amount: String(a.amount) })),
        otherPayment: row.otherPayment ? String(row.otherPayment) : '',
        otherNote: row.otherNote ?? '',
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
      setNotes([])
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
    // Only issued notes are money; a draft is still being argued about.
    creditNotesService
      .listCreditNotes({ distributorId: draft.partyId, status: 'ISSUED', limit: 50 })
      .then(({ notes: rows }) => alive && setNotes(rows ?? []))
      .catch(() => alive && setNotes([]))
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

  /**
   * Choosing the party brings its own people with it — "ऑटोमेटिक आ जाएगा"
   * — because the office should not be typing what the firm already knows.
   * With several executives on a firm nobody is guessed; the person
   * recording it picks, since the target follows whoever is chosen.
   */
  const staffOf = (partyId) => {
    const firm = firmById[partyId]
    const executives = firm?.executives ?? []
    return { managerId: firm?.managerId ?? '', executiveId: executives.length === 1 ? executives[0].id : '' }
  }

  const setField = (field, value) =>
    setDrawer((d) => ({
      ...d,
      payment: { ...d.payment, [field]: value, ...(field === 'partyId' ? { allocations: [], ...staffOf(value) } : {}) },
      errors: { ...d.errors, [field]: undefined },
    }))

  /**
   * The firm's own next receipt number, fetched when the firm is picked.
   * Only for a new payment: an existing one keeps the number it was given.
   */
  useEffect(() => {
    if (!draft?.partyId || drawer?.editingId) return
    let alive = true
    paymentsService
      .nextPaymentNo(draft.date, draft.partyId)
      .then((number) => {
        if (!alive) return
        setDrawer((d) => (d && !d.editingId ? { ...d, payment: { ...d.payment, number } } : d))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [draft?.partyId, draft?.date, drawer?.editingId])

  const areaOptions = useMemo(() => [...new Set((routes ?? []).map((one) => one.name).filter(Boolean))].sort(), [routes])

  /** The firm's own manager and executives, which is what "party assigned" means. */
  const staff = useMemo(() => {
    const firm = firmById[draft?.partyId]
    return {
      managerOptions: firm?.managerId ? [{ value: firm.managerId, label: firm.managerName || 'Manager' }] : [],
      executiveOptions: (firm?.executives ?? []).map((one) => ({ value: one.id, label: one.name })),
    }
  }, [firmById, draft?.partyId])

  const allocate = (bill, value) =>
    setDrawer((d) => {
      /**
       * A sum handed over at the shop, put against the oldest bill first and
       * then the next — "जो सबसे पुराना इनवॉइस है उसमें चला जाए". What no
       * bill can take is kept on account rather than turned away.
       */
      if (bill === 'SPREAD') {
        const { allocations, onAccount } = spreadOldestFirst(value, openBills)
        return {
          ...d,
          payment: {
            ...d.payment,
            allocations,
            otherPayment: onAccount > 0 ? String(onAccount) : '',
            spread: '',
          },
          errors: { ...d.errors, allocations: undefined, amount: undefined },
        }
      }
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
    // A cheque with no date on it cannot be banked, and nobody can be
    // reminded about it either.
    if (draft.method === 'CHEQUE' && !draft.chequeDate) found.chequeDate = 'Enter the date written on the cheque.'
    else if (draft.method === 'CHEQUE' && draft.chequeDate < draft.date) {
      found.chequeDate = 'A cheque cannot be dated before the day it was handed over.'
    }
    // "एरिया ऐड करना है" — which beat the money came off.
    if (!draft.area?.trim()) found.area = 'Which area was this collected on?'
    if (paymentTotals(draft).amount <= 0) found.amount = 'Enter an amount, or settle at least one bill.'
    if (Object.keys(found).length) return setDrawer((d) => ({ ...d, errors: found }))

    const payload = {
      number: draft.number.trim(),
      distributorId: draft.partyId,
      at: draft.date,
      managerId: draft.managerId || undefined,
      executiveId: draft.executiveId || undefined,
      method: draft.method,
      reference: draft.reference?.trim() ?? '',
      chequeDate: draft.method === 'CHEQUE' ? draft.chequeDate || undefined : undefined,
      chequeFront: draft.method === 'CHEQUE' ? (draft.chequeFront ?? null) : null,
      chequeBack: draft.method === 'CHEQUE' ? (draft.chequeBack ?? null) : null,
      area: draft.area?.trim() ?? '',
      comment: draft.comment?.trim() ?? '',
      documents: draft.documents ?? [],
      otherPayment: Number(draft.otherPayment) || 0,
      otherNote: draft.otherNote?.trim() ?? '',
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

  /**
   * Approving is the thing that makes the money real, and rejecting puts it
   * straight back on the books. Neither should happen on a mis-click —
   * "गलती से क्लिक हो गया तो" (27:43) — so both are asked for first.
   */
  const [deciding, setDeciding] = useState(null) // { row, next }

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
        onSetStatus: isOffice ? (row, next) => setDeciding({ row, next }) : null,
        onDelete: removePayment,
        // Payment In counts towards the party's own manager and executive.
        staffColumn: true,
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

      {/* The cheques whose date has arrived. Until there is somewhere to send
          a reminder, the screen itself is the reminder. */}
      {chequesDue.length > 0 && (
        <div
          id="cheques-due"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-warning-soft bg-warning-soft px-4 py-3 text-sm text-warning-ink"
        >
          <CalendarClock className="size-4 shrink-0" />
          <p className="flex-1">
            <span className="font-semibold">
              {chequesDue.length} cheque{chequesDue.length === 1 ? '' : 's'}
            </span>{' '}
            {chequesDue.length === 1 ? 'is' : 'are'} dated today or earlier and still waiting to be banked —{' '}
            <span className="font-mono font-semibold">{formatINR(chequesDue.reduce((sum, one) => sum + one.amount, 0))}</span>.
          </p>
          <button
            type="button"
            onClick={() => {
              const showing = !onlyCheques
              setOnlyCheques(showing)
              // The date filter is on the day the cheque was taken in, and an
              // overdue cheque was taken in long before today — so the range
              // is opened back to the oldest of them, not to a fixed preset.
              if (showing) {
                const oldest = chequesDue.reduce((first, one) => (one.at < first ? one.at : first), chequesDue[0].at)
                setRange({ preset: 'custom', start: oldest, end: new Date().toISOString().slice(0, 10) })
              } else {
                setRange({ preset: 'thisMonth', ...presetRange('thisMonth') })
              }
            }}
            className="font-semibold underline underline-offset-4"
          >
            {onlyCheques ? 'Show everything' : 'Show them'}
          </button>
        </div>
      )}

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
            <SearchSelect
              aria-label="Filter by manager or executive"
              placeholder="Manager / executive"
              clearable
              options={userOptions}
              value={userId}
              onChange={setUserId}
            />
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

      {/* What approving and rejecting actually mean, said in money, before
          either one happens. */}
      <Modal
        open={Boolean(deciding)}
        onOpenChange={(open) => !open && setDeciding(null)}
        title={deciding?.next === 'APPROVED' ? 'Approve this payment?' : deciding?.next === 'REJECTED' ? 'Reject this payment?' : 'Move back to pending?'}
        description={deciding ? `${deciding.row.number} · ${deciding.row.party?.name ?? ''}` : ''}
        className="max-w-md"
        footer={
          <>
            <Button variant="outline" size="lg" onClick={() => setDeciding(null)}>
              Cancel
            </Button>
            <Button
              size="lg"
              onClick={async () => {
                const { row, next } = deciding
                setDeciding(null)
                await setStatusOf(row, next)
              }}
            >
              {deciding?.next === 'APPROVED' ? 'Yes, approve' : deciding?.next === 'REJECTED' ? 'Yes, reject' : 'Yes, move it back'}
            </Button>
          </>
        }
      >
        {deciding && (
          <div className="space-y-3 text-sm">
            <p className="font-mono text-2xl font-extrabold text-black">{formatINR(deciding.row.totals.amount)}</p>
            <p className="text-ink">
              {deciding.next === 'APPROVED' ? (
                <>
                  This says the money is really in the company's account. It comes straight off what{' '}
                  <span className="font-semibold">{deciding.row.party?.name}</span> owes.
                </>
              ) : deciding.next === 'REJECTED' ? (
                <>
                  Whatever this settled goes back on <span className="font-semibold">{deciding.row.party?.name}</span>'s account — which
                  is what happens when a cheque comes back.
                </>
              ) : (
                <>This stops counting as money until it is approved again.</>
              )}
            </p>
            {deciding.row.method === 'CHEQUE' && deciding.row.chequeDate && (
              <p className="rounded-xl bg-bg px-3.5 py-2.5 text-xs text-ink-muted">
                Cheque {deciding.row.reference || ''} is dated {deciding.row.chequeDate.split('-').reverse().join('-')}.
              </p>
            )}
          </div>
        )}
      </Modal>

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
              staff={staff}
              areaOptions={areaOptions}
              account={account}
              creditNotes={notes}
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
