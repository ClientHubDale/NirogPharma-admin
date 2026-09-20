import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { Switch } from '@/components/form/Switch'
import { TextAreaField } from '@/components/form/TextAreaField'
import { TextField } from '@/components/form/TextField'
import { Button } from '@/components/ui/button'

const TOGGLES = [
  { key: 'vehicleNo', label: 'Vehicle No.', hint: 'Show a vehicle number field' },
  { key: 'ewayBillNo', label: 'E-way Bill No', hint: 'Show an e-way bill number field' },
  { key: 'creditPeriod', label: 'Credit Period', hint: 'Credit days on the document (defaults from the party)' },
  { key: 'creditLimit', label: 'Credit Limit', hint: 'Warn when this takes the party over its credit limit' },
  { key: 'creditBillLimit', label: 'Credit Bill Limit', hint: 'Show the party’s allowed number of unpaid bills' },
  { key: 'terms', label: 'Terms and conditions', hint: 'Print terms at the bottom' },
]

function CustomFields({ title, sign, values, onChange }) {
  const [adding, setAdding] = useState('')
  return (
    <div className="grid gap-2 border-t border-mint-pale py-4 sm:grid-cols-[10rem_1fr] sm:items-start">
      <p className="pt-2 text-sm font-semibold text-ink">
        {title} ({sign}):
      </p>
      <div className="space-y-2">
        {values.map((label) => (
          <div key={label} className="flex items-center justify-between rounded-lg border border-mint-pale bg-bg px-3 py-2 text-sm">
            <span>
              <span className="mr-1.5 font-mono text-ink-muted">{sign}</span>
              {label}
            </span>
            <button type="button" aria-label={`Remove ${label}`} onClick={() => onChange(values.filter((v) => v !== label))} className="text-ink-muted hover:text-danger">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (adding.trim() && !values.includes(adding.trim())) onChange([...values, adding.trim()])
                setAdding('')
              }
            }}
            placeholder={sign === '−' ? 'e.g. Cash discount' : 'e.g. Freight'}
            aria-label={`New ${title.toLowerCase()} field`}
            className="h-10 min-w-0 flex-1 rounded-lg border border-dashed border-green-soft bg-white px-3 text-sm outline-none focus:border-green-fresh"
          />
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              if (adding.trim() && !values.includes(adding.trim())) onChange([...values, adding.trim()])
              setAdding('')
            }}
          >
            <Plus data-icon="inline-start" /> Add Custom Field
          </Button>
        </div>
      </div>
    </div>
  )
}

/** ⚙ Transaction Settings — which optional fields a document type shows, plus bill-level rules. */
export function TransactionSettingsDialog({ open, onOpenChange, settings, onSave, noun }) {
  const [draft, setDraft] = useState(settings)
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (o) setDraft(settings)
        onOpenChange(o)
      }}
      title="Transaction Settings"
      description={`Applies to every new ${noun}.`}
      footer={
        <>
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="lg"
            onClick={() => {
              onSave({ ...draft, minOrderValue: Number(draft.minOrderValue) || 0 })
              onOpenChange(false)
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <ul className="divide-y divide-mint-pale">
        {TOGGLES.map((t) => (
          <li key={t.key} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-semibold text-black">{t.label}</p>
              <p className="text-xs text-ink-muted">{t.hint}</p>
            </div>
            <Switch id={`setting-${t.key}`} checked={draft[t.key]} onCheckedChange={(v) => set(t.key, v)} />
          </li>
        ))}
      </ul>
      {draft.terms && (
        <TextAreaField id="setting-terms" label="Terms text" rows={2} value={draft.termsText} onChange={(e) => set('termsText', e.target.value)} className="mt-2" />
      )}
      <div className="mt-4 grid gap-2 border-t border-mint-pale py-4 sm:grid-cols-[10rem_1fr] sm:items-center">
        <p className="text-sm font-semibold text-ink">Min. Order Value:</p>
        <TextField
          id="setting-min-order"
          size="md"
          prefix="₹"
          inputMode="decimal"
          placeholder="No minimum"
          value={draft.minOrderValue || ''}
          onChange={(e) => set('minOrderValue', e.target.value.replace(/[^\d.]/g, ''))}
          className="sm:max-w-56"
        />
      </div>
      <CustomFields title="Discounts" sign="−" values={draft.discountFields} onChange={(v) => set('discountFields', v)} />
      <CustomFields title="Charges" sign="+" values={draft.chargeFields} onChange={(v) => set('chargeFields', v)} />
    </Modal>
  )
}
