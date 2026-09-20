/**
 * MOCK DATA (UI phase) — item catalogue and its lookups.
 * Backend replacement: GET /items, /warehouses, /item-categories, /brands.
 */

export const WAREHOUSES = [
  { value: 'wh-meerut', label: 'Nirog Pharma Private Limited — Meerut' },
  { value: 'wh-saharanpur', label: 'Saharanpur Depot' },
]

export const UNITS = [
  { value: 'PCS', label: 'PCS — Pieces' },
  { value: 'STRIP', label: 'STRIP — Strips' },
  { value: 'BOX', label: 'BOX — Box' },
  { value: 'BTL', label: 'BTL — Bottle' },
  { value: 'TUBE', label: 'TUBE — Tube' },
  { value: 'VIAL', label: 'VIAL — Vial' },
  { value: 'PKT', label: 'PKT — Packet' },
  { value: 'JAR', label: 'JAR — Jar' },
]

export const GST_RATES = [0, 5, 12, 18, 28].map((rate) => ({ value: String(rate), label: `${rate}%` }))
export const CESS_RATES = [0, 1, 3, 5].map((rate) => ({ value: String(rate), label: `${rate}%` }))

export const TAX_MODES = [
  { value: 'EXCL', label: 'Excl. tax' },
  { value: 'INCL', label: 'Incl. tax' },
]

export const DISCOUNT_TYPES = [
  { value: 'AMOUNT', label: 'Amount' },
  { value: 'PERCENT', label: '%' },
]

export const ITEM_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
]

export const INITIAL_CATEGORIES = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Drops', 'Powder', 'Ayurvedic']
export const INITIAL_BRANDS = ['Nirog', 'Nirog Ayurveda', 'Nirog Care', 'Nirog Kids']

/** Stock at or below this counts as low. */
export const LOW_STOCK_THRESHOLD = 50

const item = (id, name, code, category, brand, unit, mrp, sellPrice, purchasePrice, gst, hsn, stock, warehouseId, status = 'ACTIVE', extra = {}) => ({
  id,
  name,
  code,
  category,
  brand,
  unit,
  mrp,
  sellPrice,
  sellTaxMode: 'EXCL',
  purchasePrice,
  purchaseTaxMode: 'EXCL',
  gst,
  cess: 0,
  hsn,
  discount: 0,
  discountType: 'AMOUNT',
  offerText: '',
  stock,
  openingStockDate: '2026-04-01',
  secondaryUnit: unit === 'STRIP' ? 'BOX' : '',
  conversionFactor: unit === 'STRIP' ? 10 : null,
  erpId: '',
  warehouseId,
  weight: '',
  description: '',
  images: [],
  status,
  updatedAt: '2026-09-1' + (Number(id.slice(-1)) % 9),
  ...extra,
})

export const INITIAL_ITEMS = [
  item('itm-01', 'Nirog Paracetamol 650 mg', 'NP-PCM650', 'Tablet', 'Nirog', 'STRIP', 32, 24.5, 18, 12, '30049099', 1240, 'wh-meerut'),
  item('itm-02', 'Nirog Cough Syrup 100 ml', 'NP-CS100', 'Syrup', 'Nirog', 'BTL', 110, 82, 61, 12, '30049011', 486, 'wh-meerut', 'ACTIVE', { offerText: '10 + 1 free' }),
  item('itm-03', 'Nirog Vitamin C 500 mg', 'NP-VTC500', 'Tablet', 'Nirog Care', 'STRIP', 45, 34, 25, 12, '29362700', 38, 'wh-meerut'),
  item('itm-04', 'Nirog ORS Sachet 21 g', 'NP-ORS21', 'Powder', 'Nirog', 'PKT', 22, 17, 12.5, 12, '30049099', 2210, 'wh-meerut'),
  item('itm-05', 'Nirog Pain Relief Gel 30 g', 'NP-PRG30', 'Ointment', 'Nirog Care', 'TUBE', 145, 108, 79, 12, '30049099', 312, 'wh-saharanpur'),
  item('itm-06', 'Nirog Amoxicillin 500 mg', 'NP-AMX500', 'Capsule', 'Nirog', 'STRIP', 118, 88, 66, 12, '30041010', 640, 'wh-meerut'),
  item('itm-07', 'Nirog Ashwagandha Churna 100 g', 'NA-ASH100', 'Ayurvedic', 'Nirog Ayurveda', 'JAR', 240, 180, 128, 12, '30049011', 94, 'wh-saharanpur'),
  item('itm-08', 'Nirog Eye Drops 10 ml', 'NP-ED10', 'Drops', 'Nirog Care', 'BTL', 75, 56, 41, 12, '30049099', 22, 'wh-meerut'),
  item('itm-09', 'Nirog Cetirizine 10 mg', 'NP-CTZ10', 'Tablet', 'Nirog', 'STRIP', 28, 21, 15, 12, '30049099', 1780, 'wh-meerut'),
  item('itm-10', 'Nirog Kids Multivitamin Syrup 200 ml', 'NK-MVS200', 'Syrup', 'Nirog Kids', 'BTL', 165, 124, 92, 12, '30045090', 205, 'wh-saharanpur'),
  item('itm-11', 'Nirog Pantoprazole 40 mg', 'NP-PAN40', 'Tablet', 'Nirog', 'STRIP', 96, 72, 53, 12, '30049099', 870, 'wh-meerut'),
  item('itm-12', 'Nirog Ceftriaxone 1 g Injection', 'NP-CFX1G', 'Injection', 'Nirog', 'VIAL', 62, 47, 34, 12, '30042019', 0, 'wh-meerut'),
  item('itm-13', 'Nirog Triphala Tablets', 'NA-TRP60', 'Ayurvedic', 'Nirog Ayurveda', 'BOX', 150, 112, 80, 12, '30049011', 164, 'wh-saharanpur'),
  item('itm-14', 'Nirog Antiseptic Liquid 500 ml', 'NP-ASL500', 'Drops', 'Nirog Care', 'BTL', 210, 158, 115, 18, '38089400', 118, 'wh-meerut'),
  item('itm-15', 'Nirog Calcium + D3', 'NP-CD3', 'Tablet', 'Nirog Care', 'STRIP', 120, 90, 66, 12, '30045039', 45, 'wh-meerut'),
  item('itm-16', 'Nirog Azithromycin 500 mg', 'NP-AZI500', 'Tablet', 'Nirog', 'STRIP', 128, 96, 71, 12, '30042019', 560, 'wh-meerut'),
  item('itm-17', 'Nirog Kids Gripe Water 150 ml', 'NK-GW150', 'Syrup', 'Nirog Kids', 'BTL', 70, 52, 38, 12, '30049011', 0, 'wh-saharanpur', 'DRAFT'),
  item('itm-18', 'Nirog Chyawanprash 500 g', 'NA-CHY500', 'Ayurvedic', 'Nirog Ayurveda', 'JAR', 295, 222, 160, 12, '21069099', 76, 'wh-meerut', 'DRAFT'),
  item('itm-19', 'Nirog Metformin 500 mg', 'NP-MET500', 'Tablet', 'Nirog', 'STRIP', 38, 28.5, 21, 12, '30049099', 1320, 'wh-meerut'),
  item('itm-20', 'Nirog Hand Sanitizer 100 ml', 'NC-HS100', 'Drops', 'Nirog Care', 'BTL', 55, 41, 29, 18, '38089400', 930, 'wh-saharanpur'),
  item('itm-21', 'Nirog Diclofenac 50 mg', 'NP-DCF50', 'Tablet', 'Nirog', 'STRIP', 26, 19.5, 14, 12, '30049099', 404, 'wh-meerut'),
  item('itm-22', 'Nirog Burn Cream 20 g', 'NC-BC20', 'Ointment', 'Nirog Care', 'TUBE', 88, 66, 48, 12, '30049099', 17, 'wh-meerut', 'DRAFT'),
]
