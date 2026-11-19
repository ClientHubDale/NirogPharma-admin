import { MultiSelect } from '@/components/form/MultiSelect'
import { SelectField } from '@/components/form/SelectField'
import { TextField } from '@/components/form/TextField'
import { AMOUNT_SCOPES, DISCOUNT_TYPES, REPEAT_OPTIONS } from '../../schemeModel'

const decimal = (v) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')

/**
 * What earns the scheme.
 *
 * Only the chosen trigger's fields are shown. Everything about *what they get*
 * lives in the slabs below, so this stays short whichever trigger is picked.
 */
export function TriggerFields({ form, errors, onChange, itemOptions }) {
  if (form.trigger === 'ITEM_QTY') {
    return (
      <>
        <MultiSelect
          id="scheme-buy-items"
          label="Which product earns it"
          required
          placeholder="Search a product to add"
          options={itemOptions}
          value={form.buyItemIds}
          onChange={(v) => onChange('buyItemIds', v)}
          error={errors.buyItemIds}
        />
        {/* A single rung can repeat — "24 की पेटी लेगा तो 5 पीस" twice over for
            two boxes. Brackets cannot, so the choice disappears once there is
            more than one rung rather than sitting there lying. */}
        {form.slabs.length === 1 ? (
          <SelectField
            id="scheme-repeats"
            label="Does it repeat?"
            searchable={false}
            options={REPEAT_OPTIONS}
            value={form.repeats}
            onChange={(v) => onChange('repeats', v)}
          />
        ) : (
          <div className="hidden sm:block" />
        )}
      </>
    )
  }

  return (
    <>
      <SelectField
        id="scheme-scope"
        label="The amount counts across"
        required
        searchable={false}
        options={AMOUNT_SCOPES}
        value={form.scope}
        onChange={(v) => onChange('scope', v)}
      />
      {form.scope === 'PRODUCTS' ? (
        <MultiSelect
          id="scheme-products"
          label="Which products count"
          required
          placeholder="Search a product to add"
          options={itemOptions}
          value={form.productIds}
          onChange={(v) => onChange('productIds', v)}
          error={errors.productIds}
        />
      ) : (
        <div className="hidden sm:block" />
      )}
    </>
  )
}

/**
 * How the money-off reward is measured. A free-item reward needs nothing here
 * — the item and its quantity belong to the slab that gives it.
 */
export function RewardFields({ form, errors, onChange }) {
  if (form.reward !== 'DISCOUNT') return null
  const percent = form.discountType === 'PERCENT'

  return (
    <>
      <SelectField
        id="scheme-discount-type"
        label="Discount measured in"
        required
        searchable={false}
        options={DISCOUNT_TYPES}
        value={form.discountType}
        onChange={(v) => onChange('discountType', v)}
      />
      {percent ? (
        <TextField
          id="scheme-max-discount"
          label="Most it can ever take off (optional)"
          size="md"
          prefix="₹"
          inputMode="decimal"
          placeholder="No cap"
          value={form.maxDiscount}
          onChange={(e) => onChange('maxDiscount', decimal(e.target.value))}
          error={errors.maxDiscount}
        />
      ) : (
        <div className="hidden sm:block" />
      )}
    </>
  )
}
