/**
 * Auth service — MOCK IMPLEMENTATION (UI phase).
 *
 * The UI is built before the backend, so this fakes the API with a few demo
 * accounts. When the backend is ready, replace the body of `login` with:
 *
 *   const { data } = await api.post('/auth/login', { mobile, password })
 *   return data.data   // { user, accessToken }
 *
 * and delete DEMO_ACCOUNTS. Nothing else in the UI needs to change — the
 * return shape and the error codes below are the contract.
 */
import { ROLES } from '@/constants/roles'

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
  await wait(700) // feel of a real network call, so loading states are visible

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

export async function logout() {
  await wait(150)
}
