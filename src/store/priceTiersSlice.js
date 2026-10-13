import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as priceTiersService from '@/services/priceTiersService'
import { BUILT_IN_TIERS } from '@/constants/priceTiers'

/**
 * The rate columns, backed by /api/v1/price-tiers. Four are seeded and locked;
 * the admin adds the rest from the item form. Anything that prices an item or
 * a distributor reads this list rather than restating the multipliers.
 */

export const fetchPriceTiers = createAsyncThunk('priceTiers/fetch', async (_arg, { rejectWithValue }) => {
  try {
    return await priceTiersService.fetchPriceTiers()
  } catch (error) {
    return rejectWithValue(priceTiersService.errorFrom(error))
  }
})

export const addPriceTier = createAsyncThunk('priceTiers/add', async ({ discounts, label }, { rejectWithValue }) => {
  try {
    return await priceTiersService.createPriceTier({ discounts, label })
  } catch (error) {
    return rejectWithValue(priceTiersService.errorFrom(error))
  }
})

export const removePriceTier = createAsyncThunk('priceTiers/remove', async ({ id }, { rejectWithValue }) => {
  try {
    return { id, message: await priceTiersService.deletePriceTier(id) }
  } catch (error) {
    return rejectWithValue(priceTiersService.errorFrom(error))
  }
})

const priceTiersSlice = createSlice({
  // Until the list arrives, the four built-in columns stand in — they are the
  // same rows the server seeded, so nothing jumps when it does.
  name: 'priceTiers',
  initialState: { list: BUILT_IN_TIERS, status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPriceTiers.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchPriceTiers.fulfilled, (state, action) => {
        state.status = 'ready'
        state.list = action.payload
      })
      .addCase(fetchPriceTiers.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? { message: 'Could not load the rate columns.' }
      })
      .addCase(addPriceTier.fulfilled, (state, action) => {
        state.list.push(action.payload.tier)
      })
      .addCase(removePriceTier.fulfilled, (state, action) => {
        state.list = state.list.filter((tier) => tier.id !== action.payload.id)
      })
  },
})

export const selectPriceTiers = (state) => state.priceTiers.list
export const selectPriceTiersStatus = (state) => state.priceTiers.status

export default priceTiersSlice.reducer
