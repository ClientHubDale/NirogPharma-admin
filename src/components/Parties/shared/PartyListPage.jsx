import { useEffect, useMemo, useState } from 'react'
import { FileDown, FileUp, List, MapPin, Plus } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { ColumnSettings } from '@/components/data/ColumnSettings'
import { DataTable } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { FormDrawer } from '@/components/data/FormDrawer'
import { ImportDialog } from '@/components/data/ImportDialog'
import { Notice } from '@/components/data/Notice'
import { PageHeader } from '@/components/data/PageHeader'
import { Pagination } from '@/components/data/Pagination'
import { SearchInput } from '@/components/data/SearchInput'
import { SearchSelect } from '@/components/form/SearchSelect'
import { Button } from '@/components/ui/button'
import { parseCSV } from '@/lib/csv'
import { cn } from '@/lib/utils'
import { buildWorkbook, downloadWorkbook, readWorkbookRows } from '@/lib/xlsx'
import { partiesAdded, partyDeleted, partyPatched, partyRestored, partySaved, selectParties } from '@/store/partiesSlice'
import { routeAdded, selectCities, selectRegions, selectRoutes } from '@/store/geographySlice'
import { PartyForm } from './components/PartyForm'
import { PartiesMap } from './components/PartiesMap'
import { buildPartyColumns, PARTY_COLUMN_OPTIONS, DEFAULT_PARTY_COLUMN_VISIBILITY } from './components/PartiesTable'
import {
  partySheetColumns,
  partiesToSheetRows,
  partyToForm,
  emptyPartyForm,
  formToParty,
  nextPartyId,
  rowsToParties,
  validatePartyForm,
} from './partyModel'
import { IMPORT_REQUIRED_NOTE, PARTY_TYPES } from './partyTypes'

const PAGE_SIZE = 30
const getRowId = (c) => c.id
const FIELD_IDS = { name: 'cust-name', code: 'cust-code', mobile: 'cust-mobile', email: 'cust-email', geo: 'cust-geo', gstin: 'cust-gstin', stateCode: 'cust-state', openingBalance: 'cust-opening', creditPeriodDays: 'cust-credit-period', creditLimit: 'cust-credit-limit', creditBillLimit: 'cust-bill-limit' }
const today = () => new Date().toISOString().slice(0, 10)

/**
 * List + map + create/edit drawer + Excel for one party type.
 * Customers and Suppliers are both this page with a different `type`.
 */
export default function PartyListPage({ type }) {
  const config = PARTY_TYPES[type]
  const { noun, plural, title } = config
  const dispatch = useDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  const parties = useSelector(selectParties(type))
  const regions = useSelector(selectRegions)
  const cities = useSelector(selectCities)
  const routes = useSelector(selectRoutes)

  const citiesById = useMemo(() => Object.fromEntries(cities.map((c) => [c.id, c])), [cities])
  const routesById = useMemo(() => Object.fromEntries(routes.map((r) => [r.id, r])), [routes])
  const placeOf = useMemo(() => {
    return (c) => {
      const route = routesById[c.routeId]
      const city = citiesById[route?.cityId]
      return { route: route?.name ?? '', city: city?.name ?? '', cityId: city?.id ?? '', regionId: city?.regionId ?? '', label: city ? `${city.name} ${route.name}` : '' }
    }
  }, [routesById, citiesById])

  // List controls.
  const [view, setView] = useState('list')
  const [search, setSearch] = useState('')
  const [regionId, setRegionId] = useState('')
  const [cityId, setCityId] = useState('')
  const [routeId, setRouteId] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })
  const [columnVisibility, setColumnVisibility] = useState(DEFAULT_PARTY_COLUMN_VISIBILITY)
  const [notice, setNotice] = useState(null)
  const [highlightId, setHighlightId] = useState(null)
  const [importOpen, setImportOpen] = useState(false)

  // Drawer.
  const [drawer, setDrawer] = useState({ open: false, editingId: null })
  const [form, setForm] = useState(emptyPartyForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const regionOptions = regions.map((r) => ({ value: r.id, label: r.name }))
  const cityOptions = cities.filter((c) => !regionId || c.regionId === regionId).map((c) => ({ value: c.id, label: c.name }))
  const routeFilterOptions = routes
    .filter((r) => (cityId ? r.cityId === cityId : !regionId || citiesById[r.cityId]?.regionId === regionId))
    .map((r) => ({ value: r.id, label: r.name, hint: citiesById[r.cityId]?.name }))
  const routeFormOptions = routes.map((r) => ({ value: r.id, label: r.name, hint: citiesById[r.cityId]?.name }))
  const allCityOptions = cities.map((c) => ({ value: c.id, label: c.name }))

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const digitsQ = q.replace(/\D/g, '')
    return parties.filter((c) => {
      const p = placeOf(c)
      if (regionId && p.regionId !== regionId) return false
      if (cityId && p.cityId !== cityId) return false
      if (routeId && c.routeId !== routeId) return false
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        c.id.includes(q) ||
        c.code?.toLowerCase().includes(q) ||
        c.contactPerson?.toLowerCase().includes(q) ||
        c.gstin?.toLowerCase().includes(q) ||
        (digitsQ.length >= 3 && c.mobile.includes(digitsQ))
      )
    })
  }, [parties, search, regionId, cityId, routeId, placeOf])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize))
  const page = pagination.pageIndex < pageCount ? pagination : { ...pagination, pageIndex: pageCount - 1 }
  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }))
  const hasFilters = Boolean(search || regionId || cityId || routeId)
  const clearFilters = () => {
    setSearch('')
    setRegionId('')
    setCityId('')
    setRouteId('')
    resetPage()
  }

  /* ── drawer ───────────────────────────────────────────── */

  const openCreate = () => {
    setForm(emptyPartyForm({ type, routeId, balanceType: config.defaultBalanceType, groupId: config.defaultGroup }))
    setErrors({})
    setDrawer({ open: true, editingId: null })
  }
  const openEdit = (c) => {
    setForm(partyToForm(c))
    setErrors({})
    setDrawer({ open: true, editingId: c.id })
  }

  // "Add party" shortcuts (top-bar + menu, dashboard) land here with { create: true }.
  useEffect(() => {
    if (location.state?.create) {
      openCreate()
      navigate(location.pathname, { replace: true, state: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  const updateField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const addRoute = ({ cityId: cid, name }) => {
    const id = `rt-${Date.now()}`
    dispatch(routeAdded({ id, name, cityId: cid }))
    return id
  }

  const save = async () => {
    const found = validatePartyForm(form, { parties, editingId: drawer.editingId, noun })
    setErrors(found)
    const first = Object.keys(found).find((k) => found[k])
    if (first) {
      document.getElementById(FIELD_IDS[first])?.focus()
      return
    }
    setSaving(true)
    await new Promise((r) => setTimeout(r, 400)) // mock network
    const existing = parties.find((c) => c.id === drawer.editingId)
    const id = drawer.editingId ?? nextPartyId(parties, config.idBase)
    const saved = formToParty({ ...form, type }, id, existing)
    dispatch(partySaved({ type, party: saved }))
    setSaving(false)
    setDrawer({ open: false, editingId: null })
    setHighlightId(id)
    if (!drawer.editingId) clearFilters()
    setNotice({ tone: 'success', message: `${saved.name} ${drawer.editingId ? 'updated' : `added as ${noun} ${id}`}.` })
  }

  /* ── row actions ──────────────────────────────────────── */

  const columns = useMemo(
    () =>
      buildPartyColumns({
        placeOf,
        placeLabel: config.placeLabel,
        onEdit: openEdit,
        onToggleStatus: (c) => {
          dispatch(partyPatched({ type, id: c.id, changes: { status: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } }))
          setNotice({ tone: 'success', message: `${c.name} ${c.status === 'ACTIVE' ? 'deactivated' : 'activated'}.` })
        },
        onToggleVerified: (c) => {
          dispatch(partyPatched({ type, id: c.id, changes: { verified: !c.verified } }))
          setNotice({ tone: 'success', message: `${c.name} marked ${c.verified ? 'unverified' : 'verified'}.` })
        },
        onDelete: (c) => {
          const index = parties.findIndex((x) => x.id === c.id)
          dispatch(partyDeleted({ type, id: c.id }))
          setNotice({
            tone: 'success',
            message: `${c.name} deleted.`,
            undo: () => {
              dispatch(partyRestored({ type, party: c, index }))
              setNotice({ tone: 'success', message: `${c.name} restored.` })
            },
          })
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placeOf, parties, dispatch, type],
  )

  /* ── excel ────────────────────────────────────────────── */

  const sheetColumns = () => partySheetColumns([...new Set(routes.map((r) => r.name))])

  const exportParties = async () => {
    const wb = await buildWorkbook({ sheetName: config.sheetName, columns: sheetColumns(), rows: partiesToSheetRows(filtered, { routesById, citiesById }) })
    await downloadWorkbook(`nirog-${plural}-${today()}.xlsx`, wb)
    setNotice({ tone: 'success', message: `Exported ${filtered.length} ${filtered.length === 1 ? noun : plural} to Excel.` })
  }

  const downloadSample = async () => {
    const wb = await buildWorkbook({ sheetName: config.sheetName, columns: sheetColumns(), rows: config.sampleRows, blankRows: 48, instructions: config.instructions })
    await downloadWorkbook(`nirog-sample-import-${plural}.xlsx`, wb)
  }

  const importFile = async (file) => {
    let rows
    try {
      rows = /\.xlsx$/i.test(file.name) ? await readWorkbookRows(file) : parseCSV(await file.text())
    } catch {
      throw new Error('Couldn’t read this file. Open it in Excel and save it again as .xlsx, then retry.')
    }
    if (!rows.length) throw new Error('The file has no rows under the header. Use Download Sample for the format.')
    const { parties: added, skipped } = rowsToParties(rows, { existing: parties, routes, citiesById, config })
    const reasons = skipped.slice(0, 5).map((s) => `Line ${s.line}: ${s.reason}`)
    if (!added.length) throw new Error(`No ${plural} imported. ${reasons.join(' · ')}${skipped.length > 5 ? ` · …and ${skipped.length - 5} more` : ''}`)
    dispatch(partiesAdded({ type, parties: added }))
    clearFilters()
    setNotice({
      tone: 'success',
      message: (
        <>
          Imported {added.length} {added.length === 1 ? noun : plural}
          {skipped.length > 0 && `, skipped ${skipped.length}`}.
          {skipped.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs">
              {reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
              {skipped.length > 5 && <li>…and {skipped.length - 5} more</li>}
            </ul>
          )}
        </>
      ),
    })
  }

  /* ── render ───────────────────────────────────────────── */

  const empty = (
    <EmptyState
      icon={config.icon}
      title={hasFilters ? `No ${plural} match these filters` : `No ${plural} yet`}
      description={hasFilters ? 'Try a different search, or clear the filters.' : config.emptyText}
    >
      {hasFilters ? (
        <Button variant="outline" size="lg" onClick={clearFilters}>
          Clear filters
        </Button>
      ) : (
        <Button size="lg" onClick={openCreate}>
          <Plus data-icon="inline-start" /> New {noun}
        </Button>
      )}
    </EmptyState>
  )

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title={title} subtitle={`${parties.length.toLocaleString('en-IN')} ${parties.length === 1 ? noun : plural}`}>
        <Button
          variant="outline"
          size="icon-lg"
          className={cn('size-11', view === 'map' && 'bg-black text-white hover:bg-black/85 hover:text-white')}
          onClick={() => setView((v) => (v === 'map' ? 'list' : 'map'))}
          aria-label={view === 'map' ? 'Show list' : 'Show on map'}
          aria-pressed={view === 'map'}
          title={view === 'map' ? 'Show list' : 'Show on map'}
        >
          {view === 'map' ? <List className="size-4" /> : <MapPin className="size-4" />}
        </Button>
        {view === 'list' && <ColumnSettings columns={PARTY_COLUMN_OPTIONS} visibility={columnVisibility} onChange={setColumnVisibility} />}
        <Button variant="outline" size="lg" className="h-11" onClick={exportParties} disabled={!filtered.length}>
          <FileDown data-icon="inline-start" /> Export
        </Button>
        <Button variant="outline" size="lg" className="h-11" onClick={() => setImportOpen(true)}>
          <FileUp data-icon="inline-start" /> Import
        </Button>
        <Button size="lg" className="h-11" onClick={openCreate}>
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
        <div className="flex flex-col gap-3 border-b border-mint-pale p-4 xl:flex-row xl:items-center">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v)
              resetPage()
            }}
            placeholder="Search name, ID, mobile, GSTIN"
            className="xl:w-72"
          />
          <div className={cn('grid flex-1 grid-cols-1 gap-3', config.showRouteFilter ? 'sm:grid-cols-3' : 'sm:grid-cols-2 xl:max-w-xl')}>
            <SearchSelect
              aria-label="Filter by region"
              placeholder="Select region"
              clearable
              options={regionOptions}
              value={regionId}
              onChange={(v) => {
                setRegionId(v)
                if (v && cityId && citiesById[cityId]?.regionId !== v) {
                  setCityId('')
                  setRouteId('')
                }
                resetPage()
              }}
            />
            <SearchSelect
              aria-label="Filter by city"
              placeholder="Select city"
              clearable
              options={cityOptions}
              value={cityId}
              onChange={(v) => {
                setCityId(v)
                if (v) setRegionId(citiesById[v].regionId)
                if (routeId && routesById[routeId]?.cityId !== v) setRouteId('')
                resetPage()
              }}
            />
            {config.showRouteFilter && (
              <SearchSelect
                aria-label="Filter by route"
                placeholder="Select route"
                clearable
                options={routeFilterOptions}
                value={routeId}
                onChange={(v) => {
                  setRouteId(v)
                  if (v) {
                    const cid = routesById[v].cityId
                    setCityId(cid)
                    setRegionId(citiesById[cid].regionId)
                  }
                  resetPage()
                }}
              />
            )}
          </div>
          {view === 'list' ? (
            <Pagination
              pageIndex={page.pageIndex}
              pageSize={page.pageSize}
              total={filtered.length}
              onPageChange={(pageIndex) => setPagination((p) => ({ ...p, pageIndex }))}
              className="justify-between xl:ml-auto xl:justify-end"
            />
          ) : (
            <p className="text-sm whitespace-nowrap text-ink-muted" aria-live="polite">
              <span className="font-mono text-ink">{filtered.length}</span> {plural}
            </p>
          )}
        </div>

        {view === 'list' ? (
          <DataTable
            data={filtered}
            columns={columns}
            getRowId={getRowId}
            pagination={page}
            onPaginationChange={setPagination}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            onRowClick={openEdit}
            highlightRowId={highlightId}
            empty={empty}
          />
        ) : (
          <PartiesMap parties={filtered} placeOf={placeOf} onEdit={openEdit} noun={noun} />
        )}
      </section>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title={`Import ${plural}`}
        requiredNote={IMPORT_REQUIRED_NOTE}
        onDownloadSample={downloadSample}
        onSubmit={importFile}
      />

      <FormDrawer
        open={drawer.open}
        onOpenChange={(open) => !open && setDrawer({ open: false, editingId: null })}
        title={drawer.editingId ? `Edit ${noun}` : `Create ${noun}`}
        description={drawer.editingId ? `ID ${drawer.editingId}` : 'Fields marked * are required.'}
        onSubmit={save}
        saving={saving}
        saveLabel={drawer.editingId ? 'Save changes' : 'Save'}
      >
        <PartyForm
          config={config}
          form={form}
          errors={errors}
          onChange={updateField}
          routeOptions={routeFormOptions}
          cityOptions={allCityOptions}
          routes={routes}
          onAddRoute={addRoute}
        />
      </FormDrawer>
    </div>
  )
}
