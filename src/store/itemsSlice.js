import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as itemsService from '@/services/itemsService'

/**
 * The item catalogue, backed by /api/v1/items. Shared by Items and anything
 * that picks items (schemes, price lists, orders).
 */

export const fetchItems = createAsyncThunk('items/fetch', async (_arg, { rejectWithValue }) => {
  try {
    const { items } = await itemsService.listItems()
    return items
  } catch (error) {
    return rejectWithValue(itemsService.errorFrom(error))
  }
})

export const saveItem = createAsyncThunk('items/save', async ({ id, form }, { rejectWithValue }) => {
  try {
    return id ? await itemsService.updateItem(id, form) : await itemsService.createItem(form)
  } catch (error) {
    return rejectWithValue(itemsService.errorFrom(error))
  }
})

export const setItemStatus = createAsyncThunk('items/setStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    return await itemsService.setItemStatus(id, status)
  } catch (error) {
    return rejectWithValue(itemsService.errorFrom(error))
  }
})

export const removeItem = createAsyncThunk('items/remove', async ({ id }, { rejectWithValue }) => {
  try {
    return { id, message: await itemsService.deleteItem(id) }
  } catch (error) {
    return rejectWithValue(itemsService.errorFrom(error))
  }
})

export const importItems = createAsyncThunk('items/import', async ({ items }, { rejectWithValue }) => {
  try {
    return await itemsService.importItems(items)
  } catch (error) {
    return rejectWithValue(itemsService.errorFrom(error))
  }
})

const upsert = (state, item) => {
  const i = state.list.findIndex((x) => x.id === item.id)
  if (i === -1) state.list.unshift(item)
  else state.list[i] = item
}

const itemsSlice = createSlice({
  name: 'items',
  initialState: { list: [], status: 'idle', error: null },
  reducers: {
    /** An item created somewhere else (the order editor's quick add). */
    itemAdded(state, action) {
      upsert(state, action.payload)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchItems.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchItems.fulfilled, (state, action) => {
        state.status = 'ready'
        state.list = action.payload
      })
      .addCase(fetchItems.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? { message: 'Could not load items.' }
      })
      .addCase(saveItem.fulfilled, (state, action) => upsert(state, action.payload.item))
      .addCase(setItemStatus.fulfilled, (state, action) => upsert(state, action.payload.item))
      .addCase(removeItem.fulfilled, (state, action) => {
        state.list = state.list.filter((item) => item.id !== action.payload.id)
      })
      .addCase(importItems.fulfilled, (state, action) => {
        state.list.unshift(...action.payload.added)
      })
  },
})

export const { itemAdded } = itemsSlice.actions

export const selectItems = (state) => state.items.list
export const selectItemsStatus = (state) => state.items.status
export const selectItemsError = (state) => state.items.error

export default itemsSlice.reducer
