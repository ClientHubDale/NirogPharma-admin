import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { FormSection } from '@/components/form/FormSection'
import { Switch } from '@/components/form/Switch'
import { TextField } from '@/components/form/TextField'
import { KindPicker } from '@/components/Inventory/Schemes/components/KindPicker'
import { RewardFields, TriggerFields } from '@/components/Inventory/Schemes/components/SchemeFields'
import { SlabEditor } from '@/components/Inventory/Schemes/components/SlabEditor'
import {
  describeScheme,
  emptySchemeForm,
  endAfterMonths,
  formToScheme,
  kindOf,
  presetFor,
  schemeToForm,
  splitKind,
  validateSchemeForm,
  VALIDITY_PRESETS,
} from '@/components/Inventory/Schemes/schemeModel'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/common/Toast'
import { useGifts } from '@/hooks/useGifts'
import { useItems } from '@/hooks/useItems'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import { addGift as addGiftThunk } from '@/store/giftsSlice'
import { fetchSchemes, saveScheme, selectSchemes, selectSchemesStatus } from '@/store/schemesSlice'

const BASE = '/admin/inventory/schemes'

/** Field → element id, to put the cursor on the first thing that is wrong. */
const FIELD_IDS = {
  name: 'scheme-name',
  priority: 'scheme-priority',
  window: 'scheme-window-start',
  buyItemIds: 'scheme-buy-items',
  productIds: 'scheme-products',
  maxDiscount: 'scheme-max-discount',
  slabs: 'scheme-add-slab',
}

function initialForm(schemes, schemeId, state) {
  if (schemeId) {
    const existing = schemes.find((row) => row.id === schemeId)
    return existing ? schemeToForm(existing) : null
  }
  if (state?.duplicateOf) {
    const source = schemes.find((row) => row.id === state.duplicateOf)
    if (source) return { ...schemeToForm(source), name: `${source.name} (copy)`, status: 'ACTIVE' }
  }
  const blank = emptySchemeForm()
  // Opened from a product that has no scheme yet, so it is already filled in.
  if (state?.forItemId) return { ...blank, trigger: 'ITEM_QTY', buyItemIds: [state.forItemId] }
  return blank
}

function SchemeEditorForm({ schemeId, state }) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const toast = useToast()
  const schemes = useSelector(selectSchemes)
  const items = useItems()
  const gifts = useGifts()

  const [form, setForm] = useState(() => initialForm(schemes, schemeId, state))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const itemsById = useMemo(() => Object.fromEntries(items.map((row) => [row.id, row])), [items])
  const giftsById = useMemo(() => Object.fromEntries(gifts.map((row) => [row.id, row])), [gifts])

  const itemOptions = useMemo(() => {
    const live = items
      .filter((row) => row.status === 'ACTIVE' || form?.buyItemIds?.includes(row.id) || form?.productIds?.includes(row.id))
      .map((row) => ({ value: row.id, label: row.name, hint: `${row.code || 'No code'} · ${formatPrice(row.sellPrice)} / ${row.unit}` }))

    /**
     * A product the scheme names that is no longer in the catalogue.
     *
     * The picker only draws a chip for a value it has an option for, so
     * without this the id sits in the scheme invisibly — counting towards
     * nothing, impossible to remove, and showing up as "Unknown" in the
     * sentence. Named plainly, it can be taken off.
     */
    const known = new Set(items.map((row) => row.id))
    const missing = [...new Set([...(form?.buyItemIds ?? []), ...(form?.productIds ?? [])])]
      .filter((id) => !known.has(id))
      .map((id) => ({ value: id, label: 'Product no longer in the catalogue', hint: 'Remove it — it counts towards nothing' }))

    return [...live, ...missing]
  }, [items, form?.buyItemIds, form?.productIds])

  /**
   * What a slab can hand over: anything in the catalogue, which comes off our
   * own shelf, or a giveaway, which was never made or sold.
   */
  const freeOptions = useMemo(
    () => [
      ...items.map((row) => ({ value: `item:${row.id}`, label: row.name, unit: row.unit, hint: `Product · ${row.unit}` })),
      ...gifts
        .filter((row) => row.isActive !== false)
        .map((row) => ({ value: `gift:${row.id}`, label: row.name, unit: row.unit, hint: `Giveaway · ${row.unit}` })),
    ],
    [items, gifts],
  )

  /**
   * A kilo of sugar is not a product: it is not made, priced or stocked, so it
   * never belongs in the catalogue. It is a giveaway, and the moment somebody
   * needs one is while they are writing the scheme that hands it over — so it
   * is saved from right here rather than sending them to another screen.
   */
  const addGift = async ({ name, unit, image }) => {
    const result = await dispatch(addGiftThunk({ name, unit, image }))
    if (addGiftThunk.rejected.match(result)) return result.payload.message

    const { warning } = result.payload
    toast({
      tone: warning ? 'warning' : 'success',
      title: 'Giveaway added',
      description: warning ? `${name} · ${warning}` : `${name} · not from stock`,
    })
    return result.payload.gift
  }

  if (!form) return <Navigate to={BASE} replace />

  const editing = Boolean(schemeId)

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field] || (field === 'slabs' && errors.slabs)) {
      setErrors((e) => ({ ...e, [field]: undefined, ...(field === 'slabs' && { slabs: undefined, slabsGeneral: undefined }) }))
    }
  }

  /** How long it runs, without counting days out on a calendar. */
  const chosenPreset = presetFor(form.startDate, form.endDate)
  const setMonths = (months) => {
    setForm((f) => ({ ...f, endDate: endAfterMonths(f.startDate, months) }))
    if (errors.window) setErrors((e) => ({ ...e, window: undefined }))
  }

  // A live sentence, shown once there is enough typed to say anything at all.
  let preview = ''
  try {
    const ready =
      (form.trigger === 'ITEM_QTY' ? form.buyItemIds.length : form.scope === 'CART' || form.productIds.length) &&
      form.slabs.every((slab) => slab.min && (form.reward === 'FREE_ITEM' ? slab.freeRef : slab.value))
    if (ready) preview = describeScheme(formToScheme(form, 'preview'), itemsById, giftsById)
  } catch {
    preview = ''
  }

  const save = async () => {
    const found = validateSchemeForm(form, { schemes, editingId: schemeId })
    const broken = Object.keys(found).filter((key) => found[key])
    setErrors(found)
    if (broken.length) {
      const target = document.getElementById(FIELD_IDS[broken[0]]) ?? document.querySelector('[aria-invalid="true"]')
      target?.focus()
      target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }

    setSaving(true)
    const result = await dispatch(saveScheme({ id: schemeId, payload: formToScheme(form, schemeId) }))
    setSaving(false)

    if (saveScheme.rejected.match(result)) {
      // The server checks the whole ladder, which this form cannot — a gap or
      // an overlap only shows up when the slabs are read together.
      const { message, details } = result.payload ?? {}
      setErrors((e) => ({ ...e, ...details, slabsGeneral: details?.slabs ?? e.slabsGeneral, name: details?.name ?? e.name }))
      toast({ tone: 'danger', title: message ?? 'Could not save the scheme.' })
      return
    }

    const saved = result.payload
    navigate(BASE, {
      state: { highlightId: saved.id, notice: { tone: 'success', message: `${saved.name} ${editing ? 'updated' : 'created'}.` } },
    })
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
      className="mx-auto max-w-4xl space-y-5"
    >
      <div className="sticky top-16 z-10 -mx-4 flex flex-col gap-3 border-b border-mint-pale bg-bg/90 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:border sm:bg-white/90 sm:px-5">
        <div className="min-w-0">
          <Link to={BASE} className="inline-flex items-center gap-1 text-xs font-semibold text-green-deep hover:underline">
            <ArrowLeft className="size-3.5" /> Schemes
          </Link>
          <h1 className="truncate text-2xl font-extrabold sm:text-3xl">{editing ? 'Edit scheme' : 'New scheme'}</h1>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="lg" className="flex-1 sm:flex-none" onClick={() => navigate(BASE)}>
            Cancel
          </Button>
          <Button type="submit" size="lg" className="flex-1 sm:flex-none" disabled={saving}>
            {saving && <Loader2 className="animate-spin" data-icon="inline-start" />}
            {editing ? 'Save changes' : 'Create scheme'}
          </Button>
        </div>
      </div>

      {/* Step 1 — which scheme. One question, four plain answers. */}
      <FormSection title="1. What kind of scheme is it?">
        <div className="sm:col-span-2">
          <KindPicker
            value={kindOf(form)}
            disabled={editing}
            onChange={(kind) => {
              setForm((f) => ({ ...f, ...splitKind(kind) }))
              setErrors({})
            }}
          />
          {editing && (
            <p className="mt-2 text-xs text-ink-muted">
              This can’t change once a scheme exists — bills already carry what it gave. Duplicate it instead.
            </p>
          )}
        </div>
      </FormSection>

      {/* Step 2 — the rule itself, which is what the admin actually came for. */}
      <FormSection title="2. The rule">
        <TriggerFields form={form} errors={errors} onChange={set} itemOptions={itemOptions} />
        <RewardFields form={form} errors={errors} onChange={set} />
        <SlabEditor
          slabs={form.slabs}
          onChange={(slabs) => set('slabs', slabs)}
          trigger={form.trigger}
          reward={form.reward}
          discountType={form.discountType}
          freeOptions={freeOptions}
          onAddGift={addGift}
          errors={errors.slabs}
          generalError={errors.slabsGeneral}
        />
      </FormSection>

      {/* Step 3 — name it and say when it runs. */}
      <FormSection title="3. Name and dates">
        <TextField
          id="scheme-name"
          label="Scheme name"
          required
          size="md"
          placeholder="e.g. Full box of Vir 60gm — 5 pieces of 10gm free"
          maxLength={80}
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          error={errors.name}
          className="sm:col-span-2"
        />

        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-semibold text-ink">
            How long does it run? <span className="text-danger">*</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {VALIDITY_PRESETS.map((preset) => (
              <button
                key={preset.months}
                type="button"
                id={`scheme-validity-${preset.months}`}
                onClick={() => setMonths(preset.months)}
                className={cn(
                  'rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors',
                  chosenPreset === preset.months ? 'border-black bg-black text-white' : 'border-mint-pale bg-white text-ink hover:border-mint',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-ink-muted">From</span>
            <input
              id="scheme-window-start"
              type="date"
              aria-label="Starts on"
              value={form.startDate}
              onChange={(e) => {
                setForm((f) => ({ ...f, startDate: e.target.value }))
                if (errors.window) setErrors((err) => ({ ...err, window: undefined }))
              }}
              className="h-10 rounded-lg border border-mint bg-white px-3 text-sm outline-none focus:border-green-fresh"
            />
            <span className="text-ink-muted">to</span>
            <input
              id="scheme-window-end"
              type="date"
              aria-label="Ends on"
              value={form.endDate}
              onChange={(e) => {
                setForm((f) => ({ ...f, endDate: e.target.value }))
                if (errors.window) setErrors((err) => ({ ...err, window: undefined }))
              }}
              className="h-10 rounded-lg border border-mint bg-white px-3 text-sm outline-none focus:border-green-fresh"
            />
          </div>
          {errors.window && <p className="mt-1.5 text-sm font-medium text-destructive">{errors.window}</p>}
        </div>

        <Switch
          id="scheme-active"
          checked={form.status === 'ACTIVE'}
          onCheckedChange={(checked) => set('status', checked ? 'ACTIVE' : 'INACTIVE')}
          label={form.status === 'ACTIVE' ? 'On — applies to new orders' : 'Off — saved but not applied'}
          className="sm:col-span-2"
        />
      </FormSection>

      <div aria-live="polite" className="flex items-start gap-3 rounded-2xl border border-mint bg-mint-pale p-4 text-sm text-forest">
        <Sparkles className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-semibold">This scheme says</p>
          <p id="scheme-preview" className="mt-0.5">
            {preview || 'Fill in the rule above and it will be spelled out here.'}
          </p>
        </div>
      </div>
    </form>
  )
}

/**
 * Remounts per scheme, so moving between edit pages never shows the last form.
 *
 * An edit link opened cold — a bookmark, a reload — has no list behind it yet.
 * The form is only built once the list is in, which is why the waiting is done
 * out here: inside, `initialForm` would run against an empty list and bounce
 * straight back to the list page.
 */
export default function SchemeEditor() {
  const { schemeId } = useParams()
  const { state } = useLocation()
  const dispatch = useDispatch()
  const status = useSelector(selectSchemesStatus)

  useEffect(() => {
    if (status === 'idle') dispatch(fetchSchemes())
  }, [status, dispatch])

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="grid min-h-60 place-items-center" role="status" aria-label="Loading schemes">
        <span className="size-8 animate-spin rounded-full border-3 border-mint border-t-green-deep" />
      </div>
    )
  }

  return <SchemeEditorForm key={schemeId ?? `new-${state?.duplicateOf ?? state?.forItemId ?? ''}`} schemeId={schemeId} state={state} />
}
