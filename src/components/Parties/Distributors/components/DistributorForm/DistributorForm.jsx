import { FormSection } from '@/components/form/FormSection'
import { ImageUploader } from '@/components/form/ImageUploader'
import { LocationField } from '@/components/form/LocationField'
import { SelectField } from '@/components/form/SelectField'
import { TextAreaField } from '@/components/form/TextAreaField'
import { TextField } from '@/components/form/TextField'
import { PRICE_TIER_OPTIONS } from '@/constants/priceTiers'
import { DISTRIBUTOR_STATUSES, WEEK_DAYS } from '../../distributorModel'

/**
 * Create / edit a distributor — the fields from the client's app screen, plus
 * the manager (implicit there, because a manager creates it) and the status and
 * target the admin panel needs.
 */
export function DistributorForm({ form, errors, onChange, managers, executives, regions, cities, areas }) {
  const set = (field) => (e) => onChange(field, e.target.value)
  const digits = (value) => value.replace(/\D/g, '')
  const money = (value) => value.replace(/[^\d.]/g, '')

  // Each level narrows the next, so a city from another region cannot be chosen.
  const cityOptions = cities.filter((c) => !form.regionId || c.regionId === form.regionId).map((c) => ({ value: c.id, label: c.name }))
  const areaOptions = areas.filter((a) => !form.cityId || a.cityId === form.cityId).map((a) => ({ value: a.id, label: a.name }))

  return (
    <div className="space-y-5">
      <FormSection title="Firm Details" description="Who the distributor is and how to reach them.">
        <TextField
          id="dist-name"
          label="Firm name"
          required
          size="md"
          placeholder="e.g. Vaidya Pharma Distributors"
          maxLength={80}
          value={form.name}
          onChange={set('name')}
          error={errors.name}
        />
        <TextField
          id="dist-contact"
          label="Contact person"
          required
          size="md"
          placeholder="e.g. Rajesh Vaidya"
          maxLength={60}
          value={form.contactPerson}
          onChange={set('contactPerson')}
          error={errors.contactPerson}
        />
        <TextField
          id="dist-mobile"
          label="Mobile"
          required
          size="md"
          prefix="+91"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="98220 11450"
          value={form.mobile}
          onChange={(e) => onChange('mobile', digits(e.target.value))}
          error={errors.mobile}
        />
        <TextField
          id="dist-alt-mobile"
          label="Alternate mobile"
          size="md"
          prefix="+91"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="Optional"
          value={form.altMobile}
          onChange={(e) => onChange('altMobile', digits(e.target.value))}
          error={errors.altMobile}
        />
        <TextField id="dist-email" label="Email" size="md" type="email" placeholder="Optional" value={form.email} onChange={set('email')} error={errors.email} />
        <SelectField id="dist-status" label="Status" searchable={false} options={DISTRIBUTOR_STATUSES} value={form.status} onChange={(v) => onChange('status', v)} />
        <TextAreaField
          id="dist-address"
          label="Registered address"
          className="sm:col-span-2"
          rows={2}
          maxLength={240}
          placeholder="21, Sanwer Road, Industrial Area, Indore 452015"
          value={form.address}
          onChange={set('address')}
        />
        <TextField
          id="dist-gstin"
          label="G.S.T. No."
          size="md"
          placeholder="e.g. 23AACVP7781K1Z5"
          inputClassName="font-mono uppercase"
          value={form.gstin}
          onChange={(e) => onChange('gstin', e.target.value.toUpperCase())}
          error={errors.gstin}
        />
        <TextField id="dist-dl" label="Drug licence no." size="md" placeholder="e.g. 20B/MP/IND/1502" maxLength={40} value={form.drugLicence} onChange={set('drugLicence')} />
      </FormSection>

      <FormSection title="Who Runs It" description="A manager owns the distributor; an executive works under it.">
        <SelectField
          id="dist-manager"
          label="Manager"
          required
          placeholder="Select manager"
          options={managers}
          value={form.managerId}
          onChange={(v) => onChange('managerId', v)}
          error={errors.managerId}
        />
        <SelectField
          id="dist-executive"
          label="Assigned executive"
          required
          placeholder="Select executive"
          clearable
          options={executives}
          value={form.executiveId}
          onChange={(v) => onChange('executiveId', v)}
          error={errors.executiveId}
        />
      </FormSection>

      <FormSection title="Area Covered" description="Region, then the city and the area or beat inside it.">
        <SelectField
          id="dist-region"
          label="Region"
          required
          placeholder="Select region"
          clearable
          options={regions.map((r) => ({ value: r.id, label: r.name }))}
          value={form.regionId}
          error={errors.regionId}
          onChange={(v) => {
            onChange('regionId', v)
            // The city and area below belonged to the old region.
            onChange('cityId', '')
            onChange('areaId', '')
          }}
        />
        <SelectField
          id="dist-city"
          label="City"
          required
          placeholder="Select city"
          clearable
          options={cityOptions}
          value={form.cityId}
          error={errors.cityId}
          onChange={(v) => {
            onChange('cityId', v)
            onChange('areaId', '')
          }}
        />
        <SelectField
          id="dist-area"
          label="Area / beat"
          required
          placeholder="Select area"
          clearable
          options={areaOptions}
          value={form.areaId}
          error={errors.areaId}
          onChange={(v) => onChange('areaId', v)}
        />
        <LocationField
          id="dist-location"
          label="Location"
          required
          className="sm:col-span-2"
          value={{ name: form.locationName, lat: form.latitude, lng: form.longitude }}
          onChange={({ name, lat, lng }) => {
            onChange('locationName', name)
            onChange('latitude', lat)
            onChange('longitude', lng)
          }}
          hint="Search for the shop, or press Use current location while you are standing there."
          error={errors.locationName}
        />
        <TextField id="dist-transport" label="Transport" size="md" placeholder="e.g. VRL Logistics" maxLength={60} value={form.transport} onChange={set('transport')} />
        <SelectField
          id="dist-weeklyoff"
          label="Weekly off"
          placeholder="Select day"
          clearable
          searchable={false}
          options={WEEK_DAYS}
          value={form.weeklyOff}
          onChange={(v) => onChange('weeklyOff', v)}
        />
      </FormSection>

      <FormSection title="Trade Terms" description="The rate they buy on, the credit they get and what they are expected to sell.">
        <SelectField
          id="dist-price-tier"
          label="Price tier"
          required
          searchable={false}
          options={PRICE_TIER_OPTIONS}
          value={form.priceTier}
          onChange={(v) => onChange('priceTier', v)}
          error={errors.priceTier}
        />
        <TextField
          id="dist-credit-limit"
          label="Credit limit"
          size="md"
          inputMode="decimal"
          placeholder="0"
          prefix={<span className="pl-3 text-sm text-ink-muted">₹</span>}
          value={form.creditLimit}
          onChange={(e) => onChange('creditLimit', money(e.target.value))}
          error={errors.creditLimit}
        />
        <TextField
          id="dist-credit-days"
          label="Credit days"
          size="md"
          inputMode="numeric"
          placeholder="0"
          suffix={<span className="flex h-full items-center border-l border-mint-pale bg-bg px-3 text-sm text-ink-muted">days</span>}
          value={form.creditDays}
          onChange={(e) => onChange('creditDays', digits(e.target.value))}
          error={errors.creditDays}
        />
        <TextField
          id="dist-target"
          label="Monthly target"
          size="md"
          inputMode="decimal"
          placeholder="0"
          prefix={<span className="pl-3 text-sm text-ink-muted">₹</span>}
          value={form.target}
          onChange={(e) => onChange('target', money(e.target.value))}
          error={errors.target}
        />
      </FormSection>

      <FormSection title="Shop Photo & Signature" description="Taken when the distributor is appointed.">
        <ImageUploader label="Shop photo" images={form.shopPhoto} onChange={(images) => onChange('shopPhoto', images)} max={1} />
        <ImageUploader label="Signature" images={form.signature} onChange={(images) => onChange('signature', images)} max={1} />
      </FormSection>
    </div>
  )
}
