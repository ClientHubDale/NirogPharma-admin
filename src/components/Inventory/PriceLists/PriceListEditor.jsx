import { useMemo, useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Tabs } from '@/components/common/Tabs'
import { Notice } from '@/components/data/Notice'
import { SelectField } from '@/components/form/SelectField'
import { TextAreaField } from '@/components/form/TextAreaField'
import { TextField } from '@/components/form/TextField'
import { ExcelImportPanel } from '@/components/Inventory/PriceLists/components/ExcelImportPanel'
import { PercentPreview } from '@/components/Inventory/PriceLists/components/PercentPreview'
import { PriceItemsEditor } from '@/components/Inventory/PriceLists/components/PriceItemsEditor'
import {
  emptyPriceListForm,
  formToPriceList,
  PRICE_SHEET_COLUMNS,
  PRICE_SHEET_INSTRUCTIONS,
  priceListToForm,
  priceSheetRows,
  PRICING_STRATEGIES,
  sheetRowsToPrices,
  validatePriceListForm,
} from '@/components/Inventory/PriceLists/priceListModel'
import { Button } from '@/components/ui/button'
import { buildWorkbook, downloadWorkbook, readWorkbookRows } from '@/lib/xlsx'
import { PARTY_GROUPS } from '@/mocks/parties'
import { selectItems } from '@/store/itemsSlice'
import { priceListSaved, selectPriceLists } from '@/store/priceListsSlice'

const BASE = '/admin/inventory/price-lists'

function initialForm(priceLists, id, duplicateOf) {
  if (id) {
    const existing = priceLists.find((p) => p.id === id)
    return existing ? priceListToForm(existing) : null
  }
  const source = duplicateOf && priceLists.find((p) => p.id === duplicateOf)
  if (source) return { ...priceListToForm(source), name: `${source.name} (copy)` }
  return emptyPriceListForm()
}

function PriceListEditorForm({ priceListId, state }) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const priceLists = useSelector(selectPriceLists)
  const items = useSelector(selectItems)
  const itemsById = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])

  const [form, setForm] = useState(() => initialForm(priceLists, priceListId, state?.duplicateOf))
  const [errors, setErrors] = useState({})
  const [tab, setTab] = useState('manual')
  const [importNotice, setImportNotice] = useState(null)
  const [saving, setSaving] = useState(false)

  if (!form) return <Navigate to={BASE} replace />
  const editing = Boolean(priceListId)

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field] || (field === 'items' && errors.rows)) setErrors((e) => ({ ...e, [field]: undefined, ...(field === 'items' && { rows: undefined }) }))
  }

  const exportCatalog = async () => {
    const workbook = await buildWorkbook({
      sheetName: 'Price list',
      columns: PRICE_SHEET_COLUMNS,
      rows: priceSheetRows(items.filter((i) => i.status === 'ACTIVE'), form.items),
      instructions: PRICE_SHEET_INSTRUCTIONS,
    })
    await downloadWorkbook(`nirog-catalog-for-price-list.xlsx`, workbook)
  }

  const importPrices = async (file) => {
    let raw
    try {
      raw = await readWorkbookRows(file)
    } catch {
      throw new Error('Couldn’t read this file. Open it in Excel, save it as .xlsx and try again.')
    }
    if (!raw.length) throw new Error('The file has no rows under the header.')
    const { rows, skipped, keptCatalog } = sheetRowsToPrices(raw, items)
    if (!rows.length) throw new Error(`No rows could be used. ${skipped.slice(0, 3).map((s) => `Line ${s.line}: ${s.reason}`).join(' · ')}`)
    set('items', rows)
    setImportNotice({
      tone: skipped.length ? 'error' : 'success',
      message: (
        <>
          Imported {rows.length} item{rows.length === 1 ? '' : 's'}
          {keptCatalog > 0 && ` (${keptCatalog} kept at catalog price)`}
          {skipped.length > 0 && `, skipped ${skipped.length}`}. Review the prices below, then Save.
          {skipped.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs">
              {skipped.slice(0, 5).map((s) => (
                <li key={s.line}>
                  Line {s.line}: {s.reason}
                </li>
              ))}
              {skipped.length > 5 && <li>…and {skipped.length - 5} more</li>}
            </ul>
          )}
        </>
      ),
    })
    setTab('manual')
  }

  const save = async () => {
    const found = validatePriceListForm(form, { priceLists, editingId: priceListId, itemsById })
    setErrors(found)
    if (Object.keys(found).some((k) => found[k])) {
      if (found.name) document.getElementById('pl-name')?.focus()
      else if (found.percent) document.getElementById('pl-percent')?.focus()
      else {
        setTab('manual')
        document.querySelector('[aria-invalid="true"]')?.focus()
      }
      return
    }
    setSaving(true)
    await new Promise((r) => setTimeout(r, 400)) // mock network
    const id = priceListId ?? `pl-${Date.now()}`
    const saved = formToPriceList(form, id)
    dispatch(priceListSaved(saved))
    navigate(BASE, { state: { highlightId: id, notice: { tone: 'success', message: `${saved.name} ${editing ? 'updated' : 'created'}.` } } })
  }

  const percentStrategy = form.strategy !== 'FIXED'

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
      className="mx-auto max-w-7xl space-y-5"
    >
      <div className="sticky top-16 z-10 -mx-4 flex flex-col gap-3 border-b border-mint-pale bg-bg/90 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:border sm:bg-white/90 sm:px-5">
        <div className="min-w-0">
          <Link to={BASE} className="inline-flex items-center gap-1 text-xs font-semibold text-green-deep hover:underline">
            <ArrowLeft className="size-3.5" /> Price Lists
          </Link>
          <h1 className="truncate text-2xl font-extrabold sm:text-3xl">{editing ? 'Edit Price List' : 'Create Price List'}</h1>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="lg" className="flex-1 sm:flex-none" onClick={() => navigate(BASE)}>
            Cancel
          </Button>
          <Button type="submit" size="lg" className="flex-1 sm:flex-none" disabled={saving}>
            {saving && <Loader2 className="animate-spin" data-icon="inline-start" />}
            {editing ? 'Save changes' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <section className="space-y-5 rounded-2xl border border-mint-pale bg-white p-5 lg:sticky lg:top-40">
          <TextField
            id="pl-name"
            label="Price list name"
            required
            size="md"
            placeholder="e.g. Supermarket – June"
            maxLength={60}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            error={errors.name}
          />
          <TextAreaField
            id="pl-description"
            label="Description"
            rows={2}
            maxLength={160}
            placeholder="Who is this price list for?"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
          <SelectField
            id="pl-party-group"
            label="Party group"
            options={PARTY_GROUPS}
            value={form.partyGroup}
            onChange={(v) => set('partyGroup', v)}
          />
          <SelectField
            id="pl-strategy"
            label="Pricing strategy"
            searchable={false}
            options={PRICING_STRATEGIES}
            value={form.strategy}
            onChange={(v) => {
              setForm((f) => ({ ...f, strategy: v }))
              setErrors({})
            }}
          />
          {percentStrategy && (
            <TextField
              id="pl-percent"
              label={form.strategy === 'INCREASE' ? 'Increase by' : 'Decrease by'}
              required
              size="md"
              inputMode="decimal"
              placeholder="e.g. 5"
              suffix={<span className="flex h-full items-center border-l border-mint-pale bg-bg px-3.5 text-sm text-ink-muted">%</span>}
              value={form.percent}
              onChange={(e) => set('percent', e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
              error={errors.percent}
            />
          )}
        </section>

        <section className="min-w-0 rounded-2xl border border-mint-pale bg-white p-5">
          {percentStrategy ? (
            <PercentPreview items={items} strategy={form.strategy} percent={form.percent} />
          ) : (
            <Tabs
              value={tab}
              onValueChange={setTab}
              tabs={[
                {
                  value: 'manual',
                  label: `Add items manually${form.items.length ? ` (${form.items.length})` : ''}`,
                  content: (
                    <div className="space-y-4">
                      {importNotice && (
                        <Notice tone={importNotice.tone} onDismiss={() => setImportNotice(null)}>
                          {importNotice.message}
                        </Notice>
                      )}
                      <PriceItemsEditor
                        rows={form.items}
                        onChange={(rows) => set('items', rows)}
                        items={items}
                        itemsById={itemsById}
                        rowErrors={errors.rows}
                        error={errors.items}
                      />
                    </div>
                  ),
                },
                { value: 'excel', label: 'Import from Excel', content: <ExcelImportPanel onExport={exportCatalog} onImport={importPrices} /> },
              ]}
            />
          )}
        </section>
      </div>
    </form>
  )
}

/** Remount per price list so moving between edit pages never shows stale data. */
export default function PriceListEditor() {
  const { priceListId } = useParams()
  const { state } = useLocation()
  return <PriceListEditorForm key={priceListId ?? `new-${state?.duplicateOf ?? ''}`} priceListId={priceListId} state={state} />
}
