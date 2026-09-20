import { useMemo } from 'react'
import { Map } from 'lucide-react'
import { useSelector } from 'react-redux'
import { selectCities, selectRegions } from '@/store/geographySlice'
import MasterListPage from '../shared/MasterListPage'

const norm = (s) => String(s ?? '').trim().toLowerCase()

/** Routes › Regions — the top level of Region → City → Area. */
const config = {
  kind: 'regions',
  idPrefix: 'reg-',
  title: 'Regions',
  noun: 'region',
  plural: 'regions',
  icon: Map,
  serial: false,
  searchPlaceholder: 'Search region',
  emptyText: 'Regions are the top level of your geography: region → city → area.',
  select: selectRegions,
  useContext: () => {
    const cities = useSelector(selectCities)
    return useMemo(() => ({ cities }), [cities])
  },
  searchText: (row) => row.name,
  columns: () => [{ id: 'name', header: 'Name', value: (r) => r.name }],
  fields: () => [{ id: 'name', type: 'text', label: 'Name', placeholder: 'Name', full: true }],
  emptyForm: () => ({ name: '' }),
  toForm: (row) => ({ name: row.name }),
  toRecord: (form, id) => ({ id, name: form.name.trim() }),
  validate: (form, { rows, editingId }) => {
    const e = {}
    if (!form.name.trim()) e.name = 'Enter a name.'
    else if (rows.some((r) => r.id !== editingId && norm(r.name) === norm(form.name))) e.name = 'This region already exists.'
    return e
  },
  inUse: (row, { cities }) => {
    const n = cities.filter((c) => c.regionId === row.id).length
    return n ? `${row.name} has ${n} ${n === 1 ? 'city' : 'cities'}. Move or delete those first.` : null
  },
}

export default function Regions() {
  return <MasterListPage config={config} />
}
