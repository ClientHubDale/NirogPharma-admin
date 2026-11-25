/**
 * Reminders, Executive Secondary, and visits — the three dashboard rows that
 * needed a backend of their own.
 *
 * Everything this suite creates, it removes: an order and a visit it books
 * itself, and every reminder raised while it runs. Nothing it touches belongs
 * to the client, and nothing it leaves behind can age into a figure on their
 * dashboard — the lesson of the thirty-seven credit notes that lived on the
 * real books for three weeks because a suite deleted without cancelling.
 */
import { start, login, goto, sleep, ok, eq, has, finish, pageText, ADMIN } from '../lib.mjs'

const API = process.env.E2E_API ?? 'http://localhost:5000/api/v1'
const SHOP = 'E2E Clinic — Dr Test'
const SHOP_MOBILE = '9000000001'
const VISIT_NOTE = 'E2E call'
const BILL_NO = 'E2E/SEC/901'

const token = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mobile: ADMIN.mobile, password: ADMIN.password }),
})
  .then((r) => r.json())
  .then((r) => r.data.accessToken)

const api = (path, init) =>
  fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }).then((r) =>
    r.json().then((body) => ({ status: r.status, ...body })),
  )

/* ── what was here before us ──────────────────────────────────────────── */

// Every reminder that already exists is the client's. Remembering them by id
// is how the cleanup below can tell its own rows from theirs.
const theirReminders = new Set(((await api('/reminders/mine?all=1&limit=200')).data?.reminders ?? []).map((row) => row.id))
const theirSent = new Set(((await api('/reminders/sent?limit=200')).data?.reminders ?? []).map((row) => row.id))

const mine = { orderId: null, visitId: null, invoiceId: null }

/**
 * Take away everything this suite has ever made — not merely what this run
 * made.
 *
 * Sweeping by marker rather than by the ids in `mine` is the whole point. A
 * run that dies halfway leaves its rows behind, and an id-only cleanup cannot
 * see them on the next run, so they accumulate. That is exactly how
 * thirty-seven test credit notes came to sit on the client's real books for
 * three weeks.
 */
const cleanup = async () => {
  for (const visit of (await api('/visits?from=2020-01-01')).data?.rows ?? []) {
    for (const made of visit.dates ?? []) {
      if (made.note === VISIT_NOTE) await api(`/visits/${made.id}`, { method: 'DELETE' })
    }
  }

  for (const order of (await api('/orders?limit=200')).data?.orders ?? []) {
    if (order.shopName !== SHOP) continue
    // The bill goes first: deleting it hands its order back as confirmed and
    // clears the link, which is what lets the order be cancelled and removed.
    if (order.invoiceId) {
      await api(`/invoices/${order.invoiceId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) })
      await api(`/invoices/${order.invoiceId}`, { method: 'DELETE' })
    }
    await api(`/orders/${order.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) })
    await api(`/orders/${order.id}`, { method: 'DELETE' })
  }

  // Any bill this suite numbered, even one whose order has already gone.
  for (const bill of (await api(`/invoices?q=${encodeURIComponent(BILL_NO)}&limit=50`)).data?.invoices ?? []) {
    if (bill.invoiceNo !== BILL_NO) continue
    await api(`/invoices/${bill.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) })
    await api(`/invoices/${bill.id}`, { method: 'DELETE' })
  }

  for (const list of ['/reminders/mine?all=1&limit=200', '/reminders/sent?limit=200']) {
    for (const row of (await api(list)).data?.reminders ?? []) {
      if (theirReminders.has(row.id) || theirSent.has(row.id)) continue
      await api(`/reminders/${row.id}`, { method: 'DELETE' })
    }
  }
}

await cleanup()

/* ── 4. the bills past thirty days ───────────────────────────────────── */

const overdue = (await api('/reminders/overdue')).data
eq('the line is thirty days, not fifty', overdue?.afterDays, 30)
eq('…and the nudge repeats every alternate day', overdue?.everyDays, 2)
ok('the overdue list is bills, not firms', Array.isArray(overdue?.bills), typeof overdue?.bills)
ok(
  'every bill on it has actually passed the line',
  (overdue.bills ?? []).every((bill) => bill.days > 30 && bill.due > 0),
  (overdue.bills ?? []).map((b) => `${b.invoiceNo}:${b.days}d`).join(', '),
)
ok(
  'the amount is the sum of those bills',
  Math.abs(overdue.amount - (overdue.bills ?? []).reduce((sum, b) => sum + b.due, 0)) < 0.01,
  `${overdue.amount}`,
)
eq('…and the firm count matches them', overdue.parties, new Set((overdue.bills ?? []).map((b) => b.distributorId)).size)

// Asking for the list is what raises the nudges that are due, so the staff
// side has to be populated by now.
const staff = (await api('/reminders/mine?all=1&limit=200')).data

/**
 * One nudge per person per bill *per raise*.
 *
 * Not one ever: the client asked to be told again every alternate day until
 * the money comes in, so a bill still unpaid two days later rightly produces
 * a second row. This assertion used to compare total rows against distinct
 * person-and-bill pairs, which held only until the cadence fired — and then
 * failed every other day for being right.
 *
 * What must never happen is the same person being told twice in the same
 * breath, which is the bug this was written for: a manager who is also an
 * executive on their own firms appeared in both lists and got two.
 */
const moments = (staff.reminders ?? []).map((row) => `${row.invoiceId}:${row.recipientId}:${row.raisedAt}`)
eq('nobody is told twice in the same raise', moments.length, new Set(moments).size)

// And a repeat, when it comes, is a cadence apart rather than a double-send.
const byPair = new Map()
for (const row of staff.reminders ?? []) {
  const key = `${row.invoiceId}:${row.recipientId}`
  byPair.set(key, [...(byPair.get(key) ?? []), new Date(row.raisedAt).getTime()])
}
const tooSoon = [...byPair.entries()].filter(([, times]) => {
  const sorted = [...times].sort((a, b) => a - b)
  return sorted.some((time, i) => i > 0 && time - sorted[i - 1] < (overdue.everyDays ?? 2) * 86400000 - 60000)
})
ok('…and a repeat nudge waits the full cadence', tooSoon.length === 0, tooSoon.map(([key]) => key).join(', '))
ok(
  'a nudge names the bill, the firm and who it is for',
  (staff.reminders ?? []).every((row) => row.invoiceNo && row.distributorName && row.recipientName),
  JSON.stringify(staff.reminders?.[0] ?? {}).slice(0, 160),
)

// Asking twice must not raise a second round: the alternate-day rule has to
// hold however often the screen is opened.
const again = (await api('/reminders/mine?all=1&limit=200')).data
eq('asking again raises nothing new', again.reminders.length, staff.reminders.length)

/* ── 4. a firm is told only on purpose ───────────────────────────────── */

const target = (overdue.bills ?? [])[0]
if (target) {
  const sent = await api('/reminders/send', { method: 'POST', body: JSON.stringify({ invoiceIds: [target.invoiceId] }) })
  eq('the office can tell a firm about an overdue bill', sent.data?.sent, 1)

  const log = (await api('/reminders/sent?limit=50')).data?.reminders ?? []
  const row = log.find((entry) => entry.invoiceId === target.invoiceId && !theirSent.has(entry.id))
  ok('…and it is written down that they were told', Boolean(row), target.invoiceNo)
  eq('…against the right firm', row?.distributorId, target.distributorId)
  ok('…by a named person', Boolean(row?.raisedByName), row?.raisedByName)
} else {
  ok('no bill is past thirty days, so there is nobody to tell', true)
}

// A bill that is not late cannot be used to chase anybody.
const fresh = ((await api('/invoices?limit=50')).data?.invoices ?? []).find(
  (bill) => !(overdue.bills ?? []).some((old) => old.invoiceId === bill.id),
)
if (fresh) {
  const refused = await api('/reminders/send', { method: 'POST', body: JSON.stringify({ invoiceIds: [fresh.id] }) })
  eq('a bill that is not overdue is refused', refused.status, 400)
}
const empty = await api('/reminders/send', { method: 'POST', body: JSON.stringify({ invoiceIds: [] }) })
eq('and so is sending nothing', empty.status, 400)

/* ── 6. Executive Secondary ──────────────────────────────────────────── */

const firm = ((await api('/distributors?limit=50')).data?.distributors ?? [])[0]
const item = ((await api('/items?limit=50')).data?.items ?? []).find((row) => row.status === 'ACTIVE')

const booked = await api('/orders', {
  method: 'POST',
  body: JSON.stringify({
    distributorId: firm.id,
    orderDate: new Date().toISOString().slice(0, 10),
    shopName: SHOP,
    shopMobile: SHOP_MOBILE,
    lines: [{ itemId: item.id, quantity: 2, batches: [] }],
  }),
})
mine.orderId = booked.data?.order?.id ?? null
eq('an order can be booked from a shop or a doctor', booked.status, 201)
eq('…and it remembers which one', booked.data?.order?.shopName, SHOP)
eq('…and their number', booked.data?.order?.shopMobile, SHOP_MOBILE)

const secondary = (await api('/reports/executive-secondary')).data
ok('the month knows where it has got to', secondary?.asOfDay > 0 && secondary?.elapsed >= 0, `day ${secondary?.asOfDay}, ${secondary?.elapsed}%`)
ok('the order shows up as secondary sales', JSON.stringify(secondary?.executives ?? []).includes(SHOP), `${secondary?.orders} orders`)

const withShop = (secondary.executives ?? []).flatMap((person) => person.rows).find((row) => row.shopName === SHOP)
ok('its row carries the distributor as well as the shop', Boolean(withShop?.distributorName), withShop?.distributorName)
eq('…the mobile the order was booked on', withShop?.mobile, SHOP_MOBILE)
eq('…and it is red until the distributor sends it out', withShop?.dispatched, false)

/**
 * Green once it has gone — the client's own colour rule.
 *
 * The goods cannot go out before the bill does: an order refuses to be marked
 * dispatched until it has been converted, which is the rule the office works
 * to. So the bill is made first, exactly as it would be in the office.
 */
const confirmed = await api(`/orders/${mine.orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'CONFIRMED' }) })
eq('an order can be confirmed', confirmed.status, 200)

const early = await api(`/orders/${mine.orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'DISPATCHED' }) })
eq('the goods cannot go out before the bill', early.status, 409)

const bill = await api(`/orders/${mine.orderId}/invoice`, { method: 'POST', body: JSON.stringify({ invoiceNo: BILL_NO }) })
mine.invoiceId = bill.data?.invoice?.id ?? null
eq('the order becomes a bill', bill.status, 201)

const out = await api(`/orders/${mine.orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'DISPATCHED' }) })
eq('…and then the goods may go out', out.status, 200)

const after = (await api('/reports/executive-secondary')).data
const dispatched = (after.executives ?? []).flatMap((person) => person.rows).find((row) => row.shopName === SHOP)
eq('dispatched turns it green', dispatched?.dispatched, true)

ok(
  'a target is read against the calendar, not just the total',
  (after.executives ?? []).every((person) => person.target === 0 || typeof person.expected === 'number'),
  JSON.stringify((after.executives ?? [])[0] ?? {}).slice(0, 140),
)

/* ── 10. visits ──────────────────────────────────────────────────────── */

const before = (await api('/visits')).data
eq('a firm nobody visited is counted as missed', before.notVisited.length + before.visited, before.firms)

const visit = await api('/visits', {
  method: 'POST',
  body: JSON.stringify({ distributorId: firm.id, latitude: 28.6692, longitude: 77.4538, note: VISIT_NOTE }),
})
mine.visitId = visit.data?.visit?.id ?? null
eq('a visit can be recorded', visit.status, 201)
eq('…against that firm', visit.data?.visit?.distributorId, firm.id)
ok('…with where the device was', visit.data?.visit?.latitude !== null, String(visit.data?.visit?.latitude))

const report = (await api('/visits')).data
const visited = report.rows.find((row) => row.distributorId === firm.id)
ok('the firm moves onto the visited list', Boolean(visited), report.rows.map((r) => r.distributorName).join(', '))
ok('…carrying the date it was called on', (visited?.dates ?? []).some((d) => d.note === VISIT_NOTE))
ok('…and it is no longer among the missed', !report.notVisited.some((row) => row.distributorId === firm.id))

const counts = (await api('/visits/counts')).data
ok('the Parties column reads the same count', (counts.counts?.[firm.id]?.visits ?? 0) >= 1, JSON.stringify(counts.counts?.[firm.id] ?? {}))

/* ── the screens ─────────────────────────────────────────────────────── */

// `start` already collects page errors and console errors into `errors`.
const { browser, page, errors } = await start()
await login(page)
await goto(page, '/admin')
await sleep(4000)

const dash = await pageText(page)
has('the dashboard names the reminder line', dash, 'past 30 days')
has('Executive Secondary has its own card', dash, 'Executive Secondary')
has('…and visits is no longer "View routes"', dash, 'Distributor visits')
ok('the visits card offers Details instead', /Details/.test(dash))

// The reminder list opens, and the firm cannot be told by accident: Send is
// dead until a bill is ticked.
await page.click('[data-testid="open-reminders"]')
// The list fetches the overdue bills and what has already been sent before it
// can draw the table, so there are two round trips to wait out, not one.
await sleep(3000)
const sheet = await pageText(page)
has('the reminder list explains who hears automatically', sheet, 'every alternate day')
const sendOff = await page.$eval('[data-testid="reminder-send"]', (el) => el.disabled)
ok('Send is dead until a bill is ticked', sendOff === true, String(sendOff))
if (await page.$('[data-testid="reminder-tick-all"]')) {
  await page.click('[data-testid="reminder-tick-all"]')
  await sleep(500)
  const sendOn = await page.$eval('[data-testid="reminder-send"]', (el) => el.disabled)
  ok('…and alive once one is', sendOn === false, String(sendOn))
}
await page.keyboard.press('Escape')
await sleep(900)

// The Parties list carries the visits column the client asked for.
await goto(page, '/admin/parties/distributors', { heading: 'Distributors' })
// Firms, users, what each owes and now the visit counts all have to land
// before the table is drawn, so this waits longer than a one-fetch screen.
await sleep(4500)
const parties = await pageText(page)
// The header is styled uppercase, and `innerText` hands back the transformed
// text — so the column is matched without regard to case.
ok('Parties shows manager visits', /manager visits/i.test(parties), parties.slice(0, 90))

/* ── put everything back ─────────────────────────────────────────────── */

// Before `finish`, which closes the browser and ends the process.
await cleanup()

const leftovers = (await api('/reminders/mine?all=1&limit=200')).data?.reminders ?? []
eq('the suite leaves the client’s reminders alone', leftovers.length, theirReminders.size)
const orders = (await api('/orders?limit=100')).data?.orders ?? []
ok('…and takes its order away with it', !orders.some((row) => row.shopName === SHOP))
const stillVisited = (await api('/visits')).data
ok('…and its visit', !stillVisited.rows.some((row) => (row.dates ?? []).some((d) => d.note === VISIT_NOTE)))

// The refusals this suite checks on purpose are answered 400 and 409, and the
// panel logs those; they are the suite working, not the panel breaking.
await finish(browser, errors, { ignore: /status of (400|404|409)|Geolocation/ })
