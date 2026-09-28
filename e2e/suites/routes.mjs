/** Routes › Regions / Cities / Areas — the shared master list. */
import { start, login, goto, sleep, ok, eq, has, finish, rows, pageText, overflows, setField, clickText, pickOption } from '../lib.mjs'

const { browser, page, errors } = await start()
await login(page)

const subtitle = () => page.$eval('h1 + p', (el) => el.textContent.trim())
const noticeText = () => page.$eval('[role=status], [role=alert]', (el) => el.textContent.trim()).catch(() => '')
const save = () => clickText(page, 'footer button', 'Save')

/* ── Regions: create, duplicate guard, edit, delete guard ─────────────── */

await goto(page, '/admin/routes/regions', { heading: 'Regions' })
const startCount = (await rows(page)).length
ok('regions are listed', startCount > 0, `${startCount} rows`)
has('the subtitle counts them', await subtitle(), 'region')

await clickText(page, 'button', 'New', { exact: false })
await page.waitForSelector('#fld-name')
await page.type('#fld-name', 'Test Region')
await save()
await sleep(400)
has('a new region is confirmed', await noticeText(), 'added')
const afterCreate = await rows(page)
ok('it appears in the list', afterCreate.some((r) => r.join(' ').toLowerCase().includes('test region')))

await clickText(page, 'button', 'New', { exact: false })
await page.waitForSelector('#fld-name')
await page.type('#fld-name', 'test region')
await save()
await sleep(300)
has('a duplicate name is refused', await pageText(page), 'already exists')
await page.click('button[aria-label=Close]')
await sleep(300)

await page.click('button[aria-label="Edit Test Region"]')
await page.waitForSelector('#fld-name')
eq('editing loads the row', await page.$eval('#fld-name', (el) => el.value), 'Test Region')
await setField(page, '#fld-name', 'Test Region 2')
await save()
await sleep(400)
has('the edit is confirmed', await noticeText(), 'updated')

await page.click('button[aria-label="Delete Uttar Pradesh"]')
await sleep(400)
has('a region with cities cannot be deleted', await pageText(page), 'Move or delete those first')

await page.click('button[aria-label="Delete Test Region 2"]')
await sleep(400)
has('an unused region deletes', await noticeText(), 'deleted')
await clickText(page, 'button', 'Undo')
await sleep(400)
has('and the delete can be undone', await noticeText(), 'restored')
await page.click('button[aria-label="Delete Test Region 2"]')
await sleep(400)
eq('back to the count we started with', (await rows(page)).length, startCount)

/* ── Cities: search, filter, the region it belongs to ─────────────────── */

await goto(page, '/admin/routes/cities', { heading: 'Cities' })
const cities = await rows(page)
ok('cities are listed', cities.length > 0, `${cities.length} rows`)
ok('a city names its region', cities.some((r) => r.join(' ').toLowerCase().includes('uttar pradesh')))

await page.type('input[type=search]', 'meerut')
await sleep(500)
const searched = await rows(page)
ok('search narrows the list', searched.length > 0 && searched.length < cities.length, `${searched.length} of ${cities.length}`)
ok('every hit matches', searched.every((r) => r.join(' ').toLowerCase().includes('meerut')))
await page.click('button[aria-label="Clear search"]')
await sleep(400)
eq('clearing search restores the list', (await rows(page)).length, cities.length)

await pickOption(page, '#flt-regionId', 'Uttarakhand')
await sleep(400)
const filtered = await rows(page)
ok('the region filter narrows the list', filtered.length > 0 && filtered.length < cities.length, `${filtered.length} of ${cities.length}`)
ok('and keeps only that region', filtered.every((r) => r.join(' ').toLowerCase().includes('uttarakhand')))
await page.click('button[aria-label="Clear selection"]')
await sleep(400)
eq('clearing the filter restores the list', (await rows(page)).length, cities.length)

/* ── Areas: import/export controls, warehouse column, paging ──────────── */

await goto(page, '/admin/routes/areas', { heading: 'Areas' })
const areas = await rows(page)
ok('areas are listed', areas.length > 0, `${areas.length} rows`)
has('areas can be exported', await pageText(page), 'Export')
has('areas can be imported', await pageText(page), 'Import')
ok('an area carries its warehouse', (await pageText(page)).toLowerCase().includes('warehouse'))

const total = Number((await page.$eval('[aria-live=polite]', (el) => el.textContent.replace(/\s+/g, ' '))).match(/of (\d+)/)?.[1])
ok('the pager knows the total', total >= areas.length, `total ${total}, page ${areas.length}`)
if (total > areas.length) {
  await page.click('button[aria-label="Next page"]')
  await sleep(400)
  has('the pager moves on', await page.$eval('[aria-live=polite]', (el) => el.textContent.replace(/\s+/g, ' ')), `${areas.length + 1} -`)
}

/* ── phone ────────────────────────────────────────────────────────────── */

await page.setViewport({ width: 375, height: 760 })
await goto(page, '/admin/routes/areas', { heading: 'Areas' })
ok('areas fit a phone screen', !(await overflows(page)))

await finish(browser, errors)
