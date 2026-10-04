import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as distributorsService from '@/services/distributorsService'

/**
 * Distributor firms — Parties › Distributors, backed by /api/v1/distributors.
 * A distributor has no login: admin → manager → distributor → executive.
 */

export const fetchDistributors = createAsyncThunk('distributors/fetch', async (_arg, { rejectWithValue }) => {
  try {
    const { distributors } = await distributorsService.listDistributors()
    return distributors
  } catch (error) {
    return rejectWithValue(distributorsService.errorFrom(error))
  }
})

export const saveDistributor = createAsyncThunk('distributors/save', async ({ id, form }, { rejectWithValue }) => {
  try {
    return id ? await distributorsService.updateDistributor(id, form) : await distributorsService.createDistributor(form)
  } catch (error) {
    return rejectWithValue(distributorsService.errorFrom(error))
  }
})

export const setDistributorStatus = createAsyncThunk('distributors/setStatus', async ({ id, isActive }, { rejectWithValue }) => {
  try {
    return await distributorsService.setDistributorStatus(id, isActive)
  } catch (error) {
    return rejectWithValue(distributorsService.errorFrom(error))
  }
})

export const removeDistributor = createAsyncThunk('distributors/remove', async ({ id }, { rejectWithValue }) => {
  try {
    return { id, message: await distributorsService.deleteDistributor(id) }
  } catch (error) {
    return rejectWithValue(distributorsService.errorFrom(error))
  }
})

const upsert = (state, distributor) => {
  const i = state.list.findIndex((d) => d.id === distributor.id)
  if (i === -1) state.list.unshift(distributor)
  else state.list[i] = distributor
}

const distributorsSlice = createSlice({
  name: 'distributors',
  initialState: { list: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDistributors.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchDistributors.fulfilled, (state, action) => {
        state.status = 'ready'
        state.list = action.payload
      })
      .addCase(fetchDistributors.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? { message: 'Could not load distributors.' }
      })
      .addCase(saveDistributor.fulfilled, (state, action) => upsert(state, action.payload.distributor))
      .addCase(setDistributorStatus.fulfilled, (state, action) => upsert(state, action.payload.distributor))
      .addCase(removeDistributor.fulfilled, (state, action) => {
        state.list = state.list.filter((d) => d.id !== action.payload.id)
      })
  },
})

export const selectDistributors = (state) => state.distributors.list
export const selectDistributorsStatus = (state) => state.distributors.status
export const selectDistributorsError = (state) => state.distributors.error

export default distributorsSlice.reducer
