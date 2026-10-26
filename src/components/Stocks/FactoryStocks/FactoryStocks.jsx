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
import { Modal } from '@/components/common/Modal'
import { PhotoViewer } from '@/components/common/PhotoViewer'
import { StatusPill } from '@/components/data/StatusPill'
import { SearchSelect } from '@/components/form/SearchSelect'
import { Button } from '@/components/ui/button'
import { useItems } from '@/hooks/useItems'
import { INITIAL_CATEGORIES } from '@/mocks/items'
import { fetchDistributors, selectDistributors } from '@/store/distributorsSlice'
import { fetchSettings, selectStockSettings } from '@/store/settingsSlice'
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
import { IssueForm } from '../components/IssueForm'
import * as stockService from '@/services/stockService'
import {
  batchToForm,
  currentPeriod,
  emptyBatchForm,
  emptyIssueForm,
  EXPIRY_FILTERS,
  EXPIRY_TONE,
  fiscalYearLabel,
  fiscalYearOptions,
  FY_MONTHS,
  periodFor,
  validateBatchForm,
  validateIssueForm,
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
  // When the factory figure starts shouting — "फैक्ट्री के सौ कर दो".
  const lowAt = useSelector(selectStockSettings).lowFactory

  // The product photo, opened larger: "जहाँ भी आप क्लिक करोगे वो आइटम पे, तो
  // बड़े स्केल में दिखेगा".
  const [photo, setPhoto] = useState(null)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [expiry, setExpiry] = useState('')
  // The books run 1 April to 31 March, so the period is a year and a month —
  // not a free date range. Inside a month, last month's closing is the opening;
  // across a whole year, last year's closing is.
  const [period, setPeriod] = useState(currentPeriod)
  const [expanded, setExpanded] = useState(() => new Set()) // items whose batches are open
  const [history, setHistory] = useState(null) // { item, batches, loading }
  const [ledger, setLedger] = useState(null) // { batch, movements, loading }
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })
  const [columnVisibility, setColumnVisibility] = useState(DEFAULT_BATCH_COLUMN_VISIBILITY)
  const [drawer, setDrawer] = useState(null) // { form, initial, errors, editingId, batch }
  const [issuing, setIssuing] = useState(null) // { form, errors, batch }
  const [saving, setSaving] = useState(false)

  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }))

  // Nothing typed yet, nothing to save: the button stays dark until the form
  // differs from the one that opened.
  const changed = (state) => Boolean(state) && JSON.stringify(state.form) !== JSON.stringify(state.initial)

  // The period is part of the request: the server works the four figures out.
  const load = () => dispatch(fetchBatches(periodFor(period)))

  useEffect(() => {
    const { from, to } = periodFor(period)
    dispatch(fetchBatches({ from, to }))
    dispatch(fetchStockSummary())
    dispatch(fetchDistributors())
    dispatch(fetchSettings())
  }, [dispatch, period])

  /**
   * One line per item, carrying that item's figures for the period, with its
   * batches gathered underneath — the client's "आइटम कैटेगरी यूनिट सिंगल लाइन,
   * बैच मल्टिपल".
   *
   * A batch with nothing left in it drops off: "फिनिश की जगह यहाँ पर दिखना ही
   * नहीं चाहिए… 10 साल में हजारों बैच हो जायेंगे". Its movements still count
   * towards the item's figures — the four columns are the period's accounting
   * and have to add up — but it is no longer one of the lines you can open.
   */
  const itemRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const byItem = new Map()

    for (const batch of batches) {
      const row = byItem.get(batch.itemId) ?? {
        kind: 'item',
        id: `item:${batch.itemId}`,
        itemId: batch.itemId,
        itemName: batch.itemName,
        itemCode: batch.itemCode,
        itemImage: batch.itemImage,
        category: batch.category,
        unit: batch.unit,
        opening: 0,
        in: 0,
        out: 0,
        returned: 0,
        closing: 0,
        batches: [],
      }

      row.opening += batch.opening
      row.in += batch.in
      row.out += batch.out
      row.returned += batch.returned
      row.closing += batch.closing
      // Only what is still in the factory gets a line of its own.
      if (batch.closing > 0) row.batches.push({ ...batch, kind: 'batch', id: `batch:${batch.id}`, batchId: batch.id })
      byItem.set(batch.itemId, row)
    }

    return [...byItem.values()]
      .filter((row) => row.closing > 0 || row.in > 0 || row.out > 0)
      .filter(
        (row) =>
          (!q ||
            row.itemName.toLowerCase().includes(q) ||
            row.itemCode?.toLowerCase().includes(q) ||
            row.batches.some((batch) => batch.batchNo.toLowerCase().includes(q))) &&
          (!category || row.category === category) &&
          (!expiry || row.batches.some((batch) => batch.expiryState === expiry)),
      )
      .sort((a, b) => a.itemName.localeCompare(b.itemName))
  }, [batches, search, category, expiry])

  /** Item lines, each followed by its batch lines when it is open. */
  const filtered = useMemo(
    () => itemRows.flatMap((row) => (expanded.has(row.itemId) ? [row, ...row.batches] : [row])),
    [itemRows, expanded],
  )

  const toggle = (itemId) =>
    setExpanded((open) => {
      const next = new Set(open)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize))
  const page = pagination.pageIndex < pageCount ? pagination : { ...pagination, pageIndex: 0 }

  /** "October 2026–27" or "2026–27" — what the filters are currently showing. */
  const periodLabel =
    period.month === ''
      ? fiscalYearLabel(Number(period.year))
      : `${FY_MONTHS.find((m) => m.value === period.month)?.label} ${fiscalYearLabel(Number(period.year))}`

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
        onItemHistory: (row) => openHistory(row),
        onLedger: (batch) => openLedger(batch),
        onItemImage: (entry) => setPhoto(entry),
        expanded,
        onToggle: toggle,
        lowAt,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expanded, lowAt],
  )

  /** Every batch of one item for the whole financial year — "1 अप्रैल से अभी तक". */
  const openHistory = async (batch) => {
    const year = periodFor({ year: period.year, month: '' })
    setHistory({ item: batch, batches: [], loading: true })
    try {
      const { batches: rows } = await stockService.listBatches({ itemId: batch.itemId, ...year })
      setHistory({ item: batch, batches: rows, loading: false })
    } catch {
      setHistory({ item: batch, batches: [], loading: false })
    }
  }

  /* ── the batch drawer ─────────────────────────────────── */

  const openCreate = () => {
    const form = emptyBatchForm()
    setDrawer({ form, initial: form, errors: {}, editingId: null, batch: null })
  }

  const openEdit = (batch) => {
    const form = batchToForm(batch)
    setDrawer({ form, initial: form, errors: {}, editingId: batch.batchId ?? batch.id, batch })
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
    const result = await dispatch(removeBatch({ id: batch.batchId ?? batch.id }))
    if (removeBatch.rejected.match(result)) {
      return toast({ tone: 'danger', title: 'Could not delete', description: result.payload.message })
    }
    load()
    dispatch(fetchStockSummary())
    toast({ title: 'Batch deleted', description: `${batch.itemName} · ${batch.batchNo}` })
  }

  /* ── issuing to a distributor ─────────────────────────── */

  /** One bill, starting from the batch the admin opened it on. */
  const openIssue = (batch) => {
    const form = emptyIssueForm({ lines: [{ batchId: batch?.batchId ?? batch?.id ?? '', quantity: '' }] })
    setIssuing({ form, initial: form, errors: {}, batch })
  }

  const issueField = (field, value) =>
    setIssuing((state) => ({ ...state, form: { ...state.form, [field]: value }, errors: { ...state.errors, [field]: undefined } }))

  const availableOf = (batchId) => batches.find((row) => row.id === batchId)?.available ?? 0
  const unitOf = (batchId) => batches.find((row) => row.id === batchId)?.unit ?? ''

  const confirmIssue = async () => {
    const found = validateIssueForm(issuing.form, availableOf)
    if (Object.keys(found).length) {
      setIssuing((state) => ({ ...state, errors: found }))
      const first = Object.keys(found)[0]
      document.getElementById(first === 'lines' ? `issue-quantity-${found.lines.findIndex(Boolean)}` : FIELD_IDS[first])?.focus()
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
    const lines = issuing.form.lines.filter((line) => line.batchId).length
    const bill = issuing.form.invoiceNo ? ` · ${issuing.form.invoiceNo}` : ''
    setIssuing(null)
    load()
    dispatch(fetchStockSummary())
    toast({
      tone: 'success',
      title: 'Stock issued',
      description: `${lines} ${lines === 1 ? 'batch' : 'batches'} → ${to?.name ?? 'distributor'}${bill}`,
    })
  }

  /** Every go behind one batch's Out figure, with the bill each went on. */
  const openLedger = async (batch) => {
    const id = batch.batchId ?? batch.id
    setLedger({ batch, movements: [], loading: true })
    try {
      const data = await stockService.listBatchMovements(id)
      setLedger({ batch, movements: data.movements, loading: false })
    } catch {
      setLedger({ batch, movements: [], loading: false })
    }
  }

  const batchOptions = batches.map((batch) => ({
    value: batch.id,
    label: `${batch.itemName} · ${batch.batchNo}`,
    hint: `${batch.available} ${batch.unit} in stock`,
  }))

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Factory Stocks"
        subtitle={`${summary.batches} ${summary.batches === 1 ? 'batch' : 'batches'} in the factory · ${periodLabel}`}
      >
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
          <SearchSelect
            aria-label="Financial year"
            placeholder="Year"
            searchable={false}
            options={fiscalYearOptions()}
            value={period.year}
            onChange={(v) => {
              setPeriod((p) => ({ ...p, year: v || p.year }))
              resetPage()
            }}
            className="sm:w-36"
          />
          <SearchSelect
            aria-label="Month"
            placeholder="Whole year"
            searchable={false}
            options={FY_MONTHS}
            value={period.month}
            onChange={(v) => {
              setPeriod((p) => ({ ...p, month: v ?? '' }))
              resetPage()
            }}
            className="sm:w-40"
          />
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
            getRowId={(row) => row.id}
            pagination={page}
            onPaginationChange={setPagination}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            onRowClick={(row) => (row.kind === 'batch' ? openEdit(row) : toggle(row.itemId))}
            empty={
              <EmptyState
                icon={Boxes}
                title={
                  search || category || expiry
                    ? 'No batches match'
                    : summary.batches === 0
                      ? 'No stock yet'
                      : `Nothing in ${periodLabel}`
                }
                description={
                  search || category || expiry
                    ? 'Nothing in this period matches the filters.'
                    : summary.batches === 0
                      ? 'A batch is one production run: a number, a quantity, and the dates on the carton.'
                      : `Nothing was made or moved in ${periodLabel}. The factory holds ${summary.quantity.toLocaleString('en-IN')} across ${summary.batches} ${summary.batches === 1 ? 'batch' : 'batches'} — pick another year or month above to find it.`
                }
              >
                {summary.batches === 0 && (
                  <Button size="lg" onClick={openCreate}>
                    <Plus data-icon="inline-start" /> New batch
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
        title={drawer?.editingId ? 'Edit batch' : 'New batch'}
        description={drawer?.editingId ? `${drawer.batch?.itemName} · ${drawer.batch?.batchNo}` : 'Fields marked * are required.'}
        onSubmit={save}
        saving={saving}
        saveDisabled={!changed(drawer)}
        saveHint={drawer?.editingId ? 'Change something first' : 'Fill the batch in first'}
        saveLabel={drawer?.editingId ? 'Save changes' : 'Save'}
      >
        {drawer && <BatchForm form={drawer.form} errors={drawer.errors} items={items} onChange={updateField} />}
      </FormDrawer>

      {/* The product photo on the whole screen, zoomable. */}
      <PhotoViewer
        open={Boolean(photo)}
        src={photo?.itemImage}
        title={photo?.itemName ?? ''}
        subtitle={photo?.itemCode}
        onClose={() => setPhoto(null)}
      />

      <Modal
        open={Boolean(ledger)}
        onOpenChange={(open) => !open && setLedger(null)}
        title={ledger ? `${ledger.batch.itemName} · ${ledger.batch.batchNo}` : ''}
        description="Every go in and out of this batch, newest first."
        className="max-w-2xl"
      >
        {ledger?.loading ? (
          <div className="grid min-h-40 place-items-center" role="status" aria-label="Loading movements">
            <span className="size-7 animate-spin rounded-full border-3 border-mint border-t-green-deep" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-mint-pale text-left text-xs font-semibold tracking-wide text-ink-muted uppercase">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Invoice</th>
                <th className="py-2 pr-3">Who</th>
                <th className="py-2 text-right">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {ledger?.movements.map((move) => (
                <tr key={move.id} className="border-b border-mint-pale/70 last:border-0">
                  <td className="py-2.5 pr-3 whitespace-nowrap">{move.at}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs">{move.invoiceNo || <span className="text-ink-muted">—</span>}</td>
                  <td className="py-2.5 pr-3">
                    {move.kind === 'IN' ? <span className="text-ink-muted">Produced</span> : move.distributorName || '—'}
                  </td>
                  <td className="py-2.5 text-right font-mono font-semibold tabular-nums">
                    <span className={move.kind === 'OUT' ? 'text-ink' : 'text-green-deep'}>
                      {move.kind === 'OUT' ? '−' : '+'}
                      {move.quantity} {ledger.batch.unit}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>

      <Modal
        open={Boolean(history)}
        onOpenChange={(open) => !open && setHistory(null)}
        title={history ? `${history.item.itemName} — every batch` : ''}
        description={history ? `${fiscalYearLabel(Number(period.year))} · 1 April to 31 March` : ''}
        className="max-w-3xl"
      >
        {history?.loading ? (
          <div className="grid min-h-40 place-items-center" role="status" aria-label="Loading batches">
            <span className="size-7 animate-spin rounded-full border-3 border-mint border-t-green-deep" />
          </div>
        ) : history?.batches.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-ink-muted">No batches of this item in {fiscalYearLabel(Number(period.year))}.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-mint-pale text-left text-xs font-semibold tracking-wide text-ink-muted uppercase">
                <th className="py-2 pr-3">Batch</th>
                <th className="py-2 pr-3">Expiry</th>
                <th className="py-2 pr-3 text-right">Made</th>
                <th className="py-2 pr-3 text-right">Issued</th>
                <th className="py-2 text-right">In stock</th>
              </tr>
            </thead>
            <tbody>
              {history?.batches.map((batch) => (
                <tr key={batch.id} className="border-b border-mint-pale/70 last:border-0">
                  <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-black">{batch.batchNo}</td>
                  <td className="py-2.5 pr-3">
                    {batch.expiryState === 'OK' || batch.expiryState === 'NONE' ? (
                      <span className="text-ink-muted">{batch.expiryDate || '—'}</span>
                    ) : (
                      <StatusPill tone={EXPIRY_TONE[batch.expiryState]}>
                        {batch.expiryState === 'EXPIRED' ? 'Expired' : batch.expiryDate}
                      </StatusPill>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{batch.quantity}</td>
                  <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-ink-muted">{batch.out}</td>
                  <td className="py-2.5 text-right font-mono font-semibold tabular-nums">
                    {batch.available > 0 ? `${batch.available} ${batch.unit}` : <span className="text-ink-muted">finished</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>

      <FormDrawer
        open={Boolean(issuing)}
        onOpenChange={(open) => !open && setIssuing(null)}
        title="Issue stock"
        description={issuing?.batch ? `Starting from ${issuing.batch.itemName} · ${issuing.batch.batchNo}` : 'One bill, as many batches as it carries.'}
        onSubmit={confirmIssue}
        saving={saving}
        saveDisabled={!changed(issuing)}
        saveHint="Choose a distributor and a quantity first"
        saveLabel="Issue"
      >
        {issuing && (
          <IssueForm
            form={issuing.form}
            errors={issuing.errors}
            distributors={distributors}
            batches={batchOptions}
            unitOf={unitOf}
            onChange={issueField}
          />
        )}
      </FormDrawer>
    </div>
  )
}
