import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, FileSpreadsheet, Plus, UserPlus } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { Modal } from '@/components/common/Modal'
import { useToast } from '@/components/common/Toast'
import { DataTable } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ExportMenu } from '@/components/data/ExportMenu'
import { FiltersPopover } from '@/components/data/FiltersPopover'
import { FormDrawer } from '@/components/data/FormDrawer'
import { Notice } from '@/components/data/Notice'
import { PageHeader } from '@/components/data/PageHeader'
import { Pagination } from '@/components/data/Pagination'
import { SearchInput } from '@/components/data/SearchInput'
import { DateRangeFilter } from '@/components/form/DateRangeFilter'
import { SearchSelect } from '@/components/form/SearchSelect'
import { SelectField } from '@/components/form/SelectField'
import { TextAreaField } from '@/components/form/TextAreaField'
import { TextField } from '@/components/form/TextField'
import { Button } from '@/components/ui/button'
import { presetRange } from '@/lib/dateRange'
import { formatINR } from '@/lib/format'
import { buildWorkbook, downloadWorkbook } from '@/lib/xlsx'
import * as paymentsOutService from '@/services/paymentsOutService'
import {
  fetchPaymentsOut,
  fetchSuppliers,
  removePaymentOut,
  savePaymentOut,
  saveSupplier,
  selectPaymentsOut,
  selectPaymentsOutError,
  selectPaymentsOutStatus,
  selectSuppliers,
  setPaymentOutStatus,
} from '@/store/paymentsOutSlice'
import { buildPaymentOutColumns, DEFAULT_PAYMENT_OUT_VISIBILITY, PAYMENT_OUT_COLUMN_OPTIONS } from './components/PaymentsOutTable'
import {
  emptyPaymentOutForm,
  emptySupplierForm,
  formToPayload,
  METHOD_LABEL,
  PAYMENT_OUT_METHODS,
  PAYMENT_OUT_STATUSES,
  paymentOutToForm,
  STATUS_LABEL,
  validatePaymentOutForm,
  validateSupplierForm,
} from './paymentOutModel'

const PAGE_SIZE = 20
const EMPTY_FILTERS = { method: '' }
const getRowId = (payment) => payment.id

/**
 * Finance › Payment Out — money the factory pays its suppliers.
 *
 * It is the mirror of Payment In, minus one thing it cannot have: there is no
 * purchase module, so no supplier bills exist to settle against. What stands
 * in their place is the supplier's own bill number, typed off the paper.
 *
 * **Approving is what puts the money on the books**, exactly as it is for
 * money coming in — so the headline figure counts approved payments only, and
 * what is still waiting is shown separately rather than mixed in.
 */
export default function PaymentOut() {
  const dispatch = useDispatch()
  const toast = useToast()

  const payments = useSelector(selectPaymentsOut)
  const suppliers = useSelector(selectSuppliers)
  const loadStatus = useSelector(selectPaymentsOutStatus)
  const loadError = useSelector(selectPaymentsOutError)

  const [range, setRange] = useState(() => ({ preset: 'thisMonth', ...presetRange('thisMonth') }))
  const [search, setSearch] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [status, setStatus] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })
  const [columnVisibility, setColumnVisibility] = useState(DEFAULT_PAYMENT_OUT_VISIBILITY)
  const [notice, setNotice] = useState(null)

  const [drawer, setDrawer] = useState(null) // { editingId, form, errors }
  const [saving, setSaving] = useState(false)
  /// A supplier who is not on the books yet, added without losing the payment.
  const [newSupplier, setNewSupplier] = useState(null)
  const [savingSupplier, setSavingSupplier] = useState(false)
  /// Approving or rejecting asks first — it is what moves the books.
  const [deciding, setDeciding] = useState(null)

  useEffect(() => {
    dispatch(fetchPaymentsOut({}))
    dispatch(fetchSuppliers())
  }, [dispatch])

  const supplierOptions = useMemo(
    () => suppliers.map((row) => ({ value: row.id, label: row.name, hint: row.mobile || row.gstin })),
    [suppliers],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return payments.filter((payment) => {
      if (payment.at < range.start || payment.at > range.end) return false
      if (supplierId && payment.supplierId !== supplierId) return false
      if (status && payment.status !== status) return false
      if (filters.method && payment.method !== filters.method) return false
      if (!q) return true
      return (
        payment.number.toLowerCase().includes(q) ||
        payment.supplierName.toLowerCase().includes(q) ||
        payment.reference?.toLowerCase().includes(q) ||
        payment.billRef?.toLowerCase().includes(q) ||
        payment.comment?.toLowerCase().includes(q)
      )
    })
  }, [payments, range, supplierId, status, filters, search])

  // Only approved money has actually left. What is pending is money somebody
  // has written down and nobody has agreed to yet, so it is counted apart.
  const paidOut = filtered.filter((p) => p.status === 'APPROVED').reduce((sum, p) => sum + p.amount, 0)
  const waiting = filtered.filter((p) => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0)

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize))
  const page = pagination.pageIndex < pageCount ? pagination : { ...pagination, pageIndex: pageCount - 1 }
  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }))
  const hasFilters = Boolean(search || supplierId || status || Object.values(filters).some(Boolean))

  /* ── the drawer ────────────────────────────────────────────────────── */

  const openCreate = async () => {
    setDrawer({ editingId: null, errors: {}, form: emptyPaymentOutForm() })
    const number = await paymentsOutService.nextPaymentOutNo().catch(() => '')
    setDrawer((d) => (d && !d.editingId && !d.form.number ? { ...d, form: { ...d.form, number } } : d))
  }

  const openEdit = (payment) => setDrawer({ editingId: payment.id, errors: {}, form: paymentOutToForm(payment) })

  const set = (field, value) =>
    setDrawer((d) => ({ ...d, form: { ...d.form, [field]: value }, errors: { ...d.errors, [field]: undefined } }))

  const save = async () => {
    const found = validatePaymentOutForm(drawer.form)
    if (Object.keys(found).length) return setDrawer((d) => ({ ...d, errors: found }))

    setSaving(true)
    const result = await dispatch(savePaymentOut({ id: drawer.editingId, form: formToPayload(drawer.form) }))
    setSaving(false)

    if (savePaymentOut.rejected.match(result)) {
      const { message, details } = result.payload
      if (details) return setDrawer((d) => ({ ...d, errors: { ...d.errors, ...details } }))
      return toast({ tone: 'danger', title: 'Could not save', description: message })
    }

    const { payment } = result.payload
    setDrawer(null)
    setNotice({
      tone: 'success',
      message: `${payment.number} — ${formatINR(payment.amount)} to ${payment.supplierName}. It is pending until the office approves it.`,
    })
  }

  const saveNewSupplier = async () => {
    const found = validateSupplierForm(newSupplier.form)
    if (Object.keys(found).length) return setNewSupplier((d) => ({ ...d, errors: found }))

    setSavingSupplier(true)
    const result = await dispatch(saveSupplier({ id: null, form: newSupplier.form }))
    setSavingSupplier(false)

    if (saveSupplier.rejected.match(result)) {
      const { message, details } = result.payload
      if (details) return setNewSupplier((d) => ({ ...d, errors: { ...d.errors, ...details } }))
      return toast({ tone: 'danger', title: 'Could not add the supplier', description: message })
    }

    // Straight onto the payment being written.
    const { supplier } = result.payload
    setNewSupplier(null)
    set('supplierId', supplier.id)
    toast({ tone: 'success', title: 'Supplier added', description: `${supplier.name} — now on this payment.` })
  }

  const decide = async () => {
    const { payment, next } = deciding
    setDeciding(null)
    const result = await dispatch(setPaymentOutStatus({ id: payment.id, status: next }))
    if (setPaymentOutStatus.rejected.match(result)) {
      return toast({ tone: 'danger', title: 'Could not change the status', description: result.payload.message })
    }
    setNotice({
      tone: next === 'APPROVED' ? 'success' : 'warning',
      message:
        next === 'APPROVED'
          ? `${payment.number} approved — ${formatINR(payment.amount)} is on the books as paid.`
          : `${payment.number} is ${STATUS_LABEL[next].toLowerCase()}.`,
    })
  }

  const destroy = async (payment) => {
    const result = await dispatch(removePaymentOut({ id: payment.id }))
    if (removePaymentOut.rejected.match(result)) {
      return toast({ tone: 'danger', title: 'Could not delete', description: result.payload.message })
    }
    setNotice({ tone: 'success', message: `${payment.number} deleted.` })
  }

  const columns = useMemo(
    () =>
      buildPaymentOutColumns({
        onEdit: openEdit,
        onSetStatus: (payment, next) => setDeciding({ payment, next }),
        onDelete: destroy,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const exportExcel = async () => {
    const workbook = await buildWorkbook({
      sheetName: 'Payments Out',
      columns: [
        { key: 'date', header: 'Date', width: 12 },
        { key: 'number', header: 'Payment No', width: 18, required: true },
        { key: 'supplier', header: 'Supplier', width: 30, required: true },
        { key: 'gstin', header: 'GSTIN', width: 18 },
        { key: 'method', header: 'Paid By', width: 12 },
        { key: 'reference', header: 'Reference', width: 18 },
        { key: 'billRef', header: 'Their Bill', width: 18 },
        { key: 'amount', header: 'Amount', width: 13, numFmt: '0.00' },
        { key: 'status', header: 'Status', width: 12 },
        { key: 'recordedBy', header: 'Recorded By', width: 18 },
        { key: 'approvedBy', header: 'Approved By', width: 18 },
        { key: 'comment', header: 'Comment', width: 30 },
      ],
      rows: filtered.map((payment) => ({
        date: payment.at.split('-').reverse().join('-'),
        number: payment.number,
        supplier: payment.supplierName,
        gstin: payment.supplierGstin,
        method: METHOD_LABEL[payment.method] ?? payment.method,
        reference: payment.reference,
        billRef: payment.billRef,
        amount: payment.amount,
        status: STATUS_LABEL[payment.status],
        recordedBy: payment.recordedByName,
        approvedBy: payment.approvedByName,
        comment: payment.comment,
      })),
    })
    await downloadWorkbook(workbook, `payments-out-${range.start}-to-${range.end}.xlsx`)
    setNotice({ tone: 'success', message: `Exported ${filtered.length} payment${filtered.length === 1 ? '' : 's'}.` })
  }

  const empty = (
    <EmptyState
      icon={ArrowUpRight}
      title={hasFilters ? 'No payments match these filters' : 'No payments out in this period'}
      description={
        hasFilters
          ? 'Try a different search, or clear the filters.'
          : 'Record money paid to a supplier. It stays pending until the office approves it — approving is what puts it on the books.'
      }
    >
      {hasFilters ? (
        <Button
          variant="outline"
          size="lg"
          onClick={() => {
            setSearch('')
            setSupplierId('')
            setStatus('')
            setFilters(EMPTY_FILTERS)
            resetPage()
          }}
        >
          Clear filters
        </Button>
      ) : (
        <Button size="lg" onClick={openCreate}>
          <Plus data-icon="inline-start" /> Create Payment Out
        </Button>
      )}
    </EmptyState>
  )

  const chosenSupplier = suppliers.find((row) => row.id === drawer?.form.supplierId)

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title="Payment Out" subtitle={`${filtered.length} payment${filtered.length === 1 ? '' : 's'} in this view`}>
        <span id="out-paid" className="inline-flex h-11 items-center rounded-lg bg-mint-pale px-3.5 text-sm font-semibold text-forest">
          Paid: <span className="ml-1.5 font-mono">{formatINR(paidOut)}</span>
        </span>
        {/* Money written down that nobody has agreed to yet. */}
        <span id="out-waiting" className="inline-flex h-11 items-center rounded-lg bg-warning-soft px-3.5 text-sm font-semibold text-warning-ink">
          Awaiting approval: <span className="ml-1.5 font-mono">{formatINR(waiting)}</span>
        </span>
        <ExportMenu
          disabled={!filtered.length}
          options={[{ label: 'Excel', hint: 'Styled .xlsx of the filtered list', icon: FileSpreadsheet, onSelect: exportExcel }]}
        />
        <Button size="lg" className="h-11" onClick={openCreate}>
          <Plus data-icon="inline-start" /> Create Payment Out
        </Button>
      </PageHeader>

      {loadStatus === 'failed' && (
        <Notice tone="danger">
          {loadError?.message ?? 'Could not load the payments.'}
          <button type="button" onClick={() => dispatch(fetchPaymentsOut({}))} className="ml-2 font-semibold underline underline-offset-4">
            Try again
          </button>
        </Notice>
      )}

      {notice && (
        <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.message}
        </Notice>
      )}

      <section className="overflow-hidden rounded-2xl border border-mint-pale bg-white">
        <div className="space-y-3 border-b border-mint-pale p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v)
                resetPage()
              }}
              placeholder="Search number, supplier, reference, their bill"
              className="sm:w-80"
            />
            <Pagination
              pageIndex={page.pageIndex}
              pageSize={page.pageSize}
              total={filtered.length}
              onPageChange={(pageIndex) => setPagination((p) => ({ ...p, pageIndex }))}
              className="justify-between sm:ml-auto sm:justify-end"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <DateRangeFilter
              value={range}
              onChange={(r) => {
                setRange(r)
                resetPage()
              }}
            />
            <SearchSelect
              aria-label="Filter by supplier"
              placeholder="Select supplier"
              clearable
              limit={10}
              options={supplierOptions}
              value={supplierId}
              onChange={(v) => {
                setSupplierId(v)
                resetPage()
              }}
            />
            <SearchSelect
              aria-label="Filter by status"
              placeholder="Select status"
              clearable
              searchable={false}
              options={PAYMENT_OUT_STATUSES.map(({ value, label }) => ({ value, label }))}
              value={status}
              onChange={(v) => {
                setStatus(v)
                resetPage()
              }}
            />
            <FiltersPopover
              filters={filters}
              onApply={(f) => {
                setFilters(f)
                resetPage()
              }}
              columns={PAYMENT_OUT_COLUMN_OPTIONS}
              visibility={columnVisibility}
              onVisibilityChange={setColumnVisibility}
              renderFilters={(draft, setDraft) => (
                <SelectField
                  id="flt-method"
                  label="Paid by"
                  placeholder="Any"
                  clearable
                  searchable={false}
                  options={PAYMENT_OUT_METHODS}
                  value={draft.method}
                  onChange={(v) => setDraft('method', v)}
                />
              )}
            />
          </div>
        </div>

        {loadStatus === 'loading' && !payments.length ? (
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
            empty={empty}
          />
        )}
      </section>

      {/* ── recording one ───────────────────────────────────────────── */}
      <FormDrawer
        open={Boolean(drawer)}
        onOpenChange={(open) => !open && setDrawer(null)}
        title={drawer?.editingId ? 'Edit payment out' : 'Create Payment Out'}
        description="Money paid to a supplier. It stays pending until the office approves it — approving is what puts it on the books."
        onSubmit={save}
        saving={saving}
        saveLabel={drawer?.editingId ? 'Save changes' : 'Record payment'}
      >
        {drawer && (
          <div className="space-y-4">
            <TextField
              id="out-number"
              label="Payment number"
              size="md"
              placeholder="POUT/26-27/0001"
              maxLength={40}
              value={drawer.form.number}
              onChange={(e) => set('number', e.target.value)}
              error={drawer.errors.number}
            />

            <div className="space-y-1.5">
              <label htmlFor="out-supplier" className="text-sm font-semibold text-ink">
                Supplier <span className="text-destructive">*</span>
              </label>
              <SearchSelect
                id="out-supplier"
                aria-label="Supplier"
                placeholder="Enter supplier name"
                limit={10}
                options={supplierOptions}
                value={drawer.form.supplierId}
                onChange={(v) => set('supplierId', v)}
                invalid={Boolean(drawer.errors.supplierId)}
              />
              {drawer.errors.supplierId && <p className="text-xs font-medium text-destructive">{drawer.errors.supplierId}</p>}
              {/* The firm may not be on the books yet, and walking off to add
                  it would lose the payment being written. */}
              <button
                type="button"
                id="out-new-supplier"
                onClick={() => setNewSupplier({ errors: {}, form: emptySupplierForm() })}
                className="inline-flex items-center gap-1 text-xs font-semibold text-green-deep hover:underline"
              >
                <UserPlus className="size-3.5" /> New supplier
              </button>
              {chosenSupplier?.gstin && <p className="text-xs text-ink-muted">GSTIN {chosenSupplier.gstin}</p>}
            </div>

            <TextField
              id="out-at"
              label="Date paid"
              required
              size="md"
              type="date"
              value={drawer.form.at}
              onChange={(e) => set('at', e.target.value)}
              error={drawer.errors.at}
            />

            <TextField
              id="out-amount"
              label="Amount paid"
              required
              size="md"
              prefix="₹"
              inputMode="decimal"
              placeholder="0.00"
              value={drawer.form.amount}
              onChange={(e) => set('amount', e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
              error={drawer.errors.amount}
            />

            <SelectField
              id="out-method"
              label="Paid by"
              searchable={false}
              options={PAYMENT_OUT_METHODS}
              value={drawer.form.method}
              onChange={(v) => set('method', v)}
            />

            <TextField
              id="out-reference"
              label={drawer.form.method === 'CHEQUE' ? 'Cheque number' : 'Reference'}
              size="md"
              placeholder={drawer.form.method === 'CHEQUE' ? '004321' : 'UTR / transaction id'}
              maxLength={60}
              value={drawer.form.reference}
              onChange={(e) => set('reference', e.target.value)}
              error={drawer.errors.reference}
            />

            {/* A cheque is dated for a day, and that day is not always today. */}
            {drawer.form.method === 'CHEQUE' && (
              <TextField
                id="out-cheque-date"
                label="Cheque dated"
                size="md"
                type="date"
                value={drawer.form.chequeDate}
                onChange={(e) => set('chequeDate', e.target.value)}
                error={drawer.errors.chequeDate}
              />
            )}

            <TextField
              id="out-bill-ref"
              label="Their bill number"
              size="md"
              placeholder="The number on the supplier's bill"
              maxLength={60}
              value={drawer.form.billRef}
              onChange={(e) => set('billRef', e.target.value)}
              error={drawer.errors.billRef}
            />
            <p className="-mt-2 text-xs text-ink-muted">
              Typed off the paper. Supplier bills are not entered in the system yet, so there is nothing to pick from.
            </p>

            <TextAreaField
              id="out-comment"
              label="Comment"
              rows={2}
              maxLength={240}
              placeholder="Anything to note"
              value={drawer.form.comment}
              onChange={(e) => set('comment', e.target.value)}
              error={drawer.errors.comment}
            />
          </div>
        )}
      </FormDrawer>

      {/* ── a supplier who is not on the books yet ──────────────────── */}
      <FormDrawer
        open={Boolean(newSupplier)}
        onOpenChange={(open) => !open && setNewSupplier(null)}
        title="New supplier"
        description="Added here and put straight onto this payment."
        onSubmit={saveNewSupplier}
        saving={savingSupplier}
        saveLabel="Add supplier"
      >
        {newSupplier && (
          <div className="space-y-4">
            {(
              [
                ['name', 'Supplier name', 'e.g. Ganga Pharma Chemicals', true, 80],
                ['contactPerson', 'Contact person', 'Who to ask for', false, 60],
                ['mobile', 'Mobile', '98220 11450', false, 10],
                ['email', 'Email', 'Optional', false, 120],
                ['gstin', 'GSTIN', '09ABCDE1234F1Z5', false, 15],
                ['drugLicence', 'Drug licence', 'Optional', false, 40],
                ['state', 'State', 'Uttar Pradesh', false, 30],
                ['pincode', 'Pin code', '201007', false, 6],
              ]
            ).map(([field, label, placeholder, required, maxLength]) => (
              <TextField
                key={field}
                id={`sup-${field}`}
                label={label}
                required={required}
                size="md"
                placeholder={placeholder}
                maxLength={maxLength}
                value={newSupplier.form[field]}
                onChange={(e) =>
                  setNewSupplier((d) => ({
                    ...d,
                    form: { ...d.form, [field]: field === 'mobile' || field === 'pincode' ? e.target.value.replace(/\D/g, '') : e.target.value },
                    errors: { ...d.errors, [field]: undefined },
                  }))
                }
                error={newSupplier.errors[field]}
              />
            ))}
            <TextAreaField
              id="sup-address"
              label="Address"
              rows={2}
              maxLength={240}
              value={newSupplier.form.address}
              onChange={(e) => setNewSupplier((d) => ({ ...d, form: { ...d.form, address: e.target.value } }))}
            />
          </div>
        )}
      </FormDrawer>

      {/* ── approving moves the books, so it asks first ─────────────── */}
      <Modal
        open={Boolean(deciding)}
        onOpenChange={(open) => !open && setDeciding(null)}
        title={deciding?.next === 'APPROVED' ? 'Approve this payment?' : `Mark it ${STATUS_LABEL[deciding?.next ?? 'PENDING'].toLowerCase()}?`}
        description={
          deciding?.next === 'APPROVED'
            ? 'The money goes onto the books as paid. An approved payment cannot be changed or deleted until it is rejected again.'
            : 'The money comes back off the books until somebody approves it again.'
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setDeciding(null)}>
              Cancel
            </Button>
            <Button onClick={decide}>{deciding?.next === 'APPROVED' ? 'Yes, approve it' : 'Yes, do it'}</Button>
          </>
        }
      >
        {deciding && (
          <p className="text-sm text-ink-muted">
            {deciding.payment.number} — <span className="font-semibold text-black">{formatINR(deciding.payment.amount)}</span> to{' '}
            {deciding.payment.supplierName}.
          </p>
        )}
      </Modal>
    </div>
  )
}
