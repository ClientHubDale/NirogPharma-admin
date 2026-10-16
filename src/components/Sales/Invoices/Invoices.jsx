import { useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, FileText, Plus, Settings } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { useToast } from '@/components/common/Toast'
import { DataTable } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ExportMenu } from '@/components/data/ExportMenu'
import { FiltersPopover } from '@/components/data/FiltersPopover'
import { Notice } from '@/components/data/Notice'
import { PageHeader } from '@/components/data/PageHeader'
import { Pagination } from '@/components/data/Pagination'
import { SearchInput } from '@/components/data/SearchInput'
import { DateRangeFilter } from '@/components/form/DateRangeFilter'
import { SearchSelect } from '@/components/form/SearchSelect'
import { SelectField } from '@/components/form/SelectField'
import { Button } from '@/components/ui/button'
import { presetRange } from '@/lib/dateRange'
import { formatINR } from '@/lib/format'
import { buildWorkbook, downloadWorkbook } from '@/lib/xlsx'
import { selectCities, selectRoutes } from '@/store/geographySlice'
import { fetchDistributors, selectDistributors } from '@/store/distributorsSlice'
import {
  fetchInvoices,
  removeInvoice,
  selectInvoices,
  selectInvoicesError,
  selectInvoicesStatus,
  setInvoiceStatus,
} from '@/store/invoicesSlice'
import { selectDocSettings, settingsSaved } from '@/store/transactionsSlice'
import { TransactionSettingsDialog } from '@/components/Transactions/components/TransactionSettingsDialog'
import { buildInvoiceColumns, DEFAULT_INVOICE_VISIBILITY, INVOICE_COLUMN_OPTIONS } from './components/InvoicesTable'
import { INVOICE_STATUSES, STATUS_LABEL } from './invoiceModel'

const PAGE_SIZE = 20
const EMPTY_FILTERS = { routeId: '' }
const getRowId = (invoice) => invoice.id

/**
 * Sales › Sales Invoices — the sales list every other document type uses, on
 * real invoices.
 *
 * Warehouse, party group and Created By are gone from the filters and columns:
 * the client sells to distributors only, out of one factory, under one admin,
 * so each of those said the same thing on every row.
 */
export default function Invoices() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const invoices = useSelector(selectInvoices)
  const loadStatus = useSelector(selectInvoicesStatus)
  const loadError = useSelector(selectInvoicesError)
  const distributors = useSelector(selectDistributors)
  const settings = useSelector(selectDocSettings('SALES_INVOICE'))
  const routes = useSelector(selectRoutes)
  const cities = useSelector(selectCities)

  const [range, setRange] = useState(() => ({ preset: 'thisMonth', ...presetRange('thisMonth') }))
  const [search, setSearch] = useState('')
  const [distributorId, setDistributorId] = useState('')
  const [status, setStatus] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })
  const [columnVisibility, setColumnVisibility] = useState(DEFAULT_INVOICE_VISIBILITY)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notice, setNotice] = useState(location.state?.notice ?? null)
  const [highlightId] = useState(location.state?.highlightId ?? null)

  useEffect(() => {
    dispatch(fetchInvoices({}))
    dispatch(fetchDistributors())
  }, [dispatch])

  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  const routeOptions = useMemo(() => {
    const cityName = Object.fromEntries(cities.map((c) => [c.id, c.name]))
    return routes.map((r) => ({ value: r.id, label: r.name, hint: cityName[r.cityId] }))
  }, [routes, cities])

  const distributorsById = useMemo(() => Object.fromEntries(distributors.map((row) => [row.id, row])), [distributors])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return invoices.filter((invoice) => {
      if (invoice.invoiceDate < range.start || invoice.invoiceDate > range.end) return false
      if (distributorId && invoice.distributorId !== distributorId) return false
      if (status && invoice.status !== status) return false
      if (filters.routeId && distributorsById[invoice.distributorId]?.areaId !== filters.routeId) return false
      if (!q) return true
      return (
        invoice.invoiceNo.toLowerCase().includes(q) ||
        invoice.distributorName.toLowerCase().includes(q) ||
        invoice.note?.toLowerCase().includes(q) ||
        invoice.lines.some((line) => line.itemName.toLowerCase().includes(q))
      )
    })
  }, [invoices, range, distributorId, status, filters, search, distributorsById])

  // A cancelled bill is not money anyone owes, so it stays out of the total.
  const grandTotal = filtered.filter((invoice) => invoice.status !== 'CANCELLED').reduce((sum, invoice) => sum + invoice.total, 0)
  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize))
  const page = pagination.pageIndex < pageCount ? pagination : { ...pagination, pageIndex: pageCount - 1 }
  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }))
  const hasFilters = Boolean(search || distributorId || status || Object.values(filters).some(Boolean))

  const move = async (invoice, next) => {
    const result = await dispatch(setInvoiceStatus({ id: invoice.id, status: next }))
    if (setInvoiceStatus.rejected.match(result)) {
      return toast({ tone: 'danger', title: 'Could not change the status', description: result.payload.message })
    }
    if (next === 'CANCELLED') dispatch(fetchInvoices({}))
    setNotice({
      tone: next === 'CANCELLED' ? 'warning' : 'success',
      message:
        next === 'CANCELLED'
          ? `${invoice.invoiceNo} cancelled. The stock has gone back to the factory.`
          : `${invoice.invoiceNo} marked ${STATUS_LABEL[next].toLowerCase()}.`,
    })
  }

  const destroy = async (invoice) => {
    const result = await dispatch(removeInvoice({ id: invoice.id }))
    if (removeInvoice.rejected.match(result)) {
      return toast({ tone: 'danger', title: 'Could not delete', description: result.payload.message })
    }
    setNotice({ tone: 'success', message: `${invoice.invoiceNo} deleted.` })
  }

  const columns = useMemo(
    () =>
      buildInvoiceColumns({
        onEdit: (invoice) => navigate(`/admin/sales/invoices/${invoice.id}/edit`),
        onSetStatus: move,
        onDelete: destroy,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate],
  )

  const exportExcel = async () => {
    const workbook = await buildWorkbook({
      sheetName: 'Sales Invoices',
      columns: [
        { key: 'date', header: 'Date', width: 12 },
        { key: 'number', header: 'Invoice No', width: 18, required: true },
        { key: 'party', header: 'Party Name', width: 30, required: true },
        { key: 'gstin', header: 'GSTIN', width: 18 },
        { key: 'items', header: 'Items', width: 8 },
        { key: 'taxable', header: 'Taxable', width: 13, numFmt: '0.00' },
        { key: 'tax', header: 'GST', width: 13, numFmt: '0.00' },
        { key: 'total', header: 'Amount', width: 13, numFmt: '0.00' },
        { key: 'due', header: 'Due On', width: 13 },
        { key: 'status', header: 'Status', width: 12 },
        { key: 'comment', header: 'Comment', width: 30 },
      ],
      rows: filtered.map((invoice) => ({
        date: invoice.invoiceDate.split('-').reverse().join('-'),
        number: invoice.invoiceNo,
        party: invoice.distributorName,
        gstin: invoice.distributorGstin,
        items: invoice.lines.length,
        taxable: invoice.taxableValue,
        tax: invoice.taxAmount,
        total: invoice.total,
        due: invoice.dueDate ? invoice.dueDate.split('-').reverse().join('-') : '',
        status: STATUS_LABEL[invoice.status],
        comment: invoice.note,
      })),
    })
    await downloadWorkbook(workbook, `sales-invoices-${range.start}-to-${range.end}.xlsx`)
    setNotice({ tone: 'success', message: `Exported ${filtered.length} invoice${filtered.length === 1 ? '' : 's'}.` })
  }

  const empty = (
    <EmptyState
      icon={FileText}
      title={hasFilters ? 'No sales invoices match these filters' : 'No sales invoices in this period'}
      description={
        hasFilters
          ? 'Try a different search, or clear the filters.'
          : 'A bill goes to one distributor. Saving records it; issuing takes the stock out of the factory.'
      }
    >
      {hasFilters ? (
        <Button
          variant="outline"
          size="lg"
          onClick={() => {
            setSearch('')
            setDistributorId('')
            setStatus('')
            setFilters(EMPTY_FILTERS)
            resetPage()
          }}
        >
          Clear filters
        </Button>
      ) : (
        <Button size="lg" onClick={() => navigate('/admin/sales/invoices/new')}>
          <Plus data-icon="inline-start" /> Create sales invoice
        </Button>
      )}
    </EmptyState>
  )

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Sales Invoices"
        subtitle={`${filtered.length} sales invoice${filtered.length === 1 ? '' : 's'} in this view`}
      >
        <span className="inline-flex h-11 items-center rounded-lg bg-mint-pale px-3.5 text-sm font-semibold text-forest">
          Total: <span className="ml-1.5 font-mono">{formatINR(grandTotal)}</span>
        </span>
        <Button variant="outline" size="icon-lg" className="size-11" aria-label="Transaction settings" onClick={() => setSettingsOpen(true)}>
          <Settings className="size-4" />
        </Button>
        <ExportMenu
          disabled={!filtered.length}
          options={[{ label: 'Excel', hint: 'Styled .xlsx of the filtered list', icon: FileSpreadsheet, onSelect: exportExcel }]}
        />
        <Button size="lg" className="h-11" onClick={() => navigate('/admin/sales/invoices/new')}>
          <Plus data-icon="inline-start" /> Create sales invoice
        </Button>
      </PageHeader>

      {loadStatus === 'failed' && (
        <Notice tone="danger">
          {loadError?.message ?? 'Could not load the invoices.'}
          <button type="button" onClick={() => dispatch(fetchInvoices({}))} className="ml-2 font-semibold underline underline-offset-4">
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
              placeholder="Search number, party, item"
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
            />
            <SearchSelect
              aria-label="Filter by status"
              placeholder="Select status"
              clearable
              searchable={false}
              options={INVOICE_STATUSES.map(({ value, label }) => ({ value, label }))}
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
              columns={INVOICE_COLUMN_OPTIONS}
              visibility={columnVisibility}
              onVisibilityChange={setColumnVisibility}
              renderFilters={(draft, setDraft) => (
                <SelectField
                  id="flt-route"
                  label="Route"
                  placeholder="Select route"
                  clearable
                  options={routeOptions}
                  value={draft.routeId}
                  onChange={(v) => setDraft('routeId', v)}
                />
              )}
            />
          </div>
        </div>

        {loadStatus === 'loading' && !invoices.length ? (
          <div className="grid min-h-60 place-items-center" role="status" aria-label="Loading invoices">
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
            onRowClick={(invoice) => navigate(`/admin/sales/invoices/${invoice.id}/edit`)}
            highlightRowId={highlightId}
            empty={empty}
          />
        )}
      </section>

      <TransactionSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        noun="sales invoice"
        onSave={(s) => {
          dispatch(settingsSaved({ type: 'SALES_INVOICE', settings: s }))
          setNotice({ tone: 'success', message: 'Sales Invoices settings saved.' })
        }}
      />
    </div>
  )
}
