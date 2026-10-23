import { FileText, HelpCircle, Truck } from 'lucide-react'
import { Switch } from '@/components/form/Switch'
import { TextAreaField } from '@/components/form/TextAreaField'

/** A switch row with a short explanation behind the ? */
function ToggleRow({ id, label, hint, checked, onCheckedChange }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-mint-pale px-5 py-4 last:border-0">
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-medium text-ink">
        {label}
        <span title={hint} aria-label={hint} className="text-ink-muted">
          <HelpCircle className="size-3.5" />
        </span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
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
  )
}

/**
 * Settings › Billing — what a bill must carry before it can go out, and the
 * terms printed under it. Turning one on makes it mandatory to issue, which is
 * the whole point: "इशू हमेशा इनवाइस और ईवे दोनों होंगे".
 */
export function BillingSettings({ invoice, onChange }) {
  return (
    <div className="space-y-5">
      <Card icon={Truck} title="What a bill must carry">
        <ToggleRow
          id="billing-vehicle"
          label="Ask for the vehicle number"
          hint="Turn this on and a bill cannot be issued until the vehicle number is filled in."
          checked={invoice.vehicleNoRequired}
          onCheckedChange={(value) => onChange('vehicleNoRequired', value)}
        />
        <ToggleRow
          id="billing-eway"
          label="Ask for the e-way bill number"
          hint={`The government asks for an e-way bill above ₹${Number(invoice.ewayBillThreshold).toLocaleString('en-IN')}. Turn this on and a bill cannot be issued without one.`}
          checked={invoice.ewayBillRequired}
          onCheckedChange={(value) => onChange('ewayBillRequired', value)}
        />
        <p className="px-5 py-4 text-sm text-ink-muted">
          Both appear on the invoice either way — switching them on only makes them compulsory before it goes out.
        </p>
      </Card>

      <Card icon={FileText} title="Terms &amp; conditions">
        <div className="px-5 py-4">
          <TextAreaField
            id="billing-terms"
            label="Printed under every bill"
            rows={5}
            maxLength={1200}
            placeholder={'Goods once sold will not be taken back.\nInterest @18% p.a. is charged on bills unpaid after the due date.\nSubject to Ghaziabad jurisdiction.'}
            value={invoice.terms}
            onChange={(e) => onChange('terms', e.target.value)}
          />
          <p className="mt-2 text-sm text-ink-muted">One per line. A bill can still be given its own terms when it is made.</p>
        </div>
      </Card>
    </div>
  )
}
