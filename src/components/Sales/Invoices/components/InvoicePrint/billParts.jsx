import { cn } from '@/lib/utils'

/**
 * The pieces every printed sheet is built from. A bill and a credit note are
 * the same paper with a different heading — "सिमिलर फॉर्मेट है, बस टैक्स इनवाइस
 * की जगह क्रेडिट नोट लिखेंगे" — so they share these rather than each drawing
 * their own boxes a pixel apart.
 */

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

export const money = (value) => (Number(value) || 0).toFixed(2)

/** 2.5%, not 2.50% — the client's own paper reads "CGST @ 2.5 %". */
export const pct = (value) => String(Number((Number(value) || 0).toFixed(2)))

/** Every cell on these sheets is boxed, the way the printed ones are. */
export function Cell({ children, className = '', ...rest }) {
  return (
    <td className={cn('border border-black px-1 py-[3px] align-middle', className)} {...rest}>
      {children}
    </td>
  )
}

export function Head({ children, className = '', ...rest }) {
  return (
    <th className={cn('border border-black px-1 py-[3px] align-middle font-bold', className)} {...rest}>
      {children}
    </th>
  )
}

/** A label-and-value line in the meta box, "INVOICE NO.  :  NP/26-27/673". */
export function Meta({ label, children }) {
  return (
    <div className="grid grid-cols-[7.5rem_0.5rem_1fr] gap-x-1">
      <span>{label}</span>
      <span>:</span>
      <span className="font-semibold">{children}</span>
    </div>
  )
}
