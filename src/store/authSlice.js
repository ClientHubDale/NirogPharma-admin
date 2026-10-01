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

/** Updates the saved user in place, leaving the token and its storage alone. */
function writeSessionUser(user) {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem(STORAGE_KEY)
      if (raw) store.setItem(STORAGE_KEY, JSON.stringify({ ...JSON.parse(raw), user }))
    } catch {
      // Storage unavailable — the session just won't survive a reload.
    }
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

/**
 * Checks the saved session against the server on start-up. The account may
 * have been disabled, the password changed from somewhere else, or the admin
 * moved to a new mobile number in .env — in all of those the stored token is
 * dead and the user must not be left looking at a signed-in shell.
 */
export const restoreSession = createAsyncThunk('auth/restore', async (_arg, { rejectWithValue }) => {
  try {
    return await authService.fetchMe()
  } catch (error) {
    // Only a refused session signs you out; a backend that is merely down or
    // unreachable leaves you where you are.
    if (error.response?.status === 401 || error.response?.status === 403) return rejectWithValue('ended')
    throw error
  }
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
    /** The server refused the session — sign out without calling the API. */
    sessionEnded(state) {
      clearSession()
      state.user = null
      state.accessToken = null
      state.status = 'idle'
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
      // Name, role or status may have changed server-side since the last visit.
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload
        writeSessionUser(action.payload)
      })
      .addCase(restoreSession.rejected, (state, action) => {
        if (action.payload !== 'ended') return
        clearSession()
        state.user = null
        state.accessToken = null
      })
  },
})

export const { clearAuthError, sessionEnded } = authSlice.actions

export const selectUser = (state) => state.auth.user
export const selectIsAuthenticated = (state) => Boolean(state.auth.accessToken)
export const selectAuthStatus = (state) => state.auth.status
export const selectAuthError = (state) => state.auth.error

export default authSlice.reducer
