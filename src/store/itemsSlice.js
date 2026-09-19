import { createSlice } from '@reduxjs/toolkit'
import { INITIAL_ITEMS } from '@/mocks/items'

/**
 * Item catalogue, shared by Items and anything that picks items (schemes,
 * price lists, orders). Mock-backed in the UI phase; becomes API-backed later.
 */
const itemsSlice = createSlice({
  name: 'items',
  initialState: { list: INITIAL_ITEMS },
  reducers: {
    itemsReplaced(state, action) {
      state.list = action.payload
    },
  },
})

const { itemsReplaced } = itemsSlice.actions

/** Works like a useState setter: pass a new list or a function of the current one. */
export const setItems = (updater) => (dispatch, getState) =>
  dispatch(itemsReplaced(typeof updater === 'function' ? updater(getState().items.list) : updater))

export const selectItems = (state) => state.items.list

export default itemsSlice.reducer
