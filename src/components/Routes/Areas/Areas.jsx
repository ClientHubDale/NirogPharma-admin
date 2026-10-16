import { useMemo } from 'react'
import { Signpost } from 'lucide-react'
import { useSelector } from 'react-redux'
import { selectCities, selectRegions, selectRoutes } from '@/store/geographySlice'
import { selectParties } from '@/store/partiesSlice'
import MasterListPage from '../shared/MasterListPage'

const norm = (s) => String(s ?? '').trim().toLowerCase()

/**
 * Routes › Areas — the beats staff visit. An area belongs to a city (and so to
 * a region).
 */
const config = {
  kind: 'routes',
  idPrefix: 'rt-',
  title: 'Areas',
  noun: 'area',
  plural: 'areas',
  icon: Signpost,
  serial: true,
  searchPlaceholder: 'Search area, city',
  emptyText: 'Areas are the beats your field staff work — customers and suppliers are assigned to them.',
  select: selectRoutes,
  useContext: () => {
    const regions = useSelector(selectRegions)
    const cities = useSelector(selectCities)
    const customers = useSelector(selectParties('CUSTOMER'))
    const suppliers = useSelector(selectParties('SUPPLIER'))
    return useMemo(() => {
      const cityById = Object.fromEntries(cities.map((c) => [c.id, c]))
      const regionName = Object.fromEntries(regions.map((r) => [r.id, r.name]))
      return {
        regions,
        cities,
        cityById,
        regionName,
        parties: [...customers, ...suppliers],
        cityName: (routeRow) => cityById[routeRow.cityId]?.name ?? '',
        regionOf: (routeRow) => regionName[cityById[routeRow.cityId]?.regionId] ?? '',
        regionOptions: regions.map((r) => ({ value: r.id, label: r.name })),
      }
    }, [regions, cities, customers, suppliers])
  },
  searchText: (row, ctx) => `${row.name} ${ctx.cityName(row)} ${ctx.regionOf(row)}`,
  columns: (ctx) => [
    { id: 'name', header: 'Name', value: (r) => r.name },
    { id: 'city', header: 'City', value: (r) => ctx.cityName(r) },
    { id: 'region', header: 'Region', value: (r) => ctx.regionOf(r) },
  ],
  filters: (ctx, filters) => [
    {
      id: 'regionId',
      label: 'Select Region',
      options: ctx.regionOptions,
      clears: ['cityId'],
      match: (row, value) => ctx.cityById[row.cityId]?.regionId === value,
    },
    {
      id: 'cityId',
      label: 'Select City',
      options: ctx.cities.filter((c) => !filters.regionId || c.regionId === filters.regionId).map((c) => ({ value: c.id, label: c.name })),
      match: (row, value) => row.cityId === value,
    },
  ],
  fields: (ctx, form) => [
    { id: 'regionId', type: 'select', label: 'Region', placeholder: 'Select Region', options: ctx.regionOptions, clears: ['cityId'] },
    {
      id: 'cityId',
      type: 'select',
      label: 'City',
      placeholder: 'Select City',
      options: ctx.cities.filter((c) => !form.regionId || c.regionId === form.regionId).map((c) => ({ value: c.id, label: c.name })),
    },
    { id: 'name', type: 'text', label: 'Name', placeholder: 'Name', full: true },
  ],
  emptyForm: (filters) => ({ regionId: filters.regionId || '', cityId: filters.cityId || '', name: '' }),
  toForm: (row) => ({ regionId: '', cityId: row.cityId, name: row.name }),
  toRecord: (form, id) => ({ id, name: form.name.trim(), cityId: form.cityId }),
  validate: (form, { rows, editingId }) => {
    const e = {}
    if (!form.cityId) e.cityId = 'Choose a city.'
    if (!form.name.trim()) e.name = 'Enter a name.'
    else if (rows.some((r) => r.id !== editingId && r.cityId === form.cityId && norm(r.name) === norm(form.name))) e.name = 'This area already exists in that city.'
    return e
  },
  inUse: (row, { parties }) => {
    const n = parties.filter((p) => p.routeId === row.id).length
    return n ? `${row.name} is used by ${n} ${n === 1 ? 'party' : 'parties'}. Move them to another area first.` : null
  },

  /* ── Excel ── */
  sheetColumns: [
    { key: 'name', header: 'Name', width: 26, required: true },
    { key: 'city', header: 'City', width: 20, required: true },
    { key: 'region', header: 'Region', width: 20 },
  ],
  sampleRows: [
    { name: 'Lawad', city: 'Meerut', region: 'Uttar Pradesh' },
    { name: 'Deoband', city: 'Saharanpur', region: 'Uttar Pradesh' },
  ],
  importRequiredNote: 'Name and City. The city must already exist under Routes › Cities.',
  toSheetRow: (row, ctx) => ({
    name: row.name,
    city: ctx.cityName(row),
    region: ctx.regionOf(row),
  }),
  fromSheet: (sheetRows, ctx) => {
    const records = []
    const skipped = []
    const existing = [...ctx.rows]
    sheetRows.forEach((raw, i) => {
      const line = i + 2
      const name = String(raw.name ?? '').trim()
      const cityText = String(raw.city ?? '').trim()
      if (!name) return skipped.push({ line, reason: 'missing Name' })
      if (!cityText) return skipped.push({ line, reason: 'missing City' })
      const city = ctx.cities.find((c) => norm(c.name) === norm(cityText))
      if (!city) return skipped.push({ line, reason: `unknown City "${cityText}"` })
      if ([...existing, ...records].some((r) => r.cityId === city.id && norm(r.name) === norm(name))) return skipped.push({ line, reason: `"${name}" already exists in ${city.name}` })
      records.push({ id: `rt-${Date.now()}-${i}`, name, cityId: city.id })
    })
    return { records, skipped }
  },
}

export default function Areas() {
  return <MasterListPage config={config} />
}
