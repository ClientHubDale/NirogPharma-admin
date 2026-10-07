import { useEffect, useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Building2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useToast } from '@/components/common/Toast'
import { DataTable, listFeatures } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { FormDrawer } from '@/components/data/FormDrawer'
import { Notice } from '@/components/data/Notice'
import { PageHeader } from '@/components/data/PageHeader'
import { Pagination } from '@/components/data/Pagination'
import { SearchInput } from '@/components/data/SearchInput'
import { StatusPill } from '@/components/data/StatusPill'
import { SearchSelect } from '@/components/form/SearchSelect'
import { Switch } from '@/components/form/Switch'
import { Button } from '@/components/ui/button'
import { PRICE_TIER_LABEL } from '@/constants/priceTiers'
import { googleMapsUrl } from '@/lib/geo'
import { formatINR } from '@/lib/format'
import { selectCities, selectRegions, selectRoutes } from '@/store/geographySlice'
import {
  fetchDistributors,
  removeDistributor,
  saveDistributor,
  selectDistributors,
  selectDistributorsError,
  selectDistributorsStatus,
  setDistributorStatus,
} from '@/store/distributorsSlice'
import { fetchUsers, selectUsers } from '@/store/usersSlice'
import { DistributorForm } from './components/DistributorForm'
import {
  DAY_LABEL,
  distributorToForm,
  emptyDistributorForm,
  placeOf,
  validateDistributorForm,
} from './distributorModel'

const helper = createColumnHelper(listFeatures)

/**
 * Parties › Distributors — the firms a manager appoints. They have no login:
 * admin → manager → distributor → executive.
 */
export default function Distributors() {
  const dispatch = useDispatch()
  const toast = useToast()

  const distributors = useSelector(selectDistributors)
  const loadStatus = useSelector(selectDistributorsStatus)
  const loadError = useSelector(selectDistributorsError)
  const users = useSelector(selectUsers)
  const regions = useSelector(selectRegions)
  const cities = useSelector(selectCities)
  // Routes › Areas live under `routes` in the geography store.
  const areas = useSelector(selectRoutes)

  const [search, setSearch] = useState('')
  const [managerId, setManagerId] = useState('')
  const [executiveId, setExecutiveId] = useState('')
  const [cityId, setCityId] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [drawer, setDrawer] = useState(null) // { form, initial, errors, editingId }
  const [saving, setSaving] = useState(false)

  // Managers and executives come from Users — the same list the user form uses.
  useEffect(() => {
    dispatch(fetchDistributors())
    dispatch(fetchUsers())
  }, [dispatch])

  const managerOptions = useMemo(
    () => users.filter((u) => u.role === 'MANAGER').map((u) => ({ value: u.id, label: u.name })),
    [users],
  )
  const executiveOptions = useMemo(
    () =>
      users
        .filter((u) => u.role === 'EXECUTIVE')
        .map((u) => ({ value: u.id, label: u.name, hint: u.mobile })),
    [users],
  )
  const executiveFilterOptions = useMemo(() => {
    const working = distributors.filter((d) => !managerId || d.managerId === managerId)
    const assigned = new Set(working.flatMap((d) => d.executiveIds ?? []))
    return users.filter((u) => assigned.has(u.id)).map((u) => ({ value: u.id, label: u.name, hint: u.mobile }))
  }, [distributors, users, managerId])

  const cityFilterOptions = useMemo(
    () =>
      cities
        .filter((c) => distributors.some((d) => d.cityId === c.id))
        .map((c) => ({ value: c.id, label: c.name })),
    [cities, distributors],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return distributors.filter((d) => {
      if (managerId && d.managerId !== managerId) return false
      if (executiveId && !(d.executiveIds ?? []).includes(executiveId)) return false
      if (cityId && d.cityId !== cityId) return false
      return !q || `${d.name} ${d.mobile} ${d.altMobile} ${d.contactPerson}`.toLowerCase().includes(q)
    })
  }, [distributors, search, managerId, executiveId, cityId])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize))
  const page = pagination.pageIndex < pageCount ? pagination : { ...pagination, pageIndex: pageCount - 1 }
  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }))

  const openCreate = () => setDrawer({ editingId: null, errors: {}, form: emptyDistributorForm() })
  const openEdit = (distributor) => {
    const form = distributorToForm(distributor)
    setDrawer({ editingId: distributor.id, errors: {}, form, initial: form })
  }

  // Save stays greyed out on an edit until something is different.
  const changed = drawer && (!drawer.editingId || JSON.stringify(drawer.form) !== JSON.stringify(drawer.initial))

  const save = async () => {
    const found = validateDistributorForm(drawer.form, { distributors, editingId: drawer.editingId })
    if (Object.keys(found).some((k) => found[k])) return setDrawer((d) => ({ ...d, errors: found }))

    setSaving(true)
    const result = await dispatch(saveDistributor({ id: drawer.editingId, form: drawer.form }))
    setSaving(false)

    if (saveDistributor.rejected.match(result)) {
      const { message, details } = result.payload
      if (details) setDrawer((d) => ({ ...d, errors: { ...d.errors, ...details } }))
      return toast({ tone: 'danger', title: drawer.editingId ? 'Could not save' : 'Could not create', description: message })
    }

    const { distributor, warning } = result.payload
    setDrawer(null)
    // Attaching an executive changes their record too, so the list is stale.
    dispatch(fetchUsers())
    toast({
      tone: warning ? 'warning' : 'success',
      title: `Distributor ${drawer.editingId ? 'updated' : 'created'}`,
      description: warning ? `${distributor.name} · ${warning}` : distributor.name,
    })
  }

  const toggleStatus = async (distributor, on) => {
    const result = await dispatch(setDistributorStatus({ id: distributor.id, isActive: on }))
    if (setDistributorStatus.rejected.match(result)) {
      return toast({ tone: 'danger', title: 'Could not change the status', description: result.payload.message })
    }
    toast({ title: on ? 'Distributor activated' : 'Distributor deactivated', description: distributor.name })
  }

  const remove = async (distributor) => {
    const result = await dispatch(removeDistributor({ id: distributor.id }))
    if (removeDistributor.rejected.match(result)) {
      // The usual reason is that executives are still attached — the server says who.
      return toast({ tone: 'danger', title: 'Could not delete', description: result.payload.message })
    }
    dispatch(fetchUsers())
    toast({ title: 'Distributor deleted', description: distributor.name })
  }

  const columns = useMemo(
    () =>
      helper.columns([
        helper.display({
          id: 'sno',
          header: 'ID',
          meta: { className: 'w-16' },
          cell: ({ row }) => <span className="font-mono text-xs text-ink-muted">{page.pageIndex * page.pageSize + row.index + 1}</span>,
        }),
        helper.accessor('name', {
          header: 'Firm Name',
          cell: ({ row, getValue }) => (
            <div>
              <p className="font-semibold text-black uppercase">{getValue()}</p>
              <p className="text-xs text-ink-muted">{row.original.contactPerson || '—'}</p>
            </div>
          ),
        }),
        helper.accessor('mobile', {
          header: 'Mobile',
          cell: ({ row, getValue }) => (
            <div className="whitespace-nowrap">
              <p className="font-mono text-sm">{getValue() || '—'}</p>
              {row.original.altMobile && <p className="font-mono text-xs text-ink-muted">{row.original.altMobile}</p>}
            </div>
          ),
        }),
        helper.accessor((d) => placeOf(d, { cities, areas }), {
          id: 'place',
          header: 'City / Area',
          cell: (i) => <span className="text-ink uppercase">{i.getValue() || '—'}</span>,
        }),
        helper.accessor('managerName', {
          header: 'Manager',
          cell: (i) => <span className="text-ink uppercase">{i.getValue() || '—'}</span>,
        }),
        helper.accessor((d) => d.executives?.[0]?.name ?? '', {
          id: 'executive',
          header: 'Executive',
          cell: ({ row, getValue }) => {
            const extra = (row.original.executives?.length ?? 0) - 1
            return (
              <span className="text-ink uppercase" title={row.original.executives?.map((e) => e.name).join(', ')}>
                {getValue() || '—'}
                {extra > 0 && <span className="ml-1 text-xs text-ink-muted">+{extra}</span>}
              </span>
            )
          },
        }),
        helper.accessor('creditLimit', {
          header: 'Credit',
          cell: ({ row, getValue }) => (
            <div className="whitespace-nowrap">
              <p className="font-mono text-sm text-ink">{getValue() ? formatINR(getValue()) : '—'}</p>
              {row.original.creditDays ? <p className="text-xs text-ink-muted">{row.original.creditDays} days</p> : null}
            </div>
          ),
        }),
        helper.accessor((d) => d.locationName || (d.latitude === null ? '' : `${d.latitude}, ${d.longitude}`), {
          id: 'location',
          header: 'Location',
          cell: ({ row, getValue }) =>
            row.original.latitude === null || row.original.latitude === undefined ? (
              <span className="text-ink-muted">—</span>
            ) : (
              <a
                href={googleMapsUrl(row.original.latitude, row.original.longitude)}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                title={getValue()}
                className="inline-flex max-w-44 items-center gap-1 font-semibold text-green-deep hover:underline"
              >
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">{getValue()}</span>
              </a>
            ),
        }),
        helper.accessor('priceTier', {
          header: 'Price Tier',
          cell: (i) => <StatusPill tone="info">{PRICE_TIER_LABEL[i.getValue()] ?? '—'}</StatusPill>,
        }),
        helper.accessor('weeklyOff', {
          header: 'Weekly Off',
          cell: (i) => <StatusPill tone="neutral">{DAY_LABEL[i.getValue()] ?? '—'}</StatusPill>,
        }),
        helper.accessor('status', {
          header: 'Status',
          cell: ({ row, getValue }) => (
            <div onClick={(e) => e.stopPropagation()}>
              <Switch
                id={`dist-status-${row.original.id}`}
                checked={getValue() === 'ACTIVE'}
                onCheckedChange={(on) => toggleStatus(row.original, on)}
                label={<span className="sr-only">{`${row.original.name} is ${getValue() === 'ACTIVE' ? 'active' : 'inactive'}`}</span>}
              />
            </div>
          ),
        }),
        helper.display({
          id: 'actions',
          header: () => <span className="sr-only">Action</span>,
          meta: { align: 'right', className: 'w-24' },
          cell: ({ row }) => (
            <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                aria-label={`Edit ${row.original.name}`}
                onClick={() => openEdit(row.original)}
                className="grid size-9 place-items-center rounded-lg border border-mint bg-white text-ink-muted hover:border-green-fresh hover:text-green-deep focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Delete ${row.original.name}`}
                onClick={() => remove(row.original)}
                className="grid size-9 place-items-center rounded-lg border border-mint bg-white text-ink-muted hover:border-danger hover:text-danger focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ),
        }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page.pageIndex, page.pageSize, distributors, cities, areas],
  )

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title="Distributors" subtitle={`${filtered.length} ${filtered.length === 1 ? 'distributor' : 'distributors'}`}>
        <Button size="lg" className="h-11" onClick={openCreate}>
          <Plus data-icon="inline-start" /> New
        </Button>
      </PageHeader>

      {loadStatus === 'failed' && (
        <Notice tone="danger">
          {loadError?.message ?? 'Could not load distributors.'}
          <button type="button" onClick={() => dispatch(fetchDistributors())} className="ml-2 font-semibold underline underline-offset-4">
            Try again
          </button>
        </Notice>
      )}

      <section className="overflow-hidden rounded-2xl border border-mint-pale bg-white">
        <div className="flex flex-col gap-3 border-b border-mint-pale p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v)
              resetPage()
            }}
            placeholder="Search firm, contact, mobile"
            className="sm:w-72"
          />
          <SearchSelect
            aria-label="Filter by manager"
            placeholder="Select manager"
            clearable
            options={managerOptions}
            value={managerId}
            onChange={(v) => {
              setManagerId(v)
              resetPage()
            }}
            className="sm:w-48"
          />
          <SearchSelect
            aria-label="Filter by executive"
            placeholder="Select executive"
            clearable
            options={executiveFilterOptions}
            value={executiveId}
            onChange={(v) => {
              setExecutiveId(v)
              resetPage()
            }}
            className="sm:w-48"
          />
          <SearchSelect
            aria-label="Filter by city"
            placeholder="Select city"
            clearable
            options={cityFilterOptions}
            value={cityId}
            onChange={(v) => {
              setCityId(v)
              resetPage()
            }}
            className="sm:w-44"
          />
          <Pagination
            pageIndex={page.pageIndex}
            pageSize={page.pageSize}
            total={filtered.length}
            onPageChange={(pageIndex) => setPagination((p) => ({ ...p, pageIndex }))}
            className="justify-between sm:ml-auto sm:justify-end"
          />
        </div>

        {loadStatus === 'loading' && !distributors.length ? (
          <div className="grid min-h-60 place-items-center" role="status" aria-label="Loading distributors">
            <span className="size-8 animate-spin rounded-full border-3 border-mint border-t-green-deep" />
          </div>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            getRowId={(d) => d.id}
            pagination={page}
            onPaginationChange={setPagination}
            onRowClick={openEdit}
            empty={
              <EmptyState
                icon={Building2}
                title={search || managerId || executiveId || cityId ? 'No distributors match' : 'No distributors yet'}
                description="A distributor is a firm appointed under a manager. Executives then work under the distributor."
              >
                <Button size="lg" onClick={openCreate}>
                  <Plus data-icon="inline-start" /> New distributor
                </Button>
              </EmptyState>
            }
          />
        )}
      </section>

      <FormDrawer
        open={Boolean(drawer)}
        onOpenChange={(open) => !open && setDrawer(null)}
        title={drawer?.editingId ? 'Edit distributor' : 'New distributor'}
        description={drawer?.editingId ? drawer.form.name : 'Appoint a distributor under a manager.'}
        onSubmit={save}
        saving={saving}
        saveDisabled={!changed}
        saveHint="Change something first"
        saveLabel={drawer?.editingId ? 'Save changes' : 'Create distributor'}
      >
        {drawer && (
          <DistributorForm
            form={drawer.form}
            errors={drawer.errors}
            onChange={(field, value) =>
              setDrawer((d) => ({ ...d, form: { ...d.form, [field]: value }, errors: { ...d.errors, [field]: undefined } }))
            }
            managers={managerOptions}
            executives={executiveOptions}
            regions={regions}
            cities={cities}
            areas={areas}
          />
        )}
      </FormDrawer>
    </div>
  )
}
