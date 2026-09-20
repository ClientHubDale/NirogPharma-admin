import { useMemo, useState } from 'react'
import { MapPin, MapPinned } from 'lucide-react'
import { useSelector } from 'react-redux'
import { ImageLightbox } from '@/components/common/ImageLightbox'
import { ColumnSettings } from '@/components/data/ColumnSettings'
import { DataTable } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { PageHeader } from '@/components/data/PageHeader'
import { Pagination } from '@/components/data/Pagination'
import { SearchInput } from '@/components/data/SearchInput'
import { DateRangeFilter } from '@/components/form/DateRangeFilter'
import { SearchSelect } from '@/components/form/SearchSelect'
import { Button } from '@/components/ui/button'
import { presetRange } from '@/lib/dateRange'
import { fieldStaff } from '@/mocks/liveLocation'
import { INITIAL_VISITS, VISIT_STATUSES } from '@/mocks/visits'
import { selectCities, selectRoutes } from '@/store/geographySlice'
import { selectParties } from '@/store/partiesSlice'
import { buildVisitColumns, DEFAULT_VISIT_COLUMN_VISIBILITY, VISIT_COLUMN_OPTIONS } from './components/VisitsTable'
import { ON_SITE_METRES, visitStatus } from './visitModel'

const PAGE_SIZE = 20
const getRowId = (v) => v.id
const staffById = Object.fromEntries(fieldStaff.map((u) => [u.id, u]))
const STAFF_OPTIONS = fieldStaff.map((u) => ({ value: u.id, label: u.name.toUpperCase() }))

/**
 * Parties › Visited — every shop visit logged from the field app (check-in,
 * check-out with location, comment, photos). Read-only for the office.
 */
export default function Visited() {
  const customers = useSelector(selectParties('CUSTOMER'))
  const routes = useSelector(selectRoutes)
  const cities = useSelector(selectCities)

  const partiesById = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers])
  const placeOf = useMemo(() => {
    const routesById = Object.fromEntries(routes.map((r) => [r.id, r]))
    const citiesById = Object.fromEntries(cities.map((c) => [c.id, c]))
    return (p) => {
      const route = routesById[p.routeId]
      return { route: route?.name ?? '', city: citiesById[route?.cityId]?.name ?? '' }
    }
  }, [routes, cities])
  const routeOptions = useMemo(() => {
    const citiesById = Object.fromEntries(cities.map((c) => [c.id, c]))
    return routes.map((r) => ({ value: r.id, label: r.name, hint: citiesById[r.cityId]?.name }))
  }, [routes, cities])

  const [range, setRange] = useState(() => ({ preset: 'today', ...presetRange('today') }))
  const [search, setSearch] = useState('')
  const [routeId, setRouteId] = useState('')
  const [userId, setUserId] = useState('')
  const [status, setStatus] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })
  const [columnVisibility, setColumnVisibility] = useState(DEFAULT_VISIT_COLUMN_VISIBILITY)
  const [viewer, setViewer] = useState(null) // visit whose photos are open

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return INITIAL_VISITS.filter((v) => {
      if (v.date < range.start || v.date > range.end) return false
      if (userId && v.userId !== userId) return false
      if (status && visitStatus(v) !== status) return false
      const party = partiesById[v.partyId]
      if (routeId && party?.routeId !== routeId) return false
      if (!q) return true
      return party?.name.toLowerCase().includes(q) || v.comment.toLowerCase().includes(q) || staffById[v.userId]?.name.toLowerCase().includes(q)
    })
  }, [range, search, routeId, userId, status, partiesById])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize))
  const page = pagination.pageIndex < pageCount ? pagination : { ...pagination, pageIndex: pageCount - 1 }
  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }))
  const hasFilters = Boolean(search || routeId || userId || status)
  const withPhotos = filtered.filter((v) => v.images.length).length

  const columns = useMemo(
    () => buildVisitColumns({ partiesById, placeOf, staffById, onOpenImages: setViewer }),
    [partiesById, placeOf],
  )

  const empty = (
    <EmptyState
      icon={MapPinned}
      title={hasFilters ? 'No visits match these filters' : 'No visits in this period'}
      description={hasFilters ? 'Try a different search, or clear the filters.' : 'Visits appear here as soon as the field team checks in at a shop. Try a wider date range.'}
    >
      {hasFilters ? (
        <Button
          variant="outline"
          size="lg"
          onClick={() => {
            setSearch('')
            setRouteId('')
            setUserId('')
            setStatus('')
            resetPage()
          }}
        >
          Clear filters
        </Button>
      ) : (
        range.preset !== 'thisMonth' && (
          <Button variant="outline" size="lg" onClick={() => { setRange({ preset: 'thisMonth', ...presetRange('thisMonth') }); resetPage() }}>
            Show this month
          </Button>
        )
      )}
    </EmptyState>
  )

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Party Visited"
        subtitle={`${filtered.length} visit${filtered.length === 1 ? '' : 's'} · ${withPhotos} with photos`}
      >
        <ColumnSettings columns={VISIT_COLUMN_OPTIONS} visibility={columnVisibility} onChange={setColumnVisibility} />
      </PageHeader>

      <section className="overflow-hidden rounded-2xl border border-mint-pale bg-white">
        <div className="space-y-3 border-b border-mint-pale p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v)
                resetPage()
              }}
              placeholder="Search party, comment, staff"
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DateRangeFilter
              value={range}
              onChange={(r) => {
                setRange(r)
                resetPage()
              }}
            />
            <SearchSelect aria-label="Filter by route" placeholder="Select route" clearable options={routeOptions} value={routeId} onChange={(v) => { setRouteId(v); resetPage() }} />
            <SearchSelect aria-label="Filter by visited by" placeholder="Select visited by" clearable options={STAFF_OPTIONS} value={userId} onChange={(v) => { setUserId(v); resetPage() }} />
            <SearchSelect aria-label="Filter by status" placeholder="Select status" clearable searchable={false} options={VISIT_STATUSES} value={status} onChange={(v) => { setStatus(v); resetPage() }} />
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
          empty={empty}
        />

        {filtered.length > 0 && (
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-mint-pale bg-bg px-5 py-2.5 text-xs text-ink-muted">
            <span className="font-semibold text-ink">Check-out pin:</span>
            <span className="inline-flex items-center gap-1"><MapPin className="size-3.5 text-green-deep" /> within {ON_SITE_METRES} m of the shop</span>
            <span className="inline-flex items-center gap-1"><MapPin className="size-3.5 text-danger" /> further away — check this visit</span>
            <span className="inline-flex items-center gap-1"><MapPin className="size-3.5 text-ink-muted" /> shop location not saved</span>
          </p>
        )}
      </section>

      {viewer && (
        <ImageLightbox
          key={viewer.id}
          open
          onOpenChange={(open) => !open && setViewer(null)}
          images={viewer.images}
          title={`${partiesById[viewer.partyId]?.name ?? 'Visit'} · ${staffById[viewer.userId]?.name ?? ''} · ${viewer.inAt}`}
        />
      )}
    </div>
  )
}
