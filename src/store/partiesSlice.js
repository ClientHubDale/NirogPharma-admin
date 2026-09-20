import { createSlice } from '@reduxjs/toolkit'
import { INITIAL_CUSTOMERS } from '@/mocks/customers'
import { INITIAL_SUPPLIERS } from '@/mocks/suppliers'

/**
 * Customers and suppliers, keyed by party type. Every action carries `type`
 * ('CUSTOMER' | 'SUPPLIER') so one slice serves both tabs.
 */
const partiesSlice = createSlice({
  name: 'parties',
  initialState: { CUSTOMER: INITIAL_CUSTOMERS, SUPPLIER: INITIAL_SUPPLIERS },
  reducers: {
    partySaved(state, { payload: { type, party } }) {
      const list = state[type]
      const i = list.findIndex((p) => p.id === party.id)
      if (i === -1) list.unshift(party)
      else list[i] = party
    },
    partiesAdded(state, { payload: { type, parties } }) {
      state[type].unshift(...parties)
    },
    partyPatched(state, { payload: { type, id, changes } }) {
      const p = state[type].find((x) => x.id === id)
      if (p) Object.assign(p, changes)
    },
    partyDeleted(state, { payload: { type, id } }) {
      state[type] = state[type].filter((p) => p.id !== id)
    },
    partyRestored(state, { payload: { type, party, index } }) {
      state[type].splice(Math.min(index, state[type].length), 0, party)
    },
  },
})

export const { partySaved, partiesAdded, partyPatched, partyDeleted, partyRestored } = partiesSlice.actions

const selectors = {}
/** Memo-free but stable per type: `useSelector(selectParties('CUSTOMER'))`. */
export const selectParties = (type) => (selectors[type] ??= (state) => state.parties[type])

export default partiesSlice.reducer
