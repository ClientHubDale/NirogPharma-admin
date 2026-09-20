/**
 * Party (customer / supplier) form ⇄ record, validation, display helpers and
 * the Excel mapping. Per-type wording and defaults live in partyTypes.js.
 * Keep validation in sync with the backend validator later.
 */
import { INDIAN_STATES, STATE_NAME } from '@/constants/indianStates'
import { formatINR } from '@/lib/format'
import { formatLatLng, isInIndia, parseLatLng } from '@/lib/geo'
import { PARTY_GROUPS } from '@/mocks/parties'

export const PARTY_GROUP_OPTIONS = PARTY_GROUPS.filter((g) => g.value !== 'all')
export const PARTY_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
]
export const BALANCE_TYPES = [
  { value: 'COLLECT', label: 'To collect' },
  { value: 'PAY', label: 'To pay' },
]

export const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const MOBILE_PATTERN = /^[6-9]\d{9}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** "+91 98765-43210" → "9876543210" */
export const cleanMobile = (v) => String(v ?? '').replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '')

/** Signed balance: positive = they owe us (to collect), negative = we owe them (to pay). */
export const signedBalance = (c) => (c.balanceType === 'PAY' ? -1 : 1) * (Number(c.openingBalance) || 0)

export function balanceLabel(c) {
  const b = signedBalance(c)
  if (!b) return { amount: formatINR(0), note: '' }
  return { amount: formatINR(Math.abs(b)), note: b > 0 ? 'to collect' : 'to pay' }
}

/* ── form ────────────────────────────────────────────── */

export const emptyPartyForm = (defaults = {}) => ({
  name: '',
  code: '',
  contactPerson: '',
  mobile: '',
  email: '',
  status: 'ACTIVE',
  verified: false,
  routeId: '',
  groupId: 'grp-retail',
  geo: '',
  billingAddress: '',
  shippingAddress: '',
  sameAsBilling: true,
  gstin: '',
  drugLicence: '',
  openingBalance: '',
  balanceType: 'COLLECT',
  creditPeriodDays: '',
  creditLimit: '',
  creditBillLimit: '0',
  stateCode: '',
  documents: [],
  ...defaults,
})

const s = (v) => (v === null || v === undefined || v === 0 ? '' : String(v))

export const partyToForm = (c) => ({
  ...emptyPartyForm(),
  ...c,
  geo: formatLatLng(c.lat, c.lng),
  sameAsBilling: !c.shippingAddress || c.shippingAddress === c.billingAddress,
  openingBalance: s(c.openingBalance),
  creditPeriodDays: s(c.creditPeriodDays),
  creditLimit: s(c.creditLimit),
  creditBillLimit: String(c.creditBillLimit ?? 0),
  documents: c.documents ?? [],
})

const n = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v))

export function formToParty(form, id, existing) {
  const geo = parseLatLng(form.geo)
  return {
    id,
    type: existing?.type ?? form.type,
    name: form.name.trim(),
    code: form.code.trim(),
    contactPerson: form.contactPerson.trim(),
    mobile: cleanMobile(form.mobile),
    email: form.email.trim().toLowerCase(),
    status: form.status,
    verified: form.verified,
    routeId: form.routeId,
    groupId: form.groupId,
    lat: geo?.lat ?? null,
    lng: geo?.lng ?? null,
    billingAddress: form.billingAddress.trim(),
    shippingAddress: form.sameAsBilling ? '' : form.shippingAddress.trim(),
    gstin: form.gstin.trim().toUpperCase(),
    drugLicence: form.drugLicence.trim(),
    openingBalance: n(form.openingBalance),
    balanceType: form.balanceType,
    creditPeriodDays: n(form.creditPeriodDays),
    creditLimit: n(form.creditLimit),
    creditBillLimit: n(form.creditBillLimit),
    stateCode: form.stateCode,
    documents: form.documents,
    createdAt: existing?.createdAt ?? new Date().toISOString().slice(0, 10),
  }
}

/** Next 7-digit ID in the type's number range (customers 18…, suppliers 29…). */
export const nextPartyId = (parties, base) => String(Math.max(base, ...parties.map((c) => Number(c.id) || 0)) + 1)

/** Returns { field: message }. Empty = valid. */
export function validatePartyForm(form, { parties, editingId, noun = 'party' }) {
  const e = {}
  const others = parties.filter((c) => c.id !== editingId)

  if (!form.name.trim()) e.name = 'Business name is required.'
  const code = form.code.trim().toLowerCase()
  if (code && others.some((c) => c.code?.toLowerCase() === code)) e.code = `This code is already used by another ${noun}.`

  const mobile = cleanMobile(form.mobile)
  if (form.mobile && !MOBILE_PATTERN.test(mobile)) e.mobile = 'Enter a valid 10-digit mobile number.'
  else if (mobile) {
    const dup = others.find((c) => c.mobile === mobile)
    if (dup) e.mobile = `Already used by ${dup.name} (ID ${dup.id}).`
  }
  if (form.email && !EMAIL_PATTERN.test(form.email.trim())) e.email = 'Enter a valid email address.'

  if (form.geo.trim()) {
    const geo = parseLatLng(form.geo)
    if (!geo) e.geo = 'Use "latitude, longitude", e.g. 22.7196, 75.8577.'
    else if (!isInIndia(geo)) e.geo = 'That point is outside India — check the numbers aren’t swapped.'
  }

  const gstin = form.gstin.trim().toUpperCase()
  if (gstin) {
    if (!GSTIN_PATTERN.test(gstin)) e.gstin = 'GSTIN is 15 characters, e.g. 23ABCDE1234F1Z5.'
    else if (!STATE_NAME[gstin.slice(0, 2)]) e.gstin = `Unknown state code ${gstin.slice(0, 2)}.`
    else if (form.stateCode && form.stateCode !== gstin.slice(0, 2))
      e.stateCode = `GSTIN is registered in ${STATE_NAME[gstin.slice(0, 2)]}.`
  }

  const money = (field, label) => {
    const v = form[field]
    if (v !== '' && (Number.isNaN(Number(v)) || Number(v) < 0)) e[field] = `Enter a valid ${label}.`
  }
  money('openingBalance', 'amount')
  money('creditLimit', 'credit limit')
  if (form.creditPeriodDays !== '' && (!Number.isInteger(Number(form.creditPeriodDays)) || Number(form.creditPeriodDays) > 365))
    e.creditPeriodDays = 'Whole days, 0 to 365.'
  if (form.creditBillLimit !== '' && !Number.isInteger(Number(form.creditBillLimit))) e.creditBillLimit = 'Whole number of bills.'
  return e
}

/* ── Excel ───────────────────────────────────────────── */

const YES_NO = ['Yes', 'No']

export function partySheetColumns(routeNames) {
  return [
    { key: 'name', header: 'Business Name', width: 32, required: true, note: 'Required.' },
    { key: 'code', header: 'Code', width: 12, note: 'Optional, must be unique.' },
    { key: 'contactPerson', header: 'Contact Person', width: 20 },
    { key: 'mobile', header: 'Mobile', width: 14, note: '10-digit mobile, must be unique.' },
    { key: 'email', header: 'Email', width: 24 },
    { key: 'status', header: 'Status', width: 10, list: ['Active', 'Inactive'] },
    { key: 'verified', header: 'Verified', width: 10, list: YES_NO },
    { key: 'route', header: 'Route', width: 18, list: routeNames.length <= 60 ? routeNames : undefined, note: 'Must match an existing route name.' },
    { key: 'city', header: 'City', width: 14, note: 'Only needed when two cities share a route name.' },
    { key: 'group', header: 'Group', width: 18, list: PARTY_GROUP_OPTIONS.map((g) => g.label) },
    { key: 'lat', header: 'Latitude', width: 11, numFmt: '0.000000' },
    { key: 'lng', header: 'Longitude', width: 11, numFmt: '0.000000' },
    { key: 'billingAddress', header: 'Billing Address', width: 36 },
    { key: 'shippingAddress', header: 'Shipping Address', width: 36, note: 'Blank = same as billing.' },
    { key: 'gstin', header: 'GSTIN', width: 18, note: '15 characters. State of supply is taken from it if blank.' },
    { key: 'drugLicence', header: 'Drug Licence', width: 16 },
    { key: 'openingBalance', header: 'Opening Balance', width: 16, numFmt: '0.00' },
    { key: 'balanceType', header: 'Balance Type', width: 13, list: ['To collect', 'To pay'] },
    { key: 'creditPeriodDays', header: 'Credit Period (days)', width: 19, numFmt: '0' },
    { key: 'creditLimit', header: 'Credit Limit', width: 13, numFmt: '0.00' },
    { key: 'creditBillLimit', header: 'Credit Bill Limit', width: 16, numFmt: '0' },
    { key: 'state', header: 'State of Supply', width: 18, note: 'State name, e.g. Uttar Pradesh.' },
  ]
}

export function partiesToSheetRows(parties, { routesById, citiesById }) {
  const groupLabel = Object.fromEntries(PARTY_GROUP_OPTIONS.map((g) => [g.value, g.label]))
  return parties.map((c) => {
    const route = routesById[c.routeId]
    return {
      ...c,
      status: c.status === 'ACTIVE' ? 'Active' : 'Inactive',
      verified: c.verified ? 'Yes' : 'No',
      route: route?.name ?? '',
      city: citiesById[route?.cityId]?.name ?? '',
      group: groupLabel[c.groupId] ?? '',
      balanceType: c.balanceType === 'PAY' ? 'To pay' : 'To collect',
      state: STATE_NAME[c.stateCode] ?? '',
    }
  })
}

const HEADER_KEYS = Object.fromEntries(partySheetColumns([]).map((c) => [c.header.toLowerCase(), c.key]))
const num = (v) => (v === '' || v === null || v === undefined ? null : Number(String(v).replace(/[₹,\s]/g, '')))
const yes = (v) => ['yes', 'y', '1', 'true', 'verified'].includes(String(v ?? '').trim().toLowerCase())

/** Spreadsheet rows → { parties, skipped: [{ line, reason }] }. `config` gives the ID range and defaults. */
export function rowsToParties(rawRows, { existing, routes, citiesById, config }) {
  const codes = new Set(existing.map((c) => c.code?.toLowerCase()).filter(Boolean))
  const mobiles = new Set(existing.map((c) => c.mobile).filter(Boolean))
  const groupByLabel = Object.fromEntries(PARTY_GROUP_OPTIONS.map((g) => [g.label.toLowerCase(), g.value]))
  const stateByName = Object.fromEntries(INDIAN_STATES.map((st) => [st.label.toLowerCase(), st.value]))
  let nextId = Number(nextPartyId(existing, config.idBase))
  const parties = []
  const skipped = []

  rawRows.forEach((raw, index) => {
    const line = raw.__line ?? index + 2
    const row = Object.fromEntries(Object.entries(raw).filter(([h]) => HEADER_KEYS[h]).map(([h, v]) => [HEADER_KEYS[h], typeof v === 'string' ? v.trim() : v]))
    const skip = (reason) => skipped.push({ line, reason })

    const name = String(row.name ?? '').trim()
    if (!name) return skip('missing Business Name')
    const code = String(row.code ?? '').trim()
    if (code && codes.has(code.toLowerCase())) return skip(`Code ${code} already used`)
    const mobile = cleanMobile(row.mobile)
    if (row.mobile && !MOBILE_PATTERN.test(mobile)) return skip(`invalid Mobile "${row.mobile}"`)
    if (mobile && mobiles.has(mobile)) return skip(`Mobile ${mobile} already used`)

    let routeId = ''
    if (row.route) {
      const matches = routes.filter((r) => r.name.toLowerCase() === String(row.route).toLowerCase())
      const route = row.city ? matches.find((r) => citiesById[r.cityId]?.name.toLowerCase() === String(row.city).toLowerCase()) : matches[0]
      if (!route) return skip(`unknown Route "${row.route}"${row.city ? ` in ${row.city}` : ''}`)
      routeId = route.id
    }

    const lat = num(row.lat)
    const lng = num(row.lng)
    if ((lat === null) !== (lng === null)) return skip('Latitude and Longitude must both be filled')
    if (lat !== null && (Number.isNaN(lat) || Number.isNaN(lng) || !isInIndia({ lat, lng }))) return skip('location is not a valid point in India')

    const gstin = String(row.gstin ?? '').trim().toUpperCase()
    if (gstin && (!GSTIN_PATTERN.test(gstin) || !STATE_NAME[gstin.slice(0, 2)])) return skip(`invalid GSTIN "${gstin}"`)
    let stateCode = row.state ? stateByName[String(row.state).toLowerCase()] : ''
    if (row.state && !stateCode) return skip(`unknown State of Supply "${row.state}"`)
    if (!stateCode && gstin) stateCode = gstin.slice(0, 2)

    const numbers = ['openingBalance', 'creditPeriodDays', 'creditLimit', 'creditBillLimit'].map((k) => num(row[k]))
    if (numbers.some((v) => v !== null && (Number.isNaN(v) || v < 0))) return skip('a number column has an invalid value')

    if (code) codes.add(code.toLowerCase())
    if (mobile) mobiles.add(mobile)
    const [openingBalance, creditPeriodDays, creditLimit, creditBillLimit] = numbers.map((v) => v ?? 0)
    parties.push({
      id: String(nextId++),
      name,
      code,
      contactPerson: String(row.contactPerson ?? ''),
      mobile,
      email: String(row.email ?? '').toLowerCase(),
      type: config.type,
      status: String(row.status ?? '').toLowerCase() === 'inactive' ? 'INACTIVE' : 'ACTIVE',
      verified: yes(row.verified),
      routeId,
      groupId: groupByLabel[String(row.group ?? '').toLowerCase()] ?? config.defaultGroup,
      lat,
      lng,
      billingAddress: String(row.billingAddress ?? ''),
      shippingAddress: String(row.shippingAddress ?? ''),
      gstin,
      drugLicence: String(row.drugLicence ?? ''),
      openingBalance,
      balanceType: row.balanceType ? (String(row.balanceType).toLowerCase() === 'to pay' ? 'PAY' : 'COLLECT') : config.defaultBalanceType,
      creditPeriodDays,
      creditLimit,
      creditBillLimit,
      stateCode: stateCode || '',
      documents: [],
      createdAt: new Date().toISOString().slice(0, 10),
    })
  })
  return { parties, skipped }
}
