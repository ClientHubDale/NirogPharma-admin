import { createSlice } from '@reduxjs/toolkit'
import { INITIAL_CITIES, INITIAL_REGIONS, INITIAL_ROUTES } from '@/mocks/geography'

/**
 * Region → City → Area masters (Routes module), shared by parties, users and
 * reports. "Area" is a route/beat: it belongs to a city and a warehouse.
 */
const list = (state, kind) => state[kind]

const geographySlice = createSlice({
  name: 'geography',
  initialState: { regions: INITIAL_REGIONS, cities: INITIAL_CITIES, routes: INITIAL_ROUTES },
  reducers: {
    // kind: 'regions' | 'cities' | 'routes'
    recordSaved(state, { payload: { kind, record } }) {
      const rows = list(state, kind)
      const i = rows.findIndex((r) => r.id === record.id)
      if (i === -1) rows.unshift(record)
      else rows[i] = { ...rows[i], ...record }
    },
    recordDeleted(state, { payload: { kind, id } }) {
      state[kind] = list(state, kind).filter((r) => r.id !== id)
    },
    recordRestored(state, { payload: { kind, record, index } }) {
      list(state, kind).splice(Math.min(index, list(state, kind).length), 0, record)
    },
    recordsImported(state, { payload: { kind, records } }) {
      list(state, kind).unshift(...records)
    },
    routeAdded(state, action) {
      state.routes.push(action.payload)
    },
  },
})

export const { recordSaved, recordDeleted, recordRestored, recordsImported, routeAdded } = geographySlice.actions
export const selectRegions = (state) => state.geography.regions
export const selectCities = (state) => state.geography.cities
export const selectRoutes = (state) => state.geography.routes
export default geographySlice.reducer
