/** Sidebar: accordion, collapsed rail, section flyouts, mobile sheet. */
import { start, login, goto, sleep, ok, eq, has, finish, overflows } from '../lib.mjs'

const { browser, page, errors } = await start()
await login(page)

const railWidth = () => page.evaluate(() => Math.round(document.querySelector('aside').getBoundingClientRect().width))
const groupButton = (label) =>
  page
    .evaluateHandle((l) => [...document.querySelectorAll('nav[aria-label=Dashboard] button')].find((b) => b.textContent.trim() === l), label)
    .then((h) => h.asElement())
const openGroup = async (label) => {
  const button = await groupButton(label)
  await button.click()
  await sleep(400)
}
const openSections = () =>
  page.$$eval('nav[aria-label=Dashboard] button[aria-expanded=true]', (bs) => bs.map((b) => b.textContent.trim().replace(/\s+/g, ' ')))
const flyout = () =>
  page.evaluate(() => {
    const menu = document.querySelector('[data-slot=dropdown-menu-content]')
    if (!menu) return null
    const label = menu.querySelector('[data-slot=dropdown-menu-label]')
    const tint = (el) => getComputedStyle(el).backgroundColor
    return {
      section: label.textContent.trim(),
      labelClickable: getComputedStyle(label).pointerEvents !== 'none',
      items: [...menu.querySelectorAll('a')].map((a) => a.textContent.trim()),
      tinted: [...menu.querySelectorAll('a')].filter((a) => tint(a) !== 'rgba(0, 0, 0, 0)').map((a) => a.textContent.trim()),
    }
  })

/* ── expanded sidebar: one section open at a time ─────────────────────── */

await openGroup('Sales')
eq('opening Sales opens one section', (await openSections()).length, 1)
await openGroup('Purchase')
const open = await openSections()
eq('opening Purchase closes Sales', open.length, 1)
has('Purchase is the open one', open[0], 'Purchase')

await goto(page, '/admin/users/payouts')
const active = await page.$$eval('nav[aria-label=Dashboard] a', (as) =>
  as.filter((a) => a.className.includes('bg-mint-pale')).map((a) => a.textContent.trim()),
)
eq('only the current page is highlighted', active.join(), 'Payouts')

/* ── collapsed rail ───────────────────────────────────────────────────── */

await page.click('button[aria-label="Close sidebar"]')
await sleep(500)
const narrow = await railWidth()
ok('the rail is narrow', narrow > 60 && narrow < 90, `width ${narrow}`)

const rail = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('nav[aria-label=Dashboard] > *')].map((el) => el.querySelector('a, button') ?? el)
  return rows.map((el) => {
    const box = el.getBoundingClientRect()
    const icon = el.querySelector('svg').getBoundingClientRect()
    return { h: Math.round(box.height), top: Math.round(box.top), iconX: Math.round(icon.x) }
  })
})
eq('every rail row is the same height', new Set(rail.map((r) => r.h)).size, 1)
eq('every rail icon sits on the same column', new Set(rail.map((r) => r.iconX)).size, 1)
const gaps = rail.slice(1).map((row, i) => row.top - rail[i].top)
eq('rail rows are evenly spaced', new Set(gaps).size, 1)

/* ── flyouts ──────────────────────────────────────────────────────────── */

await goto(page, '/admin')
await openGroup('Inventory')
const fresh = await flyout()
eq('the flyout is headed by the section', fresh.section, 'Inventory')
ok('the heading is not clickable', !fresh.labelClickable)
eq('it lists the section pages', fresh.items.join(), 'Items,Schemes,Price Lists')
eq('nothing looks pre-selected', fresh.tinted.length, 0)

await page.evaluate(() =>
  [...document.querySelectorAll('[data-slot=dropdown-menu-content] a')].find((a) => a.textContent.trim() === 'Price Lists').click(),
)
await sleep(1200)
eq('picking a page goes straight there', new URL(page.url()).pathname, '/admin/inventory/price-lists')
eq('the rail stays collapsed', await railWidth(), narrow)

await openGroup('Inventory')
eq('the current page is marked in the flyout', (await flyout()).tinted.join(), 'Price Lists')
await page.keyboard.press('Escape')
await sleep(250)

// A path that is the prefix of a sibling's (Users vs Users › Payouts).
await openGroup('User')
await page.evaluate(() =>
  [...document.querySelectorAll('[data-slot=dropdown-menu-content] a')].find((a) => a.textContent.trim() === 'Users').click(),
)
await sleep(1200)
await openGroup('User')
eq('Users and Payouts do not both light up', (await flyout()).tinted.join(), 'Users')
await page.keyboard.press('Escape')
await sleep(250)

// Hover names the icon.
await page.mouse.move(700, 400)
const icon = await page.$eval('nav[aria-label=Dashboard] a[href="/admin/live-location"]', (el) => {
  const box = el.getBoundingClientRect()
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
})
// a real drift across the icon — Radix opens on pointermove, not on a teleport
await page.mouse.move(icon.x, icon.y, { steps: 10 })
await sleep(800)
has('hovering a rail icon names it', await page.$$eval('[role=tooltip]', (ts) => ts.map((t) => t.textContent.trim()).join('|')), 'Live Location')

/* ── the toggle, and what it remembers ────────────────────────────────── */

await page.click('button[aria-label="Open sidebar"]')
await sleep(500)
ok('the logo button opens the sidebar again', (await railWidth()) > 200, `width ${await railWidth()}`)
await page.click('button[aria-label="Close sidebar"]')
await sleep(400)
await page.reload({ waitUntil: 'networkidle0' })
await sleep(900)
eq('the choice survives a reload', await railWidth(), narrow)
await page.click('button[aria-label="Open sidebar"]')
await sleep(400)

/* ── scrollbars ───────────────────────────────────────────────────────── */

const bar = await page.evaluate(() => {
  const nav = document.querySelector('nav[aria-label=Dashboard]')
  const style = getComputedStyle(nav)
  return { width: style.scrollbarWidth, colour: style.scrollbarColor }
})
eq('scroll areas use the slim bar', bar.width, 'thin')
ok('the bar is mint on a clear track', /rgb/.test(bar.colour) && /rgba\(0, 0, 0, 0\)|transparent/.test(bar.colour), bar.colour)

/* ── mobile ───────────────────────────────────────────────────────────── */

await page.setViewport({ width: 375, height: 760 })
await goto(page, '/admin')
ok('no sidebar on a phone', await page.$eval('aside', (el) => getComputedStyle(el).display === 'none'))
ok('the dashboard does not overflow sideways', !(await overflows(page)))
await page.click('button[aria-label="Open menu"]')
await sleep(600)
ok('the menu opens as a sheet', await page.$('nav[aria-label=Dashboard]'))

await finish(browser, errors)
