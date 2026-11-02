import { cn } from '@/lib/utils'
import { BILL_COMPANY, BILL_ROWS, BILL_TERMS, billDate, placeOfSupply } from '@/components/Sales/Invoices/components/InvoicePrint/billFormat'
import { Cell, Head, Meta, money, pct, rupeesInWords } from '@/components/Sales/Invoices/components/InvoicePrint/billParts'

/**
 * Nirog's credit note, rebuilt from the note they print today (CN-007,
 * 24-10-2026). It is the bill's own sheet with a different heading and its own
 * columns — "सिमिलर फॉर्मेट है, बस जहाँ टैक्स इनवाइस लिखा है वहाँ क्रेडिट नोट
 * लिखेंगे, और कुछ कॉलम चेंज होंगे".
 *
 * What changes from the bill: no batch, manufacturing or expiry columns and no
 * MRP; CGST, SGST and IGST each print their rate beside their amount; the
 * summary carries OTHER CHARGES where a bill carries a discount; and the party
 * is named once, since goods coming back are not shipped anywhere.
 *
 * Like the bill, the create screen renders this same sheet with inputs dropped
 * into it through `slots`, so what is filled in is what comes out of the
 * printer.
 */
export function CreditNotePrint({ note, bank, company: fromSettings, copy, heading, taxRate, slots = {} }) {
  if (!note) return null

  const company = { ...BILL_COMPANY, ...(fromSettings ?? {}) }
  const slot = (key, printed) => (key in slots ? slots[key] : printed)

  /**
   * The items. While a note is being typed the editable table stands in its
   * place — but only on screen: on paper the clean table is printed, so a PDF
   * taken mid-edit still looks like the note and not like a form.
   */
  const linesSlot = (printed) =>
    'lines' in slots ? (
      <>
        <div className="print:hidden">{slots.lines}</div>
        <div className="hidden print:block">{printed}</div>
      </>
    ) : (
      printed
    )
  const editing = 'lines' in slots

  const hasSecondBank = Boolean(bank?.bankName2 || bank?.accountNumber2)
  const terms = String(company.terms ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (terms.length === 0) terms.push(...BILL_TERMS)

  // The firm comes back flattened onto the note, the way the API sends it.
  const firm = note.distributor ?? {
    name: note.distributorName,
    address: note.distributorAddress,
    state: note.distributorState,
    pincode: note.distributorPincode,
    gstin: note.distributorGstin,
    mobile: note.distributorMobile,
  }

  const lines = note.lines ?? []
  const interState = Boolean(note.interState)

  // The rate prints in its own column on a credit note rather than in the
  // header, but a note of one rate still reads that rate in the summary.
  const rates = [...new Set(lines.map((line) => Number(line.gstRate) || 0))]
  const one = rates.length === 1 ? rates[0] : rates.length === 0 ? Number(taxRate) || null : null

  const totalBoxes = lines.reduce((sum, line) => sum + (Number(line.boxes) || 0), 0)
  const totalQty = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0)
  const totalGross = lines.reduce((sum, line) => sum + (Number(line.total) || 0), 0)
  const totalTaxable = lines.reduce((sum, line) => sum + (Number(line.taxableValue) || 0), 0)
  const totalTax = lines.reduce((sum, line) => sum + (Number(line.taxAmount) || 0), 0)
  const halfTax = Math.round((totalTax / 2) * 100) / 100

  // Ruled down the full page like their own pad, items first and blanks after.
  const blanks = Math.max(0, BILL_ROWS - lines.length)

  return (
    <article
      className={cn(
        'mx-auto w-full bg-white font-sans text-[9px] leading-tight text-black print:max-w-[210mm] print:text-[8px]',
        editing ? 'max-w-[72rem]' : 'max-w-[210mm]',
      )}
    >
      <div className="border border-black">
        <div className="flex items-start justify-between gap-3 border-b border-black px-1 py-[3px]">
          <div>
            <p className="font-bold">GSTIN NO : {company.gstin}</p>
            {slot('copyChoice', null)}
          </div>
          {copy && <p className="font-bold uppercase">{copy}</p>}
        </div>

        <header className="relative border-b border-black px-2 py-1 text-center">
          {/* Two lines on their note: what the paper is, then what it is for. */}
          <h1 className="text-[13px] font-bold underline">{heading || 'CREDIT NOTE'}</h1>
          <p className="text-[12px] font-bold underline">SALES RETURN INVOICE</p>
          <p className="text-[15px] font-bold">{company.name}</p>
          <p className="font-bold">{company.tagline}</p>
          <p>{company.address}</p>
          <p>CIN NO: {company.cin}</p>
          <p>PH. {company.phone}</p>
          <p className="underline">E-Mail: {company.email}</p>
          <p>WEBSITE : {company.website}</p>
          {company.logoUrl && (
            <img src={company.logoUrl} alt="" className="absolute top-1 right-2 max-h-14 max-w-28 object-contain" />
          )}
        </header>
        <p className="border-b border-black py-[3px] text-center font-bold">
          {company.goodsHeading} DRUG LICENSE NO.- {company.drugLicence}
        </p>

        {/* Goods coming back are not shipped anywhere, so the party is named
            once — "Party Detail:" on their own note — and the meta box takes
            the rest of the width. */}
        <div className="grid grid-cols-[1fr_22rem]">
          <section className="border-r border-black px-2 py-1">
            <p className="font-bold">Party Detail:</p>
            {slot(
              'party',
              <>
                <p className="font-bold">M/S {firm.name}</p>
                {firm.address && <p className="whitespace-pre-line">{firm.address}</p>}
                <p>{[firm.state, firm.pincode].filter(Boolean).join(', ')}</p>
                <p className="font-bold">GSTIN- {firm.gstin || 'UNREGISTERED'}</p>
              </>,
            )}
          </section>

          <section className="space-y-[1px] px-2 py-1">
            <Meta label="CR. NOTE NO.">{slot('noteNo', note.noteNo)}</Meta>
            <Meta label="CR. NOTE DATE">{slot('at', billDate(note.at))}</Meta>
            {/* Their paper, raised when they sent the goods back. */}
            <Meta label="DEBIT NOTE NO.">{slot('debitNoteNo', note.debitNoteNo || '')}</Meta>
            <Meta label="DEBIT NOTE DATE">{slot('debitNoteDate', billDate(note.debitNoteDate))}</Meta>
            <Meta label="TRANSPORT">{slot('transport', note.transport || 'N.A.')}</Meta>
            <Meta label="VEHICLE NO.">{slot('vehicleNo', note.vehicleNo || 'N.A.')}</Meta>
            <Meta label="PLACE OF SUPPLY">{placeOfSupply(firm.state)}</Meta>
            <Meta label="STATION">{slot('station', note.station || '')}</Meta>
            {slot('extraMeta', null)}
          </section>
        </div>

        {linesSlot(
          <table className="w-full border-collapse border-t border-black text-center">
            <thead>
              {/* CGST, SGST and IGST each span a rate and an amount, so the
                  headers run over two rows the way their note prints them. */}
              <tr>
                <Head className="w-8" rowSpan={2}>
                  S.<br />NO
                </Head>
                <Head className="text-left" rowSpan={2}>
                  DESCRIPTION  OF GOODS
                </Head>
                <Head className="w-14" rowSpan={2}>
                  HSN<br />CODE
                </Head>
                <Head className="w-10" rowSpan={2}>
                  QTY.
                </Head>
                <Head className="w-10" rowSpan={2}>
                  UOM
                </Head>
                <Head className="w-14" rowSpan={2}>
                  RATE
                </Head>
                <Head className="w-16" rowSpan={2}>
                  TOTAL
                </Head>
                <Head className="w-16" rowSpan={2}>
                  TAXABLE<br />VALUE
                </Head>
                <Head colSpan={2}>CGST</Head>
                <Head colSpan={2}>SGST</Head>
                <Head colSpan={2}>IGST</Head>
              </tr>
              <tr>
                <Head className="w-10">RATE</Head>
                <Head className="w-14">AMOUNT</Head>
                <Head className="w-10">RATE</Head>
                <Head className="w-14">AMOUNT</Head>
                <Head className="w-10">RATE</Head>
                <Head className="w-14">AMOUNT</Head>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const tax = Number(line.taxAmount) || 0
                const half = Math.round((tax / 2) * 100) / 100
                const rate = Number(line.gstRate) || 0
                return (
                  <tr key={line.id ?? index}>
                    <Cell className="font-bold">{index + 1}</Cell>
                    <Cell className="text-left">{line.itemName}</Cell>
                    <Cell className="font-bold">{line.hsn}</Cell>
                    <Cell className="font-bold">{line.boxes ?? ''}</Cell>
                    <Cell className="font-bold">{Number(line.quantity) || 0}</Cell>
                    <Cell className="text-right font-bold">{money(line.rate)}</Cell>
                    <Cell className="text-right font-bold">{money(line.total)}</Cell>
                    <Cell className="text-right font-bold">{money(line.taxableValue)}</Cell>
                    <Cell className="font-bold">{interState ? '0%' : `${pct(rate / 2)}%`}</Cell>
                    <Cell className="text-right font-bold">{interState ? '0.00' : money(half)}</Cell>
                    <Cell className="font-bold">{interState ? '0%' : `${pct(rate / 2)}%`}</Cell>
                    <Cell className="text-right font-bold">{interState ? '0.00' : money(tax - half)}</Cell>
                    <Cell className="font-bold">{interState ? `${pct(rate)}%` : '0%'}</Cell>
                    <Cell className="text-right font-bold">{interState ? money(tax) : '0.00'}</Cell>
                  </tr>
                )
              })}
              {Array.from({ length: blanks }, (_, row) => (
                <tr key={`blank-${row}`}>
                  {Array.from({ length: 14 }, (_, i) => (
                    <Cell key={i}>&nbsp;</Cell>
                  ))}
                </tr>
              ))}
              <tr>
                <Cell />
                <Cell />
                <Cell />
                <Cell className="font-bold">{totalBoxes || 0}</Cell>
                <Cell className="font-bold">{totalQty}</Cell>
                <Cell />
                <Cell className="text-right font-bold">{money(totalGross)}</Cell>
                <Cell className="text-right font-bold">{money(totalTaxable)}</Cell>
                <Cell />
                <Cell className="text-right font-bold">{interState ? '0.00' : money(halfTax)}</Cell>
                <Cell />
                <Cell className="text-right font-bold">{interState ? '0.00' : money(totalTax - halfTax)}</Cell>
                <Cell />
                <Cell className="text-right font-bold">{interState ? money(totalTax) : '0.00'}</Cell>
              </tr>
            </tbody>
          </table>,
        )}

        {/* The bank on the left, the summary of the money on the right. */}
        <div className="grid grid-cols-[1fr_17rem] border-t border-black">
          <section className="border-r border-black">
            <p className="border-b border-black py-[3px] text-center font-bold">OUR BANK DETAILS</p>
            <div className="flex">
              <table className="w-full border-collapse">
                <tbody>
                  {[
                    ['BANK NAME :', bank?.bankName, bank?.bankName2],
                    ['BRANCH :', bank?.branch, bank?.branch2],
                    ['IFSC CODE :', bank?.ifsc, bank?.ifsc2],
                    ['ACCOUNT NO. :', bank?.accountNumber, bank?.accountNumber2],
                  ].map(([label, first, second]) => (
                    <tr key={label}>
                      <Cell className="w-24 border-0 border-r border-b border-black font-bold">{label}</Cell>
                      <Cell className="border-0 border-r border-b border-black text-center font-bold">{first || ''}</Cell>
                      {hasSecondBank && (
                        <Cell className="border-0 border-r border-b border-black text-center font-bold">{second || ''}</Cell>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {bank?.barcodeUrl && (
                <div className="grid w-24 shrink-0 place-items-center border-b border-black p-1">
                  <img src={bank.barcodeUrl} alt="Scan to pay" className="max-h-20 max-w-full object-contain" />
                </div>
              )}
            </div>
          </section>

          <table className="w-full border-collapse self-start">
            <tbody>
              <tr>
                <Head className="border-0 border-b border-l border-black text-right">SUMMARY</Head>
                <Head className="w-20 border-0 border-b border-l border-black text-center">TOTAL</Head>
              </tr>
              {[
                ['TAXABLE VALUE', money(note.taxableValue ?? totalTaxable)],
                [`CGST @ ${one === null ? '' : pct(one / 2)} %`, interState ? '0.00' : money(note.cgst ?? halfTax)],
                [`SGST @ ${one === null ? '' : pct(one / 2)} %`, interState ? '0.00' : money(note.sgst ?? totalTax - halfTax)],
                ['IGST', interState ? money(note.igst ?? totalTax) : '0.00'],
                // Their note prints NIL rather than 0.00 when nothing was added.
                ['OTHER CHARGES', Number(note.otherCharges) ? money(note.otherCharges) : 'NIL'],
                ['ROUND OFF (+)', money(note.roundOff)],
              ].map(([label, value]) => (
                <tr key={label}>
                  <Cell className="border-0 border-b border-l border-black text-right font-bold">{label}</Cell>
                  <Cell className="border-0 border-b border-l border-black text-right">{value}</Cell>
                </tr>
              ))}
              <tr>
                <Cell className="border-0 border-b border-l border-black text-right font-bold">GRAND TOTAL</Cell>
                <Cell className="border-0 border-b border-l border-black text-right font-bold">{money(note.total)}</Cell>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="border-t border-black px-1 py-[3px] font-bold">
          TOTAL IN WORDS RS. {rupeesInWords(note.total)} ONLY.
        </p>

        <div className="grid grid-cols-[1fr_12rem_14rem] border-t border-black">
          <section className="border-r border-black px-2 py-1">
            <div className="flex items-start justify-between">
              <p className="font-bold underline">TERMS &amp; CONDITION</p>
              <p>E. &amp; O.E.</p>
            </div>
            <ol className="mt-0.5 list-decimal space-y-[1px] pl-4 text-[8px]">
              {terms.map((term) => (
                <li key={term}>{term}</li>
              ))}
            </ol>
          </section>
          <section className="grid place-items-start justify-center border-r border-black px-2 py-1">
            <p className="font-bold underline">RECEIVER&apos;S SIGNATURE</p>
          </section>
          <section className="flex flex-col justify-between px-2 py-1 text-center">
            <p className="font-bold">FOR {company.name}</p>
            {company.signatureUrl ? (
              <img src={company.signatureUrl} alt="" className="mx-auto my-1 max-h-12 object-contain" />
            ) : (
              <span className="block h-10" />
            )}
            <p className="font-bold">AUTHORISED SIGNATORY</p>
          </section>
        </div>
      </div>
    </article>
  )
}
