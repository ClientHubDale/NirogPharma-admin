import { useState } from 'react'
import { ExternalLink, LocateFixed, Plus } from 'lucide-react'
import { DocumentUploader } from '@/components/form/DocumentUploader'
import { FormSection } from '@/components/form/FormSection'
import { InlineSelect } from '@/components/form/InlineSelect'
import { SelectField } from '@/components/form/SelectField'
import { Switch } from '@/components/form/Switch'
import { TextAreaField } from '@/components/form/TextAreaField'
import { TextField } from '@/components/form/TextField'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { INDIAN_STATES, STATE_NAME } from '@/constants/indianStates'
import { googleMapsUrl, parseLatLng } from '@/lib/geo'
import { BALANCE_TYPES, PARTY_GROUP_OPTIONS, PARTY_STATUSES, GSTIN_PATTERN } from '../../partyModel'
import { RouteQuickAdd } from './RouteQuickAdd'

const decimal = (v) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
const digits = (v) => v.replace(/\D/g, '')
const Addon = ({ children }) => (
  <span className="flex h-full items-center border-l border-mint-pale bg-bg px-3.5 text-sm font-medium text-ink-muted">{children}</span>
)

/**
 * Create / edit a party (customer or supplier) — General, Other, Documents.
 * Controlled by `form` + `onChange`; `config` (from partyTypes) supplies the wording.
 */
export function PartyForm({ config, form, errors, onChange, routeOptions, cityOptions, routes, onAddRoute }) {
  const [addingRoute, setAddingRoute] = useState(false)
  const [locating, setLocating] = useState(false)
  const [geoNote, setGeoNote] = useState('')
  const set = (field) => (e) => onChange(field, e.target.value)
  const geo = parseLatLng(form.geo)

  const useMyLocation = () => {
    if (!navigator.geolocation) return setGeoNote('This browser can’t share location.')
    setLocating(true)
    setGeoNote('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange('geo', `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`)
        setLocating(false)
      },
      () => {
        setGeoNote('Location permission was denied.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const onGstin = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15)
    onChange('gstin', value)
    // Fill State of supply from a complete, valid GSTIN.
    if (GSTIN_PATTERN.test(value) && STATE_NAME[value.slice(0, 2)]) onChange('stateCode', value.slice(0, 2))
  }

  return (
    <>
      <FormSection
        title="General Details"
        action={
          <Switch id="cust-verified" checked={form.verified} onCheckedChange={(v) => onChange('verified', v)} label={form.verified ? 'Verified' : 'Not verified'} />
        }
      >
        <TextField id="cust-name" label="Business Name" required size="md" placeholder={config.namePlaceholder} maxLength={80} value={form.name} onChange={set('name')} error={errors.name} />
        <TextField id="cust-code" label="Code" size="md" placeholder="Optional party code" maxLength={20} value={form.code} onChange={set('code')} error={errors.code} />
        <TextField id="cust-contact" label="Contact Person" size="md" placeholder={config.contactPlaceholder} maxLength={60} value={form.contactPerson} onChange={set('contactPerson')} />
        <TextField
          id="cust-mobile"
          label="Mobile"
          size="md"
          prefix="+91"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="98765 43210"
          value={form.mobile}
          onChange={(e) => onChange('mobile', digits(e.target.value))}
          error={errors.mobile}
        />
        <TextField id="cust-email" label="Email" size="md" type="email" placeholder="Optional" value={form.email} onChange={set('email')} error={errors.email} />
        <SelectField id="cust-status" label="Status" searchable={false} options={PARTY_STATUSES} value={form.status} onChange={(v) => onChange('status', v)} />
      </FormSection>

      <FormSection title="Other Details">
        <div>
          {addingRoute ? (
            <>
              <p className="mb-2 text-sm font-semibold text-ink">New route</p>
              <RouteQuickAdd
                cityOptions={cityOptions}
                routes={routes}
                onCancel={() => setAddingRoute(false)}
                onAdd={(route) => {
                  onChange('routeId', onAddRoute(route))
                  setAddingRoute(false)
                }}
              />
            </>
          ) : (
            <SelectField
              id="cust-route"
              label="Route"
              placeholder="Select route"
              clearable
              options={routeOptions}
              value={form.routeId}
              onChange={(v) => onChange('routeId', v)}
              labelAction={
                <button type="button" onClick={() => setAddingRoute(true)} className="inline-flex items-center gap-1 text-sm font-semibold text-green-deep hover:underline" aria-label="Add route">
                  <Plus className="size-3.5" /> New
                </button>
              }
            />
          )}
        </div>
        <SelectField id="cust-group" label="Group" options={PARTY_GROUP_OPTIONS} value={form.groupId} onChange={(v) => onChange('groupId', v)} />

        <div className="sm:col-span-2">
          <TextField
            id="cust-geo"
            label="Geolocation"
            size="md"
            placeholder="latitude, longitude — e.g. 22.7196, 75.8577"
            value={form.geo}
            onChange={set('geo')}
            error={errors.geo}
            labelAction={
              geo ? (
                <a href={googleMapsUrl(geo.lat, geo.lng)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-green-deep hover:underline">
                  View on map <ExternalLink className="size-3.5" />
                </a>
              ) : null
            }
            suffix={
              <button type="button" onClick={useMyLocation} disabled={locating} className="flex h-full shrink-0 items-center gap-1.5 border-l border-mint-pale bg-bg px-3.5 text-sm font-semibold text-green-deep hover:bg-mint-pale disabled:opacity-60">
                <LocateFixed className="size-4" /> {locating ? 'Locating…' : 'Use my location'}
              </button>
            }
          />
          {geoNote && <p className="mt-1.5 text-sm text-ink-muted">{geoNote}</p>}
          {!errors.geo && config.geoHint && <p className="mt-1.5 text-xs text-ink-muted">{config.geoHint}</p>}
        </div>

        <TextAreaField id="cust-billing" label="Billing address" rows={3} value={form.billingAddress} onChange={set('billingAddress')} />
        <div>
          <TextAreaField
            id="cust-shipping"
            label="Shipping address"
            rows={3}
            value={form.sameAsBilling ? form.billingAddress : form.shippingAddress}
            onChange={set('shippingAddress')}
            disabled={form.sameAsBilling}
          />
          <div className="mt-2 flex items-center gap-2">
            <Checkbox id="cust-same" checked={form.sameAsBilling} onCheckedChange={(v) => onChange('sameAsBilling', v === true)} />
            <Label htmlFor="cust-same" className="text-sm font-normal text-ink">Same as billing address</Label>
          </div>
        </div>

        <TextField id="cust-gstin" label="GSTIN" size="md" placeholder="e.g. 23ABCDE1234F1Z5" value={form.gstin} onChange={onGstin} error={errors.gstin} inputClassName="font-mono uppercase" />
        <TextField id="cust-dl" label="Drug licence no." size="md" placeholder="Optional" maxLength={40} value={form.drugLicence} onChange={set('drugLicence')} />

        <TextField
          id="cust-opening"
          label="Opening balance"
          size="md"
          prefix="₹"
          inputMode="decimal"
          placeholder="0"
          value={form.openingBalance}
          onChange={(e) => onChange('openingBalance', decimal(e.target.value))}
          error={errors.openingBalance}
          suffix={<InlineSelect aria-label="Balance type" value={form.balanceType} onChange={(v) => onChange('balanceType', v)} options={BALANCE_TYPES} />}
        />
        <TextField
          id="cust-credit-period"
          label="Credit period"
          size="md"
          inputMode="numeric"
          placeholder="Credit period"
          value={form.creditPeriodDays}
          onChange={(e) => onChange('creditPeriodDays', digits(e.target.value))}
          error={errors.creditPeriodDays}
          suffix={<Addon>Days</Addon>}
        />
        <TextField
          id="cust-credit-limit"
          label="Credit limit"
          size="md"
          prefix="₹"
          inputMode="decimal"
          placeholder="No limit"
          value={form.creditLimit}
          onChange={(e) => onChange('creditLimit', decimal(e.target.value))}
          error={errors.creditLimit}
        />
        <TextField
          id="cust-bill-limit"
          label="Credit bill limit"
          size="md"
          inputMode="numeric"
          value={form.creditBillLimit}
          onChange={(e) => onChange('creditBillLimit', digits(e.target.value))}
          error={errors.creditBillLimit}
          suffix={<Addon>unpaid bills</Addon>}
        />
        <SelectField
          id="cust-state"
          label="State of supply"
          placeholder="Select state"
          clearable
          options={INDIAN_STATES}
          value={form.stateCode}
          onChange={(v) => onChange('stateCode', v)}
          error={errors.stateCode}
        />
      </FormSection>

      <FormSection title="Documents">
        <DocumentUploader documents={form.documents} onChange={(docs) => onChange('documents', docs)} />
      </FormSection>
    </>
  )
}
