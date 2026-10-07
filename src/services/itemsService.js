/**
 * Inventory › Items against the API. Shapes match what the screen already
 * renders, so the table, form and sheet code did not have to change.
 */
import api from './api'

const FIELDS = [
  'name',
  'code',
  'category',
  'brand',
  'unit',
  'description',
  'status',
  'mrp',
  'sellPrice',
  'sellTaxMode',
  'purchasePrice',
  'purchaseTaxMode',
  'gst',
  'cess',
  'hsn',
  'discount',
  'discountType',
  'offerText',
  'stock',
  'openingStockDate',
  'secondaryUnit',
  'conversionFactor',
  'warehouseId',
  'erpId',
  'weight',
  'flatTierPricing',
]

/**
 * The form keeps tier prices keyed by tier with string prices; the API takes a
 * list. Only the admin's own numbers travel — a blank means "follow the
 * formula", and the server works that out from the MRP.
 */
const tierPricesFor = (form) =>
  Object.entries(form.tierPrices ?? {})
    .filter(([, row]) => row?.isCustom && String(row.price ?? '').trim() !== '' && Number(row.price) > 0)
    .map(([tier, row]) => ({ tier, price: Number(row.price), isCustom: true }))

/** New pictures are Files until they are uploaded, which needs multipart. */
function bodyFor(form) {
  const fields = Object.fromEntries(FIELDS.filter((key) => form[key] !== undefined).map((key) => [key, form[key] ?? '']))
  const tierPrices = tierPricesFor(form)
  const files = (form.images ?? []).filter((image) => image.file).map((image) => image.file)

  if (!files.length) return { data: { ...fields, tierPrices } }

  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.append(key, value)
  data.append('tierPrices', JSON.stringify(tierPrices))
  for (const file of files) data.append('images', file, file.name)
  return { data, headers: { 'Content-Type': undefined } }
}

export async function listItems(params = {}) {
  const { data } = await api.get('/items', { params: { limit: 200, ...params } })
  return { items: data.data.items, meta: data.meta }
}

export async function createItem(form) {
  const { data: body, headers } = bodyFor(form)
  const { data } = await api.post('/items', body, { headers })
  return { item: data.data.item, message: data.message, warning: data.data.warning }
}

export async function updateItem(id, form) {
  const { data: body, headers } = bodyFor(form)
  const { data } = await api.patch(`/items/${id}`, body, { headers })
  return { item: data.data.item, message: data.message, warning: data.data.warning }
}

export async function setItemStatus(id, status) {
  const { data } = await api.patch(`/items/${id}/status`, { status })
  return { item: data.data.item, message: data.message }
}

export async function deleteItem(id) {
  const { data } = await api.delete(`/items/${id}`)
  return data.message
}

export async function importItems(items) {
  const { data } = await api.post('/items/import', { items })
  return { ...data.data, message: data.message }
}

export { errorFrom } from './usersService'
