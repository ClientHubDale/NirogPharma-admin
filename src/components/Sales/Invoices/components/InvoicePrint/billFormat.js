/**
 * The fixed parts of Nirog's own tax invoice, copied from the bill the client
 * prints today (NP/26-27/673, 16-09-2026). These belong to the company, not to
 * any one bill, so they are stated once here rather than typed every time.
 */
export const BILL_COMPANY = {
  name: 'NIROG PHARMA PVT. LTD.',
  tagline: '( A G. M. P. CERTIFIED COMPANY )',
  address: '71, ANAND INDUSTRIAL ESTATE, MOHAN NAGAR, GHAZIABAD, (U.P.)',
  registration: 'CIN NO: U74899DL1995PTC064914, UDYAM REGISTRATION NO.- UDYAM-UP-29-0011057',
  phone: 'PH. 0120-4903745, 9811199881,9811300399',
  email: 'info@nirogpharma.co.in',
  website: 'WWW.NIROGPHARMA.CO.IN',
  licence: 'AYURVEDIC  MEDICINE  DRUG LICENSE NO.- A-3226/2001',
  gstin: '09AABCN9071E1ZD',
  /** The heading over the first block of lines. */
  goodsHeading: 'AYURVEDIC MEDICINE',
}

/**
 * The three copies a bill is printed in — "ऑरिजनल फॉर बायर, डुप्लीकेट फॉर
 * ट्रांसपोर्टर एंड ट्रिप्लिकेट फॉर ऑफिस". Each page says which one it is.
 */
export const BILL_COPIES = [
  { value: 'all', label: 'All three copies' },
  { value: 'original', label: 'Original for buyer' },
  { value: 'duplicate', label: 'Duplicate for transporter' },
  { value: 'triplicate', label: 'Triplicate for office' },
]

/** What each copy prints across the top. */
export const COPY_LABEL = {
  original: 'ORIGINAL FOR BUYER',
  duplicate: 'DUPLICATE FOR TRANSPORTER',
  triplicate: 'TRIPLICATE FOR OFFICE',
}

/** The five conditions printed under every bill, in the client's own words. */
export const BILL_TERMS = [
  'GOODS ONCE SOLD WILL NOT BE TAKEN BACK.',
  'INTEREST @ 18 % P.A. WILL BE CHARGED IF THE PAYMENT IS NOT MADE WITH IN STIPULATED TIME.',
  'OUR RESPONSIBILITY CEASES AFTER DISPATCH.',
  'PLEASE RETURN THE COPIES DULY SIGNED.',
  'ALL DESPUTES ARE SUBJECT TO GHAZIABAD JURISDICTION',
]

/**
 * MFD. and EXP. are printed as the month and the year — "AUG-26", "JULY-29".
 * June and July are spelled out on the client's bill, so they are here too.
 */
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUNE', 'JULY', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export function monthYear(iso) {
  if (!iso) return ''
  const [year, month] = String(iso).split('-')
  const index = Number(month) - 1
  if (!MONTHS[index]) return ''
  return `${MONTHS[index]}-${String(year).slice(2)}`
}

/** 16-09-2026, the way the bill writes a date. */
export const billDate = (iso) => (iso ? String(iso).split('-').reverse().join('-') : '')

/** "PLACE OF SUPPLY : UTTAR PRADESH (09)" — the state with its GST code. */
const STATE_CODES = {
  'ANDAMAN AND NICOBAR ISLANDS': '35', 'ANDHRA PRADESH': '37', 'ARUNACHAL PRADESH': '12', ASSAM: '18',
  BIHAR: '10', CHANDIGARH: '04', CHHATTISGARH: '22', 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU': '26',
  DELHI: '07', GOA: '30', GUJARAT: '24', HARYANA: '06', 'HIMACHAL PRADESH': '02', 'JAMMU AND KASHMIR': '01',
  JHARKHAND: '20', KARNATAKA: '29', KERALA: '32', LADAKH: '38', LAKSHADWEEP: '31', 'MADHYA PRADESH': '23',
  MAHARASHTRA: '27', MANIPUR: '14', MEGHALAYA: '17', MIZORAM: '15', NAGALAND: '13', ODISHA: '21',
  PUDUCHERRY: '34', PUNJAB: '03', RAJASTHAN: '08', SIKKIM: '11', 'TAMIL NADU': '33', TELANGANA: '36',
  TRIPURA: '16', 'UTTAR PRADESH': '09', UTTARAKHAND: '05', 'WEST BENGAL': '19',
}

/**
 * Distributors are stored with the short code the admin typed, so the bill has
 * to expand it: "PLACE OF SUPPLY : HARYANA (06)", never a bare "HR". Every
 * state and union territory is here — a missing one would print the code and
 * quietly make an inter-state bill look wrong.
 */
const FULL_NAME = {
  AN: 'ANDAMAN AND NICOBAR ISLANDS', AP: 'ANDHRA PRADESH', AR: 'ARUNACHAL PRADESH', AS: 'ASSAM',
  BR: 'BIHAR', CG: 'CHHATTISGARH', CH: 'CHANDIGARH', CT: 'CHHATTISGARH',
  DD: 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU', DL: 'DELHI', DN: 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU',
  GA: 'GOA', GJ: 'GUJARAT', HP: 'HIMACHAL PRADESH', HR: 'HARYANA',
  JH: 'JHARKHAND', JK: 'JAMMU AND KASHMIR', KA: 'KARNATAKA', KL: 'KERALA',
  LA: 'LADAKH', LD: 'LAKSHADWEEP', MH: 'MAHARASHTRA', ML: 'MEGHALAYA',
  MN: 'MANIPUR', MP: 'MADHYA PRADESH', MZ: 'MIZORAM', NL: 'NAGALAND',
  OD: 'ODISHA', OR: 'ODISHA', PB: 'PUNJAB', PY: 'PUDUCHERRY',
  RJ: 'RAJASTHAN', SK: 'SIKKIM', TG: 'TELANGANA', TN: 'TAMIL NADU',
  TR: 'TRIPURA', TS: 'TELANGANA', UK: 'UTTARAKHAND', UP: 'UTTAR PRADESH',
  UT: 'UTTARAKHAND', WB: 'WEST BENGAL',
}

export function placeOfSupply(state) {
  if (!state) return ''
  const upper = String(state).trim().toUpperCase()
  const name = FULL_NAME[upper] ?? upper
  const code = STATE_CODES[name]
  return code ? `${name} (${code})` : name
}

/**
 * How many goods rows the bill prints, items and blanks together. The client's
 * printed pad is ruled down the whole page, so a short bill is padded out
 * rather than stopping a third of the way down the sheet.
 */
export const BILL_ROWS = 20
