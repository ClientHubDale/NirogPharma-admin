import { Gift } from 'lucide-react'
import { formatPrice } from '@/lib/format'

const Row = ({ label, value, strong, children }) => (
  <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
    <span className={strong ? 'font-semibold text-ink' : 'text-ink-muted'}>{label}</span>
    {children ?? <span className="font-mono font-medium text-black">{value}</span>}
  </div>
)

/** Right-hand totals: taxable, GST split, cess, discounts/charges, round-off, grand total. */
export function TotalsSummary({ totals, schemeDiscount, adjustments, onAdjustmentChange }) {
  return (
    <section className="rounded-2xl border border-mint-pale bg-white p-5">
      <Row label="Taxable amount" value={formatPrice(totals.taxable)} />
      {totals.inter ? (
        <Row label="IGST" value={formatPrice(totals.igst)} />
      ) : (
        <>
          <Row label="SGST" value={formatPrice(totals.sgst)} />
          <Row label="CGST" value={formatPrice(totals.cgst)} />
        </>
      )}
      <Row label="CESS" value={formatPrice(totals.cess)} />
      {schemeDiscount > 0 && (
        <Row label={<span className="inline-flex items-center gap-1.5 text-green-deep"><Gift className="size-3.5" /> Scheme discount</span>} value={`− ${formatPrice(schemeDiscount)}`} />
      )}
      {adjustments.map((a) => (
        <Row key={`${a.kind}-${a.label}`} label={`${a.label} (${a.kind === 'DISCOUNT' ? '−' : '+'})`}>
          <div className="flex h-8 w-28 items-center overflow-hidden rounded-lg border border-mint focus-within:border-green-fresh">
            <span className="pl-2 text-xs text-ink-muted">₹</span>
            <input
              value={a.amount}
              inputMode="decimal"
              aria-label={a.label}
              onChange={(e) => onAdjustmentChange(a, e.target.value.replace(/[^\d.]/g, ''))}
              className="h-full w-full min-w-0 bg-transparent px-2 text-right font-mono text-sm outline-none"
            />
          </div>
        </Row>
      ))}
      <div className="my-2 border-t border-mint-pale" />
      <Row label="Roundoff" value={Math.abs(totals.roundoff) < 0.005 ? formatPrice(0) : `${totals.roundoff > 0 ? '+ ' : '− '}${formatPrice(Math.abs(totals.roundoff))}`} />
      <div className="my-2 border-t border-mint-pale" />
      <div className="flex items-center justify-between py-2">
        <span className="text-base font-bold text-black">Grand total</span>
        <span className="font-mono text-2xl font-semibold text-green-deep" aria-live="polite">{formatPrice(totals.total)}</span>
      </div>
      <p className="mt-8 border-t border-dashed border-mint pt-2 text-right text-xs text-ink-muted">Authorised signature</p>
    </section>
  )
}
