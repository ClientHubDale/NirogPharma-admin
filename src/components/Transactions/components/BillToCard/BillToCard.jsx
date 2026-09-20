import { AlertTriangle, BadgeCheck, MapPin, Plus } from 'lucide-react'
import { SearchSelect } from '@/components/form/SearchSelect'
import { SelectField } from '@/components/form/SelectField'
import { TextField } from '@/components/form/TextField'
import { STATE_NAME } from '@/constants/indianStates'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import { WAREHOUSES } from '@/mocks/items'
import { balanceLabel } from '@/components/Parties/shared/partyModel'

const PARTY_TYPES = [
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'SUPPLIER', label: 'Supplier' },
]

/**
 * "Bill to" (sales) / "Bill from" (purchase) block: party picker + summary on
 * the left, document details on the right. `config` is the doc type.
 */
export function BillToCard({ doc, set, errors, settings, config, partyOptions, party, onNewParty, userOptions, total, openDue }) {
  const purchase = config.party === 'SUPPLIER'
  const balance = party ? balanceLabel(party) : null
  const overLimit = settings.creditLimit && party?.creditLimit > 0 && openDue + total > party.creditLimit
  return (
    <section className="grid grid-cols-1 gap-6 rounded-2xl border border-mint-pale bg-white p-5 lg:grid-cols-[1.2fr_1fr]">
      <div className="min-w-0">
        <p className="mb-3 text-xs font-bold tracking-wide text-ink-muted uppercase">{purchase ? 'Bill from' : 'Bill to'}</p>
        <div className={cn('flex items-center gap-3', purchase ? 'justify-start' : 'justify-between')}>
          {/* Purchases are always from a supplier, so there is no type to pick. */}
          {purchase ? null : <SearchSelect aria-label="Party type" searchable={false} options={PARTY_TYPES} value={doc.partyType} onChange={(v) => { set('partyType', v); set('partyId', '') }} className="w-44" />}
          <button type="button" onClick={onNewParty} className="inline-flex items-center gap-1 text-sm font-semibold text-green-deep hover:underline">
            <Plus className="size-3.5" /> New {doc.partyType === 'SUPPLIER' ? 'supplier' : 'customer'}
          </button>
        </div>
        <div className="mt-3">
          <SearchSelect
            id="doc-party"
            aria-label="Party"
            placeholder="Enter party name"
            options={partyOptions}
            value={doc.partyId}
            onChange={(v) => set('partyId', v)}
            invalid={Boolean(errors.partyId)}
          />
          {errors.partyId && <p className="mt-1.5 text-sm font-medium text-destructive">{errors.partyId}</p>}
        </div>
        {party && (
          <div className="mt-3 space-y-1.5 rounded-xl bg-bg p-3.5 text-sm">
            <p className="flex items-center gap-1.5 font-bold text-black">
              {party.name} {party.verified && <BadgeCheck className="size-4 text-green-deep" />}
            </p>
            {party.billingAddress && (
              <p className="flex gap-1.5 text-ink">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-ink-muted" /> {party.billingAddress}
              </p>
            )}
            <p className="text-xs text-ink-muted">
              {party.gstin ? `GSTIN ${party.gstin}` : 'No GSTIN (unregistered)'}
              {party.stateCode && ` · ${STATE_NAME[party.stateCode]}`}
              {party.mobile && ` · +91 ${party.mobile}`}
            </p>
            <p className="text-xs text-ink-muted">
              Balance <span className="font-mono text-ink">{balance.amount}</span> {balance.note}
              {settings.creditLimit && party.creditLimit > 0 && ` · Credit limit ${formatPrice(party.creditLimit)}`}
              {settings.creditBillLimit && party.creditBillLimit > 0 && ` · Max ${party.creditBillLimit} unpaid bills`}
            </p>
            {overLimit && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-danger">
                <AlertTriangle className="size-3.5" /> This takes the party over its credit limit.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 content-start gap-4 sm:grid-cols-2">
        <TextField id="doc-date" label="Date" size="md" type="date" value={doc.date} onChange={(e) => set('date', e.target.value)} error={errors.date} />
        {settings.creditPeriod && (
          <TextField
            id="doc-credit"
            label="Credit period"
            size="md"
            inputMode="numeric"
            value={doc.creditPeriodDays}
            onChange={(e) => set('creditPeriodDays', e.target.value.replace(/\D/g, ''))}
            error={errors.creditPeriodDays}
            suffix={<span className="flex h-full items-center border-l border-mint-pale bg-bg px-3 text-sm text-ink-muted">days</span>}
          />
        )}
        {config.poNumber && <TextField id="doc-po" label="PO number" size="md" placeholder="Supplier's order no." value={doc.poNumber ?? ''} onChange={(e) => set('poNumber', e.target.value)} />}
        <SelectField id="doc-warehouse" label="Warehouse" placeholder="Select warehouse" options={WAREHOUSES} value={doc.warehouseId} onChange={(v) => set('warehouseId', v)} />
        <SelectField id="doc-created-by" label="Created by" placeholder="Select user" options={userOptions} value={doc.createdBy} onChange={(v) => set('createdBy', v)} />
        {settings.vehicleNo && <TextField id="doc-vehicle" label="Vehicle No." size="md" placeholder="e.g. MP09 AB 1234" value={doc.vehicleNo} onChange={(e) => set('vehicleNo', e.target.value.toUpperCase())} />}
        {settings.ewayBillNo && (
          <TextField id="doc-eway" label="E-way Bill No" size="md" inputMode="numeric" maxLength={12} placeholder="12 digits" value={doc.ewayBillNo} onChange={(e) => set('ewayBillNo', e.target.value.replace(/\D/g, ''))} />
        )}
      </div>
    </section>
  )
}

export const partyOptionFor = (p, cityOf) => ({
  value: p.id,
  label: p.name,
  hint: [cityOf(p), p.mobile, p.code].filter(Boolean).join(' · '),
})

