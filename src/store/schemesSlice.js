import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as schemesService from '@/services/schemesService'

/**
 * Schemes, shared by the list page and the create/edit page.
 *
 * They live on the server now, in the one table the item form also writes to —
 * so a scheme typed into an item appears here, and one made here survives a
 * refresh.
 */
export const fetchSchemes = createAsyncThunk('schemes/fetch', async (_arg, { rejectWithValue }) => {
  try {
    const { schemes } = await schemesService.listSchemes({ limit: 300 })
    return schemes
  } catch (error) {
    return rejectWithValue(schemesService.errorFrom(error))
  }
})

export const saveScheme = createAsyncThunk('schemes/save', async ({ id, payload }, { rejectWithValue }) => {
  try {
    return id ? await schemesService.updateScheme(id, payload) : await schemesService.createScheme(payload)
  } catch (error) {
    return rejectWithValue(schemesService.errorFrom(error))
  }
})

export const toggleSchemeStatus = createAsyncThunk('schemes/status', async ({ id, status }, { rejectWithValue }) => {
  try {
    return await schemesService.setSchemeStatus(id, status)
  } catch (error) {
    return rejectWithValue(schemesService.errorFrom(error))
  }
})

export const removeScheme = createAsyncThunk('schemes/remove', async (id, { rejectWithValue }) => {
  try {
    await schemesService.deleteScheme(id)
    return id
  } catch (error) {
    return rejectWithValue(schemesService.errorFrom(error))
  }
})

const upsert = (state, scheme) => {
  const index = state.list.findIndex((row) => row.id === scheme.id)
  if (index === -1) state.list.unshift(scheme)
  else state.list[index] = scheme
}

const schemesSlice = createSlice({
  name: 'schemes',
  initialState: { list: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchemes.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchSchemes.fulfilled, (state, { payload }) => {
        state.status = 'ready'
        state.error = null
        state.list = payload
      })
      .addCase(fetchSchemes.rejected, (state, { payload }) => {
        state.status = 'failed'
        state.error = payload?.message ?? 'Could not load the schemes.'
      })
      .addCase(saveScheme.fulfilled, (state, { payload }) => upsert(state, payload))
      .addCase(toggleSchemeStatus.fulfilled, (state, { payload }) => upsert(state, payload))
      .addCase(removeScheme.fulfilled, (state, { payload }) => {
        state.list = state.list.filter((row) => row.id !== payload)
      })
  },
})

export const selectSchemes = (state) => state.schemes.list
export const selectSchemesStatus = (state) => state.schemes.status
export const selectSchemesError = (state) => state.schemes.error
export const selectSchemeById = (id) => (state) => state.schemes.list.find((row) => row.id === id)
export default schemesSlice.reducer
