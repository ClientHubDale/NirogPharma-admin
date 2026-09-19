import { useState } from 'react'
import { Plus } from 'lucide-react'
import { FormSection } from '@/components/form/FormSection'
import { ImageUploader } from '@/components/form/ImageUploader'
import { InlineSelect } from '@/components/form/InlineSelect'
import { QuickAdd } from '@/components/form/QuickAdd'
import { SelectField } from '@/components/form/SelectField'
import { Switch } from '@/components/form/Switch'
import { TextAreaField } from '@/components/form/TextAreaField'
import { TextField } from '@/components/form/TextField'
import { CESS_RATES, DISCOUNT_TYPES, GST_RATES, TAX_MODES, UNITS, WAREHOUSES } from '@/mocks/items'

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
 * Create / edit item fields — General, Price and Stock details.
 * Controlled: `form` + `onChange(field, value)`; `errors` from validateItemForm.
 */
export function ItemForm({ form, errors, onChange, categories, brands, onAddCategory, onAddBrand, onImageError }) {
  const [adding, setAdding] = useState(null) // 'category' | 'brand' | null
  const set = (field) => (e) => onChange(field, e.target.value)
  const setNumber = (field) => (e) => onChange(field, e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))
  const setDigits = (field) => (e) => onChange(field, e.target.value.replace(/\D/g, ''))
  const unitLabel = form.unit || 'Unit'
  // Always offer the item's current value, even if it isn't in the list yet.
  const withCurrent = (list, current) => (current && !list.includes(current) ? [...list, current] : list)
  const categoryOptions = withCurrent(categories, form.category).map((c) => ({ value: c, label: c }))
  const brandOptions = withCurrent(brands, form.brand).map((b) => ({ value: b, label: b }))

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

        <TextField
          id="item-sell-price"
          label="Sell price"
          required
          size="md"
          prefix="₹"
          placeholder="Sale price"
          {...NUMERIC}
          value={form.sellPrice}
          onChange={setNumber('sellPrice')}
          error={errors.sellPrice}
          suffix={
            <InlineSelect
              aria-label="Sell price tax"
              value={form.sellTaxMode}
              onChange={(v) => onChange('sellTaxMode', v)}
              options={TAX_MODES}
            />
          }
        />

        <TextField
          id="item-code"
          label="Item Code"
          size="md"
          placeholder="Item code"
          value={form.code}
          onChange={set('code')}
          error={errors.code}
        />

        <TextField
          id="item-erp-id"
          label="ERP ID"
          size="md"
          placeholder="ID in Tally / ERP (optional)"
          value={form.erpId}
          onChange={set('erpId')}
        />

        <TextAreaField
          id="item-description"
          label="Item Description"
          placeholder="Item description"
          rows={2}
          value={form.description}
          onChange={set('description')}
          className="sm:col-span-2"
        />

        <div>
          {adding === 'category' ? (
            <>
              <p className="mb-2 text-sm font-semibold text-ink">New category</p>
              <QuickAdd
                existing={categories}
                placeholder="Category name"
                onCancel={() => setAdding(null)}
                onAdd={(name) => {
                  onAddCategory(name)
                  onChange('category', name)
                  setAdding(null)
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
              onChange={(v) => onChange('category', v)}
              labelAction={<NewButton label="Add category" onClick={() => setAdding('category')} />}
            />
          )}
        </div>

        <div>
          {adding === 'brand' ? (
            <>
              <p className="mb-2 text-sm font-semibold text-ink">New brand</p>
              <QuickAdd
                existing={brands}
                placeholder="Brand name"
                onCancel={() => setAdding(null)}
                onAdd={(name) => {
                  onAddBrand(name)
                  onChange('brand', name)
                  setAdding(null)
                }}
              />
            </>
          ) : (
            <SelectField
              id="item-brand"
              label="Brand"
              placeholder="Select brand"
              clearable
              options={brandOptions}
              value={form.brand}
              onChange={(v) => onChange('brand', v)}
              labelAction={<NewButton label="Add brand" onClick={() => setAdding('brand')} />}
            />
          )}
        </div>

        <ImageUploader images={form.images} onChange={(images) => onChange('images', images)} onError={onImageError} />
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
        <TextField
          id="item-purchase-price"
          label="Purchase price"
          size="md"
          prefix="₹"
          placeholder="Purchase price"
          {...NUMERIC}
          value={form.purchasePrice}
          onChange={setNumber('purchasePrice')}
          error={errors.purchasePrice}
          suffix={
            <InlineSelect
              aria-label="Purchase price tax"
              value={form.purchaseTaxMode}
              onChange={(v) => onChange('purchaseTaxMode', v)}
              options={TAX_MODES}
            />
          }
        />

        <div className="grid grid-cols-1 gap-5 sm:col-span-2 sm:grid-cols-3">
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
          <SelectField
            id="item-gst"
            label="GST %"
            placeholder="Select tax"
            searchable={false}
            options={GST_RATES}
            value={form.gst}
            onChange={(v) => onChange('gst', v)}
          />
          <SelectField
            id="item-cess"
            label="Cess %"
            placeholder="Select cess"
            searchable={false}
            options={CESS_RATES}
            value={form.cess}
            onChange={(v) => onChange('cess', v)}
          />
        </div>

        <TextField
          id="item-discount"
          label="Discount"
          size="md"
          placeholder="Discount"
          {...NUMERIC}
          value={form.discount}
          onChange={setNumber('discount')}
          error={errors.discount}
          suffix={
            <InlineSelect
              aria-label="Discount type"
              value={form.discountType}
              onChange={(v) => onChange('discountType', v)}
              options={DISCOUNT_TYPES}
            />
          }
        />
        <TextField
          id="item-offer"
          label="Offer text"
          size="md"
          placeholder="e.g. 10 + 1 free"
          maxLength={60}
          value={form.offerText}
          onChange={set('offerText')}
        />
      </FormSection>

      <FormSection title="Stock Details">
        <TextField
          id="item-stock"
          label="Opening stock"
          size="md"
          placeholder="Opening stock"
          inputMode="numeric"
          value={form.stock}
          onChange={setDigits('stock')}
          error={errors.stock}
          suffix={<span className="flex h-full items-center border-l border-mint-pale bg-bg px-3.5 text-sm font-medium text-ink-muted">{unitLabel}</span>}
        />
        <TextField
          id="item-opening-stock-date"
          label="Opening stock date"
          size="md"
          type="date"
          max={new Date().toISOString().slice(0, 10)}
          value={form.openingStockDate}
          onChange={set('openingStockDate')}
          error={errors.openingStockDate}
        />
        <SelectField
          id="item-warehouse"
          label="Warehouse"
          placeholder="Select warehouse"
          options={WAREHOUSES}
          value={form.warehouseId}
          onChange={(v) => onChange('warehouseId', v)}
          error={errors.warehouseId}
        />
        <TextField
          id="item-weight"
          label="Weight"
          size="md"
          placeholder="e.g. 100 g"
          maxLength={20}
          value={form.weight}
          onChange={set('weight')}
        />
        <SelectField
          id="item-secondary-unit"
          label="Secondary unit"
          placeholder="e.g. BOX (optional)"
          clearable
          options={UNITS.filter((u) => u.value !== form.unit)}
          value={form.secondaryUnit}
          onChange={(v) => {
            onChange('secondaryUnit', v)
            if (!v) onChange('conversionFactor', '')
          }}
          error={errors.secondaryUnit}
        />
        <TextField
          id="item-conversion"
          label={form.secondaryUnit ? `1 ${form.secondaryUnit} contains` : 'Multiplier'}
          size="md"
          placeholder={form.secondaryUnit ? 'e.g. 10' : 'Pick a secondary unit first'}
          inputMode="numeric"
          disabled={!form.secondaryUnit}
          value={form.conversionFactor}
          onChange={setDigits('conversionFactor')}
          error={errors.conversionFactor}
          suffix={<span className="flex h-full items-center border-l border-mint-pale bg-bg px-3.5 text-sm font-medium text-ink-muted">{unitLabel}</span>}
        />
      </FormSection>
    </>
  )
}
