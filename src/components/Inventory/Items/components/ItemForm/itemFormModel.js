/**
 * Item form ⇄ item record, plus validation. Inputs hold strings; the record
 * holds numbers. Keep these rules in sync with the backend validator later.
 */

export const emptyItemForm = (defaults = {}) => ({
  name: '',
  status: 'ACTIVE',
  unit: '',
  sellPrice: '',
  sellTaxMode: 'EXCL',
  code: '',
  description: '',
  category: '',
  brand: '',
  images: [],
  mrp: '',
  purchasePrice: '',
  purchaseTaxMode: 'EXCL',
  hsn: '',
  gst: '',
  cess: '',
  discount: '',
  discountType: 'AMOUNT',
  offerText: '',
  stock: '',
  openingStockDate: '',
  secondaryUnit: '',
  conversionFactor: '',
  erpId: '',
  warehouseId: '',
  weight: '',
  ...defaults,
})

const str = (v) => (v === null || v === undefined || v === 0 ? (v === 0 ? '0' : '') : String(v))

export const itemToForm = (item) => ({
  ...emptyItemForm(),
  ...item,
  sellPrice: str(item.sellPrice),
  mrp: str(item.mrp),
  purchasePrice: str(item.purchasePrice),
  gst: str(item.gst),
  cess: str(item.cess),
  discount: item.discount ? String(item.discount) : '',
  stock: str(item.stock),
  weight: str(item.weight),
  conversionFactor: str(item.conversionFactor),
  openingStockDate: item.openingStockDate ?? '',
  secondaryUnit: item.secondaryUnit ?? '',
  erpId: item.erpId ?? '',
})

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

export const formToItem = (form, id) => ({
  ...form,
  id,
  name: form.name.trim(),
  code: form.code.trim(),
  description: form.description.trim(),
  offerText: form.offerText.trim(),
  sellPrice: num(form.sellPrice),
  mrp: num(form.mrp),
  purchasePrice: num(form.purchasePrice),
  gst: num(form.gst) ?? 0,
  cess: num(form.cess) ?? 0,
  discount: num(form.discount) ?? 0,
  stock: num(form.stock) ?? 0,
  erpId: form.erpId.trim(),
  secondaryUnit: form.secondaryUnit,
  conversionFactor: form.secondaryUnit ? num(form.conversionFactor) : null,
  weight: form.weight.trim?.() ?? form.weight,
  updatedAt: new Date().toISOString().slice(0, 10),
})

const isNumber = (v) => v !== '' && !Number.isNaN(Number(v))

/** Returns { field: message } — empty object means valid. */
export function validateItemForm(form, { items, editingId }) {
  const errors = {}
  const name = form.name.trim()
  const code = form.code.trim()

  if (!name) errors.name = 'Item name is required.'
  else if (items.some((i) => i.id !== editingId && i.name.toLowerCase() === name.toLowerCase()))
    errors.name = 'An item with this name already exists.'

  if (!form.unit) errors.unit = 'Choose a unit.'

  if (!form.sellPrice) errors.sellPrice = 'Sell price is required.'
  else if (!isNumber(form.sellPrice) || Number(form.sellPrice) <= 0) errors.sellPrice = 'Enter a price above 0.'

  if (code && items.some((i) => i.id !== editingId && i.code?.toLowerCase() === code.toLowerCase()))
    errors.code = 'This item code is already used.'

  if (form.mrp !== '') {
    if (!isNumber(form.mrp) || Number(form.mrp) <= 0) errors.mrp = 'Enter a valid MRP.'
    else if (isNumber(form.sellPrice) && Number(form.sellPrice) > Number(form.mrp))
      errors.mrp = 'MRP can’t be lower than the sell price.'
  }

  if (form.purchasePrice !== '' && (!isNumber(form.purchasePrice) || Number(form.purchasePrice) < 0))
    errors.purchasePrice = 'Enter a valid purchase price.'

  if (form.hsn && !/^\d{4}(\d{2}){0,2}$/.test(form.hsn)) errors.hsn = 'HSN is 4, 6 or 8 digits.'

  if (form.discount !== '') {
    const d = Number(form.discount)
    if (!isNumber(form.discount) || d < 0) errors.discount = 'Enter a valid discount.'
    else if (form.discountType === 'PERCENT' && d > 100) errors.discount = 'A percentage can’t exceed 100.'
    else if (form.discountType === 'AMOUNT' && isNumber(form.sellPrice) && d >= Number(form.sellPrice))
      errors.discount = 'Discount must be less than the sell price.'
  }

  if (form.stock !== '' && (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0))
    errors.stock = 'Stock must be a whole number, 0 or more.'
  if (form.stock !== '' && Number(form.stock) > 0 && !form.warehouseId) errors.warehouseId = 'Choose where the stock is kept.'

  if (form.secondaryUnit) {
    if (form.secondaryUnit === form.unit) errors.secondaryUnit = 'Choose a different unit from the main one.'
    const f = Number(form.conversionFactor)
    if (!form.conversionFactor) errors.conversionFactor = 'How many are in one?'
    else if (!Number.isInteger(f) || f < 2) errors.conversionFactor = 'Whole number, 2 or more.'
  }

  if (form.openingStockDate && form.openingStockDate > new Date().toISOString().slice(0, 10))
    errors.openingStockDate = 'Can’t be in the future.'

  return errors
}
