import { useEffect, useMemo, useState } from 'react'
import { FileCode2, FileSpreadsheet, Plus, Settings } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
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
import { cn } from '@/lib/utils'
import { formatINR } from '@/lib/format'
import { buildWorkbook, downloadWorkbook } from '@/lib/xlsx'
import { WAREHOUSES } from '@/mocks/items'
import { PARTY_GROUPS } from '@/mocks/parties'
import { selectCities, selectRoutes } from '@/store/geographySlice'
import { selectParties } from '@/store/partiesSlice'
import { docDeleted, docPatched, docRestored, selectDocSettings, selectDocs, settingsSaved } from '@/store/transactionsSlice'
import { TransactionSettingsDialog } from './components/TransactionSettingsDialog'
import { buildTransactionColumns, DEFAULT_TRANSACTION_VISIBILITY, TRANSACTION_COLUMN_OPTIONS } from './components/TransactionsTable'
import { DOC_TYPES } from './docTypes'
import { SALES_USER_OPTIONS, SALES_USERS_BY_ID } from './salesUsers'
import { downloadText, toTallyXml } from './tallyExport'
import { docTotals } from './transactionModel'

const PAGE_SIZE = 20
const getRowId = (d) => d.id
const EMPTY_FILTERS = { routeId: '', warehouseId: '', partyGroup: '' }
const today = () => new Date().toISOString().slice(0, 10)

/** List page shared by every sales document type (Estimates first). */
export default function TransactionListPage({ type }) {
  const config = DOC_TYPES[type]
  const { noun, plural, title, basePath } = config
  const fileSlug = plural.replaceAll(' ', '-')
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const docs = useSelector(selectDocs(type))
  const settings = useSelector(selectDocSettings(type))
  const customers = useSelector(selectParties('CUSTOMER'))
  const suppliers = useSelector(selectParties('SUPPLIER'))
  const routes = useSelector(selectRoutes)
  const cities = useSelector(selectCities)

  const partiesById = useMemo(() => Object.fromEntries([...customers, ...suppliers].map((p) => [p.id, p])), [customers, suppliers])
  const routeOptions = useMemo(() => {
    const cityName = Object.fromEntries(cities.map((c) => [c.id, c.name]))
    return routes.map((r) => ({ value: r.id, label: r.name, hint: cityName[r.cityId] }))
  }, [routes, cities])

  const [range, setRange] = useState(() => ({ preset: 'thisMonth', ...presetRange('thisMonth') }))
  const [search, setSearch] = useState('')
  const [userId, setUserId] = useState('')
  const [status, setStatus] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })
  const [columnVisibility, setColumnVisibility] = useState(config.hiddenColumns ?? DEFAULT_TRANSACTION_VISIBILITY)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notice, setNotice] = useState(location.state?.notice ?? null)
  const [highlightId] = useState(location.state?.highlightId ?? null)

  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  const rows = useMemo(
    () =>
      docs.map((d) => {
        const party = partiesById[d.partyId]
        return { ...d, party, totals: docTotals(d, party), creatorName: SALES_USERS_BY_ID[d.createdBy]?.name ?? '—' }
      }),
    [docs, partiesById],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (r.date < range.start || r.date > range.end) return false
      if (userId && r.createdBy !== userId) return false
      if (status && r.status !== status) return false
      if (filters.routeId && r.party?.routeId !== filters.routeId) return false
      if (filters.warehouseId && r.warehouseId !== filters.warehouseId) return false
      if (filters.partyGroup && r.party?.groupId !== filters.partyGroup) return false
      if (!q) return true
      return r.number.toLowerCase().includes(q) || r.party?.name.toLowerCase().includes(q) || r.comment?.toLowerCase().includes(q) || r.lines.some((l) => l.name.toLowerCase().includes(q))
    })
  }, [rows, range, userId, status, filters, search])

  const grandTotal = filtered.filter((r) => !config.excludedStatuses.includes(r.status)).reduce((s, r) => s + r.totals.total, 0)
  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize))
  const page = pagination.pageIndex < pageCount ? pagination : { ...pagination, pageIndex: pageCount - 1 }
  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }))
  const hasFilters = Boolean(search || userId || status || Object.values(filters).some(Boolean))

  const columns = useMemo(
    () =>
      buildTransactionColumns({
        config,
        convertTargets: config.convertsTo.map((c) => ({ type: c.type, noun: DOC_TYPES[c.type].noun })),
        onEdit: (d) => navigate(`${basePath}/${d.id}/edit`),
        onDuplicate: (d) => navigate(`${basePath}/new`, { state: { duplicateOf: d.id } }),
        onConvert: (d, target) => navigate(`${DOC_TYPES[target].basePath}/new`, { state: { convertFrom: { type, id: d.id } } }),
        onSetStatus: (d, next) => {
          dispatch(docPatched({ type, id: d.id, changes: { status: next } }))
          setNotice({ tone: 'success', message: `${d.number} marked ${config.statuses.find((s) => s.value === next)?.label.toLowerCase()}.` })
        },
        onDelete: (d) => {
          const index = docs.findIndex((x) => x.id === d.id)
          const { party: _p, totals: _t, creatorName: _c, ...raw } = d
          dispatch(docDeleted({ type, id: d.id }))
          setNotice({
            tone: 'success',
            message: `${d.number} deleted.`,
            undo: () => {
              dispatch(docRestored({ type, doc: raw, index }))
              setNotice({ tone: 'success', message: `${d.number} restored.` })
            },
          })
        },
      }),
    [config, basePath, navigate, dispatch, type, docs],
  )

  const exportExcel = async () => {
    const wb = await buildWorkbook({
      sheetName: title,
      columns: [
        { key: 'date', header: 'Date', width: 12 },
        { key: 'number', header: 'Transaction No', width: 18, required: true },
        { key: 'party', header: 'Party Name', width: 30, required: true },
        { key: 'gstin', header: 'GSTIN', width: 18 },
        { key: 'items', header: 'Items', width: 8 },
        { key: 'taxable', header: 'Taxable', width: 13, numFmt: '0.00' },
        { key: 'tax', header: 'GST + Cess', width: 13, numFmt: '0.00' },
        { key: 'total', header: 'Amount', width: 13, numFmt: '0.00' },
        { key: 'status', header: 'Status', width: 11 },
        { key: 'createdBy', header: 'Created By', width: 20 },
        { key: 'comment', header: 'Comment', width: 30 },
      ],
      rows: filtered.map((r) => ({
        date: r.date.split('-').reverse().join('-'),
        number: r.number,
        party: r.party?.name ?? '',
        gstin: r.party?.gstin ?? '',
        items: r.lines.length,
        taxable: r.totals.taxable,
        tax: r.totals.cgst + r.totals.sgst + r.totals.igst + r.totals.cess,
        total: r.totals.total,
        status: config.statuses.find((s) => s.value === r.status)?.label,
        createdBy: r.creatorName,
        comment: r.comment,
      })),
    })
    await downloadWorkbook(`nirog-${fileSlug}-${today()}.xlsx`, wb)
    setNotice({ tone: 'success', message: `Exported ${filtered.length} ${filtered.length === 1 ? noun : plural} to Excel.` })
  }

  const exportTally = () => {
    downloadText(`nirog-${fileSlug}-tally-${today()}.xml`, toTallyXml(filtered, partiesById, config.tally), 'application/xml')
    setNotice({
      tone: 'success',
      message: `Exported ${filtered.length} ${filtered.length === 1 ? noun : plural} for Tally. In Tally: Gateway › Import › Transactions — voucher type “${config.tally.voucherType}” and the party/GST ledgers must exist.`,
    })
  }

  const Icon = config.icon
  const empty = (
    <EmptyState
      icon={Icon}
      title={hasFilters ? `No ${plural} match these filters` : `No ${plural} in this period`}
      description={hasFilters ? 'Try a different search, or clear the filters.' : config.emptyText}
    >
      {hasFilters ? (
        <Button variant="outline" size="lg" onClick={() => { setSearch(''); setUserId(''); setStatus(''); setFilters(EMPTY_FILTERS); resetPage() }}>
          Clear filters
        </Button>
      ) : (
        <Button size="lg" onClick={() => navigate(`${basePath}/new`)}>
          <Plus data-icon="inline-start" /> Create {noun}
        </Button>
      )}
    </EmptyState>
  )

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title={title} subtitle={`${filtered.length} ${filtered.length === 1 ? noun : plural} in this view`}>
        <span className="inline-flex h-11 items-center rounded-lg bg-mint-pale px-3.5 text-sm font-semibold text-forest">
          Total: <span className="ml-1.5 font-mono">{formatINR(grandTotal)}</span>
        </span>
        <Button variant="outline" size="icon-lg" className="size-11" aria-label="Transaction settings" onClick={() => setSettingsOpen(true)}>
          <Settings className="size-4" />
        </Button>
        <ExportMenu
          disabled={!filtered.length}
          options={[
            { label: 'Excel', hint: 'Styled .xlsx of the filtered list', icon: FileSpreadsheet, onSelect: exportExcel },
            { label: 'Tally', hint: 'XML vouchers for Tally Prime / ERP 9', icon: FileCode2, onSelect: exportTally },
          ]}
        />
        <Button size="lg" className="h-11" onClick={() => navigate(`${basePath}/new`)}>
          <Plus data-icon="inline-start" /> Create {noun}
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
            <SearchInput value={search} onChange={(v) => { setSearch(v); resetPage() }} placeholder="Search number, party, item" className="sm:w-80" />
            <Pagination pageIndex={page.pageIndex} pageSize={page.pageSize} total={filtered.length} onPageChange={(pageIndex) => setPagination((p) => ({ ...p, pageIndex }))} className="justify-between sm:ml-auto sm:justify-end" />
          </div>
          <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2', config.statuses.length ? 'lg:grid-cols-[1fr_1fr_1fr_auto]' : 'lg:grid-cols-[1fr_1fr_auto]')}>
            <DateRangeFilter value={range} onChange={(r) => { setRange(r); resetPage() }} />
            <SearchSelect aria-label="Filter by user" placeholder="Select user" clearable options={SALES_USER_OPTIONS} value={userId} onChange={(v) => { setUserId(v); resetPage() }} />
            {/* Purchase returns have no status, so the filter is dropped there. */}
            {config.statuses.length > 0 && (
              <SearchSelect aria-label="Filter by status" placeholder="Select status" clearable searchable={false} options={config.statuses} value={status} onChange={(v) => { setStatus(v); resetPage() }} />
            )}
            <FiltersPopover
              filters={filters}
              onApply={(f) => { setFilters(f); resetPage() }}
              columns={TRANSACTION_COLUMN_OPTIONS}
              visibility={columnVisibility}
              onVisibilityChange={setColumnVisibility}
              renderFilters={(draft, setDraft) => (
                <>
                  <SelectField id="flt-route" label="Route" placeholder="Select route" clearable options={routeOptions} value={draft.routeId} onChange={(v) => setDraft('routeId', v)} />
                  <SelectField id="flt-warehouse" label="Warehouse" placeholder="Select warehouse" clearable options={WAREHOUSES} value={draft.warehouseId} onChange={(v) => setDraft('warehouseId', v)} />
                  <SelectField id="flt-group" label="Party Group" placeholder="Select party group" clearable options={PARTY_GROUPS.filter((g) => g.value !== 'all')} value={draft.partyGroup} onChange={(v) => setDraft('partyGroup', v)} />
                </>
              )}
            />
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
          onRowClick={(d) => navigate(`${basePath}/${d.id}/edit`)}
          highlightRowId={highlightId}
          empty={empty}
        />
      </section>

      <TransactionSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        noun={noun}
        onSave={(s) => {
          dispatch(settingsSaved({ type, settings: s }))
          setNotice({ tone: 'success', message: `${title} settings saved.` })
        }}
      />
    </div>
  )
}
