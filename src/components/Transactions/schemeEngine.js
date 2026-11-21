/**
 * Works out what a document earns ("Apply Scheme").
 *
 * Every scheme is a **trigger** (what earns it) and a **reward** (what they
 * get), read in slabs. That makes this four short cases rather than three
 * unrelated ones, and a new combination needs no new branch:
 *
 *            │ Free item                │ Discount
 *   ─────────┼──────────────────────────┼────────────────────────
 *   Item qty │ a free line is added     │ money off those lines
 *   Amount   │ a free line is added     │ money off the bill
 *
 * Schemes run in priority order, lowest first. A scheme that is not stackable
 * locks the items it used, so later ones leave those alone. Previous effects
 * are cleared first, so applying twice gives the same answer as applying once.
 *
 * → { lines, schemeDiscount, applied: [{ id, name, effect }], checked }
 */
import { formatPrice } from '@/lib/format'

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

/**
 * The slab a figure falls in. Slabs may share a boundary and the higher one
 * wins there, so they are read from the top down.
 */
const slabFor = (slabs, reached) =>
  [...(slabs ?? [])]
    .sort((a, b) => b.min - a.min)
    .find((slab) => reached >= slab.min && (slab.max === null || slab.max === undefined || reached <= slab.max))

/** The items a scheme watches, whichever way it is triggered. */
const watched = (scheme) =>
  scheme.trigger === 'ITEM_QTY' ? (scheme.buyItemIds ?? []) : scheme.scope === 'PRODUCTS' ? (scheme.productIds ?? []) : []

export function applySchemes({ lines, schemes, date, party, itemsById, giftsById = {}, newKey }) {
  // Start from the document as typed, with every earlier scheme undone.
  let result = lines.filter((l) => !l.free).map((l) => ({ ...l, schemeDiscount: 0, schemeName: '' }))
  let schemeDiscount = 0
  const applied = []
  const locked = new Set()

  const eligible = schemes
    .filter((s) => s.status === 'ACTIVE' && s.startDate <= date && s.endDate >= date)
    .filter((s) => s.partyGroup === 'all' || s.partyGroup === party?.groupId)
    .sort((a, b) => a.priority - b.priority)

  const qtyOf = (itemId) => result.filter((l) => l.itemId === itemId && !l.free).reduce((sum, l) => sum + (Number(l.qty) || 0), 0)

  /** What the lines in scope come to, after anything already taken off. */
  const spendOn = (ids) =>
    r2(
      result
        .filter((l) => !l.free && (!ids.length || ids.includes(l.itemId)))
        .reduce((sum, l) => sum + Math.max(0, l.rate - l.discount - l.schemeDiscount) * l.qty, 0),
    )

  /**
   * Puts the free thing on the document as its own line.
   *
   * A catalogue product comes off our shelf and prices like any other line; a
   * giveaway — a pen, a bag — was never made or sold, so it has no rate and
   * carries none.
   */
  const giveFree = (scheme, slab, times) => {
    const isGift = Boolean(slab.freeGiftId)
    const thing = isGift ? giftsById[slab.freeGiftId] : itemsById[slab.freeItemId]
    if (!thing) return null

    const qty = times * slab.freeQty
    const existing = isGift ? null : result.find((l) => l.itemId === slab.freeItemId)
    const rate = isGift
      ? 0
      : (existing?.rate ?? (thing.sellTaxMode === 'INCL' ? r2(thing.sellPrice / (1 + thing.gst / 100)) : thing.sellPrice))

    result.push({
      ...(existing ?? {}),
      key: newKey(),
      itemId: isGift ? null : thing.id,
      giftId: isGift ? thing.id : null,
      name: thing.name,
      code: thing.code ?? '',
      unit: thing.unit,
      mrp: isGift ? 0 : thing.mrp,
      gst: isGift ? 0 : Number(thing.gst) || 0,
      cess: isGift ? 0 : Number(thing.cess) || 0,
      qty,
      rate,
      discount: 0,
      schemeDiscount: r2((rate * slab.freeDiscountPct) / 100),
      free: true,
      schemeName: scheme.name,
      priceSource: 'Scheme',
    })

    const how = slab.freeDiscountPct === 100 ? 'free' : `at ${slab.freeDiscountPct}% off`
    return `${qty} × ${thing.name} ${how}`
  }

  for (const scheme of eligible) {
    const ids = watched(scheme).filter((id) => !locked.has(id))
    // Every item this scheme needs is already spoken for by a stricter one.
    if (watched(scheme).length && !ids.length) continue

    // How much of the trigger the document has reached.
    const reached = scheme.trigger === 'ITEM_QTY' ? ids.reduce((sum, id) => sum + qtyOf(id), 0) : spendOn(ids)
    if (!reached) continue

    const slab = slabFor(scheme.slabs, reached)
    if (!slab) continue

    if (scheme.reward === 'FREE_ITEM') {
      /**
       * Whether it repeats is not a question any more — it follows from the
       * scheme itself, which is why the switch came off the screen.
       *
       * One quantity rung is a standing offer: every 24 earns its 5, so 48
       * earns 10. Several rungs are brackets, and you take the one you land
       * in. An amount never repeats — "2000 प्लस… कितना भी लेगा 2 ही केजी
       * मिलेगा".
       */
      const standing = scheme.trigger === 'ITEM_QTY' && (scheme.slabs ?? []).length === 1
      const effect = giveFree(scheme, slab, standing ? Math.floor(reached / slab.min) : 1)
      if (!effect) continue
      applied.push({ id: scheme.id, name: scheme.name, effect })
    } else if (scheme.trigger === 'ITEM_QTY') {
      // Money off the lines that earned it, per unit.
      result = result.map((l) =>
        ids.includes(l.itemId) && !l.free
          ? {
              ...l,
              schemeDiscount: r2(l.schemeDiscount + (scheme.discountType === 'PERCENT' ? (l.rate * slab.value) / 100 : slab.value)),
              schemeName: scheme.name,
            }
          : l,
      )
      const per = scheme.discountType === 'PERCENT' ? `${slab.value}%` : `${formatPrice(slab.value)}/unit`
      applied.push({ id: scheme.id, name: scheme.name, effect: `${reached} units → ${per} off` })
    } else {
      // Money off the bill as a whole.
      let off = scheme.discountType === 'PERCENT' ? r2((reached * slab.value) / 100) : slab.value
      if (scheme.maxDiscount) off = Math.min(off, scheme.maxDiscount)
      schemeDiscount = r2(schemeDiscount + off)
      applied.push({
        id: scheme.id,
        name: scheme.name,
        effect: `${formatPrice(off)} off the bill (spend ${formatPrice(reached)})`,
      })
    }

    if (!scheme.stackable) ids.forEach((id) => locked.add(id))
  }

  return { lines: result, schemeDiscount, applied, checked: eligible.length }
}
