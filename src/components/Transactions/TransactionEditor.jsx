import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, Gift, Loader2 } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { FormDrawer } from '@/components/data/FormDrawer'
import { DocumentUploader } from '@/components/form/DocumentUploader'
import { TextAreaField } from '@/components/form/TextAreaField'
import { emptyItemForm, formToItem, ItemForm, validateItemForm } from '@/components/Inventory/Items/components/ItemForm'
import { PartyForm } from '@/components/Parties/shared/components/PartyForm'
import { emptyPartyForm, formToParty, nextPartyId, validatePartyForm } from '@/components/Parties/shared/partyModel'
import { PARTY_TYPES } from '@/components/Parties/shared/partyTypes'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/format'
import { INITIAL_BRANDS, INITIAL_CATEGORIES, WAREHOUSES } from '@/mocks/items'
import { routeAdded, selectCities, selectRoutes } from '@/store/geographySlice'
import { selectItems, setItems } from '@/store/itemsSlice'
import { partySaved, selectParties } from '@/store/partiesSlice'
import { selectPriceLists } from '@/store/priceListsSlice'
import { docPatched, docSaved, selectDocSettings, selectDocs } from '@/store/transactionsSlice'
import { selectSchemes } from '@/store/schemesSlice'
import { BillToCard, partyOptionFor } from './components/BillToCard'
import { LineItemsTable } from './components/LineItemsTable'
import { SchemeResultDialog } from './components/SchemeResultDialog'
import { TotalsSummary } from './components/TotalsSummary'
import { DOC_TYPES, titleCase } from './docTypes'
import { SALES_USER_OPTIONS } from './salesUsers'
import { applySchemes } from './schemeEngine'
import { docTotals, lineFor, nextDocNumber, validateDoc } from './transactionModel'

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Adjustment rows = the settings' custom fields, keeping any amounts already entered. */
function withAdjustments(doc, settings) {
  const existing = doc.adjustments ?? []
  const pick = (label, kind) => existing.find((a) => a.label === label && a.kind === kind)?.amount ?? ''
  return [
    ...settings.discountFields.map((label) => ({ label, kind: 'DISCOUNT', amount: pick(label, 'DISCOUNT') })),
    ...settings.chargeFields.map((label) => ({ label, kind: 'CHARGE', amount: pick(label, 'CHARGE') })),
  ]
}

const signature = (lines) => lines.filter((l) => !l.free).map((l) => `${l.itemId}:${l.qty}`).join('|')

/**
 * Create / edit page shared by every sales document type.
 * duplicateOf = id of a same-type doc to copy; convertFrom = { type, id } of
 * another type's doc to copy (Estimate → Sales Order → Invoice …).
 */
export default function TransactionEditor({ type, docId, duplicateOf, convertFrom }) {
  const config = DOC_TYPES[type]
  const { noun, basePath } = config
  const purchase = config.party === 'SUPPLIER'
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const docs = useSelector(selectDocs(type))
  const sourceDocs = useSelector(selectDocs(convertFrom?.type ?? type))
  const settings = useSelector(selectDocSettings(type))
  const customers = useSelector(selectParties('CUSTOMER'))
  const suppliers = useSelector(selectParties('SUPPLIER'))
  const items = useSelector(selectItems)
  const priceLists = useSelector(selectPriceLists)
  const schemes = useSelector(selectSchemes)
  const routes = useSelector(selectRoutes)
  const cities = useSelector(selectCities)
  const keySeq = useRef(0)
  const newKey = () => `n${Date.now()}-${keySeq.current++}`

  const [doc, setDoc] = useState(() => {
    const converted = convertFrom && sourceDocs.find((d) => d.id === convertFrom.id)
    const source = converted ?? docs.find((d) => d.id === (docId ?? duplicateOf))
    if (docId && !source) return null
    const copy = { id: undefined, number: undefined, type, date: todayISO(), status: config.defaultStatus, documents: [] }
    const base = converted
      ? { ...source, ...copy, sourceRef: { type: convertFrom.type, id: source.id, number: source.number } }
      : source
      ? { ...source, ...(duplicateOf && { ...copy, documents: source.documents, sourceRef: undefined }) }
      : {
          type,
          date: todayISO(),
          partyType: purchase ? 'SUPPLIER' : 'CUSTOMER',
          partyId: '',
          warehouseId: WAREHOUSES[0].value,
          createdBy: 'admin',
          creditPeriodDays: '',
          status: config.defaultStatus,
          comment: '',
          vehicleNo: '',
          ewayBillNo: '',
          terms: settings.terms ? settings.termsText : '',
          schemeDiscount: 0,
          documents: [],
          lines: [],
        }
    return { ...base, adjustments: withAdjustments(base, settings) }
  })
  // The document this one came from — a return may not exceed what was sold.
  const sourceDoc = useSelector((state) => {
    const ref = doc?.sourceRef
    return ref && config.limitToSource ? state.transactions.docs[ref.type]?.find((d) => d.id === ref.id) : null
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [schemeResult, setSchemeResult] = useState(null)
  const [appliedSig, setAppliedSig] = useState(null)
  const [partyDrawer, setPartyDrawer] = useState(null) // { form, errors }
  const [itemDrawer, setItemDrawer] = useState(null)

  const partyList = purchase || doc?.partyType === 'SUPPLIER' ? suppliers : customers
  const party = useMemo(() => [...customers, ...suppliers].find((p) => p.id === doc?.partyId), [customers, suppliers, doc?.partyId])
  const itemsById = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])
  const cityOf = useMemo(() => {
    const cityById = Object.fromEntries(cities.map((c) => [c.id, c.name]))
    const routeCity = Object.fromEntries(routes.map((r) => [r.id, cityById[r.cityId]]))
    return (p) => routeCity[p.routeId] ?? ''
  }, [routes, cities])
  const partyOptions = useMemo(() => partyList.filter((p) => p.status === 'ACTIVE' || p.id === doc?.partyId).map((p) => partyOptionFor(p, cityOf)), [partyList, cityOf, doc?.partyId])
  const itemOptions = useMemo(
    () => items.filter((i) => i.status === 'ACTIVE').map((i) => ({ value: i.id, label: i.name, hint: `${i.code || 'No code'} · ${formatPrice(purchase ? i.purchasePrice : i.sellPrice)} / ${i.unit} · stock ${i.stock}` })),
    [items, purchase],
  )

  if (!doc) return <Navigate to={basePath} replace />
  const editing = Boolean(docId)
  const totals = docTotals(doc, party)
  const schemesStale = appliedSig !== null && appliedSig !== signature(doc.lines)
  const hasSchemeEffects = doc.lines.some((l) => l.free || l.schemeDiscount > 0) || doc.schemeDiscount > 0

  const set = (field, value) => {
    setDoc((d) => {
      const next = { ...d, [field]: value }
      if (field === 'partyId') {
        const p = [...customers, ...suppliers].find((x) => x.id === value)
        // New party → its credit days and its price list; scheme effects reset.
        if (p) next.creditPeriodDays = p.creditPeriodDays ? String(p.creditPeriodDays) : ''
        next.lines = d.lines.filter((l) => !l.free).map((l) => (itemsById[l.itemId] ? { ...lineFor(itemsById[l.itemId], p, priceLists, l.key, purchase), qty: l.qty, discount: l.discount } : l))
        next.schemeDiscount = 0
      }
      return next
    })
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const setLines = (lines) => {
    setDoc((d) => ({ ...d, lines }))
    if (errors.items || errors.lines) setErrors((e) => ({ ...e, items: undefined, lines: undefined }))
  }

  const addItem = (itemId) => {
    const item = itemsById[itemId]
    if (!item) return
    const existing = doc.lines.find((l) => l.itemId === itemId && !l.free)
    if (existing) setLines(doc.lines.map((l) => (l.key === existing.key ? { ...l, qty: String(Number(l.qty) + 1) } : l)))
    else setLines([...doc.lines, lineFor(item, party, priceLists, newKey(), purchase)])
  }

  const runSchemes = () => {
    if (!party) {
      setErrors((e) => ({ ...e, partyId: 'Choose the party first — schemes depend on its group.' }))
      return
    }
    const res = applySchemes({ lines: doc.lines, schemes, date: doc.date, party, itemsById, newKey })
    setDoc((d) => ({ ...d, lines: res.lines, schemeDiscount: res.schemeDiscount }))
    setAppliedSig(signature(res.lines))
    setSchemeResult(res)
  }

  const save = async () => {
    const found = validateDoc(doc, { party, settings, totals, sourceDoc })
    setErrors(found)
    if (Object.keys(found).some((k) => found[k])) {
      const target = found.partyId ? document.getElementById('doc-party') : document.querySelector('[aria-invalid="true"]') ?? document.getElementById('doc-items')
      target?.focus()
      target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    setSaving(true)
    await new Promise((r) => setTimeout(r, 400)) // mock network
    const id = doc.id ?? `${type.toLowerCase()}-${Date.now()}`
    const number = doc.number ?? nextDocNumber(docs, config.prefix, doc.date)
    const saved = {
      ...doc,
      id,
      number,
      lines: doc.lines.map((l) => ({ ...l, qty: Number(l.qty), rate: Number(l.rate), discount: Number(l.discount) || 0 })),
      adjustments: doc.adjustments.map((a) => ({ ...a, amount: Number(a.amount) || 0 })),
    }
    dispatch(docSaved({ type, doc: saved }))
    // Converting marks the source (e.g. sales order → "Invoiced").
    const sourceStatus = !editing && doc.sourceRef && DOC_TYPES[doc.sourceRef.type].convertsTo.find((c) => c.type === type)?.sourceStatus
    if (sourceStatus) dispatch(docPatched({ type: doc.sourceRef.type, id: doc.sourceRef.id, changes: { status: sourceStatus } }))
    navigate(basePath, { state: { highlightId: id, notice: { tone: 'success', message: `${number} ${editing ? 'updated' : 'created'} for ${party.name} — ${formatPrice(totals.total)}.` } } })
  }

  /* ── + New party / item (reuse the Parties and Items forms) ── */

  const partyConfig = PARTY_TYPES[doc.partyType]
  const saveParty = () => {
    const list = doc.partyType === 'SUPPLIER' ? suppliers : customers
    const found = validatePartyForm(partyDrawer.form, { parties: list, editingId: null, noun: partyConfig.noun })
    if (Object.keys(found).some((k) => found[k])) return setPartyDrawer((d) => ({ ...d, errors: found }))
    const id = nextPartyId(list, partyConfig.idBase)
    dispatch(partySaved({ type: doc.partyType, party: formToParty({ ...partyDrawer.form, type: doc.partyType }, id) }))
    setPartyDrawer(null)
    set('partyId', id)
  }
  const saveItem = () => {
    const found = validateItemForm(itemDrawer.form, { items, editingId: null })
    if (Object.keys(found).some((k) => found[k])) return setItemDrawer((d) => ({ ...d, errors: found }))
    const item = formToItem(itemDrawer.form, `itm-${Date.now()}`)
    dispatch(setItems((list) => [item, ...list]))
    setItemDrawer(null)
    setLines([...doc.lines, lineFor(item, party, priceLists, newKey(), purchase)])
  }

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); save() }} className="mx-auto max-w-7xl space-y-5">
      <div className="sticky top-16 z-10 -mx-4 flex flex-col gap-3 border-b border-mint-pale bg-bg/90 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:border sm:bg-white/90 sm:px-5">
        <div className="min-w-0">
          <Link to={basePath} className="inline-flex items-center gap-1 text-xs font-semibold text-green-deep hover:underline">
            <ArrowLeft className="size-3.5" /> {config.title}
          </Link>
          <h1 className="truncate text-2xl font-extrabold sm:text-3xl">
            {editing ? `Edit ${noun}` : `Create ${titleCase(noun)}`}
            {doc.number && <span className="ml-2 font-mono text-base font-medium text-ink-muted">{doc.number}</span>}
          </h1>
          {doc.sourceRef && (
            <p className="text-xs text-ink-muted">
              From {DOC_TYPES[doc.sourceRef.type].noun}{' '}
              <Link to={`${DOC_TYPES[doc.sourceRef.type].basePath}/${doc.sourceRef.id}/edit`} className="font-mono font-semibold text-green-deep hover:underline">
                {doc.sourceRef.number}
              </Link>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="lg" onClick={runSchemes} disabled={!doc.lines.length}>
            <Gift data-icon="inline-start" /> Apply Scheme
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => navigate(basePath)}>Cancel</Button>
          <Button type="submit" size="lg" disabled={saving}>
            {saving && <Loader2 className="animate-spin" data-icon="inline-start" />}
            {editing ? 'Save changes' : 'Save'}
          </Button>
        </div>
      </div>

      <BillToCard
        doc={doc}
        set={set}
        errors={errors}
        settings={settings}
        config={config}
        partyOptions={partyOptions}
        party={party}
        onNewParty={() => setPartyDrawer({ form: emptyPartyForm({ type: doc.partyType, balanceType: partyConfig.defaultBalanceType, groupId: partyConfig.defaultGroup }), errors: {} })}
        userOptions={SALES_USER_OPTIONS}
        total={totals.total}
        openDue={party ? Math.max(0, (party.balanceType === 'PAY' ? -1 : 1) * (party.openingBalance || 0)) : 0}
      />

      {schemesStale && hasSchemeEffects && (
        <p className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning-soft px-4 py-2.5 text-sm font-medium text-warning-ink">
          <AlertTriangle className="size-4" /> Items changed after schemes were applied — click Apply Scheme again.
        </p>
      )}

      <div id="doc-items" tabIndex={-1} className="outline-none">
        <LineItemsTable
          lines={doc.lines}
          onChange={setLines}
          itemOptions={itemOptions}
          onAddItem={addItem}
          onNewItem={() => setItemDrawer({ form: emptyItemForm({ warehouseId: WAREHOUSES[0].value }), errors: {} })}
          errors={errors.lines}
          error={errors.items}
        />
        {errors.items && doc.lines.length > 0 && <p className="mt-2 text-sm font-medium text-destructive">{errors.items}</p>}
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_24rem]">
        <section className="space-y-4 rounded-2xl border border-mint-pale bg-white p-5">
          <DocumentUploader documents={doc.documents} onChange={(docsList) => set('documents', docsList)} />
          <TextAreaField id="doc-comment" label="Instructions / comment" rows={3} placeholder="Any instructions" value={doc.comment} onChange={(e) => set('comment', e.target.value)} />
          {settings.terms && <TextAreaField id="doc-terms" label="Terms and conditions" rows={2} value={doc.terms} onChange={(e) => set('terms', e.target.value)} />}
        </section>
        <TotalsSummary
          totals={totals}
          schemeDiscount={doc.schemeDiscount}
          adjustments={doc.adjustments}
          onAdjustmentChange={(a, amount) => set('adjustments', doc.adjustments.map((x) => (x === a ? { ...x, amount } : x)))}
        />
      </div>

      <SchemeResultDialog result={schemeResult} onClose={() => setSchemeResult(null)} />

      <FormDrawer
        open={Boolean(partyDrawer)}
        onOpenChange={(o) => !o && setPartyDrawer(null)}
        title={`Create ${partyConfig.noun}`}
        description="It will be selected on this document."
        onSubmit={saveParty}
      >
        {partyDrawer && (
          <PartyForm
            config={partyConfig}
            form={partyDrawer.form}
            errors={partyDrawer.errors}
            onChange={(f, v) => setPartyDrawer((d) => ({ ...d, form: { ...d.form, [f]: v }, errors: { ...d.errors, [f]: undefined } }))}
            routeOptions={routes.map((r) => ({ value: r.id, label: r.name, hint: cities.find((c) => c.id === r.cityId)?.name }))}
            cityOptions={cities.map((c) => ({ value: c.id, label: c.name }))}
            routes={routes}
            onAddRoute={({ cityId, name }) => {
              const id = `rt-${Date.now()}`
              dispatch(routeAdded({ id, name, cityId }))
              return id
            }}
          />
        )}
      </FormDrawer>

      <FormDrawer open={Boolean(itemDrawer)} onOpenChange={(o) => !o && setItemDrawer(null)} title="Create item" description="It will be added to this document." onSubmit={saveItem}>
        {itemDrawer && (
          <ItemForm
            form={itemDrawer.form}
            errors={itemDrawer.errors}
            onChange={(f, v) => setItemDrawer((d) => ({ ...d, form: { ...d.form, [f]: v }, errors: { ...d.errors, [f]: undefined } }))}
            categories={INITIAL_CATEGORIES}
            brands={INITIAL_BRANDS}
            onAddCategory={() => {}}
            onAddBrand={() => {}}
          />
        )}
      </FormDrawer>
    </form>
  )
}
