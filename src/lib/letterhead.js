/**
 * The letterhead a document prints with.
 *
 * Settings are one shared thing; a bill is not. Read live, the sheet borrows
 * the logo, the address and the bank account fresh every time it prints — so
 * changing any of them silently rewrites every bill ever made, including the
 * one the distributor is holding on paper.
 *
 * The server now copies the letterhead onto each document: again on every save
 * while it is a draft, and a last time when it is issued, after which it never
 * moves. This reads that copy back.
 *
 * A document from before the copy existed has none, and falls back to today's
 * settings — the same behaviour it has always had.
 */

/**
 * Which switches each kind of paper carries. A missing switch means "show it":
 * a credit note written before the credit-note switches existed carries a
 * bill's copy, and the fields it says nothing about must not vanish.
 */
const SHOW = {
  invoice: {
    defaults: { vehicleNo: true, ewayBillNo: true, creditPeriod: true },
    live: (live) => ({
      vehicleNo: live.invoice?.showVehicleNo !== false,
      ewayBillNo: live.invoice?.showEwayBill !== false,
      creditPeriod: live.invoice?.showCreditPeriod !== false,
    }),
  },
  creditNote: {
    defaults: {
      debitNote: true,
      againstBill: true,
      transport: true,
      vehicleNo: true,
      station: true,
      otherCharges: true,
    },
    live: (live) => ({
      debitNote: live.creditNote?.showDebitNote !== false,
      againstBill: live.creditNote?.showAgainstBill !== false,
      transport: live.creditNote?.showTransport !== false,
      vehicleNo: live.creditNote?.showVehicleNo !== false,
      station: live.creditNote?.showStation !== false,
      otherCharges: live.creditNote?.showOtherCharges !== false,
    }),
  },
}

export function letterheadFor(doc, live = {}, kind = 'invoice') {
  const paper = SHOW[kind] ?? SHOW.invoice
  const stamp = doc?.letterhead

  if (!stamp) {
    return {
      company: live.company ?? {},
      bank: live.bank ?? {},
      show: paper.live(live),
      taxRate: live.invoice?.defaultGstRate,
      /// Whether the sheet is showing the document's own letterhead or today's.
      ownCopy: false,
    }
  }

  return {
    company: stamp.company ?? {},
    bank: stamp.bank ?? {},
    show: { ...paper.defaults, ...(stamp.show ?? {}) },
    taxRate: stamp.taxRate,
    ownCopy: true,
  }
}
