/**
 * Tally Prime / ERP 9 XML (Gateway of Tally → Import → Transactions).
 * One VOUCHER per document with party + item inventory entries and GST ledgers.
 * Ledger names must exist in the company's Tally — keep them in sync with
 * their chart of accounts (see LEDGERS).
 */
import { docTotals, lineTotals } from './transactionModel'

export const LEDGERS = { cgst: 'CGST', sgst: 'SGST', igst: 'IGST', cess: 'Cess', roundoff: 'Round Off', discount: 'Discount Allowed', charges: 'Other Charges' }

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const tallyDate = (iso) => iso.replaceAll('-', '')
const amt = (n) => (Math.round(n * 100) / 100).toFixed(2)

function voucher(doc, party, { voucherType, ledger: salesLedger, inward = false }) {
  const t = docTotals(doc, party)
  // Sales: party debited (deemed positive), sales/tax credited. Returns and
  // credit notes are the mirror image.
  const sign = inward ? -1 : 1
  const inventory = doc.lines
    .map((l) => {
      const lt = lineTotals(l)
      return `      <ALLINVENTORYENTRIES.LIST>
        <STOCKITEMNAME>${esc(l.name)}</STOCKITEMNAME>
        <RATE>${amt(lt.net)}/${esc(l.unit)}</RATE>
        <AMOUNT>${amt(sign * lt.taxable)}</AMOUNT>
        <ACTUALQTY>${l.qty} ${esc(l.unit)}</ACTUALQTY>
        <BILLEDQTY>${l.qty} ${esc(l.unit)}</BILLEDQTY>
        <ACCOUNTINGALLOCATIONS.LIST><LEDGERNAME>${esc(salesLedger)}</LEDGERNAME><AMOUNT>${amt(sign * lt.taxable)}</AMOUNT></ACCOUNTINGALLOCATIONS.LIST>
      </ALLINVENTORYENTRIES.LIST>`
    })
    .join('\n')
  const ledger = (name, value, debit = false) => {
    if (!value) return ''
    if (value < 0) return ledger(name, -value, !debit) // e.g. a negative round-off sits on the other side
    const positive = debit !== inward
    return `      <LEDGERENTRIES.LIST><LEDGERNAME>${esc(name)}</LEDGERNAME><ISDEEMEDPOSITIVE>${positive ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE><AMOUNT>${amt(positive ? -value : value)}</AMOUNT></LEDGERENTRIES.LIST>`
  }
  return `    <VOUCHER VCHTYPE="${esc(voucherType)}" ACTION="Create">
      <DATE>${tallyDate(doc.date)}</DATE>
      <VOUCHERTYPENAME>${esc(voucherType)}</VOUCHERTYPENAME>
      <VOUCHERNUMBER>${esc(doc.number)}</VOUCHERNUMBER>
      <PARTYLEDGERNAME>${esc(party?.name ?? 'Unknown party')}</PARTYLEDGERNAME>
      <PARTYGSTIN>${esc(party?.gstin ?? '')}</PARTYGSTIN>
      <NARRATION>${esc(doc.comment)}</NARRATION>
      <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
${ledger(party?.name ?? 'Unknown party', t.total, true)}
${inventory}
${ledger(LEDGERS.cgst, t.cgst)}
${ledger(LEDGERS.sgst, t.sgst)}
${ledger(LEDGERS.igst, t.igst)}
${ledger(LEDGERS.cess, t.cess)}
${ledger(LEDGERS.discount, t.discounts, true)}
${ledger(LEDGERS.charges, t.charges)}
${ledger(LEDGERS.roundoff, t.roundoff)}
    </VOUCHER>`
}

/** tally = config.tally: { voucherType, ledger, inward? } */
export function toTallyXml(docs, partiesById, tally) {
  const body = docs.map((d) => `  <TALLYMESSAGE xmlns:UDF="TallyUDF">\n${voucher(d, partiesById[d.partyId], tally)}\n  </TALLYMESSAGE>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
 <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
 <BODY>
  <IMPORTDATA>
   <REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC>
   <REQUESTDATA>
${body}
   </REQUESTDATA>
  </IMPORTDATA>
 </BODY>
</ENVELOPE>
`.replace(/\n\s*\n/g, '\n')
}

export function downloadText(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
