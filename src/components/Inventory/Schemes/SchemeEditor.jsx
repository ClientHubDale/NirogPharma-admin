import { useMemo, useState } from 'react'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChoiceCards } from '@/components/form/ChoiceCards'
import { DateRangeField } from '@/components/form/DateRangeField'
import { FormSection } from '@/components/form/FormSection'
import { SelectField } from '@/components/form/SelectField'
import { Switch } from '@/components/form/Switch'
import { TextField } from '@/components/form/TextField'
import { AmountFields, BuyXGetYFields, TieredFields } from '@/components/Inventory/Schemes/components/SchemeFields'
import {
  describeScheme,
  emptySchemeForm,
  formToScheme,
  SCHEME_TYPE_LABEL,
  SCHEME_TYPES,
  schemeToForm,
  STACKABLE_OPTIONS,
  validateSchemeForm,
} from '@/components/Inventory/Schemes/schemeModel'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/format'
import { PARTY_GROUPS } from '@/mocks/parties'
import { selectItems } from '@/store/itemsSlice'
import { schemeSaved, selectSchemes } from '@/store/schemesSlice'

const BASE = '/admin/inventory/schemes'

/** Field → element id, to focus the first invalid field on Save. */
const FIELD_IDS = {
  name: 'scheme-name',
  priority: 'scheme-priority',
  window: 'scheme-window-start',
  buyItemId: 'scheme-buy-item',
  buyQty: 'scheme-buy-qty',
  getItemId: 'scheme-get-item',
  getQty: 'scheme-get-qty',
  freeDiscountPct: 'scheme-free-pct',
  productIds: 'scheme-products',
  minSpend: 'scheme-min-spend',
  discountValue: 'scheme-discount-value',
  maxDiscount: 'scheme-max-discount',
}

function initialForm(schemes, schemeId, duplicateOf) {
  if (schemeId) {
    const existing = schemes.find((s) => s.id === schemeId)
    return existing ? schemeToForm(existing) : null
  }
  if (duplicateOf) {
    const source = schemes.find((s) => s.id === duplicateOf)
    if (source) return { ...schemeToForm(source), name: `${source.name} (copy)`, status: 'ACTIVE' }
  }
  return emptySchemeForm()
}

function SchemeEditorForm({ schemeId, state }) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const schemes = useSelector(selectSchemes)
  const items = useSelector(selectItems)

  const [form, setForm] = useState(() => initialForm(schemes, schemeId, state?.duplicateOf))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const itemsById = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])
  const itemOptions = useMemo(
    () =>
      items
        .filter((i) => i.status === 'ACTIVE' || form?.productIds?.includes(i.id) || [form?.buyItemId, form?.getItemId].includes(i.id))
        .map((i) => ({ value: i.id, label: i.name, hint: `${i.code || 'No code'} · ${formatPrice(i.sellPrice)} / ${i.unit}` })),
    [items, form?.productIds, form?.buyItemId, form?.getItemId],
  )

  if (!form) return <Navigate to={BASE} replace />

  const editing = Boolean(schemeId)
  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field] || (field === 'tiers' && errors.tiers) || ((field === 'startDate' || field === 'endDate') && errors.window))
      setErrors((e) => ({ ...e, [field]: undefined, ...(field === 'tiers' && { tiers: undefined, tiersGeneral: undefined }) }))
  }

  // Live one-line preview; hidden until the chosen type has enough to describe.
  let preview = ''
  try {
    const draft = formToScheme(form, 'preview')
    const ready =
      (form.type === 'BUY_X_GET_Y' && form.buyItemId && form.getItemId && form.buyQty && form.getQty) ||
      (form.type === 'TIERED_QTY' && form.productIds.length && form.tiers.every((t) => t.min && t.value)) ||
      (form.type === 'AMOUNT' && form.minSpend && form.discountValue)
    if (ready) preview = describeScheme(draft, itemsById)
  } catch {
    preview = ''
  }

  const save = async () => {
    const found = validateSchemeForm(form, { schemes, editingId: schemeId })
    setErrors(found)
    const first = Object.keys(found).find((k) => found[k])
    if (first) {
      const el = document.getElementById(FIELD_IDS[first]) ?? document.querySelector('[aria-invalid="true"]')
      el?.focus()
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    setSaving(true)
    await new Promise((r) => setTimeout(r, 400)) // mock network
    const id = schemeId ?? `sch-${Date.now()}`
    const scheme = formToScheme(form, id)
    dispatch(schemeSaved(scheme))
    navigate(BASE, {
      state: { highlightId: id, notice: { tone: 'success', message: `${scheme.name} ${editing ? 'updated' : 'created'}.` } },
    })
  }

  const TypeFields = { BUY_X_GET_Y: BuyXGetYFields, TIERED_QTY: TieredFields, AMOUNT: AmountFields }[form.type]

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
      className="mx-auto max-w-6xl space-y-5"
    >
      {/* Sticky title bar with the actions, like the reference. */}
      <div className="sticky top-16 z-10 -mx-4 flex flex-col gap-3 border-b border-mint-pale bg-bg/90 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:border sm:bg-white/90 sm:px-5">
        <div className="min-w-0">
          <Link to={BASE} className="inline-flex items-center gap-1 text-xs font-semibold text-green-deep hover:underline">
            <ArrowLeft className="size-3.5" /> Schemes
          </Link>
          <h1 className="truncate text-2xl font-extrabold sm:text-3xl">{editing ? 'Edit scheme' : 'Create New Scheme'}</h1>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="lg" className="flex-1 sm:flex-none" onClick={() => navigate(BASE)}>
            Cancel
          </Button>
          <Button type="submit" size="lg" className="flex-1 sm:flex-none" disabled={saving}>
            {saving && <Loader2 className="animate-spin" data-icon="inline-start" />}
            {editing ? 'Save changes' : 'Create Scheme'}
          </Button>
        </div>
      </div>

      <ChoiceCards
        label="Scheme type"
        options={SCHEME_TYPES}
        value={form.type}
        onChange={(type) => {
          setForm((f) => ({ ...f, type, discountType: f.discountType || 'FLAT' }))
          setErrors({})
        }}
        disabled={editing}
      />
      {editing && <p className="-mt-2 text-xs text-ink-muted">The type can’t be changed after a scheme is created — duplicate it instead.</p>}

      <FormSection title="Scheme details">
        <TextField
          id="scheme-name"
          label="Scheme name"
          required
          size="md"
          placeholder="e.g. Buy 10 Paracetamol, get 1 free"
          maxLength={80}
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          error={errors.name}
        />
        <SelectField
          id="scheme-party-group"
          label="Party group"
          options={PARTY_GROUPS}
          value={form.partyGroup}
          onChange={(v) => set('partyGroup', v)}
        />
        <div className="grid grid-cols-1 gap-5 sm:col-span-2 lg:grid-cols-3">
          <TextField
            id="scheme-priority"
            label="Priority (lower runs first)"
            size="md"
            inputMode="numeric"
            value={form.priority}
            onChange={(e) => set('priority', e.target.value.replace(/\D/g, ''))}
            error={errors.priority}
          />
          <SelectField
            id="scheme-stackable"
            label="Stackable"
            searchable={false}
            options={STACKABLE_OPTIONS}
            value={form.stackable}
            onChange={(v) => set('stackable', v)}
          />
          <DateRangeField
            id="scheme-window"
            label="Active window"
            required
            start={form.startDate}
            end={form.endDate}
            onChange={({ start, end }) => {
              setForm((f) => ({ ...f, startDate: start, endDate: end }))
              if (errors.window) setErrors((e) => ({ ...e, window: undefined }))
            }}
            error={errors.window}
          />
        </div>
        <Switch
          id="scheme-active"
          checked={form.status === 'ACTIVE'}
          onCheckedChange={(checked) => set('status', checked ? 'ACTIVE' : 'INACTIVE')}
          label={form.status === 'ACTIVE' ? 'Active — applies to new orders' : 'Inactive — saved but not applied'}
          className="sm:col-span-2"
        />
      </FormSection>

      <FormSection title={`${SCHEME_TYPE_LABEL[form.type]} rules`}>
        <TypeFields form={form} errors={errors} onChange={set} itemOptions={itemOptions} />
      </FormSection>

      <div
        aria-live="polite"
        className="flex items-start gap-3 rounded-2xl border border-mint bg-mint-pale p-4 text-sm text-forest"
      >
        <Sparkles className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-semibold">Preview</p>
          <p className="mt-0.5">{preview || 'Fill in the rules above to see what this scheme will do.'}</p>
        </div>
      </div>
    </form>
  )
}

/** Remount per scheme so moving between edit pages never shows the previous form. */
export default function SchemeEditor() {
  const { schemeId } = useParams()
  const { state } = useLocation()
  return <SchemeEditorForm key={schemeId ?? `new-${state?.duplicateOf ?? ''}`} schemeId={schemeId} state={state} />
}
