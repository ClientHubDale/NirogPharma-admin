import { useEffect, useMemo, useState } from 'react'
import { Boxes, Plus } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useToast } from '@/components/common/Toast'
import { DataTable } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { FormDrawer } from '@/components/data/FormDrawer'
import { Notice } from '@/components/data/Notice'
import { PageHeader } from '@/components/data/PageHeader'
import { Pagination } from '@/components/data/Pagination'
import { SearchInput } from '@/components/data/SearchInput'
import { SearchSelect } from '@/components/form/SearchSelect'
import { TextField } from '@/components/form/TextField'
import { Button } from '@/components/ui/button'
import { useItems } from '@/hooks/useItems'
import { INITIAL_CATEGORIES } from '@/mocks/items'
import { fetchDistributors, selectDistributors } from '@/store/distributorsSlice'
import {
  fetchBatches,
  fetchStockSummary,
  issueStock,
  removeBatch,
  saveBatch,
  selectBatches,
  selectBatchesStatus,
  selectStockError,
  selectStockSummary,
} from '@/store/stockSlice'
import { BatchForm } from './components/BatchForm'
import { buildBatchColumns, DEFAULT_BATCH_COLUMN_VISIBILITY } from './components/BatchesTable'
import { MoveForm } from '../components/MoveForm'
import {
  batchToForm,
  currentMonth,
  emptyBatchForm,
  emptyMoveForm,
  EXPIRY_FILTERS,
  validateBatchForm,
  validateMoveForm,
} from '../stockModel'

const PAGE_SIZE = 20

/** Form field → input id, to focus the first invalid field on Save. */
const FIELD_IDS = {
  itemId: 'batch-item',
  batchNo: 'batch-no',
  quantity: 'batch-quantity',
  mfgDate: 'batch-mfg',
  expiryDate: 'batch-expiry',
  receivedAt: 'batch-received',
  distributorId: 'move-distributor',
  batchId: 'move-batch',
  at: 'move-date',
}

/**
 * What the factory holds, batch by batch, as the client asked on 8 Oct.
 *
 * Every figure comes from the ledger on the server: opening is what the batch
 * held before the period, in and out are what moved during it, closing is what
 * it holds at the end. Issuing to a distributor is one movement, so the other
 * stock screen is the same data seen from the other side.
 */
export default function FactoryStocks() {
  const dispatch = useDispatch()
  const toast = useToast()
  const batches = useSelector(selectBatches)
  const loadStatus = useSelector(selectBatchesStatus)
  const loadError = useSelector(selectStockError)
  const summary = useSelector(selectStockSummary)
  const distributors = useSelector(selectDistributors)
  const items = useItems()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [expiry, setExpiry] = useState('')
  const [period, setPeriod] = useState(currentMonth)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })
  const [columnVisibility, setColumnVisibility] = useState(DEFAULT_BATCH_COLUMN_VISIBILITY)
  const [drawer, setDrawer] = useState(null) // { form, initial, errors, editingId, batch }
  const [issuing, setIssuing] = useState(null) // { form, errors, batch }
  const [saving, setSaving] = useState(false)

  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }))

  // The period is part of the request: the server works the four figures out.
  const load = () => dispatch(fetchBatches({ from: period.from, to: period.to }))

  useEffect(() => {
    dispatch(fetchBatches({ from: period.from, to: period.to }))
    dispatch(fetchStockSummary())
    dispatch(fetchDistributors())
  }, [dispatch, period.from, period.to])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return batches.filter(
      (batch) =>
        (!q ||
          batch.itemName.toLowerCase().includes(q) ||
          batch.itemCode?.toLowerCase().includes(q) ||
          batch.batchNo.toLowerCase().includes(q)) &&
        (!category || batch.category === category) &&
        (!expiry || batch.expiryState === expiry),
    )
  }, [batches, search, category, expiry])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize))
  const page = pagination.pageIndex < pageCount ? pagination : { ...pagination, pageIndex: 0 }

  const categoryOptions = useMemo(() => {
    const all = [...INITIAL_CATEGORIES, ...batches.map((batch) => batch.category)]
    return [...new Set(all.filter(Boolean))].sort((a, b) => a.localeCompare(b)).map((name) => ({ value: name, label: name }))
  }, [batches])

  const columns = useMemo(
    () =>
      buildBatchColumns({
        onEdit: (batch) => openEdit(batch),
        onIssue: (batch) => openIssue(batch),
        onDelete: (batch) => destroy(batch),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  /* ── the batch drawer ─────────────────────────────────── */

  const openCreate = () => {
    const form = emptyBatchForm()
    setDrawer({ form, initial: form, errors: {}, editingId: null, batch: null })
  }

  const openEdit = (batch) => {
    const form = batchToForm(batch)
    setDrawer({ form, initial: form, errors: {}, editingId: batch.id, batch })
  }

  const updateField = (field, value) =>
    setDrawer((d) => ({ ...d, form: { ...d.form, [field]: value }, errors: { ...d.errors, [field]: undefined } }))

  const save = async () => {
    const found = validateBatchForm(drawer.form)
    if (Object.keys(found).length) {
      setDrawer((d) => ({ ...d, errors: found }))
      document.getElementById(FIELD_IDS[Object.keys(found)[0]])?.focus()
      return
    }

    setSaving(true)
    const result = await dispatch(saveBatch({ id: drawer.editingId, form: drawer.form }))
    setSaving(false)

    if (saveBatch.rejected.match(result)) {
      const { message, details } = result.payload
      if (details) setDrawer((d) => ({ ...d, errors: { ...d.errors, ...details } }))
      return toast({ tone: 'danger', title: drawer.editingId ? 'Could not save' : 'Could not add', description: message })
    }

    setDrawer(null)
    load()
    dispatch(fetchStockSummary())
    toast({
      tone: 'success',
      title: drawer.editingId ? 'Batch saved' : 'Batch added',
      description: `${result.payload.batch.itemName} · ${result.payload.batch.batchNo}`,
    })
  }

  const destroy = async (batch) => {
    const result = await dispatch(removeBatch({ id: batch.id }))
    if (removeBatch.rejected.match(result)) {
      return toast({ tone: 'danger', title: 'Could not delete', description: result.payload.message })
    }
    load()
    dispatch(fetchStockSummary())
    toast({ title: 'Batch deleted', description: `${batch.itemName} · ${batch.batchNo}` })
  }

  /* ── issuing to a distributor ─────────────────────────── */

  const openIssue = (batch) => setIssuing({ form: emptyMoveForm({ batchId: batch.id }), errors: {}, batch })

  const issueField = (field, value) =>
    setIssuing((state) => ({ ...state, form: { ...state.form, [field]: value }, errors: { ...state.errors, [field]: undefined } }))

  const confirmIssue = async () => {
    const found = validateMoveForm(issuing.form, issuing.batch.available)
    if (Object.keys(found).length) {
      setIssuing((state) => ({ ...state, errors: found }))
      document.getElementById(FIELD_IDS[Object.keys(found)[0]])?.focus()
      return
    }

    setSaving(true)
    const result = await dispatch(issueStock(issuing.form))
    setSaving(false)

    if (issueStock.rejected.match(result)) {
      const { message, details } = result.payload
      if (details) setIssuing((state) => ({ ...state, errors: { ...state.errors, ...details } }))
      return toast({ tone: 'danger', title: 'Could not issue', description: message })
    }

    const to = distributors.find((row) => row.id === issuing.form.distributorId)
    setIssuing(null)
    load()
    dispatch(fetchStockSummary())
    toast({
      tone: 'success',
      title: 'Stock issued',
      description: `${issuing.form.quantity} ${issuing.batch.unit} of ${issuing.batch.batchNo} → ${to?.name ?? 'distributor'}`,
    })
  }

  const batchOptions = batches.map((batch) => ({
    value: batch.id,
    label: `${batch.itemName} · ${batch.batchNo}`,
    hint: `${batch.available} ${batch.unit} in stock`,
  }))

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title="Factory Stocks" subtitle={`${summary.batches} ${summary.batches === 1 ? 'batch' : 'batches'} in the factory`}>
        <Button size="lg" className="h-11" onClick={openCreate}>
          <Plus data-icon="inline-start" /> New
        </Button>
      </PageHeader>

      {loadStatus === 'failed' && (
        <Notice tone="danger">
          {loadError?.message ?? 'Could not load the stock.'}
          <button type="button" onClick={load} className="ml-2 font-semibold underline underline-offset-4">
            Try again
          </button>
        </Notice>
      )}

      {/* What is in the factory at a glance — the client asks for expiry first. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Batches', value: summary.batches },
          { label: 'In stock', value: summary.quantity.toLocaleString('en-IN') },
          { label: 'Expired', value: summary.expired, tone: summary.expired ? 'text-danger' : '' },
          { label: 'Expiring in 90 days', value: summary.expiring, tone: summary.expiring ? 'text-warning' : '' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-mint-pale bg-white p-4">
            <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{card.label}</p>
            <p className={`mt-1 font-mono text-2xl font-bold tabular-nums ${card.tone || 'text-black'}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-mint-pale bg-white">
        <div className="flex flex-col gap-3 border-b border-mint-pale p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v)
              resetPage()
            }}
            placeholder="Search item, code or batch"
            className="sm:w-64"
          />
          <SearchSelect
            aria-label="Filter by category"
            placeholder="Select category"
            clearable
            options={categoryOptions}
            value={category}
            onChange={(v) => {
              setCategory(v)
              resetPage()
            }}
            className="sm:w-44"
          />
          <SearchSelect
            aria-label="Filter by expiry"
            placeholder="Any expiry"
            searchable={false}
            clearable
            options={EXPIRY_FILTERS}
            value={expiry}
            onChange={(v) => {
              setExpiry(v)
              resetPage()
            }}
            className="sm:w-48"
          />
          <div className="flex items-center gap-2">
            <TextField
              id="stock-from"
              aria-label="Period from"
              size="md"
              type="date"
              value={period.from}
              onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))}
              className="w-40"
            />
            <span className="text-sm text-ink-muted">to</span>
            <TextField
              id="stock-to"
              aria-label="Period to"
              size="md"
              type="date"
              value={period.to}
              onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))}
              className="w-40"
            />
          </div>
          <Pagination
            pageIndex={page.pageIndex}
            pageSize={page.pageSize}
            total={filtered.length}
            onPageChange={(pageIndex) => setPagination((p) => ({ ...p, pageIndex }))}
            className="justify-between sm:ml-auto sm:justify-end"
          />
        </div>

        {loadStatus === 'loading' && !batches.length ? (
          <div className="grid min-h-60 place-items-center" role="status" aria-label="Loading stock">
            <span className="size-8 animate-spin rounded-full border-3 border-mint border-t-green-deep" />
          </div>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            getRowId={(batch) => batch.id}
            pagination={page}
            onPaginationChange={setPagination}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            onRowClick={openEdit}
            empty={
              <EmptyState
                icon={Boxes}
                title={search || category || expiry ? 'No batches match' : 'No stock yet'}
                description="A batch is one production run: a number, a quantity, and the dates on the carton."
              >
                <Button size="lg" onClick={openCreate}>
                  <Plus data-icon="inline-start" /> New batch
                </Button>
              </EmptyState>
            }
          />
        )}
      </section>

      <FormDrawer
        open={Boolean(drawer)}
        onOpenChange={(open) => !open && setDrawer(null)}
        title={drawer?.editingId ? 'Edit batch' : 'New batch'}
        description={drawer?.editingId ? `${drawer.batch?.itemName} · ${drawer.batch?.batchNo}` : 'Fields marked * are required.'}
        onSubmit={save}
        saving={saving}
        saveLabel={drawer?.editingId ? 'Save changes' : 'Save'}
      >
        {drawer && <BatchForm form={drawer.form} errors={drawer.errors} items={items} onChange={updateField} editing={drawer.batch} />}
      </FormDrawer>

      <FormDrawer
        open={Boolean(issuing)}
        onOpenChange={(open) => !open && setIssuing(null)}
        title="Issue stock"
        description={issuing ? `${issuing.batch.itemName} · ${issuing.batch.batchNo}` : ''}
        onSubmit={confirmIssue}
        saving={saving}
        saveLabel="Issue"
      >
        {issuing && (
          <MoveForm
            form={issuing.form}
            errors={issuing.errors}
            distributors={distributors}
            batches={batchOptions}
            available={issuing.batch.available}
            unit={issuing.batch.unit}
            onChange={issueField}
          />
        )}
      </FormDrawer>
    </div>
  )
}
