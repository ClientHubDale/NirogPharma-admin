import { useState } from 'react'
import { Plus } from 'lucide-react'
import { FormSection } from '@/components/form/FormSection'
import { ImageUploader } from '@/components/form/ImageUploader'
import { QuickAdd } from '@/components/form/QuickAdd'
import { SelectField } from '@/components/form/SelectField'
import { Switch } from '@/components/form/Switch'
import { TextAreaField } from '@/components/form/TextAreaField'
import { TextField } from '@/components/form/TextField'
import { SchemeFields } from './SchemeFields'
import { TierPrices } from './TierPrices'
import { useGifts } from '@/hooks/useGifts'
import { usePriceTiers } from '@/hooks/usePriceTiers'
import { QUANTITY_UNITS, UNITS, quantityUnitFor } from '@/mocks/items'

const NUMERIC = { inputMode: 'decimal', autoComplete: 'off' }

function NewButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-sm font-semibold text-green-deep hover:underline hover:underline-offset-4"
      aria-label={label}
    >
      <Plus className="size-3.5" /> New
    </button>
  )
}

/**
 * Create / edit item fields — General and Price details.
 * Controlled: `form` + `onChange(field, value)`; `errors` from validateItemForm.
 *
 * The client dropped sell price, item code, ERP ID, purchase price, cess and
 * discount on 8 Oct: a distributor's price comes from the rate columns and the
 * counter price is the MRP, so there is nothing for the other prices to do.
 * Stock details went the same way on 13 Oct — opening stock, batches and
 * warehouses belong to the stock module, not to creating a product.
 */
export function ItemForm({ form, errors, onChange, categories, categoryUnits, items = [], onAddCategory, onAddTier, onRemoveTier, onAddGift, onImageError }) {
  const [adding, setAdding] = useState(false) // adding a category
  const priceTiers = usePriceTiers()
  const gifts = useGifts()
  const set = (field) => (e) => onChange(field, e.target.value)
  const setNumber = (field) => (e) => onChange(field, e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))
  const setDigits = (field) => (e) => onChange(field, e.target.value.replace(/\D/g, ''))
  // Always offer the item's current value, even if it isn't in the list yet.
  const withCurrent = (list, current) => (current && !list.includes(current) ? [...list, current] : list)
  const categoryOptions = withCurrent(categories, form.category).map((c) => ({ value: c, label: c }))
  // How much is in one pack is counted differently per category: ml, capsules,
  // grams. Picking a category sets the unit; the item carries it from then on.
  const unitOf = (category) => quantityUnitFor(category, categoryUnits)
  const quantityUnit = form.quantityUnit || unitOf(form.category)
  const chooseCategory = (category, unit) => {
    onChange('category', category)
    onChange('quantityUnit', unit ?? unitOf(category))
  }

  return (
    <>
      <FormSection title="General Details">
        <div className="sm:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <TextField
              id="item-name"
              label="Item Name"
              required
              size="md"
              placeholder="Name of item"
              value={form.name}
              onChange={set('name')}
              error={errors.name}
              className="flex-1"
            />
            <Switch
              id="item-active"
              checked={form.status === 'ACTIVE'}
              onCheckedChange={(checked) => onChange('status', checked ? 'ACTIVE' : 'DRAFT')}
              label={form.status === 'ACTIVE' ? 'Active' : 'Draft'}
              className={errors.name ? 'sm:mb-8' : 'sm:mb-2.5'}
            />
          </div>
        </div>

        <SelectField
          id="item-unit"
          label="Unit"
          required
          placeholder="Select unit"
          options={UNITS}
          value={form.unit}
          onChange={(v) => onChange('unit', v)}
          error={errors.unit}
        />

        <div>
          {adding ? (
            <>
              <p className="mb-2 text-sm font-semibold text-ink">New category</p>
              <QuickAdd
                existing={categories}
                placeholder="Category name"
                extraOptions={QUANTITY_UNITS}
                extraLabel="Quantity unit"
                extraPlaceholder="Qty in"
                onCancel={() => setAdding(false)}
                onAdd={(name, unit) => {
                  onAddCategory(name, unit)
                  chooseCategory(name, unit)
                  setAdding(false)
                }}
              />
            </>
          ) : (
            <SelectField
              id="item-category"
              label="Category"
              placeholder="Select category"
              clearable
              options={categoryOptions}
              value={form.category}
              onChange={(v) => chooseCategory(v)}
              labelAction={<NewButton label="Add category" onClick={() => setAdding(true)} />}
            />
          )}
        </div>

        {/* Replaced Brand (client, 8 Oct): everything is Nirog, and what they
            need on the item is how much is in one pack. */}
        <TextField
          id="item-quantity"
          label="Quantity"
          size="md"
          placeholder={quantityUnit ? `Quantity in ${quantityUnit}` : 'Pick a category first'}
          {...NUMERIC}
          value={form.quantity}
          onChange={setNumber('quantity')}
          error={errors.quantity}
          suffix={
            <span className="flex h-full items-center border-l border-mint-pale bg-bg px-3.5 text-sm font-medium text-ink-muted">
              {quantityUnit || '—'}
            </span>
          }
        />

        {/* The client's "box packing" — typed free-hand ("1X48X200ML",
            "1 box = 48 bottles"). It is stored in the item's description. */}
        <TextAreaField
          id="item-box-packing"
          label="Box Packing"
          placeholder="e.g. 1X48X200ML  ·  1 box = 48 bottles"
          rows={2}
          value={form.description}
          onChange={set('description')}
          className="sm:col-span-2"
        />

        <ImageUploader
          label="Upload Product Image"
          images={form.images}
          onChange={(images) => onChange('images', images)}
          onError={onImageError}
        />
      </FormSection>

      <FormSection title="Price Details">
        <TextField
          id="item-mrp"
          label="MRP"
          size="md"
          prefix="₹"
          placeholder="MRP"
          {...NUMERIC}
          value={form.mrp}
          onChange={setNumber('mrp')}
          error={errors.mrp}
        />
        <TierPrices
          mrp={form.mrp}
          flat={form.flatTierPricing}
          tierPrices={form.tierPrices}
          tiers={priceTiers}
          onChange={(next) => onChange('tierPrices', next)}
          onFlatChange={(on) => onChange('flatTierPricing', on)}
          onAddTier={onAddTier}
          onRemoveTier={onRemoveTier}
        />

        <div className="grid grid-cols-1 gap-5 sm:col-span-2 sm:grid-cols-2">
          <TextField
            id="item-hsn"
            label="HSN Code"
            size="md"
            placeholder="HSN code"
            inputMode="numeric"
            maxLength={8}
            value={form.hsn}
            onChange={setDigits('hsn')}
            error={errors.hsn}
          />
          {/* Typed, not picked: the client uses rates that are not on any
              short list, and the % is added for them. */}
          <TextField
            id="item-gst"
            label="GST"
            size="md"
            placeholder="e.g. 12"
            {...NUMERIC}
            value={form.gst}
            onChange={setNumber('gst')}
            error={errors.gst}
            suffix={
              <span className="flex h-full items-center border-l border-mint-pale bg-bg px-3.5 text-sm font-medium text-ink-muted">
                %
              </span>
            }
          />
        </div>

        <SchemeFields form={form} errors={errors} items={items} gifts={gifts} onChange={onChange} onAddGift={onAddGift} />
      </FormSection>

    </>
  )
}
