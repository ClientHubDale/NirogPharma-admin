/**
 * Auth service — talks to POST /auth/login on the API.
 *
 * Demo mode: while the database is still being set up, VITE_DEMO_AUTH=true in
 * .env signs in against the accounts below instead, so the UI and the browser
 * suites keep working. Delete that line from .env once the API is live.
 */
import { ROLES } from '@/constants/roles'
import api from './api'

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  APP_ONLY_ROLE: 'APP_ONLY_ROLE',
}

export class AuthError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

/** True while VITE_DEMO_AUTH=true — the login screen also hides its demo list when this is off. */
export const DEMO_MODE = String(import.meta.env.VITE_DEMO_AUTH).toLowerCase() === 'true'

export const DEMO_ACCOUNTS = [
  { mobile: '9876500001', password: 'admin@123', name: 'Office Admin', role: ROLES.ADMIN, isActive: true },
  { mobile: '9876500002', password: 'dist@123', name: 'Gupta Pharma', role: ROLES.DISTRIBUTOR, isActive: true },
  { mobile: '9876500003', password: 'manager@123', name: 'Rakesh Sharma', role: ROLES.MANAGER, isActive: true },
  { mobile: '9876500004', password: 'exec@123', name: 'Rahul Singh', role: ROLES.EXECUTIVE, isActive: true },
  { mobile: '9876500005', password: 'dist@123', name: 'City Medical Agency', role: ROLES.DISTRIBUTOR, isActive: false },
]

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * @param {{ mobile: string, password: string }} credentials
 * @returns {Promise<{ user: { id, name, mobile, role }, accessToken: string }>}
 */
export async function login({ mobile, password }) {
  if (DEMO_MODE) return demoLogin({ mobile, password })

  try {
    const { data } = await api.post('/auth/login', { mobile, password })
    return data.data // { user, accessToken }
  } catch (error) {
    throw toAuthError(error)
  }
}

export async function logout() {
  if (DEMO_MODE) return wait(150)
  try {
    await api.post('/auth/logout')
  } catch {
    // The local session is cleared either way — a failed call must not trap
    // anyone in a signed-in state.
  }
}

/** Re-reads the signed-in user, e.g. after a reload, to catch a disabled account. */
export async function fetchMe() {
  const { data } = await api.get('/auth/me')
  return data.data.user
}

/** Turns an axios failure into the AuthError the login screen understands. */
function toAuthError(error) {
  const body = error.response?.data
  if (body?.code && AUTH_ERRORS[body.code]) return new AuthError(body.code, body.message)
  if (body?.message) return new AuthError('UNKNOWN', body.message)
  if (error.code === 'ECONNABORTED') return new AuthError('UNKNOWN', 'The server took too long to respond. Try again.')
  return new AuthError('UNKNOWN', 'Could not reach the server. Check your connection and try again.')
}

async function demoLogin({ mobile, password }) {
  await wait(700)

  const account = DEMO_ACCOUNTS.find((a) => a.mobile === mobile && a.password === password)
  if (!account) {
    throw new AuthError(AUTH_ERRORS.INVALID_CREDENTIALS, 'Mobile number or password is incorrect.')
  }
  if (!account.isActive) {
    throw new AuthError(AUTH_ERRORS.ACCOUNT_DISABLED, 'This account has been disabled. Please contact the office.')
  }
  if (account.role === ROLES.MANAGER || account.role === ROLES.EXECUTIVE) {
    throw new AuthError(
      AUTH_ERRORS.APP_ONLY_ROLE,
      'Managers and executives sign in on the Nirog Pharma mobile app, not the website.',
    )
  }

  return {
    user: { id: `demo-${account.mobile}`, name: account.name, mobile: account.mobile, role: account.role },
    accessToken: `demo-token-${account.mobile}`,
  }
}
