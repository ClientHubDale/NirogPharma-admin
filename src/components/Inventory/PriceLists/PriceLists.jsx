import { useEffect, useMemo, useState } from 'react'
import { Plus, Tags } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { DataTable } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { Notice } from '@/components/data/Notice'
import { PageHeader } from '@/components/data/PageHeader'
import { Pagination } from '@/components/data/Pagination'
import { SearchInput } from '@/components/data/SearchInput'
import { PRICE_SHEET_COLUMNS, PRICE_SHEET_INSTRUCTIONS, priceSheetRows } from '@/components/Inventory/PriceLists/priceListModel'
import { buildPriceListColumns } from '@/components/Inventory/PriceLists/components/PriceListsTable'
import { Button } from '@/components/ui/button'
import { buildWorkbook, downloadWorkbook } from '@/lib/xlsx'
import { selectItems } from '@/store/itemsSlice'
import { priceListDeleted, priceListRestored, selectPriceLists } from '@/store/priceListsSlice'

const BASE = '/admin/inventory/price-lists'
const PAGE_SIZE = 10
const getRowId = (list) => list.id
const NO_HIDDEN = {}

const fileSafe = (name) => name.replace(/[^\w-]+/g, '-').replace(/-+/g, '-').toLowerCase()

export default function PriceLists() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const priceLists = useSelector(selectPriceLists)
  const items = useSelector(selectItems)

  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })
  const [notice, setNotice] = useState(location.state?.notice ?? null)
  const [highlightId] = useState(location.state?.highlightId ?? null)

  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return priceLists.filter((p) => !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
  }, [priceLists, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize))
  const page = pagination.pageIndex < pageCount ? pagination : { ...pagination, pageIndex: pageCount - 1 }

  const columns = useMemo(
    () =>
      buildPriceListColumns({
        onEdit: (p) => navigate(`${BASE}/${p.id}/edit`),
        onDuplicate: (p) => navigate(`${BASE}/new`, { state: { duplicateOf: p.id } }),
        onExport: async (p) => {
          // Fixed lists export their own items; percentage lists export the whole catalog.
          const scope = p.strategy === 'FIXED' ? items.filter((i) => p.items.some((r) => r.itemId === i.id)) : items
          const workbook = await buildWorkbook({
            sheetName: 'Price list',
            columns: PRICE_SHEET_COLUMNS,
            rows: priceSheetRows(scope, p.items),
            instructions: PRICE_SHEET_INSTRUCTIONS,
          })
          await downloadWorkbook(`nirog-price-list-${fileSafe(p.name)}.xlsx`, workbook)
        },
        onDelete: (p) => {
          const index = priceLists.findIndex((x) => x.id === p.id)
          dispatch(priceListDeleted(p.id))
          setNotice({
            tone: 'success',
            message: `${p.name} deleted.`,
            undo: () => {
              dispatch(priceListRestored({ priceList: p, index }))
              setNotice({ tone: 'success', message: `${p.name} restored.` })
            },
          })
        },
      }),
    [navigate, items, priceLists, dispatch],
  )

  const empty = (
    <EmptyState
      icon={Tags}
      title={search ? 'No price lists match your search' : 'No price lists yet'}
      description={
        search
          ? 'Try a different name.'
          : 'Give a party group its own prices — fixed per item, or a percentage above or below the catalog.'
      }
    >
      {search ? (
        <Button variant="outline" size="lg" onClick={() => setSearch('')}>
          Clear search
        </Button>
      ) : (
        <Button size="lg" onClick={() => navigate(`${BASE}/new`)}>
          <Plus data-icon="inline-start" /> New price list
        </Button>
      )}
    </EmptyState>
  )

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title="Price Lists" subtitle="Customer- or group-specific pricing, used when orders are booked.">
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
        <div className="flex flex-col gap-3 border-b border-mint-pale p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            }}
            placeholder="Search price lists"
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
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={getRowId}
          pagination={page}
          onPaginationChange={setPagination}
          columnVisibility={NO_HIDDEN}
          onColumnVisibilityChange={() => {}}
          onRowClick={(p) => navigate(`${BASE}/${p.id}/edit`)}
          highlightRowId={highlightId}
          empty={empty}
        />
      </section>
    </div>
  )
}
