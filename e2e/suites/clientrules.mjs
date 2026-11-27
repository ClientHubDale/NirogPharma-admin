/**
 * The rules the client settled on 2026-11-26, each checked against the API
 * that is supposed to enforce it.
 *
 * They were answered in one conversation and built in one go, which is
 * exactly when a rule quietly gets implemented as its opposite. So each one
 * is written here in the terms he used, not in the terms the code uses.
 *
 *   1  an executive adds a party, a manager adds a distributor too
 *   2  office hours are the admin's, and the same for everybody
 *   5  nobody sees their pay until they ask and the office agrees
 *   7  a revisit comes pre-filled, but never pre-fills the location
 *   8  an executive may ask for a beat; the office grants it
 *  10  the firm remembers who added it
 *
 * API only — the app is built elsewhere.
 */
import { ADMIN } from '../lib.mjs'

const API = process.env.E2E_API ?? 'http://localhost:5000/api/v1'
const MARK = 'E2E-RULES'
const PASSWORD = 'Rules1234@'

let pass = 0
let fail = 0
const ok = (label, cond, detail = '') => {
  cond ? (pass++, console.log(`PASS ${label}`)) : (fail++, console.log(`FAIL ${label}${detail ? ` — ${detail}` : ''}`))
  return Boolean(cond)
}
const eq = (label, a, b) => ok(label, Object.is(a, b), `got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`)

const login = (who) =>
  fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(who) }).then((r) =>
    r.json(),
  )
const call = (bearer) => (path, init) =>
  fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' } }).then((r) =>
    r.json().then((body) => ({ status: r.status, ...body })),
  )
const api = call((await login({ mobile: ADMIN.mobile, password: ADMIN.password, client: 'web' })).data.accessToken)

const theirApp = (await api('/settings')).data.settings.mobileApp
const theirOffice = (await api('/settings')).data.settings.office

/** People before firms: a firm will not delete while an executive works under it. */
const cleanup = async () => {
  for (const r of ((await api('/requests')).data?.requests ?? []).filter((x) => x.userName?.startsWith(MARK))) {
    await api(`/requests/${r.id}`, { method: 'DELETE' })
  }
  for (const u of ((await api('/users?limit=300')).data?.users ?? []).filter((x) => x.name?.startsWith(MARK))) {
    await api(`/users/${u.id}`, { method: 'DELETE' })
  }
  for (const d of ((await api('/distributors?limit=500')).data?.distributors ?? []).filter((x) => x.name?.startsWith(MARK))) {
    const gone = await api(`/distributors/${d.id}`, { method: 'DELETE' })
    if (gone.status !== 200) console.log(`    [cleanup] ${d.name}: ${gone.status} ${gone.message}`)
  }
  for (const a of ((await api('/areas')).data?.areas ?? []).filter((x) => x.name?.startsWith(MARK))) {
    await api(`/areas/${a.id}`, { method: 'DELETE' })
  }
  for (const c of ((await api('/cities')).data?.cities ?? []).filter((x) => x.name?.startsWith(MARK))) {
    await api(`/cities/${c.id}`, { method: 'DELETE' })
  }
  for (const r of ((await api('/regions')).data?.regions ?? []).filter((x) => x.name?.startsWith(MARK))) {
    await api(`/regions/${r.id}`, { method: 'DELETE' })
  }
  await api('/settings/mobileApp', { method: 'PATCH', body: JSON.stringify(theirApp) })
  await api('/settings/office', { method: 'PATCH', body: JSON.stringify(theirOffice) })
}
await cleanup()

/* ── the cast ─────────────────────────────────────────────────────────── */

const region = (await api('/regions', { method: 'POST', body: JSON.stringify({ name: `${MARK} Region` }) })).data.region
const city = (await api('/cities', { method: 'POST', body: JSON.stringify({ name: `${MARK} City`, regionId: region.id }) })).data.city
const beat = (await api('/areas', { method: 'POST', body: JSON.stringify({ name: `${MARK} Beat`, cityId: city.id }) })).data.area
const spare = (await api('/areas', { method: 'POST', body: JSON.stringify({ name: `${MARK} Spare Beat`, cityId: city.id }) })).data.area

const mk = async (name, mobile, role, extra = {}) =>
  (await api('/users', { method: 'POST', body: JSON.stringify({ name: `${MARK} ${name}`, mobile, role, password: PASSWORD, ...extra }) })).data
    ?.user

const boss = await mk('Manager', '9900990041', 'MANAGER')
const exec = await mk('Exec', '9900990042', 'EXECUTIVE', { reportingTo: boss.id, routeIds: [beat.id] })
ok('a manager and an executive exist', Boolean(boss?.id && exec?.id))

const asExec = call((await login({ mobile: '9900990042', password: PASSWORD, client: 'app' })).data.accessToken)
const asBoss = call((await login({ mobile: '9900990041', password: PASSWORD, client: 'app' })).data.accessToken)

const firmBody = (name, mobile, partyType) => ({
  name: `${MARK} ${name}`,
  contactPerson: 'Someone',
  mobile,
  partyType,
  managerId: boss.id,
  regionId: region.id,
  cityId: city.id,
  areaId: beat.id,
  executiveIds: [exec.id],
  locationName: 'Sadar Bazaar, Meerut',
  latitude: 28.9845,
  longitude: 77.7064,
})

/* ── 1. who may add what ──────────────────────────────────────────────── */

const shop = await asExec('/distributors', { method: 'POST', body: JSON.stringify(firmBody('Chemist', '9900990043', 'CHEMIST')) })
eq('an executive can add a chemist', shop.status, 201)
const clinic = await asExec('/distributors', { method: 'POST', body: JSON.stringify(firmBody('Clinic', '9900990044', 'DOCTOR')) })
eq('…and a doctor', clinic.status, 201)

const refused = await asExec('/distributors', { method: 'POST', body: JSON.stringify(firmBody('Firm', '9900990045', 'DISTRIBUTOR')) })
eq('…but not a distributor — that is the manager’s', refused.status, 403)
ok('…and is told why in plain words', /manager/i.test(refused.message ?? ''), refused.message)

const byBoss = await asBoss('/distributors', { method: 'POST', body: JSON.stringify(firmBody('Firm', '9900990045', 'DISTRIBUTOR')) })
eq('a manager can add a distributor', byBoss.status, 201)
const alsoParty = await asBoss('/distributors', { method: 'POST', body: JSON.stringify(firmBody('Mgr Shop', '9900990046', 'CHEMIST')) })
eq('…and a party as well', alsoParty.status, 201)

/* ── 10. the firm remembers who added it ──────────────────────────────── */

const added = (await api(`/distributors/${shop.data.distributor.id}`)).data?.distributor
eq('the shop records the executive who added it', added?.createdById, exec.id)
eq('…by name, so the office need not look it up', added?.createdByName, `${MARK} Exec`)

/* ── 5. pay: asked for, then granted ──────────────────────────────────── */

await api('/settings/mobileApp', { method: 'PATCH', body: JSON.stringify({ showSalary: true, salaryVisibleTo: [] }) })
eq('to begin with, nobody sees their pay', (await asExec('/auth/profile')).data?.profile?.canSeePay, false)

const asked = await asExec('/requests', { method: 'POST', body: JSON.stringify({ kind: 'SALARY', note: 'Please' }) })
eq('an executive can ask to see it', asked.status, 201)
eq('…and it waits for the office', asked.data?.request?.status, 'PENDING')

const again = await asExec('/requests', { method: 'POST', body: JSON.stringify({ kind: 'SALARY' }) })
eq('asking twice does not make two requests', again.status, 200)
eq('…it hands back the one already waiting', again.data?.request?.id, asked.data.request.id)
eq('still cannot see it while it waits', (await asExec('/auth/profile')).data?.profile?.canSeePay, false)

eq('an executive cannot read the office’s inbox', (await asExec('/requests')).status, 403)
eq('…nor decide their own request', (await asExec(`/requests/${asked.data.request.id}/decide`, { method: 'PATCH', body: JSON.stringify({ approve: true }) })).status, 403)

const inbox = await api('/requests?status=PENDING')
ok('the office sees it waiting', (inbox.data?.requests ?? []).some((r) => r.id === asked.data.request.id))

const granted = await api(`/requests/${asked.data.request.id}/decide`, { method: 'PATCH', body: JSON.stringify({ approve: true }) })
eq('the office approves it', granted.data?.request?.status, 'APPROVED')
const paid = (await asExec('/auth/profile')).data?.profile
eq('…and only then does the person see their pay', paid?.canSeePay, true)
ok('…with real figures on it', typeof paid?.pay?.salary === 'number', JSON.stringify(paid?.pay))

const other = call((await login({ mobile: '9900990041', password: PASSWORD, client: 'app' })).data.accessToken)
eq('approving one person does not open it for everybody', (await other('/auth/profile')).data?.profile?.canSeePay, false)

const takenBack = await api(`/requests/${asked.data.request.id}/revoke`, { method: 'PATCH', body: JSON.stringify({ note: 'changed my mind' }) })
eq('the office can take it back', takenBack.data?.request?.status, 'PENDING')
eq('…and the pay goes out of sight again', (await asExec('/auth/profile')).data?.profile?.canSeePay, false)

/* ── 8. asking for a beat ─────────────────────────────────────────────── */

const mine = await asExec('/areas/mine')
eq('the executive starts with the one beat they were given', mine.data?.areas?.length, 1)

const already = await asExec('/requests', { method: 'POST', body: JSON.stringify({ kind: 'AREA', areaId: beat.id }) })
eq('asking for a beat already theirs is refused', already.status, 409)

const wants = await asExec('/requests', { method: 'POST', body: JSON.stringify({ kind: 'AREA', areaId: spare.id, note: 'Covering for a colleague' }) })
eq('an executive can ask for another beat', wants.status, 201)
eq('…naming it', wants.data?.request?.areaName, `${MARK} Spare Beat`)
eq('…and it does not grant itself', (await asExec('/areas/mine')).data?.areas?.length, 1)

await api(`/requests/${wants.data.request.id}/decide`, { method: 'PATCH', body: JSON.stringify({ approve: true }) })
const after = await asExec('/areas/mine')
eq('once the office agrees, the beat is theirs', after.data?.areas?.length, 2)
ok('…and it is the one they asked for', (after.data?.areas ?? []).some((a) => a.id === spare.id))

await api(`/requests/${wants.data.request.id}/revoke`, { method: 'PATCH', body: JSON.stringify({}) })
eq('taking it back removes the beat again', (await asExec('/areas/mine')).data?.areas?.length, 1)

const second = await asExec('/requests', { method: 'POST', body: JSON.stringify({ kind: 'AREA', areaId: spare.id }) })
const turned = await api(`/requests/${second.data.request.id}/decide`, { method: 'PATCH', body: JSON.stringify({ approve: false, note: 'Not this month' }) })
eq('the office can say no', turned.data?.request?.status, 'REJECTED')
eq('…with a reason', turned.data?.request?.decidedNote, 'Not this month')
eq('…and nothing changes for the executive', (await asExec('/areas/mine')).data?.areas?.length, 1)
eq('a decided request cannot be decided twice', (await api(`/requests/${second.data.request.id}/decide`, { method: 'PATCH', body: JSON.stringify({ approve: true }) })).status, 409)

/* ── 7. a revisit is pre-filled, but never pre-located ────────────────── */

const firstCall = await asExec('/visits', {
  method: 'POST',
  body: JSON.stringify({ distributorId: shop.data.distributor.id, latitude: 28.9845, longitude: 77.7064, note: 'Stocked up, reorder in a fortnight' }),
})
eq('a visit can be recorded', firstCall.status, 201)

const back = await asExec(`/visits/last?distributorId=${shop.data.distributor.id}`)
eq('the app can ask what happened last time', back.status, 200)
eq('…and is told it is a revisit', back.data?.revisit, true)
eq('…that this person made themselves', back.data?.visitedByMe, true)
eq('…how many times the firm has been called on', back.data?.visits, 1)
eq('the form comes back filled with the last note', back.data?.prefill?.note, 'Stocked up, reorder in a fortnight')
eq('…and the firm’s own details', back.data?.prefill?.mobile, '9900990043')

/**
 * The one thing that must never be pre-filled. "वो करंट आनी चाहिए, कहीं ऐसा
 * तो न हो घर बैठे बैठे कर दिया" — a visit marked from the sofa is the thing
 * this screen exists to prevent.
 */
ok('the prefill carries no location at all', back.data?.prefill?.latitude === undefined && back.data?.prefill?.longitude === undefined, JSON.stringify(back.data?.prefill))
eq('…and the API says so outright', back.data?.locationMustBeLive, true)

const fresh = await asExec(`/visits/last?distributorId=${clinic.data.distributor.id}`)
eq('a firm never called on is not a revisit', fresh.data?.revisit, false)
eq('…with nothing to fill the note from', fresh.data?.prefill?.note, '')

/* ── 2. office hours are the admin's, and shared ──────────────────────── */

const saved = await api('/settings/office', { method: 'PATCH', body: JSON.stringify({ start: '09:30', end: '18:30' }) })
eq('the office window can be set', saved.status, 200)
const report = await api('/attendance?from=2026-11-23&to=2026-11-23')
eq('…and attendance is measured by it', report.data?.officeTime?.start, '09:30')
eq('…the same window for everybody, not per person', report.data?.officeTime?.end, '18:30')

await api('/settings/office', { method: 'PATCH', body: JSON.stringify({ holidays: [{ name: 'Test Holiday', date: '2026-11-23' }] }) })
ok('holidays are kept with it', ((await api('/settings')).data.settings.office.holidays ?? []).length === 1)

/* ── put everything back ──────────────────────────────────────────────── */

await cleanup()
eq('no user is left behind', ((await api('/users?limit=300')).data?.users ?? []).filter((u) => u.name?.startsWith(MARK)).length, 0)
eq('no firm is left behind', ((await api('/distributors?limit=500')).data?.distributors ?? []).filter((d) => d.name?.startsWith(MARK)).length, 0)
eq('the client’s app settings are exactly as they were', JSON.stringify((await api('/settings')).data.settings.mobileApp), JSON.stringify(theirApp))
eq('…and their office hours too', JSON.stringify((await api('/settings')).data.settings.office), JSON.stringify(theirOffice))

console.log(`\n— ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
