/**
 * MOCK DATA (UI phase) — customers (retailers, chemists, clinics).
 * Backend replacement: GET /parties?type=customer → same shape.
 * Generated deterministically so the list looks the same on every load.
 */
import { INITIAL_CITIES, INITIAL_REGIONS, INITIAL_ROUTES } from './geography'

const PREFIX = ['Shree', 'Om', 'Jai', 'Sai', 'New', 'City', 'Arogya', 'Balaji', 'Mahakal', 'Gupta', 'Jain', 'Krishna', 'Shiv', 'Ganesh', 'Laxmi', 'Raj', 'Maa Durga', 'Kalyan', 'Sanjivani', 'Apna']
const SUFFIX = ['Medical Store', 'Medicos', 'Pharmacy', 'Chemist', 'Medical Hall', 'Drug House', 'Pharma', 'Medical Agency', 'Traders', 'Clinic']
const PEOPLE = ['Ramesh Jain', 'Suresh Gupta', 'Anil Sharma', 'Pooja Verma', 'Imran Khan', 'Vikas Patel', 'Neha Soni', 'Deepak Rathore', 'Arun Tiwari', 'Kavita Joshi']
const GROUPS = ['grp-retail', 'grp-retail', 'grp-retail', 'grp-hospital', 'grp-wholesale', 'grp-distributors']

function rng(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = rng(20260919)
const pick = (list) => list[Math.floor(rand() * list.length)]
const PAN_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const letters = (n) => Array.from({ length: n }, () => pick([...PAN_LETTERS])).join('')

function makeCustomer(i) {
  const route = INITIAL_ROUTES[i % INITIAL_ROUTES.length]
  const city = INITIAL_CITIES.find((c) => c.id === route.cityId)
  const region = INITIAL_REGIONS.find((g) => g.id === city.regionId)
  const name = `${pick(PREFIX)} ${pick(SUFFIX)}`
  const hasGeo = rand() > 0.12
  const hasGst = rand() > 0.35
  const hasMobile = rand() > 0.06
  const balance = rand() > 0.45 ? Math.round(rand() * 60000 / 10) * 10 : 0
  const street = `${Math.floor(rand() * 200) + 1}, ${route.name}`
  return {
    id: String(1853000 + i * 1571),
    type: 'CUSTOMER',
    name,
    code: rand() > 0.55 ? `NP-C${String(1000 + i)}` : '',
    contactPerson: rand() > 0.3 ? pick(PEOPLE) : '',
    mobile: hasMobile ? `${pick(['6', '7', '8', '9'])}${String(Math.floor(rand() * 1e9)).padStart(9, '0')}` : '',
    email: '',
    status: rand() > 0.08 ? 'ACTIVE' : 'INACTIVE',
    verified: rand() > 0.3,
    routeId: route.id,
    groupId: pick(GROUPS),
    lat: hasGeo ? +(city.lat + (rand() - 0.5) * 0.08).toFixed(6) : null,
    lng: hasGeo ? +(city.lng + (rand() - 0.5) * 0.08).toFixed(6) : null,
    billingAddress: `${street}, ${city.name}, ${region.name}`,
    shippingAddress: '',
    gstin: hasGst ? `${region.stateCode}${letters(5)}${String(Math.floor(rand() * 9000) + 1000)}${letters(1)}1Z${letters(1)}` : '',
    drugLicence: rand() > 0.4 ? `${region.stateCode === '23' ? 'MP' : region.stateCode === '09' ? 'UP' : 'RJ'}-${Math.floor(rand() * 90000) + 10000}` : '',
    openingBalance: balance,
    balanceType: balance && rand() > 0.85 ? 'PAY' : 'COLLECT',
    creditPeriodDays: pick([0, 15, 30, 30, 45]),
    creditLimit: pick([0, 25000, 50000, 100000]),
    creditBillLimit: pick([0, 2, 3, 5]),
    stateCode: region.stateCode,
    documents: [],
    createdAt: `2026-0${1 + (i % 9)}-${String(1 + (i % 27)).padStart(2, '0')}`,
  }
}

export const INITIAL_CUSTOMERS = Array.from({ length: 142 }, (_, i) => makeCustomer(i)).sort((a, b) => a.name.localeCompare(b.name))
