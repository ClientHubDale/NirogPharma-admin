import { FormSection } from '@/components/form/FormSection'
import { MultiSelect } from '@/components/form/MultiSelect'
import { SelectField } from '@/components/form/SelectField'
import { Switch } from '@/components/form/Switch'
import { TextField } from '@/components/form/TextField'
import { isAllAccess, pickAccess, USER_ROLES, withAllOption } from '../../userModel'

/**
 * Create / edit user: who they are and what they can see.
 * Geography and catalogue access narrow what the mobile app shows them.
 */
export function UserForm({ form, errors, onChange, editing, userOptions, regions, cities, routes, categories, brands }) {
  const set = (field) => (value) => onChange(field, value)
  const allRegions = isAllAccess(form.regionIds)
  const allCities = isAllAccess(form.cityIds)
  const cityOptions = withAllOption(
    'All cities',
    cities.filter((c) => allRegions || form.regionIds.includes(c.regionId)).map((c) => ({ value: c.id, label: c.name })),
  )
  const routeOptions = withAllOption(
    'All routes',
    routes
      .filter((r) => {
        if (!allCities) return form.cityIds.includes(r.cityId)
        if (!allRegions) return form.regionIds.includes(cities.find((c) => c.id === r.cityId)?.regionId)
        return true
      })
      .map((r) => ({ value: r.id, label: r.name, hint: cities.find((c) => c.id === r.cityId)?.name })),
  )

  return (
    <div className="space-y-5">
      <FormSection title="General Details" description="The mobile number is how this person signs in.">
        <TextField id="usr-name" label="Name" required size="md" placeholder="Name of user" value={form.name} onChange={(e) => onChange('name', e.target.value)} error={errors.name} />
        <TextField
          id="usr-mobile"
          label="Mobile"
          required
          size="md"
          inputMode="numeric"
          maxLength={10}
          placeholder="Mobile"
          value={form.mobile}
          onChange={(e) => onChange('mobile', e.target.value.replace(/\D/g, ''))}
          error={errors.mobile}
        />
        <SelectField id="usr-role" label="Role" required placeholder="Select user" options={USER_ROLES} value={form.role} onChange={set('role')} error={errors.role} />
        <TextField id="usr-email" label="Email" size="md" type="email" placeholder="Email address" value={form.email} onChange={(e) => onChange('email', e.target.value)} error={errors.email} />
        <TextField
          id="usr-password"
          label={editing ? 'New password' : 'Password'}
          required={!editing}
          size="md"
          type="password"
          autoComplete="new-password"
          placeholder={editing ? 'Leave blank to keep the current one' : 'Enter password'}
          value={form.password}
          onChange={(e) => onChange('password', e.target.value)}
          error={errors.password}
        />
        <TextField
          id="usr-confirm"
          label="Confirm password"
          required={!editing}
          size="md"
          type="password"
          autoComplete="new-password"
          placeholder="Confirm password"
          value={form.confirmPassword}
          onChange={(e) => onChange('confirmPassword', e.target.value)}
          error={errors.confirmPassword}
        />
        <TextField id="usr-designation" label="Designation" size="md" placeholder="Designation" value={form.designation} onChange={(e) => onChange('designation', e.target.value)} />
        <SelectField
          id="usr-reporting"
          label="Reporting To"
          placeholder="Select user"
          clearable
          options={userOptions}
          value={form.reportingTo}
          onChange={set('reportingTo')}
          error={errors.reportingTo}
        />
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-semibold text-ink">Status</p>
          <Switch
            id="usr-status"
            checked={form.status === 'ACTIVE'}
            onCheckedChange={(on) => onChange('status', on ? 'ACTIVE' : 'INACTIVE')}
            label={form.status === 'ACTIVE' ? 'Active — can sign in' : 'Inactive — cannot sign in'}
          />
        </div>
      </FormSection>

      <FormSection title="Geographical Access Details" description="Pick “All …” (or leave a box empty) for access to everything at that level.">
        <MultiSelect
          id="usr-regions"
          label="Select Region"
          className="sm:col-span-2"
          placeholder="Select Region"
          value={form.regionIds}
          onChange={(next) => {
            const picked = pickAccess(next)
            onChange('regionIds', picked)
            // Drop cities that are no longer inside the chosen regions.
            onChange('cityIds', isAllAccess(picked) ? form.cityIds : form.cityIds.filter((id) => picked.includes(cities.find((c) => c.id === id)?.regionId)))
          }}
          options={withAllOption('All regions', regions.map((r) => ({ value: r.id, label: r.name })))}
        />
        <MultiSelect id="usr-cities" label="Select City" className="sm:col-span-2" placeholder="Select City" value={form.cityIds} onChange={(next) => onChange('cityIds', pickAccess(next))} options={cityOptions} />
        <MultiSelect id="usr-routes" label="Select Route" className="sm:col-span-2" placeholder="Select Route" value={form.routeIds} onChange={(next) => onChange('routeIds', pickAccess(next))} options={routeOptions} />
      </FormSection>

      <FormSection title="Other Access Details" description="Which part of the catalogue this user can sell.">
        <MultiSelect
          id="usr-categories"
          label="Category"
          placeholder="All categories"
          value={form.categories}
          onChange={set('categories')}
          options={categories.map((c) => ({ value: c, label: c }))}
        />
        <MultiSelect id="usr-brands" label="Brand" placeholder="All brands" value={form.brands} onChange={set('brands')} options={brands.map((b) => ({ value: b, label: b }))} />
      </FormSection>
    </div>
  )
}
