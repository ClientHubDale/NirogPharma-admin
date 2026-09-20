/** Settings options and rules. */
import { INDIAN_STATES } from '@/constants/indianStates'

/** A→Z, as in the reference (the value stays the GST state code). */
export const STATE_OPTIONS = [...INDIAN_STATES].sort((a, b) => a.label.localeCompare(b.label))

export const CURRENCIES = [{ value: 'INR', label: 'INR - Indian rupee' }]
export const TIMEZONES = [
  ['Asia/Kolkata', 'India', '+05:30'],
  ['Asia/Kabul', 'Afghanistan', '+04:30'],
  ['Asia/Dhaka', 'Bangladesh', '+06:00'],
  ['Asia/Thimphu', 'Bhutan', '+06:00'],
  ['Asia/Shanghai', 'China', '+08:00'],
  ['Asia/Nicosia', 'Cyprus', '+03:00'],
  ['Asia/Dili', 'East Timor', '+09:00'],
  ['Asia/Dubai', 'UAE', '+04:00'],
  ['Asia/Tbilisi', 'Georgia', '+04:00'],
  ['Asia/Hong_Kong', 'Hong Kong', '+08:00'],
  ['Asia/Jakarta', 'Indonesia', '+07:00'],
  ['Asia/Tehran', 'Iran', '+03:30'],
  ['Asia/Tokyo', 'Japan', '+09:00'],
  ['Asia/Kuwait', 'Kuwait', '+03:00'],
  ['Asia/Kuala_Lumpur', 'Malaysia', '+08:00'],
  ['Asia/Kathmandu', 'Nepal', '+05:45'],
  ['Asia/Muscat', 'Oman', '+04:00'],
  ['Asia/Karachi', 'Pakistan', '+05:00'],
  ['Asia/Manila', 'Philippines', '+08:00'],
  ['Asia/Qatar', 'Qatar', '+03:00'],
  ['Asia/Riyadh', 'Saudi Arabia', '+03:00'],
  ['Asia/Singapore', 'Singapore', '+08:00'],
  ['Asia/Colombo', 'Sri Lanka', '+05:30'],
  ['Asia/Bangkok', 'Thailand', '+07:00'],
  ['Europe/London', 'United Kingdom', '+00:00'],
  ['America/New_York', 'USA — Eastern', '-05:00'],
].map(([value, country, offset]) => ({ value, label: `${country} (${offset})` }))

export const WEEK_DAYS = [
  { value: 'MON', label: 'Monday' },
  { value: 'TUE', label: 'Tuesday' },
  { value: 'WED', label: 'Wednesday' },
  { value: 'THU', label: 'Thursday' },
  { value: 'FRI', label: 'Friday' },
  { value: 'SAT', label: 'Saturday' },
  { value: 'SUN', label: 'Sunday' },
]

export const BANKS = [
  'HDFC Bank', 'Axis Bank', 'ICICI Bank', 'Kotak Bank', 'State Bank of India', 'Bank of Baroda',
  'Allahabad Bank', 'Andhra Bank', 'Bandhan Bank', 'Bank of India', 'Bank of Maharashtra', 'Canara Bank',
  'Central Bank of India', 'City Union Bank', 'DCB Bank', 'Federal Bank', 'IDBI Bank', 'IDFC First Bank',
  'Indian Bank', 'Indian Overseas Bank', 'IndusInd Bank', 'Jammu & Kashmir Bank', 'Karnataka Bank',
  'Karur Vysya Bank', 'Punjab & Sind Bank', 'Punjab National Bank', 'RBL Bank', 'South Indian Bank',
  'Syndicate Bank', 'UCO Bank', 'Union Bank of India', 'Yes Bank',
].map((b) => ({ value: b, label: b }))

/** Screens the field app can lock behind a check-in. */
export const APP_MODULES = [
  { value: 'PARTIES', label: 'Parties' },
  { value: 'ITEMS', label: 'Items' },
  { value: 'TRANSACTIONS', label: 'Transactions' },
  { value: 'DISTRIBUTORS', label: 'Distributors' },
  { value: 'DELIVERIES', label: 'Deliveries' },
  { value: 'EXPENSES', label: 'Expenses' },
  { value: 'LEADS', label: 'Leads' },
]

/** Returns { field: message } — empty = valid. */
export function validateCompany({ company, office, bank }) {
  const e = {}
  if (!company.name.trim()) e.name = 'Enter the company name.'
  if (!/^[6-9]\d{9}$/.test(company.mobile.trim())) e.mobile = 'Enter a 10-digit mobile number.'
  if (company.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company.email.trim())) e.email = 'Enter a valid email address.'
  if (company.gstin.trim()) {
    if (company.gstin.trim().length !== 15) e.gstin = 'A GSTIN is 15 characters.'
    else if (company.gstin.trim().slice(0, 2) !== company.stateCode) e.gstin = 'The GSTIN does not start with the state of supply code.'
  }
  if (!office.workingDays.length) e.workingDays = 'Choose at least one working day.'
  if (office.start >= office.end) e.workTimings = 'The closing time must be after the opening time.'
  // A holiday row counts only when it has both a name and a date.
  const halfDone = (office.holidays ?? []).some((h) => Boolean(h.name?.trim()) !== Boolean(h.date))
  if (halfDone) e.holidays = 'Give every holiday a name and a date, or remove the row.'
  if (bank.ifsc.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank.ifsc.trim().toUpperCase())) e.ifsc = 'An IFSC looks like HDFC0001234.'
  if (bank.accountNumber.trim() && !/^\d{9,18}$/.test(bank.accountNumber.trim())) e.accountNumber = 'An account number is 9 to 18 digits.'
  return e
}

/** Rows with neither a name nor a date are dropped on save. */
export const cleanHolidays = (holidays) =>
  (holidays ?? []).filter((h) => h.name?.trim() && h.date).map((h) => ({ ...h, name: h.name.trim() }))
