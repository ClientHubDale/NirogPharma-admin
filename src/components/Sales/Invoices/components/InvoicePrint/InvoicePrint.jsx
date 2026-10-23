import { cn } from '@/lib/utils'
import { BILL_COMPANY, BILL_TERMS, billDate, monthYear, placeOfSupply } from './billFormat'

const ONES = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN']
const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']

const under100 = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`)

/** "THIRTY ONE THOUSAND FIVE HUNDRED SEVENTY" — the grand total in words. */
export function rupeesInWords(amount) {
  const whole = Math.round(Math.abs(Number(amount) || 0))
  if (whole === 0) return 'ZERO'

  const parts = []
  for (const [value, label] of [
    [Math.floor(whole / 10000000), 'CRORE'],
    [Math.floor((whole % 10000000) / 100000), 'LAKH'],
    [Math.floor((whole % 100000) / 1000), 'THOUSAND'],
    [Math.floor((whole % 1000) / 100), 'HUNDRED'],
  ]) {
    if (value) parts.push(`${under100(value)} ${label}`)
  }
  if (whole % 100) parts.push(under100(whole % 100))
  return parts.join(' ')
}

const money = (value) => (Number(value) || 0).toFixed(2)

/** Every cell on this bill is boxed, the way the printed one is. */
function Cell({ children, className = '', ...rest }) {
  return (
    <td className={cn('border border-black px-1 py-[3px] align-middle', className)} {...rest}>
      {children}
    </td>
  )
}
function Head({ children, className = '', ...rest }) {
  return (
    <th className={cn('border border-black px-1 py-[3px] align-middle font-bold', className)} {...rest}>
      {children}
    </th>
  )
}

/** A label-and-value line in the invoice meta box, "INVOICE NO.  :  NP/26-27/673". */
function Meta({ label, children }) {
  return (
    <div className="grid grid-cols-[7.5rem_0.5rem_1fr] gap-x-1">
      <span>{label}</span>
      <span>:</span>
      <span className="font-semibold">{children}</span>
    </div>
  )
}

/**
 * Nirog's tax invoice, rebuilt from the bill they print today. The create
 * screen renders this same sheet with inputs dropped into it through `slots`,
 * so what the admin fills in is literally what comes out of the printer.
 */
export function InvoicePrint({ invoice, bank, slots = {} }) {
  if (!invoice) return null

  const slot = (key, printed) => (key in slots ? slots[key] : printed)

  /**
   * The items. While a bill is being typed the editable table stands in its
   * place — but only on screen: on paper the clean bill table is printed, so a
   * PDF taken mid-edit still looks like the bill and not like a form.
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
  const editing = Object.keys(slots).length > 0

  // The firm arrives flattened from the API and whole from the create screen.
  const firm = {
    name: invoice.distributor?.name ?? invoice.distributorName ?? '',
    address: invoice.distributor?.address ?? invoice.distributorAddress ?? '',
    mobile: invoice.distributor?.mobile ?? invoice.distributorMobile ?? '',
    gstin: invoice.distributor?.gstin ?? invoice.distributorGstin ?? '',
    state: invoice.distributor?.state ?? invoice.distributorState ?? invoice.state ?? '',
    pincode: invoice.distributor?.pincode ?? invoice.distributorPincode ?? '',
  }

  /**
   * One printed row per batch, the way their bill reads — each row carries its
   * own BATCH NO., MFD. and EXP. A line drawn from two batches becomes two
   * rows, and the money is split across them in proportion to the quantity so
   * the column still adds up to the line.
   */
  const lines = (invoice.lines ?? []).flatMap((line) => {
    const batches = line.batches ?? []
    const base = {
      id: line.id,
      itemName: line.itemName,
      hsn: line.hsn,
      mrp: line.mrp,
      rate: line.rate,
      gstRate: line.gstRate,
      boxes: line.boxes ?? 1,
    }
    if (batches.length === 0) {
      return [{ ...base, quantity: line.quantity, taxableValue: line.taxableValue, taxAmount: line.taxAmount, batchNo: '', mfgDate: '', expiryDate: '' }]
    }

    const whole = batches.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0) || 1
    let takenTaxable = 0
    let takenTax = 0
    return batches.map((row, index) => {
      const last = index === batches.length - 1
      const share = (Number(row.quantity) || 0) / whole
      // The last row takes the remainder, so rounding never loses a paisa.
      const taxableValue = last
        ? Math.round((Number(line.taxableValue) - takenTaxable) * 100) / 100
        : Math.round(Number(line.taxableValue) * share * 100) / 100
      const taxAmount = last
        ? Math.round((Number(line.taxAmount) - takenTax) * 100) / 100
        : Math.round(Number(line.taxAmount) * share * 100) / 100
      takenTaxable += taxableValue
      takenTax += taxAmount
      return {
        ...base,
        id: `${line.id}-${row.batchId ?? index}`,
        quantity: row.quantity,
        batchNo: row.batchNo,
        mfgDate: row.mfgDate,
        expiryDate: row.expiryDate,
        taxableValue,
        taxAmount,
      }
    })
  })
  const interState = Boolean(invoice.interState)
  // The tax columns are headed with the rate when every line shares one, which
  // is how the client's own bill reads: CGST (2.5%) · SGST (2.5%) · IGST (5%).
  const rates = [...new Set(lines.map((line) => Number(line.gstRate) || 0))]
  const one = rates.length === 1 ? rates[0] : null
  const halfLabel = one === null ? '' : ` (${(one / 2).toFixed(one % 2 === 0 ? 0 : 2).replace(/\.00$/, '')}%)`
  const fullLabel = one === null ? '' : ` (${one}%)`

  const totalQty = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0)
  const totalTaxable = lines.reduce((sum, line) => sum + (Number(line.taxableValue) || 0), 0)
  const totalTax = lines.reduce((sum, line) => sum + (Number(line.taxAmount) || 0), 0)
  const halfTax = Math.round((totalTax / 2) * 100) / 100

  // The printed bill always runs to sixteen rows, filling out with blanks.
  const blanks = Math.max(0, 3 - lines.length)

  return (
    <article
      className={cn(
        'mx-auto w-full bg-white font-sans text-[9px] leading-tight text-black print:max-w-[210mm] print:text-[8px]',
        editing ? 'max-w-[72rem]' : 'max-w-[210mm]',
      )}
    >
      <div className="border border-black">
        <p className="border-b border-black px-1 py-[3px] font-bold">GSTIN- {BILL_COMPANY.gstin}</p>

        <header className="border-b border-black px-2 py-1 text-center">
          <h1 className="text-[13px] font-bold underline">TAX INVOICE</h1>
          <p className="text-[15px] font-bold">{BILL_COMPANY.name}</p>
          <p className="font-bold">{BILL_COMPANY.tagline}</p>
          <p>{BILL_COMPANY.address}</p>
          <p>{BILL_COMPANY.registration}</p>
          <p>{BILL_COMPANY.phone}</p>
          <p className="underline">E-Mail: {BILL_COMPANY.email}</p>
          <p>WEBSITE : {BILL_COMPANY.website}</p>
        </header>
        <p className="border-b border-black py-[3px] text-center font-bold">{BILL_COMPANY.licence}</p>

        {/* Buyer on the left, the bill's own particulars on the right. */}
        <div className="grid grid-cols-[1fr_20rem]">
          <section className="border-r border-black px-2 py-1">
            <p className="font-bold">Buyer&apos;s Detail:</p>
            {slot(
              'billTo',
              <>
                <p className="font-bold">M/S {firm.name}</p>
                {firm.address && <p className="whitespace-pre-line">{firm.address}</p>}
                <p>{[firm.state, firm.pincode].filter(Boolean).join(', ')}</p>
                <p className="font-bold">GSTIN-{firm.gstin || 'UNREGISTERED'}</p>
                {firm.mobile && <p className="font-bold">CONTACT NO= {firm.mobile}</p>}
              </>,
            )}
          </section>

          <section className="space-y-[1px] px-2 py-1">
            <Meta label="INVOICE NO.">{slot('invoiceNo', invoice.invoiceNo)}</Meta>
            <Meta label="DATE">{slot('invoiceDate', billDate(invoice.invoiceDate))}</Meta>
            <Meta label="TRANSPORT">{slot('transport', invoice.transport || '')}</Meta>
            <Meta label="VEHICLE NO.">{slot('vehicleNo', invoice.vehicleNo || '')}</Meta>
            {invoice.ewayBillNo || 'ewayBillNo' in slots ? (
              <Meta label="E-WAY BILL NO.">{slot('ewayBillNo', invoice.ewayBillNo || '')}</Meta>
            ) : null}
            <Meta label="PLACE OF SUPPLY">{placeOfSupply(firm.state)}</Meta>
            <Meta label="STATION">{slot('station', invoice.station || '')}</Meta>
            {/* Credit period and the like: the system needs them, the printed
                bill does not show them, so they only appear while editing. */}
            {slot('extraMeta', null)}
          </section>
        </div>

        {linesSlot(
          <table className="w-full border-collapse border-t border-black text-center">
            <thead>
              <tr>
                <Head className="w-8">S.<br />NO</Head>
                <Head className="text-left">DESCRIPTION  OF GOODS</Head>
                <Head className="w-16">BATCH NO.</Head>
                <Head className="w-14">MFD.</Head>
                <Head className="w-14">EXP.</Head>
                <Head className="w-12">HSN<br />CODE</Head>
                <Head className="w-10">QTY.<br />(IN BOX)</Head>
                <Head className="w-12">UOM<br />(IN BOTTLE)</Head>
                <Head className="w-14">MRP<br />(P.BOTTLE)</Head>
                <Head className="w-14">RATE<br />(P.BOTTLE)</Head>
                <Head className="w-16">TAXABLE<br />VALUE</Head>
                <Head className="w-14">CGST<br />{halfLabel}</Head>
                <Head className="w-14">SGST<br />{halfLabel}</Head>
                <Head className="w-14">IGST{fullLabel}</Head>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Cell />
                <Cell className="text-left font-bold">{BILL_COMPANY.goodsHeading}</Cell>
                {Array.from({ length: 12 }, (_, i) => (
                  <Cell key={i} />
                ))}
              </tr>
              {lines.map((line, index) => {
                const tax = Number(line.taxAmount) || 0
                const half = Math.round((tax / 2) * 100) / 100
                return (
                  <tr key={line.id ?? index}>
                    <Cell className="font-bold">{index + 1}</Cell>
                    <Cell className="text-left">{line.itemName}</Cell>
                    <Cell className="font-bold">{line.batchNo}</Cell>
                    <Cell className="font-bold">{monthYear(line.mfgDate)}</Cell>
                    <Cell className="font-bold">{monthYear(line.expiryDate)}</Cell>
                    <Cell className="font-bold">{line.hsn}</Cell>
                    <Cell className="font-bold">{line.boxes}</Cell>
                    <Cell className="font-bold">{Number(line.quantity) || 0}</Cell>
                    <Cell className="text-right font-bold">{money(line.mrp)}</Cell>
                    <Cell className="text-right font-bold">{money(line.rate)}</Cell>
                    <Cell className="text-right font-bold">{money(line.taxableValue)}</Cell>
                    <Cell className="text-right font-bold">{interState ? '0.00' : money(half)}</Cell>
                    <Cell className="text-right font-bold">{interState ? '0.00' : money(tax - half)}</Cell>
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
                <Cell className="text-left font-bold">TOTAL NAG = {invoice.packages || ''}</Cell>
                <Cell />
                <Cell />
                <Cell />
                <Cell />
                <Cell />
                <Cell className="font-bold">{totalQty}</Cell>
                <Cell />
                <Cell />
                <Cell className="text-right font-bold">{money(totalTaxable)}</Cell>
                <Cell className="text-right font-bold">{interState ? '0.00' : money(halfTax)}</Cell>
                <Cell className="text-right font-bold">{interState ? '0.00' : money(totalTax - halfTax)}</Cell>
                <Cell className="text-right font-bold">{interState ? money(totalTax) : '0.00'}</Cell>
              </tr>
            </tbody>
          </table>,
        )}

        {/* The bank on the left, the summary of the money on the right. */}
        <div className="grid grid-cols-[1fr_17rem] border-t border-black">
          <section className="border-r border-black">
            <p className="border-b border-black py-[3px] text-center font-bold">OUR BANK DETAILS</p>
            <table className="w-full border-collapse">
              <tbody>
                {[
                  ['BANK NAME :', bank?.bankName],
                  ['BRANCH :', bank?.branch],
                  ['IFSC CODE :', bank?.ifsc],
                  ['ACCOUNT NO. :', bank?.accountNumber],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <Cell className="w-28 border-0 border-r border-b border-black font-bold">{label}</Cell>
                    <Cell className="border-0 border-b border-black text-center font-bold">{value || ''}</Cell>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <table className="w-full border-collapse self-start">
            <tbody>
              <tr>
                <Head className="border-0 border-b border-l border-black text-right">SUMMARY</Head>
                <Head className="w-20 border-0 border-b border-l border-black text-center">TOTAL</Head>
              </tr>
              {[
                ['TAXABLE VALUE', money(invoice.taxableValue ?? totalTaxable)],
                [`CGST @ ${one === null ? '' : one / 2} %`, interState ? '0.00' : money(invoice.cgst ?? halfTax)],
                [`SGST @ ${one === null ? '' : one / 2} %`, interState ? '0.00' : money(invoice.sgst ?? totalTax - halfTax)],
                ['IGST', interState ? money(invoice.igst ?? totalTax) : '0.00'],
                ['DISCOUNT', '0.00'],
                ['ROUND OFF', money(invoice.roundOff)],
              ].map(([label, value]) => (
                <tr key={label}>
                  <Cell className="border-0 border-b border-l border-black text-right font-bold">{label}</Cell>
                  <Cell className="border-0 border-b border-l border-black text-right">{value}</Cell>
                </tr>
              ))}
              <tr>
                <Cell className="border-0 border-b border-l border-black text-right font-bold">GRAND TOTAL</Cell>
                <Cell className="border-0 border-b border-l border-black text-right font-bold">{money(invoice.total)}</Cell>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="border-t border-black px-1 py-[3px] font-bold">
          TOTAL IN WORDS RS. {rupeesInWords(invoice.total)} ONLY.
        </p>

        {/* Terms, the receiver's signature, and ours. */}
        <div className="grid grid-cols-[1fr_12rem_14rem] border-t border-black">
          <section className="border-r border-black px-2 py-1">
            <div className="flex items-start justify-between">
              <p className="font-bold underline">TERMS &amp; CONDITION</p>
              <p>E. &amp; O.E.</p>
            </div>
            <ol className="mt-0.5 list-decimal space-y-[1px] pl-4 text-[8px]">
              {BILL_TERMS.map((term) => (
                <li key={term}>{term}</li>
              ))}
            </ol>
          </section>
          <section className="grid place-items-start justify-center border-r border-black px-2 py-1">
            <p className="font-bold underline">RECEIVER&apos;S SIGNATURE</p>
          </section>
          <section className="flex flex-col justify-between px-2 py-1 text-center">
            <p className="font-bold">FOR {BILL_COMPANY.name}</p>
            <p className="mt-10 font-bold">AUTHORISED SIGNATORY</p>
          </section>
        </div>
      </div>
    </article>
  )
}
