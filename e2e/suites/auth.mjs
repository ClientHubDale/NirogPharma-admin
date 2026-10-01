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

// The two deliberate bad sign-ins, and the revoked-session test, make Chrome
// log those 401 responses.
await finish(browser, errors, { ignore: /status of 401/ })
