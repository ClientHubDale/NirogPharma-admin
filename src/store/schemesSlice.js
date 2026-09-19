import { createSlice } from '@reduxjs/toolkit'
import { INITIAL_SCHEMES } from '@/mocks/schemes'

/** Schemes, shared by the list page and the create/edit page. */
const schemesSlice = createSlice({
  name: 'schemes',
  initialState: { list: INITIAL_SCHEMES },
  reducers: {
    schemeSaved(state, action) {
      const index = state.list.findIndex((s) => s.id === action.payload.id)
      if (index === -1) state.list.unshift(action.payload)
      else state.list[index] = action.payload
    },
    schemeStatusToggled(state, action) {
      const scheme = state.list.find((s) => s.id === action.payload)
      if (scheme) scheme.status = scheme.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    },
    schemeDeleted(state, action) {
      state.list = state.list.filter((s) => s.id !== action.payload)
    },
    schemeRestored(state, action) {
      const { scheme, index } = action.payload
      state.list.splice(Math.min(index, state.list.length), 0, scheme)
    },
  },
})

export const { schemeSaved, schemeStatusToggled, schemeDeleted, schemeRestored } = schemesSlice.actions
export const selectSchemes = (state) => state.schemes.list
export const selectSchemeById = (id) => (state) => state.schemes.list.find((s) => s.id === id)

export default schemesSlice.reducer
