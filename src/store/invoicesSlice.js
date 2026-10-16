import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as invoicesService from '@/services/invoicesService'

/** Sales invoices, backed by /api/v1/invoices. */

export const fetchInvoices = createAsyncThunk('invoices/fetch', async (params, { rejectWithValue }) => {
  try {
    return await invoicesService.listInvoices(params)
  } catch (error) {
    return rejectWithValue(invoicesService.errorFrom(error))
  }
})

export const saveInvoice = createAsyncThunk('invoices/save', async ({ id, form }, { rejectWithValue }) => {
  try {
    return id ? await invoicesService.updateInvoice(id, form) : await invoicesService.createInvoice(form)
  } catch (error) {
    return rejectWithValue(invoicesService.errorFrom(error))
  }
})

export const issueInvoice = createAsyncThunk('invoices/issue', async ({ id }, { rejectWithValue }) => {
  try {
    return await invoicesService.issueInvoice(id)
  } catch (error) {
    return rejectWithValue(invoicesService.errorFrom(error))
  }
})

export const setInvoiceStatus = createAsyncThunk('invoices/setStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    return await invoicesService.setInvoiceStatus(id, status)
  } catch (error) {
    return rejectWithValue(invoicesService.errorFrom(error))
  }
})

export const removeInvoice = createAsyncThunk('invoices/remove', async ({ id }, { rejectWithValue }) => {
  try {
    return { id, message: await invoicesService.deleteInvoice(id) }
  } catch (error) {
    return rejectWithValue(invoicesService.errorFrom(error))
  }
})

const upsert = (state, invoice) => {
  const at = state.list.findIndex((row) => row.id === invoice.id)
  if (at === -1) state.list.unshift(invoice)
  else state.list[at] = invoice
}

const invoicesSlice = createSlice({
  name: 'invoices',
  initialState: { list: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoices.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.status = 'ready'
        state.list = action.payload.invoices
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? { message: 'Could not load the invoices.' }
      })
      .addCase(saveInvoice.fulfilled, (state, action) => upsert(state, action.payload.invoice))
      .addCase(issueInvoice.fulfilled, (state, action) => upsert(state, action.payload.invoice))
      .addCase(setInvoiceStatus.fulfilled, (state, action) => upsert(state, action.payload.invoice))
      .addCase(removeInvoice.fulfilled, (state, action) => {
        state.list = state.list.filter((row) => row.id !== action.payload.id)
      })
  },
})

export const selectInvoices = (state) => state.invoices.list
export const selectInvoicesStatus = (state) => state.invoices.status
export const selectInvoicesError = (state) => state.invoices.error

export default invoicesSlice.reducer
