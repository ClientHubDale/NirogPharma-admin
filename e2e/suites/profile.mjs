/**
 * The profile both app screens read, and the switches on it.
 *
 * `/auth/me` answered with six fields, which was enough to decide what to
 * unlock and nothing else. The app's profile screen asks who you report to,
 * the patch you cover, the day you joined, and four notification switches —
 * all of which the admin already fills in on the Users screen, and none of
 * which was ever served. This checks every line on that screen.
 *
 * It also checks the panel's own `user` object kept the exact shape it had,
 * because widening a response everything signs in through is the kind of
 * change that breaks a screen nobody thought to look at.
 *
 * API only — the app is built elsewhere, so there is no browser half.
 */
const API = process.env.E2E_API ?? 'http://localhost:5000/api/v1'
const MARK = 'E2E-PROF'
const MOBILE = '9900990094'
const PASSWORD = 'Profile1234@'

let pass = 0
let fail = 0
const ok = (l, c, d = '') => { c ? (pass++, console.log('PASS ' + l)) : (fail++, console.log(`FAIL ${l}${d ? ' — ' + d : ''}`)); return !!c }
const eq = (l, a, b) => ok(l, Object.is(a, b), `got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`)

const login = (who) =>
  fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(who) }).then((r) => r.json())

const token = (await login({ mobile: '7654296611', password: 'Abhi1234@', client: 'web' })).data.accessToken
const call = (b) => (p, i) =>
  fetch(`${API}${p}`, { ...i, headers: { Authorization: `Bearer ${b}`, 'Content-Type': 'application/json' } }).then((r) =>
    r.json().then((x) => ({ status: r.status, ...x })),
  )
const api = call(token)

const sweep = async () => {
  for (const u of ((await api('/users?limit=300')).data?.users ?? []).filter((x) => x.name?.startsWith(MARK))) {
    await api(`/users/${u.id}`, { method: 'DELETE' })
  }
  for (const a of (await api('/areas')).data?.areas ?? []) if (a.name.startsWith(MARK)) await api(`/areas/${a.id}`, { method: 'DELETE' })
  for (const c of (await api('/cities')).data?.cities ?? []) if (c.name.startsWith(MARK)) await api(`/cities/${c.id}`, { method: 'DELETE' })
  for (const r of (await api('/regions')).data?.regions ?? []) if (r.name.startsWith(MARK)) await api(`/regions/${r.id}`, { method: 'DELETE' })
}
await sweep()

const theirApp = (await api('/settings')).data.settings.mobileApp

/* a patch to cover, and a manager to report to */
const region = (await api('/regions', { method: 'POST', body: JSON.stringify({ name: `${MARK} Region`, stateCode: '09' }) })).data.region
const city = (await api('/cities', { method: 'POST', body: JSON.stringify({ name: `${MARK} City`, regionId: region.id }) })).data.city
const area = (await api('/areas', { method: 'POST', body: JSON.stringify({ name: `${MARK} Beat`, cityId: city.id }) })).data.area

const boss = (await api('/users', {
  method: 'POST',
  body: JSON.stringify({ name: `${MARK} Manager`, mobile: '9900990093', role: 'MANAGER', password: PASSWORD }),
})).data.user

const made = await api('/users', {
  method: 'POST',
  body: JSON.stringify({
    name: `${MARK} Executive`,
    mobile: MOBILE,
    role: 'EXECUTIVE',
    email: 'exec@example.test',
    password: PASSWORD,
    reportingTo: boss.id,
    regionIds: [region.id],
    cityIds: [city.id],
    routeIds: [area.id],
    salary: 25000,
    target: 600000,
    taPerKm: 4,
    daPerDay: 250,
  }),
})
eq('an executive can be created with every detail the admin fills', made.status, 201)

const asExec = call((await login({ mobile: MOBILE, password: PASSWORD, client: 'app' })).data.accessToken)

/* ── the profile screen's five lines ──────────────────────────────────── */

const p = (await asExec('/auth/profile')).data?.profile
ok('the profile comes back', Boolean(p))
eq('Name', p.name, `${MARK} Executive`)
eq('Mobile (login ID)', p.mobile, MOBILE)
eq('Email', p.email, 'exec@example.test')
eq('Reports to', p.reportsTo?.name, `${MARK} Manager`)
eq('…with their number, so the rep can ring them', p.reportsTo?.mobile, '9900990093')
eq('Region', p.region, `${MARK} Region · ${MARK} City`)
ok('Joined is a real date', /^\d{4}-\d{2}-\d{2}T/.test(p.joinedAt ?? ''), p.joinedAt)
eq('…and the beats they cover', p.areas?.[0]?.name, `${MARK} Beat`)

/* ── the four switches ────────────────────────────────────────────────── */

eq('Order updates default on', p.preferences.notifications.orders, true)
eq('Payment verification default on', p.preferences.notifications.pay, true)
eq('Outstanding reminders default on', p.preferences.notifications.due, true)
eq('Daily summary default off', p.preferences.notifications.eod, false)
eq('theme defaults to system', p.preferences.theme, 'system')

const saved = await asExec('/auth/me/preferences', {
  method: 'PATCH',
  body: JSON.stringify({ notifications: { eod: true, due: false }, theme: 'dark' }),
})
eq('a switch can be turned on', saved.data?.preferences?.notifications?.eod, true)
eq('…and another off', saved.data?.preferences?.notifications?.due, false)
eq('…the untouched ones stay as they were', saved.data?.preferences?.notifications?.orders, true)
eq('…and the theme sticks', saved.data?.preferences?.theme, 'dark')

const again = (await asExec('/auth/profile')).data.profile
eq('and it survives a re-read, so a reinstall cannot undo it', again.preferences.notifications.eod, true)
eq('…theme too', again.preferences.theme, 'dark')

eq('a theme the app does not have is refused', (await asExec('/auth/me/preferences', { method: 'PATCH', body: JSON.stringify({ theme: 'neon' }) })).status, 400)
const stray = await asExec('/auth/me/preferences', { method: 'PATCH', body: JSON.stringify({ notifications: { nonsense: true } }) })
eq('a switch the app does not have is ignored, not stored', stray.data?.preferences?.notifications?.nonsense, undefined)

/* ── pay is the admin's to allow ──────────────────────────────────────── */

await api('/settings/mobileApp', { method: 'PATCH', body: JSON.stringify({ showSalary: false }) })
const hidden = (await asExec('/auth/profile')).data.profile
eq('with salary switched off, it is not shown', hidden.canSeePay, false)
eq('…and not even sent', hidden.pay, undefined)

await api('/settings/mobileApp', { method: 'PATCH', body: JSON.stringify({ showSalary: true, salaryVisibleTo: ['ALL'] }) })
const shown = (await asExec('/auth/profile')).data.profile
eq('switched on for all, it is shown', shown.canSeePay, true)
eq('…with the figure the admin typed', shown.pay?.salary, 25000)
eq('…and the monthly target', shown.pay?.target, 600000)

await api('/settings/mobileApp', { method: 'PATCH', body: JSON.stringify({ salaryVisibleTo: [boss.id] }) })
eq('named for somebody else, it is hidden again', (await asExec('/auth/profile')).data.profile.canSeePay, false)

await api('/settings/mobileApp', { method: 'PATCH', body: JSON.stringify({ salaryVisibleTo: [] }) })
eq('an empty list means nobody, not everybody', (await asExec('/auth/profile')).data.profile.canSeePay, false)

await api('/settings/mobileApp', { method: 'PATCH', body: JSON.stringify(theirApp) })

/* ── the panel must not have been broken ──────────────────────────────── */

const web = await api('/auth/me')
ok('the panel still gets the `user` object it always had', Boolean(web.data?.user?.id && web.data.user.role))
eq('…with exactly the keys it had before', Object.keys(web.data.user).sort().join(','), 'avatarUrl,email,id,mobile,name,role')

/**
 * …and nothing more. Every page the panel opens restores the session through
 * /auth/me, so the profile — five extra round trips to a database in Tokyo —
 * must not ride along on it. It briefly did, and took that route from 188ms
 * to over a second.
 */
eq('the profile does not ride along on /auth/me', web.data.profile, undefined)

await sweep()
eq('nothing is left behind', ((await api('/users?limit=300')).data?.users ?? []).filter((u) => u.name?.startsWith(MARK)).length, 0)
eq('the client’s app settings are put back', JSON.stringify((await api('/settings')).data.settings.mobileApp), JSON.stringify(theirApp))

console.log(`\n— ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
