/**
 * MOCK DATA (UI phase) — suppliers (manufacturers, bulk-drug traders, packaging).
 * Backend replacement: GET /parties?type=supplier → same shape as customers.
 * Names are fictional.
 */
import { INITIAL_CITIES, INITIAL_REGIONS, INITIAL_ROUTES } from './geography'

const S = [
  ['Ganga Pharma Chemicals', 'rt-sadarbazaar', 'Sanjay Mehta', 'NP-S501', 92000],
  ['Yamuna Bulk Drugs', 'rt-bhagpatroad', 'Anita Kaushik', 'NP-S502', 148500],
  ['Doab Laboratories', 'rt-mzncity', 'Rajesh Dubey', 'NP-S503', 0],
  ['Shivalik Life Sciences', 'rt-saharanpurcity', 'Meena Chauhan', 'NP-S504', 36400],
  ['Kali Nadi Healthcare', 'rt-khatauli', '', '', 12750],
  ['Meerut Pharma Packaging', 'rt-shastrinagar', 'Farhan Ali', 'NP-S506', 23900],
  ['Rajputana Glass Vials', 'rt-alwarbazaar', 'Gopal Singh', 'NP-S507', 64200],
  ['Chambal Remedies', 'rt-bharatpurmandi', '', 'NP-S508', 0],
  ['Agra Bottling Works', 'rt-sanjayplace', 'Vivek Agarwal', 'NP-S509', 18300],
  ['Awadh Herbals', 'rt-civillines', 'Nusrat Jahan', 'NP-S510', 41000],
  ['Kumaon API Traders', 'rt-haldwanimandi', 'Prakash Rawat', '', 7600],
  ['Shree Label Printers', 'rt-ashokvihar', 'Mukesh Soni', 'NP-S512', 5400],
]

export const INITIAL_SUPPLIERS = S.map(([name, routeId, contactPerson, code, balance], i) => {
  const route = INITIAL_ROUTES.find((r) => r.id === routeId)
  const city = INITIAL_CITIES.find((c) => c.id === route.cityId)
  const region = INITIAL_REGIONS.find((g) => g.id === city.regionId)
  const hasGeo = i % 5 !== 4
  return {
    id: String(2900001 + i * 37),
    type: 'SUPPLIER',
    name,
    code,
    contactPerson,
    mobile: `98${String(26500000 + i * 70313).padStart(8, '0')}`,
    email: '',
    status: i === 7 ? 'INACTIVE' : 'ACTIVE',
    verified: i % 3 !== 2,
    routeId,
    groupId: i % 4 === 0 ? 'grp-distributors' : 'grp-wholesale',
    lat: hasGeo ? +(city.lat + ((i * 13) % 7 - 3) * 0.006).toFixed(6) : null,
    lng: hasGeo ? +(city.lng + ((i * 7) % 9 - 4) * 0.006).toFixed(6) : null,
    billingAddress: `${10 + i * 3}, ${route.name}, ${city.name}, ${region.name}`,
    shippingAddress: '',
    gstin: i % 4 === 3 ? '' : `${region.stateCode}AAB${'CDEFGHJKLMNP'[i]}${'QRSTUVWXYZAB'[i]}${String(4101 + i * 17)}K1Z${(i % 9) + 1}`,
    drugLicence: i % 2 === 0 ? `${region.stateCode === '23' ? 'MP' : region.stateCode === '09' ? 'UP' : 'RJ'}-MFG-${1100 + i * 11}` : '',
    openingBalance: balance,
    balanceType: 'PAY',
    creditPeriodDays: [30, 45, 60][i % 3],
    creditLimit: 0,
    creditBillLimit: 0,
    stateCode: region.stateCode,
    documents: [],
    createdAt: `2026-0${1 + (i % 8)}-1${i % 9}`,
  }
})
