/**
 * Finance › Payment In, and the money ledger behind it.
 *
 * The rule the whole module turns on: **recording a payment is not having the
 * money**. A cheque is handed over long before it clears, so a payment is
 * entered as Pending and the office approves it only once it is in the
 * company's account — "बैंक में लगाया है, हमारे खाते में पैसा आ गया, उस चैक के
 * अगेंस्ट अप्रूव करेंगे". Only then does a distributor's outstanding move.
 *
 * Alongside it, the bills from before the system: the client holds the paper
 * copies and types them in so the money owed is right, and those bills must
 * not move any stock, because the goods left months ago.
 */
import { start, login, goto, sleep, ok, eq, has, finish, pageText, overflows, pickOption, ADMIN } from '../lib.mjs'

const API = process.env.E2E_API ?? 'http://localhost:5000/api/v1'
const ITEM = { name: 'E2E Pay Tonic', code: 'E2E-PAY-ITEM' }
const OLD_BILL = 'E2E/PAY/OLD1'
const NEW_BILL = 'E2E/PAY/NEW1'
const BATCH = 'E2E-PAY-A'
/** Marks the payment this suite writes by hand, so cleanup can find it. */
const MARK = 'E2E staff payment'

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
  for (const payment of (await api('/payments?limit=300')).data?.payments ?? []) {
    if (!payment.number.startsWith('PIN/')) continue
    if (!payment.comment?.includes('E2E')) continue
    if (payment.status === 'APPROVED') {
      await api(`/payments/${payment.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'REJECTED' }) })
    }
    await api(`/payments/${payment.id}`, { method: 'DELETE' })
  }
  for (const bill of (await api('/invoices?limit=300')).data?.invoices ?? []) {
    if (![OLD_BILL, NEW_BILL].includes(bill.invoiceNo)) continue
    if (bill.status !== 'PENDING' && bill.status !== 'CANCELLED') {
      await api(`/invoices/${bill.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) })
    }
    await api(`/invoices/${bill.id}`, { method: 'DELETE' })
  }
  for (const batch of (await api('/stocks/batches?limit=300')).data?.batches ?? []) {
    if (batch.batchNo === BATCH) await api(`/stocks/batches/${batch.id}`, { method: 'DELETE' })
  }
  for (const item of (await api('/items?limit=300')).data?.items ?? []) {
    if (item.code === ITEM.code) await api(`/items/${item.id}`, { method: 'DELETE' })
  }
}
await cleanup()

const firm = ((await api('/distributors?limit=200')).data?.distributors ?? []).find(
  (row) => (row.state ?? '').toUpperCase() === 'UP',
)
if (!firm) {
  console.log('FAIL  a distributor inside UP is needed — none in the database')
  process.exit(1)
}

const item = (
  await api('/items', {
    method: 'POST',
    body: JSON.stringify({ ...ITEM, unit: 'BTL', category: 'Syrup', mrp: 600, gst: 5, hsn: '300490' }),
  })
).data.item

/** Where this firm's account stands right now. */
const account = async () => (await api(`/payments/dues?distributorId=${firm.id}`)).data.account
const started = await account()

/* ── a bill from before the system ────────────────────────────────────── */

/**
 * "जैसे नया जनरेट हो रहा है, वैसे पुराना भी जनरेट कर सके" — the client types
 * the old bills in from the paper copies. The money is owed; the goods left
 * months ago, so nothing may move on the shelf.
 */
const past = (
  await api('/invoices', {
    method: 'POST',
    body: JSON.stringify({
      invoiceNo: OLD_BILL,
      distributorId: firm.id,
      invoiceDate: '2026-06-10',
      pastBill: true,
      lines: [{ itemId: item.id, quantity: 10, batches: [] }],
    }),
  })
).data?.invoice

ok('an old bill can be typed in', Boolean(past?.id), JSON.stringify(past).slice(0, 160))
eq('…and it knows it is an old one', past?.pastBill, true)

const issuedPast = (await api(`/invoices/${past.id}/issue`, { method: 'POST' })).data?.invoice
eq('…it goes out without any batches being chosen', issuedPast?.status, 'CONFIRMED')

const touched = ((await api(`/stocks/distributors?distributorId=${firm.id}`)).data?.rows ?? []).filter(
  (row) => row.itemId === item.id,
)
eq('…and it moves no stock at all', touched.length, 0, JSON.stringify(touched).slice(0, 160))

const afterBill = await account()
eq(
  'but the money is owed, to the rupee',
  Math.round((afterBill.outstanding - started.outstanding) * 100) / 100,
  Number(past.total),
)

// It is a real bill, so it can be settled and credited against like any other.
const dues = (await api(`/payments/dues?distributorId=${firm.id}`)).data?.bills ?? []
const owing = dues.find((row) => row.invoiceNo === OLD_BILL)
ok('the old bill shows up as unpaid', Boolean(owing), JSON.stringify(dues.slice(0, 2)))
eq('…with the whole of it still due', owing?.due, Number(past.total))

/* ── a payment is not money until it is approved ──────────────────────── */

const number = (await api('/payments/next-number')).data?.number
ok('payments run on their own series', number?.startsWith('PIN/'), number)

const cheque = (
  await api('/payments', {
    method: 'POST',
    body: JSON.stringify({
      distributorId: firm.id,
      at: '2026-11-13',
      method: 'CHEQUE',
      reference: 'CHQ-9001',
      comment: 'E2E cheque',
      allocations: [{ invoiceId: past.id, amount: Number(past.total) }],
    }),
  })
).data?.payment

ok('a payment can be recorded', Boolean(cheque?.id), JSON.stringify(cheque).slice(0, 160))
eq('…and it starts out waiting for approval', cheque?.status, 'PENDING')
eq('…worth what it settles', cheque?.amount, Number(past.total))

const pending = await account()
eq('a pending payment moves nothing', pending.outstanding, afterBill.outstanding)
eq('…but it is shown as waiting on the office', pending.awaiting, Number(past.total))

// A second payment must not be able to settle the same bill over again.
const twice = await api('/payments', {
  method: 'POST',
  body: JSON.stringify({
    distributorId: firm.id,
    at: '2026-11-13',
    comment: 'E2E double',
    allocations: [{ invoiceId: past.id, amount: Number(past.total) }],
  }),
})
eq('money already spoken for cannot be settled twice', twice?.code, 'OVER_ALLOCATED', JSON.stringify(twice).slice(0, 160))

/* ── approving is what makes it real ──────────────────────────────────── */

await api(`/payments/${cheque.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'APPROVED' }) })
const approved = await account()
eq('approving takes it off what they owe', approved.outstanding, started.outstanding)
eq('…and it stops being money we are waiting on', approved.awaiting, 0)
eq('…and counts as received', approved.received - started.received, Number(past.total))

// An approved payment is a fact. Changing it means undoing it first.
const edited = await api(`/payments/${cheque.id}`, {
  method: 'PATCH',
  body: JSON.stringify({ distributorId: firm.id, at: '2026-11-13', otherPayment: 5 }),
})
eq('an approved payment cannot be quietly edited', edited?.code, 'PAYMENT_ALREADY_SETTLED', JSON.stringify(edited).slice(0, 140))
const deleted = await api(`/payments/${cheque.id}`, { method: 'DELETE' })
eq('…nor deleted', deleted?.code, 'PAYMENT_ALREADY_SETTLED', JSON.stringify(deleted).slice(0, 140))

/* ── the cheque bounces ───────────────────────────────────────────────── */

// "बाद में रिजेक्ट भी कर सकते हैं" — the money goes straight back on the books.
await api(`/payments/${cheque.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'REJECTED' }) })
const bounced = await account()
eq('rejecting it puts the money back on what they owe', bounced.outstanding, afterBill.outstanding)
eq('…and it is not counted as received any more', bounced.received, started.received)
eq('…nor as waiting', bounced.awaiting, 0)

const freed = ((await api(`/payments/dues?distributorId=${firm.id}`)).data?.bills ?? []).find(
  (row) => row.invoiceNo === OLD_BILL,
)
eq('…and the bill is due again in full', freed?.due, Number(past.total))

/* ── a discount is money off, and needs the same approval ─────────────── */

const withDiscount = (
  await api('/payments', {
    method: 'POST',
    body: JSON.stringify({
      distributorId: firm.id,
      at: '2026-11-13',
      method: 'CASH',
      comment: 'E2E discount',
      allocations: [{ invoiceId: past.id, amount: Number(past.total) - 200 }],
      discount: 200,
    }),
  })
).data?.payment

eq('a discount comes off the payment', withDiscount?.amount, Number(past.total) - 400)
eq('…and waits on the office like any other', withDiscount?.status, 'PENDING')

/* ── every firm at once ───────────────────────────────────────────────── */

const all = (await api('/payments/accounts')).data?.accounts ?? []
const ours = all.find((row) => row.distributorId === firm.id)
ok('every firm’s account can be read in one go', Boolean(ours), String(all.length))
eq('…and it agrees with the firm’s own', ours?.outstanding, bounced.outstanding)

/* ── the screen ───────────────────────────────────────────────────────── */

const { browser, page, errors } = await start()
await login(page)

await goto(page, '/admin/finance/payment-in', { heading: 'Payment In' })
await sleep(1200)
const list = await pageText(page)
has('the payment is on the list', list, withDiscount.number)
has('…against the firm it came from', list, firm.name)
has('…and says what approval is for', list, 'only once the office approves')
has('…with the money that is really ours kept apart', list, 'Banked:')
has('…from the money still waiting', list, 'Awaiting approval:')

// Writing one by hand.
await page.click('button:has-text("Create Payment In")').catch(async () => {
  const buttons = await page.$$('button')
  for (const button of buttons) {
    const text = await page.evaluate((el) => el.textContent, button)
    if (text?.includes('Create Payment In')) return button.click()
  }
})
await sleep(900)
ok('the drawer offers a payment number', Boolean(await page.$('#pay-number')))
await pickOption(page, '#pay-party', firm.name)
await sleep(1200)

const drawer = await pageText(page)
has('choosing the firm shows what they owe', drawer, 'Outstanding')
has('…and what they were billed', drawer, 'Billed')
has('…and what came back on credit notes', drawer, 'Credit notes')
has('…and lists the bill still unpaid', drawer, OLD_BILL)
ok('…with a box to settle it', Boolean(await page.$(`#alloc-${past.id}`)))

/* ── whose payment it is ─────────────────────────────────────────────── */

/**
 * "Collected By" is gone, and in its place the two people the firm is
 * already assigned — "पार्टी असाइन मैनेजर… पार्टी असाइन एग्जीक्यूटिव"
 * (16:13, 17:18). They are not decoration: the client works targets out of
 * money in, so every payment has to say whose it was.
 */
ok('the drawer no longer asks who collected it', !(await page.$('#pay-collected')))
ok('it asks for the party’s manager instead', Boolean(await page.$('#pay-manager')))
ok('…and the party’s executive', Boolean(await page.$('#pay-executive')))
ok('party type is gone — "पार्टी टाइप की ज़रूरत नहीं"', !(await page.$('#pay-party-type')))

const chosen = await page.$eval('#pay-manager', (el) => el.innerText.trim()).catch(() => '')
ok(
  'the manager fills itself in from the firm',
  firm.managerId ? chosen === (firm.managerName ?? '') : true,
  `${chosen} || firm has ${firm.managerName || '(none)'}`,
)

// The note on money kept on account only exists once there is money on
// account — "किस चीज़ का पेमेंट है" has nothing to answer otherwise.
ok('no note is asked for before money is kept on account', !(await page.$('#pay-other-note')))
await page.type('#pay-other', '700')
await sleep(500)
ok('…and it is asked for as soon as there is', Boolean(await page.$('#pay-other-note')))
await page.type('#pay-other-note', 'Advance against the Diwali order')

if (firm.executives?.length) await pickOption(page, '#pay-executive', firm.executives[0].name)

// "एरिया ऐड करना है, एग्जीक्यूटिव सिलेक्ट करेगा" (22:47) — which beat the
// money came off, and nothing saves without it.
ok('the drawer asks which area it was collected on', Boolean(await page.$('#pay-area')))
await page.type('#pay-area', 'Rampur beat')
await page.type('#pay-comment', MARK)
await sleep(300)

await page.evaluate(() => [...document.querySelectorAll('button[type=submit]')].find((b) => b.innerText.trim() === 'Save')?.click())
await sleep(2500)

/** The save is a round trip; give it a moment rather than reading once. */
const waitForPayment = async (match, tries = 10) => {
  for (let i = 0; i < tries; i += 1) {
    const found = ((await api('/payments?limit=300')).data?.payments ?? []).find(match)
    if (found) return found
    await sleep(500)
  }
  return null
}

const written = await waitForPayment((row) => row.comment === MARK)
ok('the payment saves', Boolean(written), 'nothing came back')
if (written) {
  eq('…credited to the firm’s manager', written.managerName, firm.managerName ?? '')
  if (firm.executives?.length) eq('…and to the executive who collected it', written.executiveName, firm.executives[0].name)
  eq('…with the money on account', written.otherPayment, 700)
  eq('…and the reason it is on account', written.otherNote, 'Advance against the Diwali order')
  eq('…and still only a piece of paper until the office approves it', written.status, 'PENDING')
  eq('…and the beat it came off', written.area, 'Rampur beat')
  // "जिस पार्टी की पेमेंट डाले उसकी number of payment दे" (14:56): the run
  // belongs to the firm, so another firm may hold the very same number.
  const elsewhere = ((await api('/distributors?limit=200')).data?.distributors ?? []).find((one) => one.id !== firm.id)
  if (elsewhere) {
    const theirNext = (await api(`/payments/next-number?distributorId=${elsewhere.id}`)).data?.number
    const oursNext = (await api(`/payments/next-number?distributorId=${firm.id}`)).data?.number
    ok('each firm counts its receipts on its own', theirNext !== oursNext || written.number !== theirNext, `${oursNext} vs ${theirNext}`)
  }

  await goto(page, '/admin/finance/payment-in', { heading: 'Payment In' })
  await sleep(1500)
  const columns = await page.$$eval('thead th', (cells) => cells.map((cell) => cell.innerText.trim()))
  ok('the list says whose payment it is', columns.includes('MANAGER / EXECUTIVE'), columns.join(' | '))
  const row = await page.evaluate(
    (no) => [...document.querySelectorAll('tbody tr')].find((tr) => tr.innerText.includes(no))?.innerText ?? '',
    written.number,
  )
  has('…and names them on the row', row.toUpperCase(), (firm.managerName ?? '').toUpperCase())
  await api(`/payments/${written.id}`, { method: 'DELETE' })
}

await page.keyboard.press('Escape')
await sleep(500)

/* ── a sum handed over at the shop ───────────────────────────────────── */

/**
 * The office is given an amount, not a bill-by-bill breakdown. It goes
 * against the oldest bill first and down the list — "जो सबसे पुराना इनवॉइस
 * है उसमें चला जाए" (24:26) — and whatever no bill can take is kept on
 * account rather than refused.
 */
await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  buttons.find((b) => b.innerText.includes('Create Payment In'))?.click()
})
await sleep(900)
await pickOption(page, '#pay-party', firm.name)
await sleep(1400)

const owedBefore = (await account()).outstanding
const openBills = ((await api(`/payments/dues?distributorId=${firm.id}`)).data?.bills ?? []).filter((row) => row.due > 0)
const oldest = openBills[0]
ok('the firm has a bill to settle', Boolean(oldest), `${openBills.length} unpaid`)

if (oldest) {
  // More than every bill put together, so the ladder is walked all the way
  // down and the overflow has nowhere left to go but on account.
  const owedOnBills = openBills.reduce((sum, row) => sum + row.due, 0)
  const handed = Math.round(owedOnBills + 50)
  await page.type('#pay-spread', String(handed))
  await sleep(300)
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Put on oldest bills')?.click())
  await sleep(900)

  const filled = await page.evaluate(() => {
    const out = { bills: {} }
    for (const input of document.querySelectorAll('input[id^="alloc-"]')) out.bills[input.id.replace('alloc-', '')] = Number(input.value) || 0
    out.other = Number(document.querySelector('#pay-other')?.value) || 0
    return out
  })

  eq('the oldest bill is settled first, and in full', filled.bills[oldest.id], oldest.due)
  ok(
    '…then the next one down the list',
    openBills.every((row) => filled.bills[row.id] === row.due),
    JSON.stringify(filled.bills),
  )
  const spread = Object.values(filled.bills).reduce((sum, one) => sum + one, 0)
  eq('…and every rupee handed over is accounted for', Math.round((spread + filled.other) * 100) / 100, handed)
  ok('…with what no bill could take kept on account', filled.other > 0, `${filled.other}`)

  /**
   * "अगर ये क्लियर हो गया तो कितना बकाया बचेगा" (19:31) — read against what
   * is owed today, because this payment is still only a piece of paper.
   */
  const line = await page.$eval('#pay-after', (el) => el.innerText.trim()).catch(() => '')
  ok('the drawer says what will be left if it clears', Boolean(line), '(no line)')
  const expected = Math.round((owedBefore - handed) * 100) / 100
  const figure = Math.abs(expected).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  has('…and the figure is the one the ledger holds', line, figure)
  if (expected < 0) has('…said in their favour, not as a minus', line, 'in credit')

  // Goods they sent back are money in their favour, and whoever is asking
  // for a cheque should not be the last to hear about it.
  const notes = ((await api(`/credit-notes?distributorId=${firm.id}&status=ISSUED&limit=50`)).data?.notes ?? []).length
  const onScreen = await pageText(page)
  if (notes > 0) {
    has('their credit notes are shown beside what they owe', onScreen, 'Their credit notes')
    has('…totalled in their favour', onScreen, 'in their favour')
  } else {
    ok('no credit notes panel when they have sent nothing back', !onScreen.includes('Their credit notes'))
  }
}

await page.keyboard.press('Escape')
await sleep(500)

/* ── the cheque, and the day it can be banked ────────────────────────── */

/**
 * A cheque is money only on the day written on it — "आज 16 तारीख है, चेक 20
 * का है" (18:12) — and both sides of it are photographed, because the back
 * carries the endorsement that settles an argument later (18:02).
 */
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.includes('Create Payment In'))?.click())
await sleep(900)
await pickOption(page, '#pay-party', firm.name)
await sleep(1400)

ok('a cash payment is asked nothing about cheques', !(await page.$('#pay-cheque-date')))
await pickOption(page, '#pay-method', 'Cheque')
await sleep(700)
ok('choosing cheque asks for the date written on it', Boolean(await page.$('#pay-cheque-date')))
ok('…and for the front of it', Boolean(await page.$('#cheque-front')))
ok('…and the back', Boolean(await page.$('#cheque-back')))

const typeDate = (selector, value) =>
  page.$eval(
    selector,
    (el, v) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      setter.call(el, v)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    },
    value,
  )

const dayFrom = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)

await page.type('#pay-reference', '004321')
await page.type('#pay-area', 'Rampur beat')
await page.type('#pay-other', '5000')
await sleep(400)
await page.type('#pay-other-note', 'Cheque against the old bills')
await page.type('#pay-comment', MARK)

// A cheque dated before it was handed over is somebody typing the wrong
// date, and it would fall straight into an overdue reminder.
await typeDate('#pay-cheque-date', dayFrom(-1))
await page.evaluate(() => [...document.querySelectorAll('button[type=submit]')].find((b) => b.innerText.trim() === 'Save')?.click())
await sleep(1200)
const refused = await page.$$eval('.text-destructive', (es) => es.map((e) => e.innerText.trim()))
ok('a cheque dated before it was handed over is refused', refused.some((one) => /before the day/i.test(one)), JSON.stringify(refused))

await typeDate('#pay-cheque-date', dayFrom(0))
await sleep(300)
await page.evaluate(() => [...document.querySelectorAll('button[type=submit]')].find((b) => b.innerText.trim() === 'Save')?.click())
await sleep(2000)

const postDated = await waitForPayment((row) => row.comment === MARK && row.method === 'CHEQUE')
ok('the cheque saves', Boolean(postDated), 'nothing came back')
if (postDated) {
  eq('…with the day it is dated for', postDated.chequeDate, dayFrom(0))
  eq('…and its number', postDated.reference, '004321')

  /**
   * Due today, so the office is told — "उस डेट पे रिमाइंडर आना चाहिए"
   * (18:25), with the cheque number and the amount on it.
   */
  const due = (await api('/payments/cheques-due')).data
  ok('a cheque due today is on the list to bank', (due.cheques ?? []).some((one) => one.id === postDated.id), `${due.cheques?.length} due`)

  await goto(page, '/admin/finance/payment-in', { heading: 'Payment In' })
  await sleep(2000)
  const banner = await page.$eval('#cheques-due', (el) => el.innerText.replace(/\n/g, ' ')).catch(() => '')
  ok('and the screen says so on the way in', /waiting to be banked/.test(banner), banner.slice(0, 120))

  /**
   * Approving is what makes the money real and rejecting puts it back on
   * the books, so neither may happen on a mis-click — "गलती से क्लिक हो
   * गया तो" (27:43).
   */
  await page.evaluate((no) => {
    const row = [...document.querySelectorAll('tbody tr')].find((tr) => tr.innerText.includes(no))
    row?.querySelector('button[aria-label^="Actions"]')?.scrollIntoView({ block: 'center' })
  }, postDated.number)
  await sleep(400)
  await page.click('button[aria-label^="Actions"]')
  await sleep(600)
  await page.evaluate(() => [...document.querySelectorAll('[data-slot=dropdown-menu-item]')].find((i) => /Approve/i.test(i.innerText))?.click())
  await sleep(900)

  const asked = await page.$eval('[role="dialog"]', (d) => d.innerText).catch(() => '')
  ok('approving asks before it does anything', /Approve this payment\?/.test(asked), asked.slice(0, 120))
  has('…and says how much is at stake', asked, '5,000')
  const untouched = ((await api('/payments?limit=300')).data?.payments ?? []).find((one) => one.id === postDated.id)
  eq('…and nothing moves while it is asking', untouched?.status, 'PENDING')

  await page.keyboard.press('Escape')
  await sleep(400)

  if (postDated.status === 'APPROVED') {
    await api(`/payments/${postDated.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'REJECTED' }) })
  }
  await api(`/payments/${postDated.id}`, { method: 'DELETE' })
}

/* ── what the stock with them is worth ────────────────────────────────── */

await goto(page, '/admin/stocks/distributor', { heading: 'Distributor Stocks' })
await sleep(2500)

// "कितने का माल पड़ा है" — quantity never answered that, so the holdings now
// carry money as well, at the rate the goods actually went out at.
const heads = await page.$$eval('th', (cells) => cells.map((cell) => cell.textContent.trim()))
ok('the holdings screen carries money too', heads.includes('Value'), heads.join(' | '))

const money = await page.$$eval('tbody td', (cells) => cells.map((cell) => cell.textContent.trim()))
ok('…and a holding shows what it is worth', money.some((text) => /^₹/.test(text)), money.slice(0, 12).join(' | '))
ok('…beside the rate behind it', money.some((text) => text.includes('@ ₹')), money.slice(0, 12).join(' | '))

/**
 * Most stock reached a distributor through Stocks → Issue, where the bill
 * number is typed by hand and is no bill of ours. Those rows are still priced,
 * off the firm's rate column — but the screen has to say so, because a
 * valuation nobody can trace is worse than none.
 */
const priced = (await api('/stocks/distributors')).data?.rows ?? []
ok(
  'every holding carries a value',
  priced.every((row) => row.heldValue !== null),
  JSON.stringify(priced.filter((row) => row.heldValue === null).map((row) => `${row.distributorName}/${row.itemName}`)),
)
ok(
  '…and each says which price it used',
  // MIXED is the honest answer for a holding that came on our bills and also
  // by other means — it is priced, and the screen says both halves.
  priced.every((row) => ['BILL', 'TIER', 'MIXED'].includes(row.rateSource)),
  JSON.stringify(priced.map((row) => row.rateSource)),
)

const starred = priced.some((row) => row.rateSource === 'TIER')
if (starred) {
  const note = await page.$eval('#holdings-rate-note', (el) => el.textContent).catch(() => '')
  has('…and the screen explains the ones it could not prove', note, 'never went out on a bill')
  ok('…marking those rates apart', money.some((text) => text.includes('*')), money.slice(0, 12).join(' | '))
}

/* ── what each firm owes, on the distributor list ─────────────────────── */

/**
 * "डिस्ट्रीब्यूटर वाले मॉड्यूल के अंदर ही 1 कॉलम ऐड करना पड़ेगा… इतना हमारा
 * पैसा गया है और इतना आया है… कितना बकाया है, ये सब दिखाना पड़ेगा."
 */
await goto(page, '/admin/parties/distributors', { heading: 'Distributors' })
await sleep(2200)

const firmHeads = await page.$$eval('th', (cells) => cells.map((cell) => cell.textContent.trim()))
ok('the distributor list says what each firm owes', firmHeads.includes('Outstanding'), firmHeads.join(' | '))

const shown = await page.$$eval('tbody tr', (trs) =>
  trs.map((tr) => ({
    name: tr.querySelectorAll('td')[1]?.innerText.split('\n')[0] ?? '',
    cells: [...tr.querySelectorAll('td')].map((td) => td.innerText.replace(/\s+/g, ' ').trim()),
  })),
)
const mine = shown.find((row) => row.name.toUpperCase() === firm.name.toUpperCase())
ok('…for the firm this suite has been billing', Boolean(mine), shown.map((r) => r.name).join(' | '))

// A credit balance means the returns outran the bills, so it must not read as
// a debt — the screen says "cr" rather than printing a minus sign.
const live = (await api('/payments/accounts')).data?.accounts?.find((row) => row.distributorId === firm.id)
const printed = mine?.cells.join(' ') ?? ''
const figure = Math.abs(live?.outstanding ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
ok('…and the figure is the one the ledger holds', printed.includes(figure), `${printed.slice(0, 160)} || want ${figure}`)
if ((live?.outstanding ?? 0) < 0) {
  ok('…marked as a credit, not as a debt', printed.includes('cr'), printed.slice(0, 160))
  ok('…and never as a minus', !printed.includes(`-₹`), printed.slice(0, 160))
}

/* ── phone ────────────────────────────────────────────────────────────── */

await page.setViewport({ width: 375, height: 760 })
await goto(page, '/admin/finance/payment-in', { heading: 'Payment In' })
await sleep(800)
ok('the payment list fits a phone screen', !(await overflows(page)))

/* ── nothing left behind ──────────────────────────────────────────────── */

await cleanup()
const back = await account()
eq('the suite leaves the firm’s account as it found it', back.outstanding, started.outstanding)
ok(
  'and takes its payments with it',
  !((await api('/payments?limit=300')).data?.payments ?? []).some((row) => row.comment?.includes('E2E')),
)

await finish(browser, errors, { ignore: /status of (400|404|409)/ })
