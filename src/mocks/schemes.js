/**
 * MOCK DATA (UI phase) — schemes.
 *
 * Every scheme is a **trigger** paired with a **reward**, read in slabs:
 *
 *   { id, name, trigger, reward, partyGroup, priority, stackable,
 *     startDate, endDate, status,
 *     ITEM_QTY:     buyItemIds[], repeats
 *     ORDER_AMOUNT: scope: 'CART'|'PRODUCTS', productIds[]
 *     DISCOUNT:     discountType: 'FLAT'|'PERCENT', maxDiscount|null
 *     slabs: [{ min, max|null,
 *               FREE_ITEM: freeItemId|null, freeGiftId|null, freeQty, freeDiscountPct
 *               DISCOUNT:  value }] }
 *
 * Backend replacement: GET /schemes → this same shape, dates as YYYY-MM-DD.
 */
/**
 * Empty on purpose.
 *
 * The samples that used to sit here named demo products — `itm-01`, a sugar
 * giveaway — that no catalogue actually has, so every row read "a product no
 * longer in the catalogue" and the screen taught the wrong thing about itself.
 * A scheme is only worth showing against products that exist, which is what
 * the real list will be once these come from the server.
 */
export const INITIAL_SCHEMES = []
