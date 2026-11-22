import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as paymentsOutService from '@/services/paymentsOutService'
import * as suppliersService from '@/services/suppliersService'

/** Money paid to suppliers, and the suppliers themselves — /api/v1/payments-out. */

export const fetchPaymentsOut = createAsyncThunk('paymentsOut/fetch', async (params, { rejectWithValue }) => {
  try {
    return await paymentsOutService.listPaymentsOut(params)
  } catch (error) {
    return rejectWithValue(paymentsOutService.errorFrom(error))
  }
})

export const fetchSuppliers = createAsyncThunk('paymentsOut/suppliers', async (_arg, { rejectWithValue }) => {
  try {
    return await suppliersService.listSuppliers()
  } catch (error) {
    return rejectWithValue(suppliersService.errorFrom(error))
  }
})

export const saveSupplier = createAsyncThunk('paymentsOut/saveSupplier', async ({ id, form }, { rejectWithValue }) => {
  try {
    return id ? await suppliersService.updateSupplier(id, form) : await suppliersService.createSupplier(form)
  } catch (error) {
    return rejectWithValue(suppliersService.errorFrom(error))
  }
})

export const savePaymentOut = createAsyncThunk('paymentsOut/save', async ({ id, form }, { rejectWithValue }) => {
  try {
    return id ? await paymentsOutService.updatePaymentOut(id, form) : await paymentsOutService.createPaymentOut(form)
  } catch (error) {
    return rejectWithValue(paymentsOutService.errorFrom(error))
  }
})

export const setPaymentOutStatus = createAsyncThunk('paymentsOut/setStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    return await paymentsOutService.setPaymentOutStatus(id, status)
  } catch (error) {
    return rejectWithValue(paymentsOutService.errorFrom(error))
  }
})

export const removePaymentOut = createAsyncThunk('paymentsOut/remove', async ({ id }, { rejectWithValue }) => {
  try {
    return { id, message: await paymentsOutService.deletePaymentOut(id) }
  } catch (error) {
    return rejectWithValue(paymentsOutService.errorFrom(error))
  }
})

const upsert = (state, payment) => {
  const at = state.list.findIndex((row) => row.id === payment.id)
  if (at === -1) state.list.unshift(payment)
  else state.list[at] = payment
}

const paymentsOutSlice = createSlice({
  name: 'paymentsOut',
  initialState: { list: [], suppliers: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPaymentsOut.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchPaymentsOut.fulfilled, (state, action) => {
        state.status = 'ready'
        state.list = action.payload.payments
      })
      .addCase(fetchPaymentsOut.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? { message: 'Could not load the payments.' }
      })
      .addCase(fetchSuppliers.fulfilled, (state, action) => {
        state.suppliers = action.payload.suppliers
      })
      .addCase(saveSupplier.fulfilled, (state, action) => {
        const supplier = action.payload.supplier
        const at = state.suppliers.findIndex((row) => row.id === supplier.id)
        if (at === -1) state.suppliers.unshift(supplier)
        else state.suppliers[at] = supplier
      })
      .addCase(savePaymentOut.fulfilled, (state, action) => upsert(state, action.payload.payment))
      .addCase(setPaymentOutStatus.fulfilled, (state, action) => upsert(state, action.payload.payment))
      .addCase(removePaymentOut.fulfilled, (state, action) => {
        state.list = state.list.filter((row) => row.id !== action.payload.id)
      })
  },
})

export const selectPaymentsOut = (state) => state.paymentsOut.list
export const selectSuppliers = (state) => state.paymentsOut.suppliers
export const selectPaymentsOutStatus = (state) => state.paymentsOut.status
export const selectPaymentsOutError = (state) => state.paymentsOut.error

export default paymentsOutSlice.reducer
