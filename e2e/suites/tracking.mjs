/**
 * Live Location: where the field is, and where it has been.
 *
 * The screen was built against two mock files that named their own
 * replacements — `GET /tracking/live` and `GET /tracking/:userId?date=`. This
 * checks the answers come back in those shapes exactly, including the three
 * fields that have to be `null` rather than zero, and then drives the screen
 * itself: the four counters, the users list, a person's day, both tabs and
 * the date picker.
 *
 * Everything it creates it removes. Its pings are its own — recorded against
 * a throwaway executive and pruned by that id, so the client's real trails
 * are never touched.
 */
import { start, login, goto, sleep, ok, eq, has, finish, pageText, ADMIN } from '../lib.mjs'

const API = process.env.E2E_API ?? 'http://localhost:5000/api/v1'
const MARK = 'E2E-TRK'
const MOBILE = '9900990095'
const PASSWORD = 'Track1234@'

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

const istToday = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)
const tomorrow = () => new Date(Date.now() + 330 * 60000 + 86400000).toISOString().slice(0, 10)

/* ── what was here before us ──────────────────────────────────────────── */

/**
 * Take away everything this suite has ever made. Pings go by the throwaway
 * user's own id, so pruning can never reach a real person's trail: a date
 * cutoff on its own would have taken the client's with it.
 */
const cleanup = async () => {
  for (const stale of ((await api('/users?limit=300')).data?.users ?? []).filter((u) => u.name?.startsWith(MARK))) {
    await api(`/tracking/prune?before=${tomorrow()}&userId=${stale.id}`, { method: 'DELETE' })
    for (const row of (await api(`/attendance?from=2020-01-01&userId=${stale.id}`)).data?.rows ?? []) {
      await api(`/attendance/${row.id}`, { method: 'DELETE' })
    }
    await api(`/users/${stale.id}`, { method: 'DELETE' })
  }
}

await cleanup()

/* ── 1. a throwaway executive out on a beat ───────────────────────────── */

const made = await api('/users', {
  method: 'POST',
  body: JSON.stringify({ name: `${MARK} Executive`, mobile: MOBILE, role: 'EXECUTIVE', password: PASSWORD }),
})
eq('a throwaway executive can be created', made.status, 201)
const userId = made.data.user.id

const session = await signIn({ mobile: MOBILE, password: PASSWORD, client: 'app' })
const asExec = call(session.data?.accessToken ?? '')

/* ── 2. pings ─────────────────────────────────────────────────────────── */

const now = Date.now()
const minutesAgo = (n) => new Date(now - n * 60000).toISOString()

const one = await asExec('/tracking/ping', {
  method: 'POST',
  body: JSON.stringify({ lat: 28.9845, lng: 77.7064, accuracy: 5, battery: 80, at: minutesAgo(40) }),
})
eq('a phone can report where it is', one.status, 201)
eq('…and one ping is one ping', one.data?.kept, 1)

const batch = await asExec('/tracking/ping', {
  method: 'POST',
  body: JSON.stringify({
    pings: [
      { lat: 28.9901, lng: 77.7139, battery: 70, at: minutesAgo(25) },
      { lat: 28.9962, lng: 77.7201, battery: 61, at: minutesAgo(5) },
    ],
  }),
})
eq('a buffered batch is the normal case, not an error', batch.status, 201)
eq('…and all of it is kept', batch.data?.kept, 2)

const mixed = await asExec('/tracking/ping', {
  method: 'POST',
  body: JSON.stringify({
    pings: [
      { lat: 28.99, lng: 77.71, at: minutesAgo(3) },
      { lat: 999, lng: 77.71, at: minutesAgo(3) },
      { lat: 28.99, lng: 77.71, at: new Date(now + 3 * 86400000).toISOString() },
    ],
  }),
})
eq('one bad row does not cost the caller the rest of its buffer', mixed.data?.kept, 1)
eq('…and the bad ones are reported back', mixed.data?.rejected?.length, 2)
has('…saying why', JSON.stringify(mixed.data?.rejected), 'Earth')

eq('an empty send is refused', (await asExec('/tracking/ping', { method: 'POST', body: JSON.stringify({ pings: [] }) })).status, 400)

/* ── 3. the roster, in the shape the screen reads ─────────────────────── */

const roster = await api('/tracking/live')
eq('the office can read the roster', roster.status, 200)
const mine = (roster.data?.users ?? []).find((u) => u.id === userId)
ok('the throwaway executive is on it', Boolean(mine), `${roster.data?.users?.length} users`)

// Every key src/mocks/liveLocation.js renders.
const MOCK_KEYS = ['id', 'name', 'role', 'manager', 'area', 'lat', 'lng', 'lastSeenMinutesAgo', 'checkedIn', 'battery']
const missing = MOCK_KEYS.filter((key) => !(key in (mine ?? {})))
ok('the answer carries every key the Live Location mock renders', missing.length === 0, `missing: ${missing.join(', ')}`)

ok('…with the newest ping as their position', Math.abs((mine?.lat ?? 0) - 28.99) < 0.02, String(mine?.lat))
ok('…and how long ago it was', mine?.lastSeenMinutesAgo !== null && mine.lastSeenMinutesAgo <= 10, String(mine?.lastSeenMinutesAgo))
ok('…and the battery off the phone', mine?.battery !== null, String(mine?.battery))

/**
 * Offline means not working, not merely unreachable. Somebody who has not
 * opened their day is offline however recently they pinged — which is why
 * this feature needed attendance built first.
 */
eq('a phone pinging with no day open still reads as not checked in', mine?.checkedIn, false)

const opened = await api('/attendance/check-in', {
  method: 'POST',
  body: JSON.stringify({ userId, inLat: 28.9845, inLng: 77.7064, comment: `${MARK} beat` }),
})
eq('the admin can open their day', opened.status, 201)

const after = (await api('/tracking/live')).data.users.find((u) => u.id === userId)
eq('…and now they are checked in', after?.checkedIn, true)
eq('…with the day’s note standing in for the beat', after?.area, `${MARK} beat`)
ok('…and today’s distance alongside', typeof after?.distanceKm === 'number', String(after?.distanceKm))
ok('…which is more than nothing, having walked', after.distanceKm > 0, String(after.distanceKm))

const quiet = (roster.data?.users ?? []).find((u) => u.id !== userId && u.lastSeenMinutesAgo === null)
if (quiet) {
  eq('somebody who never pinged has no position at all, not a zero one', quiet.lat, null)
  eq('…nor a longitude', quiet.lng, null)
}

eq('an executive may not read the roster', (await asExec('/tracking/live')).status, 403)

/* ── 4. one person's day ──────────────────────────────────────────────── */

const day = await api(`/tracking/${userId}?date=${istToday()}`)
eq('the office can read their day', day.status, 200)
const TRACK_KEYS = ['points', 'entries', 'checkedInAt', 'checkedOutAt', 'distanceKm', 'durationMinutes', 'visits', 'orders']
const absent = TRACK_KEYS.filter((key) => !(key in (day.data ?? {})))
ok('the answer carries every key the track mock renders', absent.length === 0, `missing: ${absent.join(', ')}`)

eq('the trail has the pings on it', day.data.points.length, 4)
ok('…oldest first', new Date(day.data.points[0].at) < new Date(day.data.points.at(-1).at))
ok('every total is a number, never null', TRACK_KEYS.slice(4).every((key) => typeof day.data[key] === 'number'))
has('the timeline opens with the check-in', JSON.stringify(day.data.entries), 'check_in')
has('…and ends where they were last seen, the day being open', JSON.stringify(day.data.entries), 'live')

await api('/attendance/check-out', { method: 'POST', body: JSON.stringify({ userId, outLat: 28.996, outLng: 77.72 }) })
const closed = await api(`/tracking/${userId}?date=${istToday()}`)
has('once the day is closed the timeline says so', JSON.stringify(closed.data.entries), 'check_out')
ok('…and stops calling them live', !JSON.stringify(closed.data.entries).includes('"live"'))
eq('…and the roster drops them to not checked in', (await api('/tracking/live')).data.users.find((u) => u.id === userId)?.checkedIn, false)

const empty = await api(`/tracking/${userId}?date=2020-01-01`)
eq('a day they did not work is empty rather than missing', empty.data?.points?.length, 0)
eq('…with totals still numbers', empty.data?.distanceKm, 0)

/* ── 5. housekeeping ──────────────────────────────────────────────────── */

eq('pruning without a date is refused', (await api('/tracking/prune', { method: 'DELETE' })).status, 400)

/* ── the screen ───────────────────────────────────────────────────────── */

// `start` already collects page errors and console errors into `errors`.
const { browser, page, errors } = await start()
await login(page)
await goto(page, '/admin/live-location', { heading: 'Live Location' })
await sleep(4500)

const screen = await pageText(page)
has('the screen names the field staff', screen, 'Users')
const counters = await page.$$eval('[role=radio]', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ')))
eq('all four counters are there', counters.length, 4)
ok('…and they are counting real people', counters.some((c) => /\d/.test(c)), counters.join(' | '))

const rows = await page.$$('aside ul li button')
ok('the users list is populated from the API', rows.length > 0, `${rows.length} rows`)

await rows[0].click()
await sleep(3500)
const panel = await pageText(page)
has('opening somebody shows their day', panel, 'Total distance')
has('…their time on the field', panel, 'Total time')
has('…and their visits', panel, 'Visits')

const tabs = await page.$$eval('[role=tab]', (els) => els.map((e) => e.innerText.trim()))
ok('the timeline and sales tabs both survive', tabs.length === 2, JSON.stringify(tabs))

const salesTab = await page.$$('[role=tab]')
await salesTab[1].click()
await sleep(1500)
ok('the sales tab renders', (await pageText(page)).length > 0)

await salesTab[0].click()
await sleep(1000)

// A date input cannot be typed into character by character, so the value is
// set the way the browser would and React is told about it.
await page.$eval('input[type=date]', (el) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(el, '2020-01-01')
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
})
await sleep(3000)
has('a day with nothing on it says so rather than breaking', await pageText(page), 'No activity on this day')

/* ── put everything back ──────────────────────────────────────────────── */

// Before `finish`, which closes the browser and ends the process.
await cleanup()

eq(
  'the suite leaves no user behind',
  ((await api('/users?limit=300')).data?.users ?? []).filter((u) => u.name?.startsWith(MARK)).length,
  0,
)
const stillThere = await api(`/tracking/${userId}?date=${istToday()}`)
ok('…and no pings', stillThere.status === 404 || (stillThere.data?.points?.length ?? 0) === 0, `${stillThere.status}`)

// The refusals this suite checks on purpose are answered 400 and 403, and the
// panel logs those; they are the suite working, not the panel breaking.
await finish(browser, errors, { ignore: /status of (400|403|404)|Geolocation|Google Maps/ })
