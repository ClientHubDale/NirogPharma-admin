/**
 * Item form ⇄ item record, plus validation. Inputs hold strings; the record
 * holds numbers. Keep these rules in sync with the backend validator later.
 */

export const emptyItemForm = (defaults = {}) => ({
  name: '',
  status: 'ACTIVE',
  unit: '',
  description: '',
  category: '',
  quantity: '',
  quantityUnit: '',
  images: [],
  mrp: '',
  hsn: '',
  gst: '',
  offerText: '',
  schemeBuyQty: '',
  schemeFreeQty: '',
  schemeFreeItemId: '',
  schemeFreeGiftId: '',
  // What this item costs on each of the client's rate columns.
  flatTierPricing: false,
  tierPrices: {}, // { [tier]: { price: string, isCustom: boolean } }
  ...defaults,
})

const str = (v) => (v === null || v === undefined || v === 0 ? (v === 0 ? '0' : '') : String(v))

export const itemToForm = (item) => ({
  ...emptyItemForm(),
  ...item,
  flatTierPricing: item.flatTierPricing ?? false,
  tierPrices: Object.fromEntries(
    (item.tierPrices ?? []).map((row) => [row.tier, { price: str(row.price), isCustom: row.isCustom }]),
  ),
  quantity: str(item.quantity),
  schemeBuyQty: str(item.schemeBuyQty),
  schemeFreeQty: str(item.schemeFreeQty),
  schemeFreeItemId: item.schemeFreeItemId ?? '',
  schemeFreeGiftId: item.schemeFreeGiftId ?? '',
  quantityUnit: item.quantityUnit ?? '',
  mrp: str(item.mrp),
  gst: str(item.gst),
})

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

export const formToItem = (form, id) => ({
  ...form,
  id,
  name: form.name.trim(),
  description: form.description.trim(),
  offerText: form.offerText.trim(),
  quantity: num(form.quantity),
  mrp: num(form.mrp),
  gst: num(form.gst) ?? 0,
  updatedAt: new Date().toISOString().slice(0, 10),
})

const isNumber = (v) => v !== '' && !Number.isNaN(Number(v))

/** Returns { field: message } — empty object means valid. */
export function validateItemForm(form, { items, editingId }) {
  const errors = {}
  const name = form.name.trim()

  if (!name) errors.name = 'Item name is required.'
  else if (items.some((i) => i.id !== editingId && i.name.toLowerCase() === name.toLowerCase()))
    errors.name = 'An item with this name already exists.'

  if (!form.unit) errors.unit = 'Choose a unit.'

  if (form.quantity !== '' && (!isNumber(form.quantity) || Number(form.quantity) <= 0))
    errors.quantity = 'Enter a quantity above 0.'

  if (form.mrp !== '' && (!isNumber(form.mrp) || Number(form.mrp) <= 0)) errors.mrp = 'Enter a valid MRP.'

  // A scheme is all three or none: how many to buy, how many are free, and of what.
  const freeThing = form.schemeFreeItemId || form.schemeFreeGiftId
  const scheme = [form.schemeBuyQty, form.schemeFreeQty, freeThing].filter((v) => String(v ?? '').trim() !== '')
  if (scheme.length && scheme.length < 3) {
    if (!form.schemeBuyQty) errors.schemeBuyQty = 'How many must they buy?'
    if (!freeThing) errors.schemeFreeItemId = 'Choose the free item.'
    if (!form.schemeFreeQty) errors.schemeFreeQty = 'How many are free?'
  }

  if (form.gst !== '' && (!isNumber(form.gst) || Number(form.gst) < 0 || Number(form.gst) > 100))
    errors.gst = 'Enter a percentage between 0 and 100.'

  if (form.hsn && !/^\d{4}(\d{2}){0,2}$/.test(form.hsn)) errors.hsn = 'HSN is 4, 6 or 8 digits.'

  return errors
}
