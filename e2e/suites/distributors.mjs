/**
 * Parties › Distributors against the real API — the chain
 * admin → manager → distributor → executive, through the UI.
 */
import { start, login, goto, sleep, ok, eq, has, finish, rows, pageText, overflows, clickText, pickOption, ADMIN, BASE, waitForToast } from '../lib.mjs'

const API = process.env.E2E_API ?? 'http://localhost:5000/api/v1'
const MANAGER = { name: 'E2E Dist Manager', mobile: '6900000061' }
const EXEC = { name: 'E2E Dist Exec', mobile: '6900000062' }
const DIST = { name: 'E2E Vaidya Distributors', mobile: '6900000063' }

/* ── set up the staff through the API, and clean up after ─────────────── */

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

const cleanup = async () => {
  for (const d of (await api('/distributors?limit=100')).data?.distributors ?? []) {
    if (d.mobile === DIST.mobile || d.name === DIST.name) {
      await api(`/distributors/${d.id}`, { method: 'PATCH', body: JSON.stringify({ executiveIds: [] }) })
      await api(`/distributors/${d.id}`, { method: 'DELETE' })
    }
  }
  for (const u of (await api('/users?limit=100')).data?.users ?? []) {
    if ([MANAGER.mobile, EXEC.mobile].includes(u.mobile)) await api(`/users/${u.id}`, { method: 'DELETE' })
  }
}
await cleanup()

const manager = await api('/users', {
  method: 'POST',
  body: JSON.stringify({ name: MANAGER.name, mobile: MANAGER.mobile, role: 'MANAGER', password: 'nirog@123' }),
})
const exec = await api('/users', {
  method: 'POST',
  body: JSON.stringify({ name: EXEC.name, mobile: EXEC.mobile, role: 'EXECUTIVE', password: 'nirog@123' }),
})
const managerId = manager?.data?.user?.id
const execId = exec?.data?.user?.id

const { browser, page, errors } = await start()

// The place search and the device position are stubbed: the suite must not
// depend on an outside service, and a headless browser has no real fix.
await page.setRequestInterception(true)
page.on('request', (request) => {
  const url = request.url()
  const json = (body) =>
    request.respond({
      status: 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(body),
    })

  if (url.includes('nominatim.openstreetmap.org/search')) {
    return json([
      { place_id: '1', display_name: 'Sanwer Road, Industrial Area, Indore, Madhya Pradesh, 452015, India', lat: '22.7533', lon: '75.8370' },
      { place_id: '2', display_name: 'Sanwer, Indore, Madhya Pradesh, India', lat: '22.9700', lon: '75.8300' },
    ])
  }
  if (url.includes('nominatim.openstreetmap.org/reverse')) {
    return json({ display_name: 'Lawad, Meerut, Uttar Pradesh, India' })
  }
  return request.continue()
})

await browser.defaultBrowserContext().overridePermissions(BASE, ['geolocation'])
await page.setGeolocation({ latitude: 28.9845, longitude: 77.7064 })

await login(page)
await goto(page, '/admin/parties/distributors', { heading: 'Distributors' })

const startCount = (await rows(page)).length
const toastText = () => waitForToast(page)

/* ── the menu entry ───────────────────────────────────────────────────── */

const partiesPages = await page.evaluate(() => {
  const group = [...document.querySelectorAll('nav[aria-label=Dashboard] button')].find((b) => b.textContent.trim() === 'Parties')
  group.click()
  return new Promise((resolve) =>
    setTimeout(() => resolve([...document.querySelectorAll('nav[aria-label=Dashboard] a')].map((a) => a.textContent.trim())), 400),
  )
})
has('Distributors sits under Parties', partiesPages.join(' | '), 'Distributors')

/* ── a list inside the drawer scrolls with the wheel ──────────────────── */

// Regression: the drawer locks scrolling outside itself, so a list portalled to
// <body> had its wheel events swallowed and the last options were unreachable.
await clickText(page, 'button', 'New', { exact: false })
await page.waitForSelector('#dist-name')
await sleep(500)
await page.click('#dist-weeklyoff')
await page.waitForSelector('[role=listbox]')
await sleep(400)

const wheel = await page.evaluate(() => {
  const list = document.querySelector('[role=listbox]')
  const box = list.getBoundingClientRect()
  return { scrollable: list.scrollHeight > list.clientHeight, x: box.x + box.width / 2, y: box.y + box.height / 2 }
})
ok('the weekly-off list is longer than the box', wheel.scrollable)
await page.mouse.move(wheel.x, wheel.y)
await page.mouse.wheel({ deltaY: 300 })
await sleep(400)
ok('and the wheel scrolls it', (await page.$eval('[role=listbox]', (l) => l.scrollTop)) > 0)

const lastDay = await page.evaluate(() => [...document.querySelectorAll('[role=option]')].at(-1).textContent.trim())
eq('so the last day can be reached', lastDay, 'Saturday')
await page.keyboard.press('Escape')
await sleep(250)
await clickText(page, 'header button', 'Cancel')
await sleep(500)

/* ── create one through the form ──────────────────────────────────────── */

await clickText(page, 'button', 'New', { exact: false })
await page.waitForSelector('#dist-name')
await sleep(500)

const form = await pageText(page)
for (const label of ['Firm Details', 'Who Runs It', 'Area Covered', 'Trade Terms', 'Shop Photo & Signature']) {
  has(`the form has the ${label} section`, form, label)
}

ok('there is no Code field', !(await page.$('#dist-code')) && !form.includes('Code'))
ok('a second mobile number can be given', Boolean(await page.$('#dist-alt-mobile')))

// Firm name, contact person and mobile are all required now.
await clickText(page, 'header button, footer button', 'Create distributor')
await sleep(600)
const required = await page.$$eval('[id$="-error"]', (els) => els.map((e) => e.id))
ok(
  'every required field is marked',
  ['dist-name-error', 'dist-contact-error', 'dist-mobile-error', 'dist-manager-error', 'dist-executive-error', 'dist-region-error', 'dist-city-error', 'dist-area-error', 'dist-location-error'].every(
    (id) => required.includes(id),
  ),
  required.join(' | '),
)

await page.type('#dist-name', DIST.name)
await page.type('#dist-contact', 'Rajesh Vaidya')
await page.type('#dist-mobile', DIST.mobile)
await page.type('#dist-alt-mobile', DIST.mobile)
await clickText(page, 'header button, footer button', 'Create distributor')
await sleep(600)
has(
  'the second number cannot repeat the first',
  await page.$eval('#dist-alt-mobile-error', (el) => el.textContent.trim()).catch(() => ''),
  'same as the first',
)
await page.click('#dist-alt-mobile', { clickCount: 3 })
await page.keyboard.press('Backspace')
await page.type('#dist-alt-mobile', '6900000064')
await page.type('#dist-address', '21, Sanwer Road, Industrial Area, Indore 452015')
await page.type('#dist-gstin', '23AACVP7781K1Z5')
await page.type('#dist-dl', '20B/MP/IND/1502')

// A firm with no manager cannot be saved.
await clickText(page, 'header button, footer button', 'Create distributor')
await sleep(600)
has('a manager is required', await pageText(page), 'Choose the manager')

await pickOption(page, '#dist-manager', MANAGER.name)
await pickOption(page, '#dist-weeklyoff', 'Sunday')
await page.type('#dist-transport', 'VRL Logistics')
await page.type('#dist-credit-limit', '250000')
await page.type('#dist-credit-days', '30')
await page.type('#dist-target', '500000')

// The rate column this firm buys on.
await page.click('#dist-price-tier')
await page.waitForSelector('[role=listbox]')
await sleep(300)
const tiers = await page.$$eval('[role=option]', (os) => os.map((o) => o.innerText.split('\n')[0].trim()))
eq('the price tier offers the four rate columns', tiers.join(' | '), 'Default — full MRP | −50% −12% | −50% −15% | −45% −10%')
await page.keyboard.press('Escape')
await sleep(200)
await pickOption(page, '#dist-price-tier', '−50% −12%')

/* ── region → city → area narrows as you go ───────────────────────────── */

await pickOption(page, '#dist-region', 'Uttar Pradesh')
await page.click('#dist-city')
await page.waitForSelector('[role=listbox]')
await sleep(300)
const upCities = await page.$$eval('[role=option]', (os) => os.map((o) => o.textContent.trim()))
ok('the city list is limited to the region', upCities.length > 0 && !upCities.some((c) => /Jaipur|Dehradun/.test(c)), upCities.slice(0, 4).join(' | '))
await page.keyboard.press('Escape')
await sleep(200)

await pickOption(page, '#dist-city', 'Meerut')
await page.click('#dist-area')
await page.waitForSelector('[role=listbox]')
await sleep(300)
const meerutAreas = await page.$$eval('[role=option]', (os) => os.map((o) => o.textContent.trim()))
ok('the area list is limited to the city', meerutAreas.length > 0, meerutAreas.slice(0, 3).join(' | '))
await page.keyboard.press('Escape')
await sleep(200)
await pickOption(page, '#dist-area', meerutAreas[0])

/* ── the location: searched, then taken from the device ───────────────── */

await page.click('#dist-location')
await page.waitForSelector('input[aria-label="Search for a location"]')
await page.type('input[aria-label="Search for a location"]', 'Sanwer Road')
await sleep(1400)
const places = await page.$$eval('[role=option]', (os) => os.map((o) => o.innerText.split('\n')[0]))
eq('the search offers the places it found', places.join(' | '), 'Sanwer Road | Sanwer')

await page.evaluate(() => document.querySelectorAll('[role=option]')[0].click())
await sleep(400)
has('picking one fills the field', await page.$eval('#dist-location', (el) => el.textContent.trim()), 'Sanwer Road')

// …and the button takes the position of whoever is filling the form in.
await clickText(page, 'button', 'Use current location', { exact: false })
await sleep(1600)
has('the current location replaces it', await page.$eval('#dist-location', (el) => el.textContent.trim()), 'Lawad, Meerut')

// One executive is attached from here, chosen from all of them.
await page.click('#dist-executive')
await page.waitForSelector('[role=listbox]')
await sleep(300)
const offered = await page.$$eval('[role=option]', (os) => os.map((o) => o.textContent.trim()))
ok('every executive is offered', offered.some((o) => o.includes(EXEC.name)), offered.slice(0, 3).join(' | '))
await page.keyboard.press('Escape')
await sleep(200)
await pickOption(page, '#dist-executive', EXEC.name)
eq('and only one can be picked', await page.$eval('#dist-executive', (el) => el.textContent.trim()), EXEC.name)

await clickText(page, 'header button, footer button', 'Create distributor')
await sleep(1800)
has('a toast confirms the distributor', await toastText(), 'Distributor created')

/* ── it is in the database, with the whole chain ──────────────────────── */

await page.reload({ waitUntil: 'networkidle0' })
await sleep(1800)
const listed = await rows(page)
eq('the list grew by one', listed.length, startCount + 1)

const headers = await page.$$eval('thead th', (ths) => ths.map((th) => th.textContent.trim()))
const columnOf = (name) => headers.findIndex((h) => h === name)
const row = listed.find((r) => r[columnOf('Firm Name')].toLowerCase().includes(DIST.name.toLowerCase()))
ok('it survives a reload', Boolean(row))
has('the row names its manager', row[columnOf('Manager')], MANAGER.name)
has('and names the executive, not a count', row[columnOf('Executive')], EXEC.name)
has('both mobile numbers are shown', row[columnOf('Mobile')], DIST.mobile)
has('including the second one', row[columnOf('Mobile')], '6900000064')
has('the location column shows the place', row[columnOf('Location')], 'Lawad')
has('the city and area are shown', row[columnOf('City / Area')].toLowerCase(), 'meerut')
has('the credit terms are shown', row[columnOf('Credit')], '30 days')

const stored = (await api(`/distributors?q=${encodeURIComponent(DIST.name)}`)).data.distributors[0]
eq('the API agrees about the manager', stored.managerId, managerId)
eq('and about the executive', stored.executiveIds.join(), execId)
eq('the target was saved', stored.target, 500000)
eq('the weekly off was saved', stored.weeklyOff, 'SUNDAY')
eq('the price tier was saved', stored.priceTier, 'D50_12')
has('and shows in the table', row[columnOf('Price Tier')], '−50% −12%')
eq('the second number was saved', stored.altMobile, '6900000064')
eq('the captured latitude was saved', stored.latitude, 28.9845)
eq('and the longitude', stored.longitude, 77.7064)
has('with the name of the place', stored.locationName, 'Lawad')
ok('no code is stored any more', stored.code === undefined, String(stored.code))

/* ── the location opens on a map, and the executive filter ────────────── */

const mapLink = await page.$eval('tbody a[href*="google.com/maps"]', (a) => a.href).catch(() => '')
has('the location links to the map', mapLink, '28.9845,77.7064')
ok('and opens in a new tab', await page.$eval('tbody a[href*="google.com/maps"]', (a) => a.target === '_blank'))

await pickOption(page, '[aria-label="Filter by executive"]', EXEC.name)
await sleep(600)
const byExec = await rows(page)
ok('the executive filter keeps their distributor', byExec.some((r) => r[columnOf('Firm Name')].toLowerCase().includes(DIST.name.toLowerCase())))
ok('and drops the rest', byExec.every((r) => r[columnOf('Executive')].toLowerCase().includes(EXEC.name.toLowerCase())))
await page.click('[aria-label="Filter by executive"] ~ button[aria-label="Clear selection"], button[aria-label="Clear selection"]')
await sleep(500)

/* ── the executive now shows the distributor on Users ─────────────────── */

await goto(page, '/admin/users', { heading: 'Users' })
await sleep(600)
const userHeaders = await page.$$eval('thead th', (ths) => ths.map((th) => th.textContent.trim()))
ok('Users has a Distributor column', userHeaders.includes('Distributor'), userHeaders.join(' | '))

await page.type('input[type=search]', EXEC.name)
await sleep(700)
const execRow = (await rows(page))[0]
has('the executive row shows the distributor', execRow[userHeaders.indexOf('Distributor')], DIST.name)

/* ── delete is refused while somebody works there ─────────────────────── */

await goto(page, '/admin/parties/distributors', { heading: 'Distributors' })
await sleep(600)
await page.click(`button[aria-label="Delete ${DIST.name}"]`)
await sleep(1500)
has('deleting is refused while an executive is attached', await toastText(), EXEC.name)

/* ── phone ────────────────────────────────────────────────────────────── */

await page.setViewport({ width: 375, height: 760 })
await goto(page, '/admin/parties/distributors', { heading: 'Distributors' })
ok('the list fits a phone screen', !(await overflows(page)))

await cleanup()
const left = await api('/distributors?limit=100')
ok('the suite leaves nothing behind', !(left?.data?.distributors ?? []).some((d) => d.mobile === DIST.mobile))

// The refused save and the refused delete make Chrome log their 400/409.
await finish(browser, errors, { ignore: /status of (400|409)/ })
