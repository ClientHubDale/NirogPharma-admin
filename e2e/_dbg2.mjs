import { start, login, goto, sleep, finish, ADMIN } from './lib.mjs'
const API = 'http://localhost:5000/api/v1'
const t = (await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: ADMIN.mobile, password: ADMIN.password }) }).then((r) => r.json()))?.data?.accessToken
const api = (p) => fetch(`${API}${p}`, { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json())
const dir = '/private/tmp/claude-501/-Users-macbookpro-Desktop-NP/2c2d1b7b-9c40-46bc-a403-ba95410bc1a0/scratchpad'
const inv = (await api('/invoices?limit=20')).data.invoices.find((i) => i.lines?.length)
const { browser, page, errors } = await start()
await login(page)
for (const copy of ['all', 'original']) {
  await goto(page, `/admin/sales/invoices/${inv.id}/print?copy=${copy}`)
  await sleep(2000)
  await page.pdf({ path: `${dir}/bill-${copy}.pdf`, format: 'A4', printBackground: true, margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' } })
}
await finish(browser, errors)
