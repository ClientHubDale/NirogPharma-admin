/**
 * What the field may see, and whose.
 *
 * An executive could not book an order: `/orders` let them through, but the
 * firm list, the product catalogue and distributor stock were all locked to
 * the admin, so there was nothing to pick from. Opening those is only half of
 * it — the half that matters is that opening them did not hand every
 * executive the whole book of business.
 *
 * So this sets up two executives under two managers with a firm each, and
 * checks each one sees their own and not the other's, by list and by id.
 * Then it checks the office still sees everything, and that the things which
 * are decisions rather than field work stayed shut.
 */
import { ADMIN } from '../lib.mjs'

let pass = 0
let fail = 0
const ok = (label, cond, detail = '') => {
  cond ? (pass++, console.log(`PASS ${label}`)) : (fail++, console.log(`FAIL ${label}${detail ? ` — ${detail}` : ''}`))
  return Boolean(cond)
}
const eq = (label, a, b) => ok(label, Object.is(a, b), `got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`)

const API = process.env.E2E_API ?? 'http://localhost:5000/api/v1'
const MARK = 'E2E-ACC'
const PASSWORD = 'Access1234@'

const login = (who) =>
  fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(who) }).then((r) =>
    r.json(),
  )

const call = (bearer) => (path, init) =>
  fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' } }).then((r) =>
    r.json().then((body) => ({ status: r.status, ...body })),
  )

const api = call((await login({ mobile: ADMIN.mobile, password: ADMIN.password, client: 'web' })).data.accessToken)

/**
 * Order matters, and it is a rule of the system rather than a quirk of the
 * test: a firm will not delete while an executive still works under it —
 * "Move them first" — so the people go before the firms, not after.
 *
 * A failed delete is said out loud. A cleanup that fails quietly is how
 * thirty-seven test credit notes came to live on the client's real books.
 */
const cleanup = async () => {
  for (const u of ((await api('/users?limit=300')).data?.users ?? []).filter((x) => x.name?.startsWith(MARK))) {
    const gone = await api(`/users/${u.id}`, { method: 'DELETE' })
    if (gone.status !== 200) console.log(`    [cleanup] ${u.name}: ${gone.status} ${gone.message}`)
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
}
await cleanup()

/* ── two managers, two executives, a firm each ───────────────────────── */

const region = (await api('/regions', { method: 'POST', body: JSON.stringify({ name: `${MARK} Region` }) })).data.region
const city = (await api('/cities', { method: 'POST', body: JSON.stringify({ name: `${MARK} City`, regionId: region.id }) })).data.city
const area = (await api('/areas', { method: 'POST', body: JSON.stringify({ name: `${MARK} Beat`, cityId: city.id }) })).data.area

const makeUser = async (name, mobile, role, reportingTo) =>
  (await api('/users', { method: 'POST', body: JSON.stringify({ name: `${MARK} ${name}`, mobile, role, password: PASSWORD, ...(reportingTo ? { reportingTo } : {}) }) }))
    .data.user

const bossA = await makeUser('Manager A', '9900990081', 'MANAGER')
const bossB = await makeUser('Manager B', '9900990082', 'MANAGER')
const execA = await makeUser('Exec A', '9900990083', 'EXECUTIVE', bossA.id)
const execB = await makeUser('Exec B', '9900990084', 'EXECUTIVE', bossB.id)
ok('two managers and two executives exist', Boolean(bossA.id && bossB.id && execA.id && execB.id))

const makeFirm = async (name, mobile, managerId, executiveIds) =>
  (await api('/distributors', {
    method: 'POST',
    body: JSON.stringify({
      name: `${MARK} ${name}`,
      contactPerson: 'Someone',
      mobile,
      managerId,
      regionId: region.id,
      cityId: city.id,
      areaId: area.id,
      executiveIds,
      // A firm has to sit somewhere — the form insists, and so does the API.
      locationName: 'Sadar Bazaar, Meerut',
      latitude: 28.9845,
      longitude: 77.7064,
    }),
  })).data?.distributor

const firmA = await makeFirm('Firm A', '9900990085', bossA.id, [execA.id])
const firmB = await makeFirm('Firm B', '9900990086', bossB.id, [execB.id])
ok('each manager has a firm, each with its own executive', Boolean(firmA?.id && firmB?.id))

const asExecA = call((await login({ mobile: '9900990083', password: PASSWORD, client: 'app' })).data.accessToken)
const asExecB = call((await login({ mobile: '9900990084', password: PASSWORD, client: 'app' })).data.accessToken)
const asBossA = call((await login({ mobile: '9900990081', password: PASSWORD, client: 'app' })).data.accessToken)

/* ── an executive sees their own firm, and only their own ────────────── */

const listA = await asExecA('/distributors?limit=500')
eq('an executive can list firms at all', listA.status, 200)
const namesA = (listA.data?.distributors ?? []).map((d) => d.name)
ok('…and their own firm is on it', namesA.includes(`${MARK} Firm A`), namesA.join(', '))
ok('…and the other executive’s is not', !namesA.includes(`${MARK} Firm B`), namesA.join(', '))

const listB = (await asExecB('/distributors?limit=500')).data?.distributors ?? []
ok('the other executive sees theirs', listB.some((d) => d.name === `${MARK} Firm B`))
ok('…and not the first one’s', !listB.some((d) => d.name === `${MARK} Firm A`))

/**
 * By id as well as by list. A scope applied only to the list is not a scope —
 * the id is in the URL of every detail screen, and guessing one is not the
 * point: being handed one is.
 */
eq('asking for somebody else’s firm by id finds nothing', (await asExecA(`/distributors/${firmB.id}`)).status, 404)
eq('…while their own opens', (await asExecA(`/distributors/${firmA.id}`)).status, 200)

/* ── a manager sees their own team's firms ───────────────────────────── */

const bossList = (await asBossA('/distributors?limit=500')).data?.distributors ?? []
ok('a manager sees the firm they own', bossList.some((d) => d.name === `${MARK} Firm A`))
ok('…and not the other manager’s', !bossList.some((d) => d.name === `${MARK} Firm B`))

/* ── the office still sees everything ────────────────────────────────── */

const all = (await api('/distributors?limit=500')).data?.distributors ?? []
ok('the office sees both', all.some((d) => d.name === `${MARK} Firm A`) && all.some((d) => d.name === `${MARK} Firm B`))

/* ── the catalogue, and what is on the shelf ─────────────────────────── */

eq('an executive can list products, or they cannot build an order', (await asExecA('/items?limit=5')).status, 200)
eq('…and read distributor stock', (await asExecA('/stocks/distributors')).status, 200)

const stock = (await asExecA('/stocks/distributors')).data?.rows ?? []
ok(
  'stock is narrowed to their own firms too',
  !stock.some((row) => row.distributorName === `${MARK} Firm B`),
  stock.map((r) => r.distributorName).join(', '),
)

/* ── and what stayed shut ────────────────────────────────────────────── */

eq('an executive still cannot edit a firm', (await asExecA(`/distributors/${firmA.id}`, { method: 'PATCH', body: JSON.stringify({ name: 'nope' }) })).status, 403)
eq('…nor delete one', (await asExecA(`/distributors/${firmA.id}`, { method: 'DELETE' })).status, 403)
eq('…nor change the catalogue', (await asExecA('/items', { method: 'POST', body: JSON.stringify({ name: 'nope' }) })).status, 403)
eq('…nor issue warehouse stock', (await asExecA('/stocks/issue', { method: 'POST', body: JSON.stringify({}) })).status, 403)
eq('…nor read the whole team’s attendance', (await asExecA('/attendance')).status, 403)
eq('…nor the live map', (await asExecA('/tracking/live')).status, 403)

/* ── put everything back ─────────────────────────────────────────────── */

await cleanup()
eq(
  'no firm is left behind',
  ((await api('/distributors?limit=500')).data?.distributors ?? []).filter((d) => d.name?.startsWith(MARK)).length,
  0,
)
eq('no user is left behind', ((await api('/users?limit=300')).data?.users ?? []).filter((u) => u.name?.startsWith(MARK)).length, 0)

console.log(`\n— ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
