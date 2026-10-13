import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as stockService from '@/services/stockService'

/**
 * Stock, backed by /api/v1/stocks. The period the screens are looking at is
 * part of the request, so a reload after any movement brings back figures that
 * already add up — nothing is recalculated in the browser.
 */

export const fetchBatches = createAsyncThunk('stock/fetchBatches', async (params, { rejectWithValue }) => {
  try {
    return await stockService.listBatches(params)
  } catch (error) {
    return rejectWithValue(stockService.errorFrom(error))
  }
})

export const fetchDistributorStock = createAsyncThunk('stock/fetchDistributorStock', async (params, { rejectWithValue }) => {
  try {
    return await stockService.listDistributorStock(params)
  } catch (error) {
    return rejectWithValue(stockService.errorFrom(error))
  }
})

export const fetchStockSummary = createAsyncThunk('stock/fetchSummary', async (_arg, { rejectWithValue }) => {
  try {
    return await stockService.fetchSummary()
  } catch (error) {
    return rejectWithValue(stockService.errorFrom(error))
  }
})

export const saveBatch = createAsyncThunk('stock/saveBatch', async ({ id, form }, { rejectWithValue }) => {
  try {
    return id ? await stockService.updateBatch(id, form) : await stockService.createBatch(form)
  } catch (error) {
    return rejectWithValue(stockService.errorFrom(error))
  }
})

export const removeBatch = createAsyncThunk('stock/removeBatch', async ({ id }, { rejectWithValue }) => {
  try {
    return { id, message: await stockService.deleteBatch(id) }
  } catch (error) {
    return rejectWithValue(stockService.errorFrom(error))
  }
})

export const issueStock = createAsyncThunk('stock/issue', async (body, { rejectWithValue }) => {
  try {
    return await stockService.issueStock(body)
  } catch (error) {
    return rejectWithValue(stockService.errorFrom(error))
  }
})

export const returnStock = createAsyncThunk('stock/return', async (body, { rejectWithValue }) => {
  try {
    return await stockService.returnStock(body)
  } catch (error) {
    return rejectWithValue(stockService.errorFrom(error))
  }
})

const stockSlice = createSlice({
  name: 'stock',
  initialState: {
    batches: [],
    distributorStock: [],
    summary: { batches: 0, quantity: 0, expired: 0, expiring: 0 },
    status: 'idle',
    distributorStatus: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBatches.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchBatches.fulfilled, (state, action) => {
        state.status = 'ready'
        state.batches = action.payload.batches
      })
      .addCase(fetchBatches.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? { message: 'Could not load the stock.' }
      })
      .addCase(fetchDistributorStock.pending, (state) => {
        state.distributorStatus = 'loading'
        state.error = null
      })
      .addCase(fetchDistributorStock.fulfilled, (state, action) => {
        state.distributorStatus = 'ready'
        state.distributorStock = action.payload.rows
      })
      .addCase(fetchDistributorStock.rejected, (state, action) => {
        state.distributorStatus = 'failed'
        state.error = action.payload ?? { message: 'Could not load what the distributors hold.' }
      })
      .addCase(fetchStockSummary.fulfilled, (state, action) => {
        state.summary = action.payload
      })
  },
})

export const selectBatches = (state) => state.stock.batches
export const selectBatchesStatus = (state) => state.stock.status
export const selectDistributorStock = (state) => state.stock.distributorStock
export const selectDistributorStockStatus = (state) => state.stock.distributorStatus
export const selectStockSummary = (state) => state.stock.summary
export const selectStockError = (state) => state.stock.error

export default stockSlice.reducer
