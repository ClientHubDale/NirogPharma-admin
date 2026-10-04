/**
 * Distributor firms: the form shape and its rules. A distributor has no login —
 * the admin creates the record, a manager owns it, and executives work under
 * it (admin → manager → distributor → executive).
 */
import { GSTIN_PATTERN } from '@/components/Parties/shared/partyModel'

export const WEEK_DAYS = [
  { value: 'SUNDAY', label: 'Sunday' },
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
]

export const DAY_LABEL = Object.fromEntries(WEEK_DAYS.map((d) => [d.value, d.label]))

export const DISTRIBUTOR_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
]

export const emptyDistributorForm = () => ({
  name: '',
  contactPerson: '',
  mobile: '',
  altMobile: '',
  email: '',
  address: '',
  gstin: '',
  drugLicence: '',
  managerId: '',
  regionId: '',
  cityId: '',
  areaId: '',
  locationName: '',
  latitude: null,
  longitude: null,
  creditLimit: '',
  creditDays: '',
  transport: '',
  weeklyOff: '',
  target: '',
  status: 'ACTIVE',
  executiveId: '',
  shopPhoto: [],
  signature: [],
})

const s = (value) => (value === null || value === undefined || value === 0 ? '' : String(value))

export const distributorToForm = (distributor) => ({
  ...emptyDistributorForm(),
  ...distributor,
  latitude: distributor.latitude ?? null,
  longitude: distributor.longitude ?? null,
  creditLimit: s(distributor.creditLimit),
  creditDays: s(distributor.creditDays),
  target: s(distributor.target),
  // The record can hold several; this form manages the one assigned here.
  executiveId: distributor.executiveIds?.[0] ?? '',
  shopPhoto: distributor.shopPhoto ?? [],
  signature: distributor.signature ?? [],
})

const MOBILE_PATTERN = /^[6-9]\d{9}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Returns { field: message } — empty means valid. */
export function validateDistributorForm(form, { distributors = [], editingId } = {}) {
  const e = {}
  const mobile = form.mobile.trim()
  const altMobile = form.altMobile.trim()

  if (!form.name.trim()) e.name = 'Enter the firm name.'
  if (!form.contactPerson.trim()) e.contactPerson = 'Enter the contact person.'
  if (!form.managerId) e.managerId = 'Choose the manager who owns this distributor.'
  if (!form.executiveId) e.executiveId = 'Choose the executive who works under this distributor.'
  if (!form.regionId) e.regionId = 'Choose a region.'
  if (!form.cityId) e.cityId = 'Choose a city.'
  if (!form.areaId) e.areaId = 'Choose an area.'
  if (form.latitude === null || form.latitude === undefined || form.latitude === '') {
    e.locationName = 'Search for the location, or use the current one.'
  }

  if (!mobile) e.mobile = 'Enter a mobile number.'
  else if (!MOBILE_PATTERN.test(mobile)) e.mobile = 'Enter a 10-digit Indian mobile number.'
  else if (distributors.some((d) => d.id !== editingId && d.mobile === mobile)) {
    e.mobile = 'Another distributor already uses this number.'
  }

  if (altMobile) {
    if (!MOBILE_PATTERN.test(altMobile)) e.altMobile = 'Enter a 10-digit Indian mobile number.'
    else if (altMobile === mobile) e.altMobile = 'This is the same as the first number.'
  }

  // Email is optional here, by the client's decision.
  if (form.email.trim() && !EMAIL_PATTERN.test(form.email.trim())) e.email = 'Enter a valid email address.'
  if (form.gstin.trim() && !GSTIN_PATTERN.test(form.gstin.trim().toUpperCase())) e.gstin = 'A GSTIN is 15 characters, e.g. 23AACVP7781K1Z5.'

  for (const [field, label] of [['creditLimit', 'Credit limit'], ['creditDays', 'Credit days'], ['target', 'Target']]) {
    if (form[field] !== '' && !(Number(form[field]) >= 0)) e[field] = `${label} cannot be negative.`
  }

  return e
}

/** "Meerut · Lawad" for the table, from the geography masters. */
export const placeOf = (distributor, { cities, areas }) => {
  const city = cities.find((c) => c.id === distributor.cityId)?.name
  const area = areas.find((a) => a.id === distributor.areaId)?.name
  return [city, area].filter(Boolean).join(' · ')
}
