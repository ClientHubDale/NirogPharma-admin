import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as ordersService from '@/services/ordersService'

/** Sales orders, backed by /api/v1/orders. */

export const fetchOrders = createAsyncThunk('orders/fetch', async (params, { rejectWithValue }) => {
  try {
    return await ordersService.listOrders(params)
  } catch (error) {
    return rejectWithValue(ordersService.errorFrom(error))
  }
})

export const saveOrder = createAsyncThunk('orders/save', async ({ id, form }, { rejectWithValue }) => {
  try {
    return id ? await ordersService.updateOrder(id, form) : await ordersService.createOrder(form)
  } catch (error) {
    return rejectWithValue(ordersService.errorFrom(error))
  }
})

export const setOrderStatus = createAsyncThunk('orders/setStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    return await ordersService.setOrderStatus(id, status)
  } catch (error) {
    return rejectWithValue(ordersService.errorFrom(error))
  }
})

export const convertOrder = createAsyncThunk('orders/convert', async ({ id, body }, { rejectWithValue }) => {
  try {
    return await ordersService.convertToInvoice(id, body)
  } catch (error) {
    return rejectWithValue(ordersService.errorFrom(error))
  }
})

export const removeOrder = createAsyncThunk('orders/remove', async ({ id }, { rejectWithValue }) => {
  try {
    return { id, message: await ordersService.deleteOrder(id) }
  } catch (error) {
    return rejectWithValue(ordersService.errorFrom(error))
  }
})

const upsert = (state, order) => {
  const at = state.list.findIndex((row) => row.id === order.id)
  if (at === -1) state.list.unshift(order)
  else state.list[at] = order
}

const ordersSlice = createSlice({
  name: 'orders',
  initialState: { list: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.status = 'ready'
        state.list = action.payload.orders
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? { message: 'Could not load the orders.' }
      })
      .addCase(saveOrder.fulfilled, (state, action) => upsert(state, action.payload.order))
      .addCase(setOrderStatus.fulfilled, (state, action) => upsert(state, action.payload.order))
      .addCase(convertOrder.fulfilled, (state, action) => upsert(state, action.payload.order))
      .addCase(removeOrder.fulfilled, (state, action) => {
        state.list = state.list.filter((row) => row.id !== action.payload.id)
      })
  },
})

export const selectOrders = (state) => state.orders.list
export const selectOrdersStatus = (state) => state.orders.status
export const selectOrdersError = (state) => state.orders.error

export default ordersSlice.reducer
