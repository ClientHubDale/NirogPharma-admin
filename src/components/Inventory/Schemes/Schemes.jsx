import { useEffect, useMemo, useState } from 'react'
import { Plus, TicketPercent } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { ColumnSettings } from '@/components/data/ColumnSettings'
import { DataTable } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { Notice } from '@/components/data/Notice'
import { PageHeader } from '@/components/data/PageHeader'
import { Pagination } from '@/components/data/Pagination'
import { SearchInput } from '@/components/data/SearchInput'
import { SearchSelect } from '@/components/form/SearchSelect'
import { SCHEME_STATUS_OPTIONS, SCHEME_TYPE_OPTIONS } from '@/components/Inventory/Schemes/schemeModel'
import { buildSchemeColumns, SCHEME_COLUMN_OPTIONS } from '@/components/Inventory/Schemes/components/SchemesTable'
import { Button } from '@/components/ui/button'
import { selectItems } from '@/store/itemsSlice'
import {
  schemeDeleted,
  schemeRestored,
  schemeStatusToggled,
  selectSchemes,
} from '@/store/schemesSlice'

const BASE = '/admin/inventory/schemes'
const PAGE_SIZE = 10
const getRowId = (scheme) => scheme.id

export default function Schemes() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const schemes = useSelector(selectSchemes)
  const items = useSelector(selectItems)
  const itemsById = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])

  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })
  const [columnVisibility, setColumnVisibility] = useState({ priority: false })
  // A notice / highlight handed over by the editor after Save.
  const [notice, setNotice] = useState(location.state?.notice ?? null)
  const [highlightId] = useState(location.state?.highlightId ?? null)

  // Don't show the hand-over notice again on refresh / back.
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return schemes.filter(
      (s) => (!q || s.name.toLowerCase().includes(q)) && (!type || s.type === type) && (!status || s.status === status),
    )
  }, [schemes, search, type, status])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize))
  const page = pagination.pageIndex < pageCount ? pagination : { ...pagination, pageIndex: pageCount - 1 }
  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }))
  const hasFilters = Boolean(search || type || status)

  const columns = useMemo(
    () =>
      buildSchemeColumns({
        itemsById,
        onEdit: (s) => navigate(`${BASE}/${s.id}/edit`),
        onDuplicate: (s) => navigate(`${BASE}/new`, { state: { duplicateOf: s.id } }),
        onToggleStatus: (s) => {
          dispatch(schemeStatusToggled(s.id))
          setNotice({ tone: 'success', message: `${s.name} ${s.status === 'ACTIVE' ? 'deactivated' : 'activated'}.` })
        },
        onDelete: (s) => {
          const index = schemes.findIndex((x) => x.id === s.id)
          dispatch(schemeDeleted(s.id))
          setNotice({
            tone: 'success',
            message: `${s.name} deleted.`,
            undo: () => {
              dispatch(schemeRestored({ scheme: s, index }))
              setNotice({ tone: 'success', message: `${s.name} restored.` })
            },
          })
        },
      }),
    [itemsById, navigate, dispatch, schemes],
  )

  const empty = (
    <EmptyState
      icon={TicketPercent}
      title={hasFilters ? 'No schemes match these filters' : 'No schemes yet'}
      description={
        hasFilters
          ? 'Try a different search, or clear the filters.'
          : 'Create a scheme — buy X get Y, quantity slabs or spend-based discounts — and it applies automatically at order time.'
      }
    >
      {hasFilters ? (
        <Button
          variant="outline"
          size="lg"
          onClick={() => {
            setSearch('')
            setType('')
            setStatus('')
            resetPage()
          }}
        >
          Clear filters
        </Button>
      ) : (
        <Button size="lg" onClick={() => navigate(`${BASE}/new`)}>
          <Plus data-icon="inline-start" /> New scheme
        </Button>
      )}
    </EmptyState>
  )

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title="Schemes" subtitle="Applied automatically when the field team books an order.">
        <ColumnSettings columns={SCHEME_COLUMN_OPTIONS} visibility={columnVisibility} onChange={setColumnVisibility} />
        <Button size="lg" className="h-11" onClick={() => navigate(`${BASE}/new`)}>
          <Plus data-icon="inline-start" /> New
        </Button>
      </PageHeader>

      {notice && (
        <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.message}
          {notice.undo && (
            <button type="button" onClick={notice.undo} className="ml-2 font-semibold underline underline-offset-4">
              Undo
            </button>
          )}
        </Notice>
      )}

      <section className="overflow-hidden rounded-2xl border border-mint-pale bg-white">
        <div className="flex flex-col gap-3 border-b border-mint-pale p-4 lg:flex-row lg:items-center">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v)
              resetPage()
            }}
            placeholder="Search schemes"
            className="lg:w-72"
          />
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-lg">
            <SearchSelect
              aria-label="Filter by type"
              placeholder="Select type"
              clearable
              options={SCHEME_TYPE_OPTIONS}
              value={type}
              onChange={(v) => {
                setType(v)
                resetPage()
              }}
            />
            <SearchSelect
              aria-label="Filter by status"
              placeholder="Select status"
              clearable
              options={SCHEME_STATUS_OPTIONS}
              value={status}
              onChange={(v) => {
                setStatus(v)
                resetPage()
              }}
            />
          </div>
          <Pagination
            pageIndex={page.pageIndex}
            pageSize={page.pageSize}
            total={filtered.length}
            onPageChange={(pageIndex) => setPagination((p) => ({ ...p, pageIndex }))}
            className="justify-between lg:ml-auto lg:justify-end"
          />
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          getRowId={getRowId}
          pagination={page}
          onPaginationChange={setPagination}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          onRowClick={(s) => navigate(`${BASE}/${s.id}/edit`)}
          highlightRowId={highlightId}
          empty={empty}
        />
      </section>
    </div>
  )
}
