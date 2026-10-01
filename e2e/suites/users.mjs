/**
 * User › Users against the real API: the form's shape, and that what you save
 * is actually in the database (not just in the browser's memory).
 */
import { start, login, goto, sleep, ok, eq, has, finish, rows, pageText, overflows, clickText, pickOption, ADMIN } from '../lib.mjs'

const API = process.env.E2E_API ?? 'http://localhost:5000/api/v1'
const MANAGER = { name: 'E2E Manager', mobile: '6900000021' }
const EXEC = { name: 'E2E Executive', mobile: '6900000022' }

/* ── a token of our own, to set up and clean up through the API ───────── */

const signIn = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mobile: ADMIN.mobile, password: ADMIN.password }),
}).then((r) => r.json())

const token = signIn?.data?.accessToken
const api = (path, init = {}) =>
  fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
  }).then((r) => r.json())

/** Leaves no test accounts behind, whether or not the last run finished. */
const cleanup = async () => {
  const { data } = await api('/users?limit=100')
  for (const user of data?.users ?? []) {
    if ([MANAGER.mobile, EXEC.mobile].includes(user.mobile)) await api(`/users/${user.id}`, { method: 'DELETE' })
  }
}
await cleanup()

const { browser, page, errors } = await start()
await login(page)
await goto(page, '/admin/users', { heading: 'Users' })

const startCount = (await rows(page)).length

/* ── the form's shape ─────────────────────────────────────────────────── */

await clickText(page, 'button', 'New', { exact: false })
await page.waitForSelector('#usr-name')
await sleep(400)

const form = await pageText(page)
const labels = await page.$$eval('form label', (ls) => ls.map((l) => l.textContent.trim().replace(/\*$/, '').trim()))

ok('Designation is gone', !labels.includes('Designation') && !form.includes('Designation'))
ok('the Other Access Details section is gone', !form.includes('Other Access Details'))
has('Payout Details is still there', form, 'Payout Details')
ok('Monthly target is a payout field', Boolean(await page.$('#usr-target')))

await page.click('#usr-role')
await page.waitForSelector('[role=listbox]')
await sleep(300)
const roles = await page.$$eval('[role=option]', (os) => os.map((o) => o.textContent.trim()))
eq('Role offers Manager and Sales Executive only', roles.join(' · '), 'Manager · Sales Executive')
await page.keyboard.press('Escape')
await sleep(250)

/* ── Reporting To belongs to executives only ──────────────────────────── */

ok('Reporting To is hidden before a role is chosen', !(await page.$('#usr-reporting')))
await pickOption(page, '#usr-role', 'Manager')
ok('a manager reports to nobody, so the field stays hidden', !(await page.$('#usr-reporting')))
await pickOption(page, '#usr-role', 'Sales Executive')
ok('an executive gets the field', Boolean(await page.$('#usr-reporting')))

/* ── a long dropdown near the bottom still scrolls ────────────────────── */

// Regression: the geography pickers used to open past the bottom of the window,
// where the list was clipped and could not be scrolled.
await page.evaluate(() => document.querySelector('#usr-cities').scrollIntoView({ block: 'end' }))
await sleep(400)
await page.click('#usr-cities')
await page.waitForSelector('[role=listbox]')
await sleep(400)

const panel = await page.evaluate(() => {
  const list = document.querySelector('[role=listbox]')
  const box = (list.closest('[data-radix-popper-content-wrapper]')?.firstElementChild ?? list).getBoundingClientRect()
  list.scrollTop = 99999
  return {
    onScreen: box.top >= -1 && box.bottom <= window.innerHeight + 1,
    options: list.querySelectorAll('[role=option]').length,
    scrolled: list.scrollTop > 0,
  }
})
ok('a dropdown opened at the bottom stays on screen', panel.onScreen)
ok('and its list scrolls', panel.options > 8 && panel.scrolled, JSON.stringify(panel))
await page.keyboard.press('Escape')
await sleep(300)

/* ── create a manager, through the UI ─────────────────────────────────── */

const fill = async ({ name, mobile }, role, extras = {}) => {
  await page.type('#usr-name', name)
  await page.type('#usr-mobile', mobile)
  await pickOption(page, '#usr-role', role)
  await page.type('#usr-password', 'nirog@123')
  await page.type('#usr-confirm', 'nirog@123')
  for (const [selector, value] of Object.entries(extras)) await page.type(selector, value)
}

await fill(MANAGER, 'Manager', { '#usr-salary': '32000', '#usr-target': '900000' })
await clickText(page, 'footer button, header button', 'Save')
await sleep(1500)

const toastText = async () => (await page.evaluate(() => [...document.querySelectorAll('[data-state=open]')].map((e) => e.textContent.trim()).join(' | '))) ?? ''

const created = await toastText()
has('a toast says a manager was created', created, 'Manager created')
has('and names them', created, MANAGER.name)
// textContent keeps the original case; the uppercase in the table is CSS only.
const listed = (table, name) => table.some((r) => r.join(' ').toLowerCase().includes(name.toLowerCase()))
ok('and is in the list', listed(await rows(page), MANAGER.name), '')

/* ── it is really in the database ─────────────────────────────────────── */

await page.reload({ waitUntil: 'networkidle0' })
await sleep(1600)
const afterReload = await rows(page)
ok('it survives a reload — so it is the database, not memory', listed(afterReload, MANAGER.name))
eq('the list grew by one', afterReload.length, startCount + 1)

const fromApi = await api('/users?q=E2E%20Manager')
eq('the API has the same row', fromApi?.data?.users?.[0]?.mobile, MANAGER.mobile)
eq('with the target that was typed', fromApi?.data?.users?.[0]?.target, 900000)

/* ── an executive reporting to that manager ───────────────────────────── */

await clickText(page, 'button', 'New', { exact: false })
await page.waitForSelector('#usr-name')
await sleep(400)
await fill(EXEC, 'Sales Executive')

await page.click('#usr-reporting')
await page.waitForSelector('[role=listbox]')
await sleep(300)
const managers = await page.$$eval('[role=option]', (os) => os.map((o) => o.textContent.trim()))
ok('the new manager is offered under Reporting To', managers.some((m) => m.includes(MANAGER.name)), managers.join(' | '))
ok('no admin among them', !managers.some((m) => /admin/i.test(m)), managers.join(' | '))
await page.keyboard.press('Escape')
await sleep(200)
await pickOption(page, '#usr-reporting', MANAGER.name)

await clickText(page, 'footer button, header button', 'Save')
await sleep(1500)
const execToast = await toastText()
has('a toast says a sales executive was created', execToast, 'Sales Executive created')
has('with the mobile they sign in with', execToast, EXEC.mobile)

const execRow = (await api(`/users?q=${encodeURIComponent(EXEC.name)}`))?.data?.users?.[0]
eq('the API stored who they report to', execRow?.reportingTo, (await api('/users?q=E2E%20Manager'))?.data?.users?.[0]?.id)

/* ── the Manager column, and searching by manager ─────────────────────── */

await goto(page, '/admin/users', { heading: 'Users' })
const headers = await page.$$eval('thead th', (ths) => ths.map((th) => th.textContent.trim()))
ok('there is a Manager column', headers.includes('Manager'), headers.join(' | '))

const columnOf = (name) => headers.findIndex((h) => h === name)
const table = await rows(page)
// Match on the name cell, not the whole row — the executive's row also
// contains the manager's name, in the very column under test.
// The name cell also carries the avatar's initials, so match on contains.
const rowFor = (name) => table.find((r) => r[columnOf('User Name')]?.toLowerCase().includes(name.toLowerCase()))
const execRowCells = rowFor(EXEC.name)
const managerRowCells = rowFor(MANAGER.name)
has('the executive shows who they report to', execRowCells?.[columnOf('Manager')] ?? '', MANAGER.name)
eq('a manager has nobody above them', managerRowCells?.[columnOf('Manager')], '—')

// Search is for the person, not their manager — that is the filter's job.
await page.type('input[type=search]', MANAGER.name)
await sleep(700)
const searchHits = await rows(page)
eq('searching a name finds only that person', searchHits.length, 1)
has('and it is the right one', searchHits[0][columnOf('User Name')], MANAGER.name)
await page.click('button[aria-label="Clear search"]')
await sleep(400)

/* ── the manager filter shows that manager's team ─────────────────────── */

await pickOption(page, '[aria-label="Filter by manager"]', MANAGER.name)
await sleep(600)
const team = await rows(page)
ok('the filter lists the team', team.length >= 1, `${team.length} rows`)
ok('every row reports to that manager', team.every((r) => r[columnOf('Manager')].toLowerCase() === MANAGER.name.toLowerCase()))
ok('the manager is not in their own team', !team.some((r) => r[columnOf('User Name')].toLowerCase().includes(MANAGER.name.toLowerCase())))
has('the executive is', team.map((r) => r[columnOf('User Name')]).join(' '), EXEC.name)

await page.click('button[aria-label="Clear selection"]')
await sleep(500)
ok('clearing the filter brings everyone back', (await rows(page)).length > team.length)

/* ── the server has the last word on a duplicate ──────────────────────── */

await clickText(page, 'button', 'New', { exact: false })
await page.waitForSelector('#usr-name')
await sleep(400)
await fill({ name: 'Clash', mobile: EXEC.mobile }, 'Sales Executive')
await clickText(page, 'footer button, header button', 'Save')
await sleep(1200)
has('a mobile already in use is refused', await toastText(), 'already signs in with this number')
await clickText(page, 'header button', 'Cancel')
await sleep(500)

/* ── status toggle goes to the server ─────────────────────────────────── */

const toggle = await page.$(`[aria-label="Deactivate ${EXEC.name}"], [aria-label="Activate ${EXEC.name}"]`)
if (toggle) {
  await toggle.click()
  await sleep(1200)
  const stored = (await api(`/users?q=${encodeURIComponent(EXEC.name)}`))?.data?.users?.[0]
  eq('the status change is stored', stored?.status, 'INACTIVE')
} else {
  // The switch sits in the row; click it by position instead.
  const row = await page.evaluateHandle(
    (name) => [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent.toUpperCase().includes(name.toUpperCase())),
    EXEC.name,
  )
  const sw = await row.asElement().$('button[role=switch]')
  await sw.click()
  await sleep(1200)
  const stored = (await api(`/users?q=${encodeURIComponent(EXEC.name)}`))?.data?.users?.[0]
  eq('the status change is stored', stored?.status, 'INACTIVE')
}

/* ── editing nothing cannot be saved ──────────────────────────────────── */

await goto(page, '/admin/users', { heading: 'Users' })
await page.click(`button[aria-label="Edit ${MANAGER.name}"]`)
await page.waitForSelector('#usr-name')
await sleep(500)

const saveButton = () =>
  page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Save changes'))
const saveState = async () => (await saveButton()).asElement().evaluate((b) => b.disabled)

ok('Save changes is greyed out on opening an edit', await saveState())

await page.type('#usr-name', ' Ltd')
await sleep(300)
ok('typing enables it', !(await saveState()))

// Undo the edit and it goes back to disabled.
await page.keyboard.press('Backspace')
await page.keyboard.press('Backspace')
await page.keyboard.press('Backspace')
await page.keyboard.press('Backspace')
await sleep(300)
ok('undoing the edit disables it again', await saveState())

await clickText(page, 'header button', 'Cancel')
await sleep(500)

/* ── phone ────────────────────────────────────────────────────────────── */

await page.setViewport({ width: 375, height: 760 })
await goto(page, '/admin/users', { heading: 'Users' })
ok('the list fits a phone screen', !(await overflows(page)))

await cleanup()
const left = await api('/users?limit=100')
ok('the suite leaves no accounts behind', !(left?.data?.users ?? []).some((u) => [MANAGER.mobile, EXEC.mobile].includes(u.mobile)))

// The duplicate-mobile attempt makes Chrome log the 409 it got back.
await finish(browser, errors, { ignore: /status of 409/ })
