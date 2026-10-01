import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as usersService from '@/services/usersService'

/**
 * App users (Manager / Sales Executive) — the Users tab, backed by
 * /api/v1/users. The admin account is not in this list: it lives in the
 * backend's .env and the API never returns it.
 */

export const fetchUsers = createAsyncThunk('users/fetch', async (_arg, { rejectWithValue }) => {
  try {
    const { users } = await usersService.listUsers()
    return users
  } catch (error) {
    return rejectWithValue(usersService.errorFrom(error))
  }
})

export const saveUser = createAsyncThunk('users/save', async ({ id, form }, { rejectWithValue }) => {
  try {
    return id ? await usersService.updateUser(id, form) : await usersService.createUser(form)
  } catch (error) {
    return rejectWithValue(usersService.errorFrom(error))
  }
})

export const setUserStatus = createAsyncThunk('users/setStatus', async ({ id, isActive }, { rejectWithValue }) => {
  try {
    return await usersService.setUserStatus(id, isActive)
  } catch (error) {
    return rejectWithValue(usersService.errorFrom(error))
  }
})

export const importUsers = createAsyncThunk('users/import', async ({ users }, { rejectWithValue }) => {
  try {
    return await usersService.importUsers(users)
  } catch (error) {
    return rejectWithValue(usersService.errorFrom(error))
  }
})

const upsert = (state, user) => {
  const i = state.list.findIndex((u) => u.id === user.id)
  if (i === -1) state.list.unshift(user)
  else state.list[i] = user
}

const usersSlice = createSlice({
  name: 'users',
  initialState: {
    list: [],
    status: 'idle', // idle | loading | ready | failed
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = 'ready'
        state.list = action.payload
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? { message: 'Could not load users.' }
      })
      .addCase(saveUser.fulfilled, (state, action) => {
        upsert(state, action.payload.user)
      })
      .addCase(setUserStatus.fulfilled, (state, action) => {
        upsert(state, action.payload.user)
      })
      .addCase(importUsers.fulfilled, (state, action) => {
        state.list.unshift(...action.payload.added)
      })
  },
})

export const selectUsers = (state) => state.users.list
export const selectUsersStatus = (state) => state.users.status
export const selectUsersError = (state) => state.users.error

export default usersSlice.reducer
