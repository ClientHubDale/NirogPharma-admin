import { useEffect, useMemo, useState } from 'react'
import { Truck } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { Modal } from '@/components/common/Modal'
import { useToast } from '@/components/common/Toast'
import { DataTable } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { FormDrawer } from '@/components/data/FormDrawer'
import { Notice } from '@/components/data/Notice'
import { PageHeader } from '@/components/data/PageHeader'
import { Pagination } from '@/components/data/Pagination'
import { SearchInput } from '@/components/data/SearchInput'
import { SearchSelect } from '@/components/form/SearchSelect'
import { fetchDistributors, selectDistributors } from '@/store/distributorsSlice'
import {
  fetchBatches,
  fetchDistributorStock,
  returnStock,
  selectBatches,
  selectDistributorStock,
  selectDistributorStockStatus,
  selectStockError,
} from '@/store/stockSlice'
import { buildHoldingColumns } from './components/HoldingsTable'
import { MoveForm } from '../components/MoveForm'
import { currentPeriod, emptyMoveForm, fiscalYearOptions, FY_MONTHS, periodFor, validateMoveForm } from '../stockModel'

const PAGE_SIZE = 20

const FIELD_IDS = { distributorId: 'move-distributor', batchId: 'move-batch', quantity: 'move-quantity', at: 'move-date' }

/**
 * What each distributor is holding — the same ledger as Factory Stocks, seen
 * from the other end. Nothing here is typed twice: a row exists because stock
 * was issued on the factory screen, and a return sends it straight back.
 */
export default function DistributorStocks() {
  const dispatch = useDispatch()
  const toast = useToast()
  const rows = useSelector(selectDistributorStock)
  const loadStatus = useSelector(selectDistributorStockStatus)
  const loadError = useSelector(selectStockError)
  const distributors = useSelector(selectDistributors)
  const batches = useSelector(selectBatches)

  const [search, setSearch] = useState('')
  const [distributorId, setDistributorId] = useState('')
  // The same books as the factory screen: 1 April to 31 March.
  const [period, setPeriod] = useState(currentPeriod)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })
  const [returning, setReturning] = useState(null) // { form, errors, row }
  const [saving, setSaving] = useState(false)

  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }))
  const load = () => dispatch(fetchDistributorStock(periodFor(period)))

  useEffect(() => {
    dispatch(fetchDistributorStock(periodFor(period)))
    dispatch(fetchDistributors())
    dispatch(fetchBatches({}))
  }, [dispatch, period])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(
      (row) =>
        (!q ||
          row.itemName.toLowerCase().includes(q) ||
          row.itemCode?.toLowerCase().includes(q) ||
          row.batchNo.toLowerCase().includes(q) ||
          row.distributorName.toLowerCase().includes(q)) &&
        (!distributorId || row.distributorId === distributorId),
    )
  }, [rows, search, distributorId])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize))
  const page = pagination.pageIndex < pageCount ? pagination : { ...pagination, pageIndex: 0 }

  const totalHeld = useMemo(() => filtered.reduce((sum, row) => sum + Number(row.held), 0), [filtered])

  const columns = useMemo(() => buildHoldingColumns({ onReturn: (row) => openReturn(row) }), [])

  // Which bills this batch reached them on. The row shows the latest; this is
  // the rest of them — "किस इनवाइस का कितना स्टॉक है".
  const [bills, setBills] = useState(null)

  // Save only lights up once there is something to save.
  const changed = returning && JSON.stringify(returning.form) !== JSON.stringify(returning.initial)

  const openReturn = (row) => {
    const form = emptyMoveForm({ distributorId: row.distributorId, batchId: row.batchId })
    setReturning({ form, initial: form, errors: {}, row })
  }

  const setField = (field, value) =>
    setReturning((state) => ({ ...state, form: { ...state.form, [field]: value }, errors: { ...state.errors, [field]: undefined } }))

  const confirmReturn = async () => {
    const found = validateMoveForm(returning.form, returning.row.held)
    if (Object.keys(found).length) {
      setReturning((state) => ({ ...state, errors: found }))
      document.getElementById(FIELD_IDS[Object.keys(found)[0]])?.focus()
      return
    }

    setSaving(true)
    const result = await dispatch(returnStock(returning.form))
    setSaving(false)

    if (returnStock.rejected.match(result)) {
      const { message, details } = result.payload
      if (details) setReturning((state) => ({ ...state, errors: { ...state.errors, ...details } }))
      return toast({ tone: 'danger', title: 'Could not record the return', description: message })
    }

    const { quantity } = returning.form
    const { row } = returning
    setReturning(null)
    load()
    toast({
      tone: 'success',
      title: 'Return recorded',
      description: `${quantity} ${row.unit} of ${row.batchNo} back from ${row.distributorName}`,
    })
  }

  const batchOptions = batches.map((batch) => ({
    value: batch.id,
    label: `${batch.itemName} · ${batch.batchNo}`,
    hint: `${batch.available} ${batch.unit} in the factory`,
  }))

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Distributor Stocks"
        subtitle={`${filtered.length} ${filtered.length === 1 ? 'holding' : 'holdings'} · ${totalHeld.toLocaleString('en-IN')} in all`}
      />

      {loadStatus === 'failed' && (
        <Notice tone="danger">
          {loadError?.message ?? 'Could not load what the distributors hold.'}
          <button type="button" onClick={load} className="ml-2 font-semibold underline underline-offset-4">
            Try again
          </button>
        </Notice>
      )}

      <section className="overflow-hidden rounded-2xl border border-mint-pale bg-white">
        <div className="flex flex-col gap-3 border-b border-mint-pale p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v)
              resetPage()
            }}
            placeholder="Search distributor, item or batch"
            className="sm:w-72"
          />
          <SearchSelect
            aria-label="Filter by distributor"
            placeholder="Select distributor"
            clearable
            limit={10}
            options={distributors.map((row) => ({ value: row.id, label: row.name, hint: row.city || row.mobile }))}
            value={distributorId}
            onChange={(v) => {
              setDistributorId(v)
              resetPage()
            }}
            className="sm:w-56"
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

        {loadStatus === 'loading' && !rows.length ? (
          <div className="grid min-h-60 place-items-center" role="status" aria-label="Loading distributor stock">
            <span className="size-8 animate-spin rounded-full border-3 border-mint border-t-green-deep" />
          </div>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            getRowId={(row) => row.id}
            onRowClick={(row) => setBills(row)}
            pagination={page}
            onPaginationChange={setPagination}
            empty={
              <EmptyState
                icon={Truck}
                title={search || distributorId ? 'No holdings match' : 'No stock with distributors yet'}
                description="Issue stock from a batch on Factory Stocks and it appears here, against the distributor who took it."
              />
            }
          />
        )}
      </section>

      <Modal
        open={Boolean(bills)}
        onOpenChange={(open) => !open && setBills(null)}
        title={bills ? `${bills.itemName} · ${bills.batchNo}` : ''}
        description={bills ? `Every bill this batch reached ${bills.distributorName} on, newest first.` : ''}
        className="max-w-xl"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mint-pale text-left text-xs font-semibold tracking-wide text-ink-muted uppercase">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Invoice</th>
              <th className="py-2 pr-3 text-right">Issued</th>
              <th className="py-2 text-right">Returned</th>
            </tr>
          </thead>
          <tbody>
            {bills?.invoices.map((bill, index) => (
              <tr key={`${bill.invoiceNo}-${bill.at}-${index}`} className="border-b border-mint-pale/70 last:border-0">
                <td className="py-2.5 pr-3 whitespace-nowrap">{bill.at}</td>
                <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-black">{bill.invoiceNo || '—'}</td>
                <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-green-deep">{bill.issued || '—'}</td>
                <td className="py-2.5 text-right font-mono tabular-nums text-ink-muted">{bill.returned || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>

      <FormDrawer
        open={Boolean(returning)}
        onOpenChange={(open) => !open && setReturning(null)}
        title="Record a return"
        description={returning ? `${returning.row.distributorName} · ${returning.row.batchNo}` : ''}
        onSubmit={confirmReturn}
        saving={saving}
        saveDisabled={!changed}
        saveHint="Enter how much is coming back first"
        saveLabel="Record return"
      >
        {returning && (
          <MoveForm
            direction="RETURN"
            holding={returning.row}
            form={returning.form}
            errors={returning.errors}
            distributors={distributors}
            batches={batchOptions}
            available={returning.row.held}
            unit={returning.row.unit}
            onChange={setField}
          />
        )}
      </FormDrawer>
    </div>
  )
}
