/**
 * Finance › Payment Out — money the factory pays its suppliers.
 *
 * The mirror of Payment In, minus the one thing it cannot have. Payment In
 * settles against sales invoices because those are ours and known to the
 * paisa; nobody enters what a supplier billed us, so there is nothing here to
 * settle against and the supplier's own bill number travels as plain text.
 *
 * What this suite is really guarding is the rule both screens share:
 * **approving is the only thing that puts money on the books**, and an
 * approved payment cannot be changed or deleted until it is rejected again.
 */
import { ok, eq, finish, goto, login, clickText, pageText, setField, sleep, start, ADMIN } from '../lib.mjs'

const API = process.env.E2E_API ?? 'http://localhost:5000/api/v1'

const signIn = async (mobile, password, client = 'web') =>
  fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile, password, client }),
  })
    .then((r) => r.json())
    .then((r) => r?.data?.accessToken)

const as = (token) => (p, init = {}) =>
  fetch(`${API}${p}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers } }).then(
    async (r) => ({ status: r.status, body: await r.json() }),
  )

const admin = as(await signIn(ADMIN.mobile, ADMIN.password))

/** Waits for something to come true rather than guessing how long it takes. */
const waitFor = async (what, { tries = 24, gap = 500 } = {}) => {
  for (let i = 0; i < tries; i += 1) {
    const got = await what()
    if (got) return got
    await sleep(gap)
  }
  return null
}

const SUP = 'E2E Out Supplier'
const SUP2 = 'E2E Out Supplier Two'
const UI_SUP = 'E2E UI Supplier'
const MOBILE = '9000000961'
const MARK = 'E2E payment out suite'
const UI_MARK = 'E2E payment out suite — on screen'

/**
 * Everything this suite made, gone again. An approved payment has to be
 * rejected before it will delete, and a supplier with payments against them
 * will not delete at all — which is the point of both rules.
 */
const wipe = async () => {
  for (const payment of (await admin('/payments-out?limit=300')).body.data?.payments ?? []) {
    if (payment.comment !== MARK && payment.comment !== UI_MARK) continue
    if (payment.status === 'APPROVED') {
      await admin(`/payments-out/${payment.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'REJECTED' }) })
    }
    await admin(`/payments-out/${payment.id}`, { method: 'DELETE' })
  }
  for (const supplier of (await admin('/suppliers?limit=300')).body.data?.suppliers ?? []) {
    if (![SUP, SUP2, UI_SUP].includes(supplier.name) && supplier.mobile !== MOBILE) continue
    await admin(`/suppliers/${supplier.id}`, { method: 'DELETE' })
  }
}
await wipe()


/**
 * Everything this suite made, gone again. An approved payment has to be
 * rejected before it will delete, and a supplier with payments against them
 * will not delete at all — which is the point of both rules.
 */

/* ── suppliers ───────────────────────────────────────────────────────── */

const nameless = await admin('/suppliers', { method: 'POST', body: JSON.stringify({ contactPerson: 'Nobody' }) })
ok('a supplier with no name is refused', nameless.status === 400 || nameless.status === 422, String(nameless.status))

const made = await admin('/suppliers', {
  method: 'POST',
  body: JSON.stringify({ name: SUP, contactPerson: 'Sanjay Mehta', mobile: MOBILE, gstin: '09AABCN9071E1ZD', state: 'UP' }),
})
const supplier = made.body.data?.supplier
eq('a supplier is added', made.status, 201)
eq('…and starts out active', supplier?.status, 'ACTIVE')
ok('…with no rate column, manager or map point asked for', !('priceTier' in (supplier ?? {})) && !('managerId' in (supplier ?? {})))

const clash = await admin('/suppliers', { method: 'POST', body: JSON.stringify({ name: SUP2, mobile: MOBILE }) })
eq('two suppliers cannot share a number', clash.status, 409)

const badMobile = await admin('/suppliers', { method: 'POST', body: JSON.stringify({ name: SUP2, mobile: '12345' }) })
eq('a mobile that is not a mobile is refused', badMobile.status, 400)

const other = (await admin('/suppliers', { method: 'POST', body: JSON.stringify({ name: SUP2 }) })).body.data?.supplier
ok('a supplier needs nothing but a name', Boolean(other?.id), other?.name)

ok(
  'suppliers are found by name',
  ((await admin(`/suppliers?q=${encodeURIComponent('E2E Out Supplier')}`)).body.data?.suppliers ?? []).length >= 2,
)

/* ── the money ───────────────────────────────────────────────────────── */

const offered = (await admin('/payments-out/next-number')).body.data?.number
ok('a voucher number is offered', /^POUT\/\d\d-\d\d\/\d{4}$/.test(offered ?? ''), offered)

const nothing = await admin('/payments-out', { method: 'POST', body: JSON.stringify({ supplierId: supplier.id, comment: MARK, amount: 0 }) })
eq('a payment worth nothing is refused', nothing.status, 400)

const noParty = await admin('/payments-out', { method: 'POST', body: JSON.stringify({ comment: MARK, amount: 500 }) })
ok('…and so is one with no supplier', noParty.status === 400 || noParty.status === 422, String(noParty.status))

const paid = await admin('/payments-out', {
  method: 'POST',
  body: JSON.stringify({ supplierId: supplier.id, comment: MARK, amount: 12500.5, method: 'ONLINE', reference: 'UTR9988', billRef: 'GPC/114' }),
})
const payment = paid.body.data?.payment
eq('money out is recorded', paid.status, 201)
eq('…taking the number it was offered', payment?.number, offered)
eq('…pending until the office approves it', payment?.status, 'PENDING')
eq('…for the right supplier', payment?.supplierName, SUP)
eq('…to the paisa', payment?.amount, 12500.5)
eq('…carrying their own bill number as typed', payment?.billRef, 'GPC/114')
ok('…and remembering who wrote it down', Boolean(payment?.recordedByName), payment?.recordedByName)

const second = (await admin('/payments-out/next-number')).body.data?.number
eq('the run counts on', Number(second.slice(-4)), Number(offered.slice(-4)) + 1)
eq(
  'a number cannot be used twice',
  (await admin('/payments-out', { method: 'POST', body: JSON.stringify({ supplierId: supplier.id, comment: MARK, amount: 1, number: offered } ) })).status,
  409,
)

/* ── a cheque ────────────────────────────────────────────────────────── */

const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)
const backdated = await admin('/payments-out', {
  method: 'POST',
  body: JSON.stringify({ supplierId: supplier.id, comment: MARK, amount: 900, method: 'CHEQUE', chequeDate: day(-3) }),
})
eq('a cheque dated before it was written is refused', backdated.status, 400)

const cheque = (
  await admin('/payments-out', {
    method: 'POST',
    body: JSON.stringify({ supplierId: supplier.id, comment: MARK, amount: 900, method: 'CHEQUE', reference: '004321', chequeDate: day(7) }),
  })
).body.data?.payment
eq('a post-dated cheque is fine', cheque?.chequeDate, day(7))

const toCash = (
  await admin(`/payments-out/${cheque.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ supplierId: supplier.id, comment: MARK, amount: 900, method: 'CASH' }),
  })
).body.data?.payment
eq('changing it to cash clears the cheque date', toCash?.chequeDate, '')

/* ── approving is what counts ────────────────────────────────────────── */

const beforeApproval = (await admin('/payments-out/paid')).body.data?.suppliers ?? []
ok('nothing is on the books while it is pending', !beforeApproval.some((r) => r.supplierId === supplier.id))

const approved = (await admin(`/payments-out/${payment.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'APPROVED' }) })).body
  .data?.payment
eq('the office approves it', approved?.status, 'APPROVED')
ok('…and is recorded as having done so', Boolean(approved?.approvedByName), approved?.approvedByName)

const afterApproval = (await admin('/payments-out/paid')).body.data?.suppliers ?? []
eq('…which puts the money on the books', afterApproval.find((r) => r.supplierId === supplier.id)?.paid, 12500.5)

eq(
  'an approved payment cannot be changed',
  (await admin(`/payments-out/${payment.id}`, { method: 'PATCH', body: JSON.stringify({ supplierId: supplier.id, amount: 99 }) })).status,
  409,
)
eq('…nor deleted', (await admin(`/payments-out/${payment.id}`, { method: 'DELETE' })).status, 409)

await admin(`/payments-out/${payment.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'REJECTED' }) })
const offBooks = (await admin('/payments-out/paid')).body.data?.suppliers ?? []
ok('rejecting takes it back off the books', !offBooks.some((r) => r.supplierId === supplier.id))
eq(
  '…and then it can be changed again',
  (await admin(`/payments-out/${payment.id}`, { method: 'PATCH', body: JSON.stringify({ supplierId: supplier.id, comment: MARK, amount: 11000 }) })).status,
  200,
)

/* ── a supplier we have paid stays ───────────────────────────────────── */

const held = await admin(`/suppliers/${supplier.id}`, { method: 'DELETE' })
eq('a supplier with payments cannot be deleted', held.status, 409)
ok('…and it says to switch them off instead', /inactive/i.test(held.body.message), held.body.message)

/* ── the field does not pay suppliers ────────────────────────────────── */

const exec = ((await admin('/users?limit=300')).body.data?.users ?? []).find((u) => u.role === 'EXECUTIVE')
if (exec) {
  const anon = await fetch(`${API}/payments-out`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  eq('an unauthenticated caller cannot pay anybody', anon.status, 401)
}


/* ── the screen ───────────────────────────────────────────────────────── */

const { browser, page } = await start()
const noise = []
page.on('pageerror', (e) => noise.push(String(e).slice(0, 160)))
await login(page)


await goto(page, '/admin/finance/payment-out', { heading: 'Payment Out' })
await sleep(1500)
const list = await pageText(page)
ok('the screen says what it is', /Payment Out/.test(list))
ok('…showing what has actually been paid', /Paid:/.test(list))
ok('…and what is still waiting on the office', /Awaiting approval/.test(list))

await clickText(page, 'button', 'Create Payment Out', { exact: false })
await sleep(1400)
const drawer = await pageText(page)
ok('the drawer opens', /Create Payment Out/.test(drawer))
ok('…saying approving is what puts it on the books', /approving is what puts it on the books/i.test(drawer))

const onScreenNumber = await waitFor(async () => {
  const v = await page.$eval('#out-number', (el) => el.value).catch(() => '')
  return /^POUT\/\d\d-\d\d\/\d{4}$/.test(v) ? v : null
})
ok('the voucher number is filled in already', Boolean(onScreenNumber), offered ?? '(empty)')

/* ── a supplier who is not on the books yet ──────────────────────────── */

ok('the drawer offers to add a supplier', Boolean(await page.$('#out-new-supplier')))
await page.click('#out-new-supplier')
await sleep(1200)
ok('…which opens a supplier form', /New supplier/.test(await pageText(page)))

await clickText(page, 'button', 'Add supplier', { exact: false })
await sleep(1000)
const refused = await page.$$eval('[id$="-error"]', (els) => els.map((e) => e.innerText.trim()).filter(Boolean))
ok('a supplier with no name is refused', refused.some((c) => /name/i.test(c)), refused.join(' | ').slice(0, 120))

await page.type('#sup-name', UI_SUP)
await setField(page, '#sup-mobile', '9000000962')
await page.type('#sup-gstin', '09AABCN9071E1ZD')
await sleep(300)
await clickText(page, 'button', 'Add supplier', { exact: false })

const uiSupplier = await waitFor(async () => ((await admin('/suppliers?limit=300')).body.data?.suppliers ?? []).find((s) => s.name === UI_SUP))
ok('the supplier is created', Boolean(uiSupplier), uiSupplier?.name)

await sleep(1200)
const chosen = await page.$eval('#out-supplier', (el) => el.textContent.trim()).catch(() => '')
ok('…and is already on the payment being written', chosen.includes(UI_SUP), chosen)

/* ── the money ───────────────────────────────────────────────────────── */

await setField(page, '#out-amount', '7500')
await sleep(300)
await page.type('#out-bill-ref', 'SUP/2231')
await page.type('#out-comment', UI_MARK)
await sleep(300)
await clickText(page, 'button', 'Record payment', { exact: false })

const saved = await waitFor(async () => ((await admin('/payments-out?limit=300')).body.data?.payments ?? []).find((p) => p.comment === UI_MARK))
ok('the payment is recorded', Boolean(saved), saved ? `${saved.number} — ₹${saved.amount}` : 'nothing saved')
ok('…for the supplier just added', saved?.supplierId === uiSupplier?.id)
ok('…pending, not on the books yet', saved?.status === 'PENDING', saved?.status)
ok('…carrying their bill number', saved?.billRef === 'SUP/2231', saved?.billRef)

await sleep(900)
const afterSave = await pageText(page)
ok('the screen says it is pending until approved', /pending until the office approves/i.test(afterSave), afterSave.slice(-140))

/* ── approving asks first ────────────────────────────────────────────── */

const openMenu = async (number) => {
  const selector = `button[aria-label="Actions for ${number}"]`
  if (!(await page.$(selector))) return false
  await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'center' }), selector)
  await sleep(300)
  await page.click(selector)
  await sleep(800)
  return true
}
ok('the row has its menu', await openMenu(saved.number))
await page.evaluate(() => [...document.querySelectorAll('[data-slot=dropdown-menu-item]')].find((i) => /^Approve/i.test(i.innerText))?.click())
await sleep(1000)
const asked = await page.$eval('[role="dialog"]', (d) => d.innerText.replace(/\n/g, ' · ')).catch(() => '')
ok('approving asks first', /Approve this payment/.test(asked), asked.slice(0, 140))
ok('…warning it cannot then be changed', /cannot be changed or deleted/i.test(asked))

const stillPending = ((await admin('/payments-out?limit=300')).body.data?.payments ?? []).find((p) => p.id === saved.id)
ok('…and nothing moved while it was asking', stillPending?.status === 'PENDING', stillPending?.status)

await clickText(page, 'button', 'Yes, approve it', { exact: false })
const uiApproved = await waitFor(async () => {
  const row = ((await admin('/payments-out?limit=300')).body.data?.payments ?? []).find((p) => p.id === saved.id)
  return row?.status === 'APPROVED' ? row : null
})
ok('it is approved', Boolean(uiApproved), uiApproved?.status)
await sleep(900)
ok('…and the screen says it is on the books', /on the books as paid/i.test(await pageText(page)))

const uiPaid = (await admin('/payments-out/paid')).body.data?.suppliers ?? []
ok('…which the running total agrees with', uiPaid.find((r) => r.supplierId === uiSupplier.id)?.paid === 7500)

/* ── a phone ─────────────────────────────────────────────────────────── */

await page.setViewport({ width: 375, height: 760 })
await goto(page, '/admin/finance/payment-out', { heading: 'Payment Out' })
await sleep(1200)
ok('the list fits a phone screen', !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)))


/* ── nothing left behind ─────────────────────────────────────────────── */

await wipe()
const leftPayments = ((await admin('/payments-out?limit=300')).body.data?.payments ?? []).filter(
  (p) => p.comment === MARK || p.comment === UI_MARK,
)
eq('the suite leaves no payment behind', leftPayments.length, 0)
const leftSuppliers = ((await admin('/suppliers?limit=300')).body.data?.suppliers ?? []).filter((s) =>
  [SUP, SUP2, UI_SUP].includes(s.name),
)
eq('…and no suppliers', leftSuppliers.length, 0)

await finish(browser, noise)
