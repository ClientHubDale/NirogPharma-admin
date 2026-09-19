import { MultiSelect } from '@/components/form/MultiSelect'
import { SelectField } from '@/components/form/SelectField'
import { TextField } from '@/components/form/TextField'
import { AMOUNT_DISCOUNT_TYPES, AMOUNT_SCOPES, QTY_DISCOUNT_TYPES } from '../../schemeModel'
import { TierEditor } from '../TierEditor'

const digits = (v) => v.replace(/\D/g, '')
const decimal = (v) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')

/** Buy N of one product, get M of another (or same) free / discounted. */
export function BuyXGetYFields({ form, errors, onChange, itemOptions }) {
  return (
    <>
      <SelectField
        id="scheme-buy-item"
        label="Buy product"
        required
        placeholder="Search to add"
        options={itemOptions}
        value={form.buyItemId}
        onChange={(v) => onChange('buyItemId', v)}
        error={errors.buyItemId}
      />
      <TextField
        id="scheme-buy-qty"
        label="Buy qty"
        required
        size="md"
        inputMode="numeric"
        value={form.buyQty}
        onChange={(e) => onChange('buyQty', digits(e.target.value))}
        error={errors.buyQty}
      />
      <SelectField
        id="scheme-get-item"
        label="Get product (free item)"
        required
        placeholder="Search to add"
        options={itemOptions}
        value={form.getItemId}
        onChange={(v) => onChange('getItemId', v)}
        error={errors.getItemId}
        labelAction={
          form.buyItemId && form.getItemId !== form.buyItemId ? (
            <button
              type="button"
              onClick={() => onChange('getItemId', form.buyItemId)}
              className="text-sm font-semibold text-green-deep hover:underline hover:underline-offset-4"
            >
              Same as buy product
            </button>
          ) : null
        }
      />
      <TextField
        id="scheme-get-qty"
        label="Get qty"
        required
        size="md"
        inputMode="numeric"
        value={form.getQty}
        onChange={(e) => onChange('getQty', digits(e.target.value))}
        error={errors.getQty}
      />
      <TextField
        id="scheme-free-pct"
        label="Discount % on the free item (100 = fully free)"
        size="md"
        inputMode="decimal"
        suffix={<span className="flex h-full items-center border-l border-mint-pale bg-bg px-3.5 text-sm text-ink-muted">%</span>}
        value={form.freeDiscountPct}
        onChange={(e) => onChange('freeDiscountPct', decimal(e.target.value))}
        error={errors.freeDiscountPct}
      />
    </>
  )
}

/** Per-unit discount by quantity bracket, on a set of products. */
export function TieredFields({ form, errors, onChange, itemOptions }) {
  return (
    <>
      <MultiSelect
        id="scheme-products"
        label="Product set"
        required
        placeholder="Search item or product to add"
        options={itemOptions}
        value={form.productIds}
        onChange={(v) => onChange('productIds', v)}
        error={errors.productIds}
      />
      <SelectField
        id="scheme-discount-type"
        label="Discount type"
        required
        searchable={false}
        options={QTY_DISCOUNT_TYPES}
        value={form.discountType}
        onChange={(v) => onChange('discountType', v)}
      />
      <TierEditor
        tiers={form.tiers}
        onChange={(tiers) => onChange('tiers', tiers)}
        discountType={form.discountType}
        errors={errors.tiers}
        generalError={errors.tiersGeneral}
      />
    </>
  )
}

/** Spend at least ₹N (cart or product set), get a flat or % discount. */
export function AmountFields({ form, errors, onChange, itemOptions }) {
  const percent = form.discountType === 'PERCENT'
  return (
    <>
      <SelectField
        id="scheme-scope"
        label="Amount counts across"
        required
        searchable={false}
        options={AMOUNT_SCOPES}
        value={form.scope}
        onChange={(v) => onChange('scope', v)}
      />
      {form.scope === 'PRODUCTS' ? (
        <MultiSelect
          id="scheme-products"
          label="Product set"
          required
          placeholder="Search item or product to add"
          options={itemOptions}
          value={form.productIds}
          onChange={(v) => onChange('productIds', v)}
          error={errors.productIds}
        />
      ) : (
        <div className="hidden sm:block" />
      )}
      <TextField
        id="scheme-min-spend"
        label="Minimum spend amount"
        required
        size="md"
        prefix="₹"
        inputMode="decimal"
        placeholder="e.g. 25000"
        value={form.minSpend}
        onChange={(e) => onChange('minSpend', decimal(e.target.value))}
        error={errors.minSpend}
      />
      <SelectField
        id="scheme-amount-discount-type"
        label="Discount type"
        required
        searchable={false}
        options={AMOUNT_DISCOUNT_TYPES}
        value={form.discountType}
        onChange={(v) => onChange('discountType', v)}
      />
      <TextField
        id="scheme-discount-value"
        label={percent ? 'Discount (%)' : 'Discount amount'}
        required
        size="md"
        prefix={percent ? undefined : '₹'}
        suffix={percent ? <span className="flex h-full items-center border-l border-mint-pale bg-bg px-3.5 text-sm text-ink-muted">%</span> : undefined}
        inputMode="decimal"
        placeholder={percent ? 'e.g. 10' : 'e.g. 750'}
        value={form.discountValue}
        onChange={(e) => onChange('discountValue', decimal(e.target.value))}
        error={errors.discountValue}
      />
      {percent && (
        <TextField
          id="scheme-max-discount"
          label="Maximum discount (optional)"
          size="md"
          prefix="₹"
          inputMode="decimal"
          placeholder="No cap"
          value={form.maxDiscount}
          onChange={(e) => onChange('maxDiscount', decimal(e.target.value))}
          error={errors.maxDiscount}
        />
      )}
    </>
  )
}
