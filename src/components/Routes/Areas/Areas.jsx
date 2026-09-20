import { useMemo } from 'react'
import { Signpost } from 'lucide-react'
import { useSelector } from 'react-redux'
import { WAREHOUSES } from '@/mocks/items'
import { selectCities, selectRegions, selectRoutes } from '@/store/geographySlice'
import { selectParties } from '@/store/partiesSlice'
import MasterListPage from '../shared/MasterListPage'

const norm = (s) => String(s ?? '').trim().toLowerCase()

/**
 * Routes › Areas — the beats staff visit. An area belongs to a city (and so to
 * a region) and is served from one warehouse.
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
        warehouseName: Object.fromEntries(WAREHOUSES.map((w) => [w.value, w.label])),
        cityName: (routeRow) => cityById[routeRow.cityId]?.name ?? '',
        regionOf: (routeRow) => regionName[cityById[routeRow.cityId]?.regionId] ?? '',
        regionOptions: regions.map((r) => ({ value: r.id, label: r.name })),
      }
    }, [regions, cities, customers, suppliers])
  },
  searchText: (row, ctx) => `${row.name} ${ctx.cityName(row)} ${ctx.regionOf(row)}`,
  columns: (ctx) => [
    { id: 'name', header: 'Name', value: (r) => r.name, sub: (r) => ctx.warehouseName[r.warehouseId] },
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
    { id: 'warehouseId', label: 'Select Warehouse', options: WAREHOUSES, match: (row, value) => row.warehouseId === value },
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
    { id: 'warehouseId', type: 'select', label: 'Warehouse', placeholder: 'Select Warehouse', options: WAREHOUSES },
    { id: 'name', type: 'text', label: 'Name', placeholder: 'Name', full: true },
  ],
  emptyForm: (filters) => ({ regionId: filters.regionId || '', cityId: filters.cityId || '', warehouseId: filters.warehouseId || WAREHOUSES[0].value, name: '' }),
  toForm: (row) => ({ regionId: '', cityId: row.cityId, warehouseId: row.warehouseId, name: row.name }),
  toRecord: (form, id) => ({ id, name: form.name.trim(), cityId: form.cityId, warehouseId: form.warehouseId }),
  validate: (form, { rows, editingId }) => {
    const e = {}
    if (!form.cityId) e.cityId = 'Choose a city.'
    if (!form.warehouseId) e.warehouseId = 'Choose a warehouse.'
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
    { key: 'warehouse', header: 'Warehouse', width: 34 },
  ],
  sampleRows: [
    { name: 'Lawad', city: 'Meerut', region: 'Uttar Pradesh', warehouse: WAREHOUSES[0].label },
    { name: 'Deoband', city: 'Saharanpur', region: 'Uttar Pradesh', warehouse: WAREHOUSES[1].label },
  ],
  importRequiredNote: 'Name and City. The city must already exist under Routes › Cities. Warehouse defaults to the first one.',
  toSheetRow: (row, ctx) => ({
    name: row.name,
    city: ctx.cityName(row),
    region: ctx.regionOf(row),
    warehouse: ctx.warehouseName[row.warehouseId] ?? '',
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
      const warehouse = WAREHOUSES.find((w) => norm(w.label) === norm(raw.warehouse))?.value ?? WAREHOUSES[0].value
      records.push({ id: `rt-${Date.now()}-${i}`, name, cityId: city.id, warehouseId: warehouse })
    })
    return { records, skipped }
  },
}

export default function Areas() {
  return <MasterListPage config={config} />
}
