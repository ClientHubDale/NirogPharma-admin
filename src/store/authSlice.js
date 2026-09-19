import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as authService from '@/services/authService'

const STORAGE_KEY = 'nirog.session'

/**
 * "Remember me" keeps the session in localStorage (survives closing the
 * browser); otherwise sessionStorage (cleared when the tab closes).
 * Storage can throw in private mode, so every access is guarded.
 */
function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeSession(session, remember) {
  try {
    clearSession()
    ;(remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Session just won't survive a reload.
  }
}

function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ mobile, password, remember }, { rejectWithValue }) => {
    try {
      const session = await authService.login({ mobile, password })
      writeSession(session, remember)
      return session
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'UNKNOWN', message: error.message })
    }
  },
)

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await authService.logout()
  clearSession()
})

const saved = readSession()

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: saved?.user ?? null,
    accessToken: saved?.accessToken ?? null,
    status: 'idle', // idle | loading | failed
    error: null, // { code, message }
  },
  reducers: {
    clearAuthError(state) {
      state.error = null
      if (state.status === 'failed') state.status = 'idle'
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'idle'
        state.user = action.payload.user
        state.accessToken = action.payload.accessToken
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? { code: 'UNKNOWN', message: 'Something went wrong. Please try again.' }
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null
        state.accessToken = null
      })
  },
})

export const { clearAuthError } = authSlice.actions

export const selectUser = (state) => state.auth.user
export const selectIsAuthenticated = (state) => Boolean(state.auth.accessToken)
export const selectAuthStatus = (state) => state.auth.status
export const selectAuthError = (state) => state.auth.error

export default authSlice.reducer
