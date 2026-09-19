import { createSlice } from '@reduxjs/toolkit'
import { INITIAL_PRICE_LISTS } from '@/mocks/priceLists'

/** Price lists, shared by the list page and the create/edit page. */
const priceListsSlice = createSlice({
  name: 'priceLists',
  initialState: { list: INITIAL_PRICE_LISTS },
  reducers: {
    priceListSaved(state, action) {
      const index = state.list.findIndex((p) => p.id === action.payload.id)
      if (index === -1) state.list.unshift(action.payload)
      else state.list[index] = action.payload
    },
    priceListDeleted(state, action) {
      state.list = state.list.filter((p) => p.id !== action.payload)
    },
    priceListRestored(state, action) {
      const { priceList, index } = action.payload
      state.list.splice(Math.min(index, state.list.length), 0, priceList)
    },
  },
})

export const { priceListSaved, priceListDeleted, priceListRestored } = priceListsSlice.actions
export const selectPriceLists = (state) => state.priceLists.list

export default priceListsSlice.reducer
