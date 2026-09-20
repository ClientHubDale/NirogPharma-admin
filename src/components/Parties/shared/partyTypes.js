/**
 * Everything that differs between Customers and Suppliers. The list page, form,
 * table, map and Excel mapping are shared (components/Parties/shared) and read
 * their wording and defaults from here.
 */
import { Factory, Store } from 'lucide-react'

const commonInstructions = (plural, sheet) => [
  [`Nirog Pharma — ${sheet} import`, `Fill the "${sheet}" sheet, one row each. Keep the header row as it is.`],
  ['Required', 'Business Name (dark green header). All other columns are optional.'],
  ['Route', 'Pick an existing route. Create new routes in the app first (Routes › Areas, or "+ New" on the form).'],
  ['Location', 'Latitude and Longitude in decimal degrees, e.g. 22.7196 and 75.8577.'],
  ['GSTIN', '15 characters. If State of Supply is blank it is filled from the GSTIN.'],
  ['Balance', 'Opening Balance with Balance Type "To collect" (they owe you) or "To pay" (you owe them).'],
  ['Duplicates', `Rows whose Code or Mobile already exists among ${plural} are skipped and listed after import.`],
]

export const PARTY_TYPES = {
  CUSTOMER: {
    type: 'CUSTOMER',
    noun: 'customer',
    plural: 'customers',
    title: 'Customers',
    icon: Store,
    idBase: 1853000,
    showRouteFilter: true,
    placeLabel: 'City / route',
    defaultBalanceType: 'COLLECT',
    defaultGroup: 'grp-retail',
    namePlaceholder: 'e.g. Shree Medical Store',
    contactPlaceholder: 'Owner / pharmacist',
    geoHint: 'Captured automatically when a field executive adds the party from the app.',
    emptyText: 'Add customers here, import them from Excel, or let the field team add them from the app.',
    sheetName: 'Customers',
    instructions: commonInstructions('customers', 'Customers'),
    sampleRows: [
      {
        name: 'Shree Sample Medical Store', code: 'NP-C9001', contactPerson: 'Ramesh Jain', mobile: '9876512345', email: 'shree@example.com',
        status: 'Active', verified: 'Yes', route: 'Lawad', city: 'Meerut', group: 'Retail chemists', lat: 28.9845, lng: 77.7064,
        billingAddress: '12, Lawad Road, Meerut, Uttar Pradesh', gstin: '09ABCDE1234F1Z5', drugLicence: 'UP-45231',
        openingBalance: 12500, balanceType: 'To collect', creditPeriodDays: 30, creditLimit: 50000, creditBillLimit: 3, state: 'Uttar Pradesh',
      },
      { name: 'City Sample Chemist', route: 'Sadar Bazaar' },
    ],
  },
  SUPPLIER: {
    type: 'SUPPLIER',
    noun: 'supplier',
    plural: 'suppliers',
    title: 'Suppliers',
    icon: Factory,
    idBase: 2900000,
    showRouteFilter: false,
    placeLabel: 'City',
    defaultBalanceType: 'PAY',
    defaultGroup: 'grp-wholesale',
    namePlaceholder: 'e.g. Malwa Pharma Chemicals',
    contactPlaceholder: 'Sales / accounts contact',
    geoHint: 'Where goods are collected from or dispatched — helps plan purchase pickups.',
    emptyText: 'Add the companies you buy from — manufacturers, C&F agents, packaging suppliers.',
    sheetName: 'Suppliers',
    instructions: commonInstructions('suppliers', 'Suppliers'),
    sampleRows: [
      {
        name: 'Narmada Sample Bulk Drugs', code: 'NP-S901', contactPerson: 'Sanjay Mehta', mobile: '9826512345', email: 'sales@example.com',
        status: 'Active', verified: 'Yes', route: 'Sahibabad', city: 'Ghaziabad', group: 'Wholesalers', lat: 28.6692, lng: 77.4538,
        billingAddress: 'Plot 14, Site 4, Sahibabad Industrial Area, Ghaziabad, Uttar Pradesh', gstin: '09AABCN1234K1Z2', drugLicence: 'UP-MFG-1182',
        openingBalance: 85000, balanceType: 'To pay', creditPeriodDays: 45, creditLimit: 0, creditBillLimit: 0, state: 'Uttar Pradesh',
      },
      { name: 'Awadh Sample Herbals', route: 'Civil Lines' },
    ],
  },
}

export const IMPORT_REQUIRED_NOTE = 'Business Name. Route must be an existing route; Mobile and Code must be unique.'
