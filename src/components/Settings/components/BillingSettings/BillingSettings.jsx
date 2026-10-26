import { HelpCircle, Percent, Truck } from "lucide-react";
import { TextField } from '@/components/form/TextField'
import { Switch } from "@/components/form/Switch";

/** A switch row with a short explanation behind the ? */
function ToggleRow({ id, label, hint, checked, onCheckedChange }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-mint-pale px-5 py-4 last:border-0">
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-sm font-medium text-ink"
      >
        {label}
        <span title={hint} aria-label={hint} className="text-ink-muted">
          <HelpCircle className="size-3.5" />
        </span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function Card({ icon: Icon, title, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-mint-pale bg-white">
      <header className="flex items-center gap-3 border-b border-mint-pale px-5 py-4">
        <span className="grid size-9 place-items-center rounded-lg bg-mint-pale">
          <Icon className="size-4 text-green-deep" />
        </span>
        <h3 className="text-base font-bold text-black">{title}</h3>
      </header>
      {children}
    </section>
  );
}

/**
 * Settings › Billing — what a bill must carry before it can go out, and the
 * terms printed under it. Turning one on makes it mandatory to issue, which is
 * the whole point: "इशू हमेशा इनवाइस और ईवे दोनों होंगे".
 */
export function BillingSettings({ invoice, onChange }) {
  return (
    <div className="space-y-5">
      {/* "हमारा टैक्स रेट सेट कर दी 5 परसेंट… तो वो उसके अकॉर्डिंग कर देगा" */}
      <Card icon={Percent} title="Tax">
        <div className="grid gap-2 px-5 py-4 sm:grid-cols-[14rem_1fr] sm:items-center">
          <label htmlFor="billing-gst" className="text-sm font-medium text-ink">
            Default GST rate
          </label>
          <div className="flex items-center gap-2">
            <TextField
              id="billing-gst"
              size="md"
              inputMode="decimal"
              value={String(invoice.defaultGstRate ?? '')}
              onChange={(e) => onChange('defaultGstRate', e.target.value.replace(/[^\d.]/g, ''))}
              className="max-w-28"
              suffix={<span className="flex h-full items-center border-l border-mint-pale bg-bg px-3 text-sm text-ink-muted">%</span>}
            />
            <p className="text-sm text-ink-muted">
              Splits as CGST {(Number(invoice.defaultGstRate) || 0) / 2}% + SGST {(Number(invoice.defaultGstRate) || 0) / 2}% within
              the state, or IGST {Number(invoice.defaultGstRate) || 0}% outside it.
            </p>
          </div>
          <p className="text-xs text-ink-muted sm:col-span-2">
            The rate a new product starts on. A product with its own rate keeps it — GST follows the HSN code, so a bill of mixed
            rates shows each line's own.
          </p>
        </div>
      </Card>

      <Card icon={Truck} title="What a bill must carry">
        <ToggleRow
          id="billing-vehicle"
          label="Ask for the vehicle number"
          hint="Turn this on and a bill cannot be issued until the vehicle number is filled in."
          checked={invoice.vehicleNoRequired}
          onCheckedChange={(value) => onChange("vehicleNoRequired", value)}
        />
        <ToggleRow
          id="billing-eway"
          label="Ask for the e-way bill number"
          hint={`The government asks for an e-way bill above ₹${Number(invoice.ewayBillThreshold).toLocaleString("en-IN")}. Turn this on and a bill cannot be issued without one.`}
          checked={invoice.ewayBillRequired}
          onCheckedChange={(value) => onChange("ewayBillRequired", value)}
        />
        <p className="px-5 py-4 text-sm text-ink-muted">
          This is about what a bill cannot go out without. Whether a field
          appears at all is set on Sales → Sales Invoices, under the ⚙ beside
          Export.
        </p>
      </Card>

      {/* "यहाँ से ऑफ करके सेव कर दो तो पीडीएफ में भी नहीं दिखेगा" — a field the
          company does not use should not sit empty on the paper. */}
    </div>
  );
}
