/** Signing in against the real API (backend must be running on :5000). */
import { start, goto, sleep, ok, eq, has, finish, pageText, ADMIN, BASE } from '../lib.mjs'

const API = process.env.E2E_API ?? 'http://localhost:5000/api/v1'

const { browser, page, errors } = await start()

const session = () =>
  page.evaluate(() => {
    const raw = localStorage.getItem('nirog.session') ?? sessionStorage.getItem('nirog.session')
    return raw ? JSON.parse(raw) : null
  })

const attempt = async (mobile, password) => {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' })
  await page.type('#mobile', mobile)
  await page.type('#password', password)
  await page.click('button[type=submit]')
  await sleep(2200)
  return { path: new URL(page.url()).pathname, text: await pageText(page) }
}

/* ── the API is the one deciding ──────────────────────────────────────── */

const demo = await attempt('9876500001', 'admin@123')
eq('the old demo account no longer signs in', demo.path, '/login')
has('and it is told the credentials are wrong', demo.text, 'incorrect')

const wrong = await attempt(ADMIN.mobile, 'not-the-password')
eq('a wrong password stays on the login page', wrong.path, '/login')
has('with the message from the API', wrong.text, 'incorrect')

const good = await attempt(ADMIN.mobile, ADMIN.password)
eq('the real admin lands on the dashboard', good.path, '/admin')

const saved = await session()
eq('the session holds the admin', saved?.user?.role, 'ADMIN')
eq('the account is the one from .env', saved?.user?.mobile, ADMIN.mobile)
ok('the token is a real JWT, not a demo string', saved?.accessToken?.split('.').length === 3, saved?.accessToken?.slice(0, 24))
ok('the demo account list is gone from the login screen', !demo.text.includes('Demo accounts'))

/* ── the session survives, and ends ───────────────────────────────────── */

await page.reload({ waitUntil: 'networkidle0' })
await sleep(1200)
eq('a reload keeps you signed in', new URL(page.url()).pathname, '/admin')

await goto(page, '/admin/settings', { heading: 'Settings' })
ok('protected pages open with the session', (await pageText(page)).includes('Company'))

// The user menu in the top bar carries Sign out.
await page.click('header button[aria-haspopup=menu]:last-of-type').catch(() => {})
await sleep(400)
const signOut = await page.evaluateHandle(() =>
  [...document.querySelectorAll('[data-slot=dropdown-menu-item]')].find((i) => /sign out|log ?out/i.test(i.textContent)),
)
if (signOut.asElement()) {
  await signOut.asElement().click()
  await sleep(1500)
  eq('signing out returns to the login page', new URL(page.url()).pathname, '/login')
  eq('and the stored session is gone', await session(), null)
} else {
  ok('a sign-out item exists in the user menu', false, 'not found in the top-bar menu')
}

/* ── the session follows the server ───────────────────────────────────── */

// Sign in again, then end that session from the server side (as changing the
// admin's password in .env, or disabling an account, would).
await attempt(ADMIN.mobile, ADMIN.password)
eq('signed in again for the server-side test', new URL(page.url()).pathname, '/admin')

const token = (await session())?.accessToken
await fetch(`${API}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })

// Put a dead access token in place: the next call 401s, the refresh cookie is
// revoked too, so there is no way back and the app must sign itself out.
await page.evaluate(() => {
  for (const store of [localStorage, sessionStorage]) {
    const raw = store.getItem('nirog.session')
    if (raw) store.setItem('nirog.session', JSON.stringify({ ...JSON.parse(raw), accessToken: 'dead.token.value' }))
  }
})
await page.reload({ waitUntil: 'networkidle0' })
await sleep(2500)

eq('a revoked session lands back on login', new URL(page.url()).pathname, '/login')
eq('and the stored session is cleared', await session(), null)

/* ── a disabled account stops working at once ─────────────────────────── */

/**
 * The signed-in user is held in memory for a short while, so that every
 * request does not pay a round trip to a database in Tokyo just to find out
 * who is asking. The danger in that is obvious: an account disabled by the
 * office must not keep working until the cache happens to expire. Disabling
 * drops the entry, and this is the check that says so.
 */
const MARK = 'E2E-AUTH'
const MOBILE = '9900990096'
const PASSWORD = 'Revoke1234@'

const admin = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mobile: ADMIN.mobile, password: ADMIN.password, client: 'web' }),
}).then((r) => r.json())

const call = (bearer) => (path, init) =>
  fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' } }).then((r) =>
    r.json().then((body) => ({ status: r.status, ...body })),
  )
const asAdmin = call(admin.data.accessToken)

// Sweep by marker: a run that died here would otherwise block the next one on
// the mobile number being taken.
for (const stale of ((await asAdmin('/users?limit=300')).data?.users ?? []).filter((u) => u.name?.startsWith(MARK))) {
  await asAdmin(`/users/${stale.id}`, { method: 'DELETE' })
}

const made = await asAdmin('/users', {
  method: 'POST',
  body: JSON.stringify({ name: `${MARK} Executive`, mobile: MOBILE, role: 'EXECUTIVE', password: PASSWORD }),
})
eq('a throwaway executive can be created', made.status, 201)
const victimId = made.data.user.id

const victim = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mobile: MOBILE, password: PASSWORD, client: 'app' }),
}).then((r) => r.json())
const asVictim = call(victim.data?.accessToken ?? '')

eq('they can ask the API who they are', (await asVictim('/attendance/today')).status, 200)
// Twice, so the second answer is certainly the cached one.
eq('…and again, served from memory', (await asVictim('/attendance/today')).status, 200)

await asAdmin(`/users/${victimId}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: false }) })
eq('the moment the office disables them, the same token is refused', (await asVictim('/attendance/today')).status, 403)

await asAdmin(`/users/${victimId}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: true }) })
eq('…and allowed again the moment they are re-enabled', (await asVictim('/attendance/today')).status, 200)

await asAdmin(`/users/${victimId}`, { method: 'DELETE' })
eq('a deleted account is refused at once too', (await asVictim('/attendance/today')).status, 401)

eq(
  'the suite leaves no user behind',
  ((await asAdmin('/users?limit=300')).data?.users ?? []).filter((u) => u.name?.startsWith(MARK)).length,
  0,
)

// The two deliberate bad sign-ins, and the revoked-session test, make Chrome
// log those 401 responses.
await finish(browser, errors, { ignore: /status of 401/ })
