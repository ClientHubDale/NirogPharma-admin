/**
 * Check-in, check-out, and the Routes masters behind them.
 *
 * This one is almost entirely API: the panel's Attendance screen is still on
 * its mock file, so there is nothing of these endpoints on screen to drive
 * yet. The browser half only confirms the screen still renders — wiring it up
 * is a later phase.
 *
 * Everything the suite creates it removes: a region, a city, two beats, a
 * throwaway executive and the days they punched. The sweep matches on the
 * E2E-ATT marker rather than on ids it remembers, because a run that dies
 * halfway leaves rows an id-only cleanup can never see again. That is exactly
 * how thirty-seven test credit notes came to sit on the client's real books
 * for three weeks.
 */
import { start, login, goto, ok, eq, finish, pageText, ADMIN } from '../lib.mjs'

const API = process.env.E2E_API ?? 'http://localhost:5000/api/v1'
const MARK = 'E2E-ATT'
const MOBILE = '9900990099'
const PASSWORD = 'Attend1234@'

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

/* ── what was here before us ──────────────────────────────────────────── */

// The client's own app settings. The suite turns the odometer on to test that
// it can be insisted upon, so it has to put them back exactly as it found them.
const theirMobileApp = (await api('/settings')).data.settings.mobileApp

/**
 * Take away everything this suite has ever made — not merely what this run
 * made. Children first: a region will not delete while a city stands in it.
 */
const cleanup = async () => {
  for (const person of ((await api('/users?limit=200')).data?.users ?? []).filter((u) => u.name?.startsWith(MARK))) {
    for (const row of (await api(`/attendance?from=2020-01-01&userId=${person.id}`)).data?.rows ?? []) {
      await api(`/attendance/${row.id}`, { method: 'DELETE' })
    }
    await api(`/users/${person.id}`, { method: 'DELETE' })
  }
  for (const area of (await api('/areas')).data?.areas ?? []) {
    if (area.name.startsWith(MARK)) await api(`/areas/${area.id}`, { method: 'DELETE' })
  }
  for (const city of (await api('/cities')).data?.cities ?? []) {
    if (city.name.startsWith(MARK)) await api(`/cities/${city.id}`, { method: 'DELETE' })
  }
  for (const region of (await api('/regions')).data?.regions ?? []) {
    if (region.name.startsWith(MARK)) await api(`/regions/${region.id}`, { method: 'DELETE' })
  }
  await api('/settings/mobileApp', { method: 'PATCH', body: JSON.stringify(theirMobileApp) })
}

await cleanup()

const theirRegions = ((await api('/regions')).data?.regions ?? []).length
const theirDays = ((await api('/attendance?from=2020-01-01')).data?.rows ?? []).length

/* ── 1. Routes: region → city → area ──────────────────────────────────── */

const region = await api('/regions', { method: 'POST', body: JSON.stringify({ name: `${MARK} Region`, stateCode: '09' }) })
eq('a region can be added', region.status, 201)
eq('…and keeps the GST state code a bill needs', region.data?.region?.stateCode, '09')
const regionId = region.data.region.id

eq(
  'the same region twice is refused',
  (await api('/regions', { method: 'POST', body: JSON.stringify({ name: `${MARK} region` }) })).status,
  409,
)
eq('a region with no name is refused', (await api('/regions', { method: 'POST', body: '{}' })).status, 400)

const city = await api('/cities', {
  method: 'POST',
  body: JSON.stringify({ name: `${MARK} City`, regionId, lat: 28.9845, lng: 77.7064 }),
})
eq('a city can be added', city.status, 201)
eq('…under its region', city.data?.city?.regionId, regionId)
eq('…carrying the coordinates that centre the map', city.data?.city?.lat, 28.9845)
const cityId = city.data.city.id

eq(
  'a city in a region that does not exist is refused',
  (await api('/cities', { method: 'POST', body: JSON.stringify({ name: `${MARK} Nowhere`, regionId: 'no-such-region' }) })).status,
  400,
)

const area = await api('/areas', { method: 'POST', body: JSON.stringify({ name: `${MARK} Beat`, cityId }) })
eq('an area can be added', area.status, 201)
eq('…and reads back the city and region above it', area.data?.area?.regionName, `${MARK} Region`)
const areaId = area.data.area.id
const otherAreaId = (await api('/areas', { method: 'POST', body: JSON.stringify({ name: `${MARK} Other Beat`, cityId }) })).data.area.id

eq('a region with cities under it cannot be removed', (await api(`/regions/${regionId}`, { method: 'DELETE' })).status, 409)
eq('a city with areas under it cannot be removed', (await api(`/cities/${cityId}`, { method: 'DELETE' })).status, 409)

/* ── 2. an executive with a beat of their own ─────────────────────────── */

const made = await api('/users', {
  method: 'POST',
  body: JSON.stringify({ name: `${MARK} Executive`, mobile: MOBILE, role: 'EXECUTIVE', password: PASSWORD, routeIds: [areaId] }),
})
eq('an executive can be created with a beat assigned', made.status, 201)
const userId = made.data.user.id

const session = await signIn({ mobile: MOBILE, password: PASSWORD, client: 'app' })
ok('the executive signs in on the app', Boolean(session.data?.accessToken), session.message)
const asExec = call(session.data.accessToken)

const mine = await asExec('/areas/mine')
eq('the app is offered only the beats they were given', mine.data?.areas?.length, 1)
eq('…which is theirs', mine.data?.areas?.[0]?.id, areaId)
eq('before checking in, today is empty', (await asExec('/attendance/today')).data?.day, null)
eq('an executive may not read the whole roster', (await asExec('/attendance')).status, 403)

/* ── 3. opening the day ───────────────────────────────────────────────── */

const checkIn = await asExec('/attendance/check-in', {
  method: 'POST',
  body: JSON.stringify({ inLat: 28.9845, inLng: 77.7064, inAccuracy: 4, inAddress: 'Scheme 54, Vijay Nagar', odoIn: 28416 }),
})
eq('an executive can check in', checkIn.status, 201)
const day = checkIn.data?.attendance
ok('…at the time on the clock', /^\d{2}:\d{2}$/.test(day?.inAt ?? ''), day?.inAt)
eq('…recording where the device was', day?.inLat, 28.9845)
eq('…leaving the day open', day?.open, true)
eq('…and ignoring the odometer while tracking is switched off', day?.odoIn, null)

eq('checking in twice on one day is refused', (await asExec('/attendance/check-in', { method: 'POST', body: '{}' })).status, 409)

const peek = await asExec('/attendance/today')
eq('today reports the open day back', peek.data?.day?.id, day.id)
ok('…with the office window to measure it against', Boolean(peek.data?.officeTime?.start), JSON.stringify(peek.data?.officeTime))

/* ── 4. the beat, punched on its own screen ───────────────────────────── */

const punched = await asExec('/attendance/area', { method: 'POST', body: JSON.stringify({ areaId }) })
eq('today’s beat can be punched', punched.status, 200)
eq('…and the day names it', punched.data?.attendance?.areaName, `${MARK} Beat`)
eq(
  'a beat they were never assigned is refused',
  (await asExec('/attendance/area', { method: 'POST', body: JSON.stringify({ areaId: otherAreaId }) })).status,
  403,
)
eq('a beat with a day worked on it cannot be removed', (await api(`/areas/${areaId}`, { method: 'DELETE' })).status, 409)

/* ── 5. what Settings can insist on ───────────────────────────────────── */

await api('/settings/mobileApp', { method: 'PATCH', body: JSON.stringify({ trackOdometer: true, requireOdometer: true }) })

eq(
  'with the odometer required, checking out without one is refused',
  (await asExec('/attendance/check-out', { method: 'POST', body: '{}' })).status,
  400,
)

// That day was opened before tracking was on, so it has no opening reading and
// nothing to compare a closing one against. Open a fresh one.
await api(`/attendance/${day.id}`, { method: 'DELETE' })
const reIn = await asExec('/attendance/check-in', { method: 'POST', body: JSON.stringify({ odoIn: 28416, areaId }) })
eq('with tracking on, the opening reading is kept', reIn.data?.attendance?.odoIn, 28416)

eq(
  'a closing reading below the opening one is refused',
  (await asExec('/attendance/check-out', { method: 'POST', body: JSON.stringify({ odoOut: 10 }) })).status,
  400,
)
eq('…and the day is still open after that refusal', (await asExec('/attendance/today')).data?.day?.open, true)

/* ── 6. closing it ────────────────────────────────────────────────────── */

const out = await asExec('/attendance/check-out', {
  method: 'POST',
  body: JSON.stringify({ outLat: 29.0, outLng: 77.8, odoOut: 28474, distanceKm: 58.4 }),
})
eq('an executive can check out', out.status, 200)
const closed = out.data?.attendance
ok('…at the closing time', /^\d{2}:\d{2}$/.test(closed?.outAt ?? ''), closed?.outAt)
eq('…with the closing reading', closed?.odoOut, 28474)
eq('…the distance the device measured', closed?.distanceKm, 58.4)
eq('…and the day closed', closed?.open, false)
ok('the hours worked are derived rather than stored', closed?.workedMinutes !== null, String(closed?.workedMinutes))
eq('checking out twice is refused', (await asExec('/attendance/check-out', { method: 'POST', body: JSON.stringify({ odoOut: 28500 }) })).status, 409)

await api('/settings/mobileApp', { method: 'PATCH', body: JSON.stringify(theirMobileApp) })

/* ── 7. the shape the panel already renders ───────────────────────────── */

const report = await api(`/attendance?from=2020-01-01&userId=${userId}`)
eq('the office can read the day', report.status, 200)
eq('…and finds exactly one', report.data?.rows?.length, 1)

const row = report.data.rows[0]
// Every key src/mocks/attendance.js renders. The API answers in the mock's own
// shape so wiring the screen up later changes no table or model code.
const MOCK_KEYS = ['id', 'userId', 'date', 'inAt', 'inLat', 'inLng', 'outAt', 'outLat', 'outLng', 'odoIn', 'odoOut', 'distanceKm', 'images', 'comment']
const missing = MOCK_KEYS.filter((key) => !(key in row))
ok('the answer carries every key the Attendance mock renders', missing.length === 0, `missing: ${missing.join(', ')}`)
ok('…with the date as the panel holds it', /^\d{4}-\d{2}-\d{2}$/.test(row.date), row.date)
ok('…images an array, never null', Array.isArray(row.images))
eq('…and the comment falling back to the beat', row.comment, `${MARK} Beat`)
eq('the summary counts the day present', report.data?.summary?.present, 1)
ok('…and absences against the window', typeof report.data?.summary?.absent === 'number')
ok('the office window comes back with the report', Boolean(report.data?.officeTime?.start), JSON.stringify(report.data?.officeTime))

// `userId` has to actually narrow. It once did not: the roster filter was
// spread over it and silently won, so naming one person returned everybody.
const everyone = await api('/attendance?from=2020-01-01')
ok('asking for one person returns fewer days than asking for all', report.data.rows.length <= everyone.data.rows.length)
eq('…and only that person’s', [...new Set(report.data.rows.map((r) => r.userId))].join(','), userId)

const nobody = await api('/attendance?from=2020-01-01&userId=not-a-user')
eq('asking for somebody who does not exist returns nothing', nobody.data?.rows?.length, 0)
eq('…and counts nobody active rather than everybody', nobody.data?.summary?.active, 0)

/* ── 8. the day belongs to whoever worked it ──────────────────────────── */

// The day is stamped with the Indian date, not the UTC one. Those differ
// between midnight and 05:30, and taking UTC there would file an early
// check-in under yesterday while printing this morning's time on it.
const istToday = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)
eq('the day is filed under the Indian date, not the UTC one', row.date, istToday)

// An id is not a permission. An executive handed somebody else's day must not
// be able to write into it.
// A second throwaway executive with a day of their own, opened for them by
// the admin — then reached for by the first one. The ownership and kind checks
// run before the missing-file complaint, so a JSON request with nothing
// attached still exercises them.
const colleague = await api('/users', {
  method: 'POST',
  body: JSON.stringify({ name: `${MARK} Colleague`, mobile: '9900990098', role: 'EXECUTIVE', password: PASSWORD }),
})
eq('a second executive can be created', colleague.status, 201)
const theirDay = await api('/attendance/check-in', { method: 'POST', body: JSON.stringify({ userId: colleague.data.user.id }) })
eq('the admin can open a day on somebody’s behalf', theirDay.status, 201)

const intruded = await asExec(`/attendance/${theirDay.data.attendance.id}/photos`, {
  method: 'POST',
  body: JSON.stringify({ kind: 'DAY' }),
})
eq('an executive cannot reach into another person’s day', intruded.status, 403)

// A photo is taken checking in, checking out, or during the day — nothing else.
const badKind = await asExec(`/attendance/${row.id}/photos`, { method: 'POST', body: JSON.stringify({ kind: 'FOO' }) })
eq('an unknown photo kind is a bad request, not a crash', badKind.status, 400)
ok('…and says which kinds there are', /IN, OUT, DAY/.test(JSON.stringify(badKind.details ?? {})), JSON.stringify(badKind.details))

// Only then does it ask for the file itself.
const noFile = await asExec(`/attendance/${row.id}/photos`, { method: 'POST', body: JSON.stringify({ kind: 'DAY' }) })
eq('a photo request with nothing attached is refused', noFile.status, 400)

/* ── the screen ───────────────────────────────────────────────────────── */

// `start` already collects page errors and console errors into `errors`.
const { browser, page, errors } = await start()
await login(page)
await goto(page, '/admin/attendance', { heading: 'Attendance' })
const screen = await pageText(page)
ok('the Attendance screen still renders', screen.length > 0)

/* ── put everything back ──────────────────────────────────────────────── */

// Before `finish`, which closes the browser and ends the process.
await cleanup()

eq('no region is left behind', ((await api('/regions')).data?.regions ?? []).length, theirRegions)
eq('…nor any attendance row', ((await api('/attendance?from=2020-01-01')).data?.rows ?? []).length, theirDays)
eq('…nor the throwaway executive', ((await api('/users?limit=200')).data?.users ?? []).filter((u) => u.name?.startsWith(MARK)).length, 0)
eq(
  'the client’s app settings are exactly as they were',
  JSON.stringify((await api('/settings')).data.settings.mobileApp),
  JSON.stringify(theirMobileApp),
)

// The refusals this suite checks on purpose are answered 400, 403 and 409, and
// the panel logs those; they are the suite working, not the panel breaking.
await finish(browser, errors, { ignore: /status of (400|403|404|409)/ })
