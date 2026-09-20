import { useMemo } from 'react'
import { Building2 } from 'lucide-react'
import { useSelector } from 'react-redux'
import { selectCities, selectRegions, selectRoutes } from '@/store/geographySlice'
import MasterListPage from '../shared/MasterListPage'

const norm = (s) => String(s ?? '').trim().toLowerCase()

/** Routes › Cities — each city belongs to a region. */
const config = {
  kind: 'cities',
  idPrefix: 'cty-',
  title: 'Cities',
  noun: 'city',
  plural: 'cities',
  icon: Building2,
  serial: true,
  searchPlaceholder: 'Search city',
  emptyText: 'Cities sit inside a region and hold the areas your staff visit.',
  select: selectCities,
  useContext: () => {
    const regions = useSelector(selectRegions)
    const routes = useSelector(selectRoutes)
    return useMemo(
      () => ({ regions, routes, regionName: Object.fromEntries(regions.map((r) => [r.id, r.name])), regionOptions: regions.map((r) => ({ value: r.id, label: r.name })) }),
      [regions, routes],
    )
  },
  searchText: (row, { regionName }) => `${row.name} ${regionName[row.regionId] ?? ''}`,
  columns: ({ regionName }) => [
    { id: 'name', header: 'Name', value: (r) => r.name },
    { id: 'region', header: 'Region', value: (r) => regionName[r.regionId] ?? '' },
  ],
  filters: ({ regionOptions }) => [
    { id: 'regionId', label: 'Select Region', options: regionOptions, match: (row, value) => row.regionId === value },
  ],
  fields: ({ regionOptions }) => [
    { id: 'regionId', type: 'select', label: 'Region', placeholder: 'Select Region', options: regionOptions, full: true },
    { id: 'name', type: 'text', label: 'Name', placeholder: 'Name', full: true },
  ],
  emptyForm: (filters) => ({ regionId: filters.regionId || '', name: '' }),
  toForm: (row) => ({ regionId: row.regionId, name: row.name }),
  toRecord: (form, id) => ({ id, name: form.name.trim(), regionId: form.regionId }),
  validate: (form, { rows, editingId }) => {
    const e = {}
    if (!form.regionId) e.regionId = 'Choose a region.'
    if (!form.name.trim()) e.name = 'Enter a name.'
    else if (rows.some((r) => r.id !== editingId && r.regionId === form.regionId && norm(r.name) === norm(form.name))) e.name = 'This city already exists in that region.'
    return e
  },
  inUse: (row, { routes }) => {
    const n = routes.filter((r) => r.cityId === row.id).length
    return n ? `${row.name} has ${n} ${n === 1 ? 'area' : 'areas'}. Move or delete those first.` : null
  },
}

export default function Cities() {
  return <MasterListPage config={config} />
}
