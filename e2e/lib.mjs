/**
 * Shared harness for the browser suites.
 *
 * A suite is a plain .mjs script: it calls `start()`, drives the page with the
 * helpers here, records checks with `ok` / `eq` / `has`, and ends with
 * `finish()`. `run.sh` executes them and prints the tally.
 *
 * Nothing here is test-runner specific on purpose — puppeteer-core drives the
 * Chrome already on the machine, so there is no browser download.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, cpSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

export const E2E_DIR = path.dirname(fileURLToPath(import.meta.url))
export const BASE = process.env.E2E_BASE ?? 'http://localhost:5199'

const CHROME =
  process.env.E2E_CHROME ??
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'].find((p) =>
    existsSync(p),
  )

export const ADMIN = { mobile: '9876500001', password: 'admin@123' }

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/* ── assertions ──────────────────────────────────────────────────────── */

let passed = 0
let failed = 0

export function ok(label, condition, detail = '') {
  if (condition) {
    passed += 1
    console.log(`PASS ${label}`)
  } else {
    failed += 1
    console.log(`FAIL ${label}${detail ? ` — ${detail}` : ''}`)
  }
  return Boolean(condition)
}

export const eq = (label, actual, expected) =>
  ok(label, Object.is(actual, expected), `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)

export const has = (label, haystack, needle) =>
  ok(label, String(haystack ?? '').includes(needle), `${JSON.stringify(String(haystack ?? '').slice(0, 120))} has no ${JSON.stringify(needle)}`)

export const near = (label, actual, expected, slack = 1) =>
  ok(label, Math.abs(actual - expected) <= slack, `got ${actual}, want ${expected} ±${slack}`)

/* ── browser ─────────────────────────────────────────────────────────── */

/**
 * Opens a page on a scratch profile with its own download folder, seeded with
 * the import fixtures. Console errors are collected, and `finish()` fails the
 * suite if any appeared.
 */
export async function start({ width = 1440, height = 950, downloads = true } = {}) {
  if (!CHROME) throw new Error('No Chrome found — set E2E_CHROME to the browser binary.')

  const work = mkdtempSync(path.join(tmpdir(), 'np-e2e-'))
  const dl = path.join(work, 'downloads')
  mkdirSync(dl, { recursive: true })
  if (existsSync(path.join(E2E_DIR, 'fixtures'))) cpSync(path.join(E2E_DIR, 'fixtures'), work, { recursive: true })

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
  const page = await browser.newPage()
  await page.setViewport({ width, height })

  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))

  if (downloads) {
    await page.createCDPSession().then((cdp) => cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl }))
  }

  return { browser, page, errors, work, dl }
}

/** Signs in and waits for the dashboard. */
export async function login(page, who = ADMIN) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' })
  await page.type('#mobile', who.mobile)
  await page.type('#password', who.password)
  await page.click('button[type=submit]')
  await page.waitForFunction(() => location.pathname.startsWith('/admin') || location.pathname.startsWith('/distributor'), { timeout: 15000 })
  await sleep(800)
}

/** Navigates straight to a screen and waits for its <h1>. */
export async function goto(page, to, { heading } = {}) {
  await page.goto(`${BASE}${to}`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('h1', { timeout: 15000 })
  if (heading) await page.waitForFunction((h) => document.querySelector('h1')?.textContent.trim() === h, { timeout: 15000 }, heading)
  await sleep(500)
}

/* ── page helpers ────────────────────────────────────────────────────── */

export const heading = (page) => page.$eval('h1', (el) => el.textContent.trim())

/** Every rendered <tbody> row, cell by cell (textContent — CSS uppercase is not applied). */
export const rows = (page) =>
  page.$$eval('tbody tr', (trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent.trim())))

export const texts = (page, selector) => page.$$eval(selector, (els) => els.map((el) => el.textContent.trim()))

/** Clicks the first element matching `selector` whose text is exactly `label`. */
export async function clickText(page, selector, label, { exact = true } = {}) {
  const handle = await page.evaluateHandle(
    (sel, text, isExact) =>
      [...document.querySelectorAll(sel)].find((el) => {
        const own = el.textContent.trim()
        return isExact ? own === text : own.includes(text)
      }),
    selector,
    label,
    exact,
  )
  const element = handle.asElement()
  if (!element) throw new Error(`No ${selector} with text ${JSON.stringify(label)}`)
  await element.click()
  await sleep(350)
  return element
}

/**
 * Picks an option in a SearchSelect (the app's custom listbox, not a <select>):
 * opens it, types into its search box, then clicks the matching option.
 */
export async function pickOption(page, trigger, label) {
  await page.click(trigger)
  await page.waitForSelector('[role=listbox]', { timeout: 5000 })
  const search = await page.$('[role=combobox]')
  if (search) {
    await search.type(label.slice(0, 18))
    await sleep(250)
  }
  const option = await page
    .evaluateHandle(
      (text) => [...document.querySelectorAll('[role=option]')].find((li) => li.textContent.trim().toLowerCase().startsWith(text.toLowerCase())),
      label,
    )
    .then((h) => h.asElement())
  if (!option) throw new Error(`No option starting with ${JSON.stringify(label)}`)
  await option.click()
  await sleep(350)
}

/** The label a SearchSelect currently shows. */
export const chosen = (page, trigger) => page.$eval(trigger, (el) => el.textContent.trim())

/** Replaces the value of a field (by selector) — select-all then type. */
export async function setField(page, selector, value) {
  await page.click(selector, { clickCount: 3 })
  await page.keyboard.press('Backspace')
  if (value !== '') await page.type(selector, String(value))
  await sleep(120)
}

/** The page's visible text, whitespace-collapsed — handy for "is X on screen". */
export const pageText = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '))

/** Waits for a downloaded file to settle in the suite's download folder. */
export async function waitFile(dl, { match = /./, timeout = 15000 } = {}) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const found = readdirSync(dl).filter((name) => match.test(name) && !name.endsWith('.crdownload'))
    if (found.length) return path.join(dl, found[0])
    await sleep(250)
  }
  throw new Error(`No download matching ${match} within ${timeout}ms`)
}

/** Horizontal overflow — the mobile-width check every screen gets. */
export const overflows = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)

/* ── teardown ────────────────────────────────────────────────────────── */

/** Reports console errors as a check, prints the tally and exits non-zero on failure. */
export async function finish(browser, errors = []) {
  const noise = errors.filter((text) => !/favicon|ERR_INTERNET_DISCONNECTED|Download the React DevTools/i.test(text))
  ok('no console errors', noise.length === 0, noise.slice(0, 3).join(' | '))
  await browser.close()
  console.log(`— ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}
