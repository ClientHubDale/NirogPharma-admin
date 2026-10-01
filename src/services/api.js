import axios from 'axios'

const STORAGE_KEY = 'nirog.session'

/**
 * The one HTTP client. Base URL comes from VITE_API_BASE_URL (see .env).
 *
 * `withCredentials` matters: the refresh token lives in an httpOnly cookie set
 * by the API, and the browser only sends it back on cross-origin calls when
 * this is on (the API's CORS allows this origin with credentials).
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

/** The session as authSlice stores it — kept in whichever storage "remember me" chose. */
export function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** Replaces the stored access token after a refresh, leaving the rest of the session alone. */
function saveAccessToken(accessToken) {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem(STORAGE_KEY)
      if (raw) store.setItem(STORAGE_KEY, JSON.stringify({ ...JSON.parse(raw), accessToken }))
    } catch {
      // Storage is unavailable (private mode) — the token just won't survive a reload.
    }
  }
}

api.interceptors.request.use((config) => {
  const token = readSession()?.accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/**
 * Called when the server has refused the session for good — the store signs
 * the user out. Registered in src/store/index.js; kept as a callback so this
 * module does not import the store (which imports this one).
 */
let onSessionEnded = null
export const setSessionEndedHandler = (handler) => {
  onSessionEnded = handler
}

/**
 * On a 401, try the refresh cookie once and replay the request. If the refresh
 * fails too, the session is over: the store is told, so the app returns to the
 * login screen instead of sitting in a signed-in shell with a dead token.
 */
let refreshing = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    const isAuthCall = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh')

    if (status !== 401 || original?._retried || isAuthCall) return Promise.reject(error)

    original._retried = true
    try {
      // One refresh at a time, however many requests hit 401 together.
      refreshing = refreshing ?? api.post('/auth/refresh').finally(() => (refreshing = null))
      const { data } = await refreshing
      saveAccessToken(data.data.accessToken)
      original.headers.Authorization = `Bearer ${data.data.accessToken}`
      return api(original)
    } catch {
      onSessionEnded?.()
      return Promise.reject(error)
    }
  },
)

export default api
