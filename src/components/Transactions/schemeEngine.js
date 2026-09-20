/**
 * Applies active schemes to a document ("Apply Scheme").
 * Order: priority ascending (lower runs first). A non-stackable scheme locks
 * the items it used, so later schemes skip them. Previous scheme effects are
 * cleared first, so applying twice gives the same result.
 *
 * → { lines, schemeDiscount, applied: [{ id, name, effect }], checked }
 */
import { formatPrice } from '@/lib/format'

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

export function applySchemes({ lines, schemes, date, party, itemsById, newKey }) {
  // 1. Reset previous scheme effects.
  let result = lines.filter((l) => !l.free).map((l) => ({ ...l, schemeDiscount: 0, schemeName: '' }))
  let schemeDiscount = 0
  const applied = []
  const locked = new Set()

  const eligible = schemes
    .filter((s) => s.status === 'ACTIVE' && s.startDate <= date && s.endDate >= date)
    .filter((s) => s.partyGroup === 'all' || s.partyGroup === party?.groupId)
    .sort((a, b) => a.priority - b.priority)

  const qtyOf = (itemId) => result.filter((l) => l.itemId === itemId && !l.free).reduce((s, l) => s + (Number(l.qty) || 0), 0)

  for (const s of eligible) {
    if (s.type === 'BUY_X_GET_Y') {
      if (locked.has(s.buyItemId)) continue
      const sets = Math.floor(qtyOf(s.buyItemId) / s.buyQty)
      const item = itemsById[s.getItemId]
      if (!sets || !item) continue
      const base = result.find((l) => l.itemId === s.getItemId) ?? result.find((l) => l.itemId === s.buyItemId)
      const rate = result.find((l) => l.itemId === s.getItemId)?.rate ?? (item.sellTaxMode === 'INCL' ? r2(item.sellPrice / (1 + item.gst / 100)) : item.sellPrice)
      result.push({
        ...(base ?? {}),
        key: newKey(),
        itemId: item.id,
        name: item.name,
        code: item.code,
        unit: item.unit,
        mrp: item.mrp,
        gst: Number(item.gst) || 0,
        cess: Number(item.cess) || 0,
        qty: sets * s.getQty,
        rate,
        discount: 0,
        schemeDiscount: r2((rate * s.freeDiscountPct) / 100),
        free: true,
        schemeName: s.name,
        priceSource: 'Scheme',
      })
      applied.push({ id: s.id, name: s.name, effect: `${sets * s.getQty} × ${item.name} ${s.freeDiscountPct === 100 ? 'free' : `at ${s.freeDiscountPct}% off`}` })
      if (!s.stackable) locked.add(s.buyItemId)
    }

    if (s.type === 'TIERED_QTY') {
      const ids = s.productIds.filter((id) => !locked.has(id))
      const qty = ids.reduce((sum, id) => sum + qtyOf(id), 0)
      // Highest bracket reached wins (so a shared boundary goes to the higher tier).
      const tier = [...s.tiers].sort((a, b) => b.min - a.min).find((t) => qty >= t.min && (t.max === null || qty <= t.max))
      if (!tier) continue
      result = result.map((l) =>
        ids.includes(l.itemId) && !l.free
          ? { ...l, schemeDiscount: r2(l.schemeDiscount + (s.discountType === 'PERCENT' ? (l.rate * tier.value) / 100 : tier.value)), schemeName: s.name }
          : l,
      )
      applied.push({ id: s.id, name: s.name, effect: `${qty} units → ${s.discountType === 'PERCENT' ? `${tier.value}%` : `${formatPrice(tier.value)}/unit`} off` })
      if (!s.stackable) ids.forEach((id) => locked.add(id))
    }

    if (s.type === 'AMOUNT') {
      const inScope = result.filter((l) => !l.free && (s.scope === 'CART' || s.productIds.includes(l.itemId)))
      const base = r2(inScope.reduce((sum, l) => sum + Math.max(0, l.rate - l.discount - l.schemeDiscount) * l.qty, 0))
      if (base < s.minSpend) continue
      let off = s.discountType === 'PERCENT' ? r2((base * s.discountValue) / 100) : s.discountValue
      if (s.maxDiscount) off = Math.min(off, s.maxDiscount)
      schemeDiscount = r2(schemeDiscount + off)
      applied.push({ id: s.id, name: s.name, effect: `${formatPrice(off)} off the bill (spend ${formatPrice(base)})` })
    }
  }

  return { lines: result, schemeDiscount, applied, checked: eligible.length }
}
