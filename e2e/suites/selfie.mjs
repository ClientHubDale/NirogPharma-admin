/**
 * The check-in selfie switch, from the admin's tab to the API's answer.
 *
 * Settings › Mobile app › "Require a photo at check-in" used to be a lie: the
 * tab waited 350ms on a fake network, wrote to Redux, said "Mobile app
 * settings saved" and forgot it on the next reload. The API has enforced the
 * rule since it was built, so an admin could switch the requirement on, be
 * told it saved, and have check-ins keep going through without a photo.
 *
 * So this follows the whole path: flip the switch on the real screen, save,
 * reload the page to prove it persisted, then ask the API whether a check-in
 * without a selfie is actually refused.
 */
import { start, login, goto, sleep, ok, eq, finish, pageText, ADMIN } from '../lib.mjs'

const API = process.env.E2E_API ?? 'http://localhost:5000/api/v1'
const MARK = 'E2E-SELFIE'
const MOBILE = '9900990092'
const PASSWORD = 'Selfie1234@'

const signIn = (who) =>
  fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(who) }).then((r) =>
    r.json(),
  )

const token = (await signIn({ mobile: ADMIN.mobile, password: ADMIN.password, client: 'web' })).data.accessToken
const call = (bearer) => (path, init) =>
  fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' } }).then((r) =>
    r.json().then((body) => ({ status: r.status, ...body })),
  )
const api = call(token)

/** The client's own switches, put back at the end whatever happens here. */
const theirApp = (await api('/settings')).data.settings.mobileApp

const cleanup = async () => {
  for (const stale of ((await api('/users?limit=300')).data?.users ?? []).filter((u) => u.name?.startsWith(MARK))) {
    for (const row of (await api(`/attendance?from=2020-01-01&userId=${stale.id}`)).data?.rows ?? []) {
      await api(`/attendance/${row.id}`, { method: 'DELETE' })
    }
    await api(`/users/${stale.id}`, { method: 'DELETE' })
  }
  await api('/settings/mobileApp', { method: 'PATCH', body: JSON.stringify(theirApp) })
}
await cleanup()

const made = await api('/users', {
  method: 'POST',
  body: JSON.stringify({ name: `${MARK} Executive`, mobile: MOBILE, role: 'EXECUTIVE', password: PASSWORD }),
})
eq('a throwaway executive can be created', made.status, 201)
const userId = made.data.user.id
const asExec = call((await signIn({ mobile: MOBILE, password: PASSWORD, client: 'app' })).data.accessToken)

const dropToday = async () => {
  for (const row of (await api(`/attendance?from=2020-01-01&userId=${userId}`)).data?.rows ?? []) {
    await api(`/attendance/${row.id}`, { method: 'DELETE' })
  }
}

/* ── off: a selfie is welcome but not demanded ────────────────────────── */

await api('/settings/mobileApp', { method: 'PATCH', body: JSON.stringify({ photoAtCheckIn: false }) })
const relaxed = await asExec('/attendance/check-in', { method: 'POST', body: JSON.stringify({ inLat: 28.98, inLng: 77.7 }) })
eq('with the switch off, a check-in with no photo goes through', relaxed.status, 201)
await dropToday()

/* ── on: the API refuses ──────────────────────────────────────────────── */

await api('/settings/mobileApp', { method: 'PATCH', body: JSON.stringify({ photoAtCheckIn: true }) })
const refused = await asExec('/attendance/check-in', { method: 'POST', body: JSON.stringify({ inLat: 28.98, inLng: 77.7 }) })
eq('with it on, the same check-in is refused', refused.status, 400)
ok('…and says a photo is what is missing', /photo/i.test(refused.message ?? ''), refused.message)
eq('…naming the field, so the app can point at it', typeof refused.details?.photos, 'string')
eq('…and no day was opened', ((await api(`/attendance?from=2020-01-01&userId=${userId}`)).data?.rows ?? []).length, 0)

/* ── on: a check-in carrying one is accepted ──────────────────────────── */

// A real 1×1 PNG. Multipart, so the Content-Type header is left to the form.
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64',
)
const form = new FormData()
form.append('inLat', '28.98')
form.append('inLng', '77.7')
form.append('photos', new Blob([png], { type: 'image/png' }), 'selfie.png')

const withPhoto = await fetch(`${API}/attendance/check-in`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${(await signIn({ mobile: MOBILE, password: PASSWORD, client: 'app' })).data.accessToken}` },
  body: form,
}).then((r) => r.json().then((b) => ({ status: r.status, ...b })))

eq('a check-in carrying a selfie is accepted', withPhoto.status, 201)
eq('…and the photo comes back on the day', withPhoto.data?.attendance?.images?.length, 1)
ok('…stored, not just echoed', /^https?:\/\//.test(withPhoto.data?.attendance?.images?.[0]?.url ?? ''), withPhoto.data?.attendance?.images?.[0]?.url)
await dropToday()

/* ── the admin's tab actually saves it ────────────────────────────────── */

// Put it back to off, so the screen has something to change.
await api('/settings/mobileApp', { method: 'PATCH', body: JSON.stringify({ photoAtCheckIn: false }) })

// `start` already collects page errors and console errors into `errors`.
const { browser, page, errors } = await start()
await login(page)
await goto(page, '/admin/settings', { heading: 'Settings' })
await sleep(1500)

// Settings › Mobile app
const tabs = await page.$$('button, [role=tab]')
for (const tab of tabs) {
  const label = await page.evaluate((el) => el.innerText.trim(), tab)
  if (/mobile app/i.test(label)) {
    await tab.click()
    break
  }
}
await sleep(1200)
ok('the Mobile app tab opens', /photo at check-in/i.test(await pageText(page)))

const toggle = await page.$('#app-photo')
ok('the "Require a photo at check-in" switch is on the screen', Boolean(toggle))
eq('…and starts off, as the server has it', await page.$eval('#app-photo', (el) => el.getAttribute('aria-checked')), 'false')

await toggle.click()
await sleep(400)
eq('…and can be switched on', await page.$eval('#app-photo', (el) => el.getAttribute('aria-checked')), 'true')

// Save.
const buttons = await page.$$('button')
for (const button of buttons) {
  const label = await page.evaluate((el) => el.innerText.trim(), button)
  if (/^save/i.test(label)) {
    await button.click()
    break
  }
}
await sleep(2500)

const saved = (await api('/settings')).data.settings.mobileApp
eq('pressing Save reaches the server, rather than Redux alone', saved.photoAtCheckIn, true)

// And the API is already behaving differently.
const nowRefused = await asExec('/attendance/check-in', { method: 'POST', body: JSON.stringify({ inLat: 28.98, inLng: 77.7 }) })
eq('…so a check-in without a photo is refused from that moment', nowRefused.status, 400)

// A reload must show what the server holds, not this tab's defaults.
await goto(page, '/admin/settings', { heading: 'Settings' })
await sleep(1500)
for (const tab of await page.$$('button, [role=tab]')) {
  const label = await page.evaluate((el) => el.innerText.trim(), tab)
  if (/mobile app/i.test(label)) {
    await tab.click()
    break
  }
}
await sleep(1500)
eq('and a reload still shows it on', await page.$eval('#app-photo', (el) => el.getAttribute('aria-checked')), 'true')

/* ── put everything back ──────────────────────────────────────────────── */

// Before `finish`, which closes the browser and ends the process.
await cleanup()
eq(
  'the client’s own app settings are exactly as they were',
  JSON.stringify((await api('/settings')).data.settings.mobileApp),
  JSON.stringify(theirApp),
)
eq('no user is left behind', ((await api('/users?limit=300')).data?.users ?? []).filter((u) => u.name?.startsWith(MARK)).length, 0)

// The refusals above are the point of the suite, and the panel logs them.
await finish(browser, errors, { ignore: /status of (400|403|404|409)/ })
