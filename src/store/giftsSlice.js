import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as giftsService from '@/services/giftsService'

/** Giveaways, backed by /api/v1/gifts. Not items: they never touch stock. */

export const fetchGifts = createAsyncThunk('gifts/fetch', async (_arg, { rejectWithValue }) => {
  try {
    return await giftsService.listGifts()
  } catch (error) {
    return rejectWithValue(giftsService.errorFrom(error))
  }
})

export const addGift = createAsyncThunk('gifts/add', async ({ name, unit, image }, { rejectWithValue }) => {
  try {
    return await giftsService.createGift({ name, unit, image })
  } catch (error) {
    return rejectWithValue(giftsService.errorFrom(error))
  }
})

const giftsSlice = createSlice({
  name: 'gifts',
  initialState: { list: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGifts.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchGifts.fulfilled, (state, action) => {
        state.status = 'ready'
        state.list = action.payload
      })
      .addCase(fetchGifts.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? { message: 'Could not load the free items.' }
      })
      .addCase(addGift.fulfilled, (state, action) => {
        state.list.push(action.payload.gift)
        state.list.sort((a, b) => a.name.localeCompare(b.name))
      })
  },
})

export const selectGifts = (state) => state.gifts.list
export const selectGiftsStatus = (state) => state.gifts.status

export default giftsSlice.reducer
