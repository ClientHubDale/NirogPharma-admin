/**
 * MOCK DATA (UI phase) — price lists.
 * Backend replacement: GET /price-lists → same shape.
 *
 * FIXED:              { items: [{ itemId, price }] }  — only these items get special prices
 * INCREASE/DECREASE:  { percent }                      — applied to every item's catalog price
 */
export const INITIAL_PRICE_LISTS = [
  {
    id: 'pl-01',
    name: 'Hospital rates 2026',
    description: 'Contract prices for hospitals and nursing homes.',
    strategy: 'FIXED',
    percent: null,
    partyGroup: 'grp-hospital',
    items: [
      { itemId: 'itm-01', price: 22 },
      { itemId: 'itm-06', price: 80 },
      { itemId: 'itm-12', price: 42 },
      { itemId: 'itm-16', price: 88 },
      { itemId: 'itm-14', price: 145 },
    ],
    updatedAt: '2026-09-02',
  },
  {
    id: 'pl-02',
    name: 'Distributor margin',
    description: 'Standard distributor price — 8% below catalog.',
    strategy: 'DECREASE',
    percent: 8,
    partyGroup: 'grp-distributors',
    items: [],
    updatedAt: '2026-08-20',
  },
  {
    id: 'pl-03',
    name: 'Retail — Q4 festive',
    description: 'Festive season uplift for retail chemists.',
    strategy: 'INCREASE',
    percent: 2.5,
    partyGroup: 'grp-retail',
    items: [],
    updatedAt: '2026-09-15',
  },
]
