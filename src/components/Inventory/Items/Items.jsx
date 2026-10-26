import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { FileDown, FileUp, PackageSearch, Plus } from 'lucide-react'
import { PhotoViewer } from '@/components/common/PhotoViewer'
import { ColumnSettings } from '@/components/data/ColumnSettings'
import { DataTable } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { FormDrawer } from '@/components/data/FormDrawer'
import { ImportDialog } from '@/components/data/ImportDialog'
import { Notice } from '@/components/data/Notice'
import { useToast } from '@/components/common/Toast'
import { PageHeader } from '@/components/data/PageHeader'
import { Pagination } from '@/components/data/Pagination'
import { SearchInput } from '@/components/data/SearchInput'
import { SearchSelect } from '@/components/form/SearchSelect'
import { emptyItemForm, ItemForm, itemToForm, validateItemForm } from '@/components/Inventory/Items/components/ItemForm'
import {
  ITEM_IMPORT_REQUIRED,
  ITEM_SAMPLE_ROWS,
  itemSheetColumns,
  ITEM_SHEET_INSTRUCTIONS,
  itemsToSheetRows,
  rowsToItems,
} from '@/components/Inventory/Items/itemSheet'
import {
  buildItemColumns,
  DEFAULT_ITEM_COLUMN_VISIBILITY,
  ITEM_COLUMN_OPTIONS,
} from '@/components/Inventory/Items/components/ItemsTable'
import { Button } from '@/components/ui/button'
import { parseCSV } from '@/lib/csv'
import { buildWorkbook, downloadWorkbook, readWorkbookRows } from '@/lib/xlsx'
import { CATEGORY_QUANTITY_UNITS, INITIAL_CATEGORIES, ITEM_STATUSES, UNITS } from '@/mocks/items'
import { usePriceTiers } from '@/hooks/usePriceTiers'
import { addPriceTier, removePriceTier } from '@/store/priceTiersSlice'
import { addGift as addGiftThunk } from '@/store/giftsSlice'
import {
  fetchItems,
  importItems as importItemsThunk,
  removeItem,
  saveItem,
  selectItems,
  selectItemsError,
  selectItemsStatus,
  setItemStatus,
} from '@/store/itemsSlice'

const PAGE_SIZE = 10

/** Form field → input id, to focus the first invalid field on Save. */
const FIELD_IDS = {
  name: 'item-name',
  unit: 'item-unit',
  quantity: 'item-quantity',
  mrp: 'item-mrp',
  hsn: 'item-hsn',
}
const getRowId = (item) => item.id

export default function Items() {
  // Catalogue lives in Redux so other screens (schemes, orders) see the same items.
  const dispatch = useDispatch()
  const toast = useToast()
  const items = useSelector(selectItems)
  const loadStatus = useSelector(selectItemsStatus)
  const loadError = useSelector(selectItemsError)
  const priceTiers = usePriceTiers()
  // Categories the admin added this session, as { name: quantity unit }. There
  // is no category table yet, so the rest is rebuilt from the catalogue below.
  const [addedCategories, setAddedCategories] = useState({})
  // Units the admin added this session. Like categories, the rest is rebuilt
  // from the catalogue below, so one saved item keeps a new unit alive.
  const [addedUnits, setAddedUnits] = useState([])

  // List controls.
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })
  const [columnVisibility, setColumnVisibility] = useState(DEFAULT_ITEM_COLUMN_VISIBILITY)
  const [highlightId, setHighlightId] = useState(null)
  const [notice, setNotice] = useState(null) // { tone, message, undo? }

  // Drawer.
  const [drawer, setDrawer] = useState({ open: false, editingId: null })
  const [form, setForm] = useState(emptyItemForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(
      (item) =>
        (!q ||
          item.name.toLowerCase().includes(q) ||
          item.code?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q) ||
          item.hsn?.includes(q)) &&
        (!status || item.status === status),
    )
  }, [items, search, status])

  // Keep the page in range when rows disappear (delete, filter).
  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize))
  const page = pagination.pageIndex < pageCount ? pagination : { ...pagination, pageIndex: pageCount - 1 }

  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }))
  const hasFilters = Boolean(search || status)

  /* ── drawer ───────────────────────────────────────────── */

  const openCreate = () => {
    setForm(emptyItemForm())
    setErrors({})
    setDrawer({ open: true, editingId: null })
  }

  const openEdit = (item) => {
    setForm(itemToForm(item))
    setErrors({})
    setDrawer({ open: true, editingId: item.id })
  }

  useEffect(() => {
    dispatch(fetchItems())
  }, [dispatch])

  /**
   * Every category in play, and what each one's quantity is counted in: the
   * built-in list, whatever the saved items use, then this session's additions.
   * An item remembers the unit it was saved with, so a category invented last
   * week still knows it is counted in ML today.
   */
  const categoryUnits = useMemo(() => {
    const units = { ...CATEGORY_QUANTITY_UNITS }
    for (const item of items) if (item.category && item.quantityUnit) units[item.category] = item.quantityUnit
    return { ...units, ...addedCategories }
  }, [items, addedCategories])

  const units = useMemo(() => {
    const all = [...UNITS.map((unit) => unit.value), ...items.map((item) => item.unit), ...addedUnits]
    return [...new Set(all.filter(Boolean))]
  }, [items, addedUnits])

  const categories = useMemo(() => {
    const all = [...INITIAL_CATEGORIES, ...items.map((item) => item.category), ...Object.keys(addedCategories)]
    return [...new Set(all.filter(Boolean))].sort((a, b) => a.localeCompare(b))
  }, [items, addedCategories])

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const save = async () => {
    const found = validateItemForm(form, { items, editingId: drawer.editingId })
    setErrors(found)
    if (Object.keys(found).length) {
      // Bring the first problem into view.
      document.getElementById(FIELD_IDS[Object.keys(found)[0]])?.focus()
      return
    }

    setSaving(true)
    // An item saved before its category had a unit gets one now.
    const payload = { ...form, quantityUnit: form.quantityUnit || categoryUnits[form.category] || '' }
    const result = await dispatch(saveItem({ id: drawer.editingId, form: payload }))
    setSaving(false)

    if (saveItem.rejected.match(result)) {
      // The server checks the same things again and knows about clashes this
      // browser cannot see — show its message and its per-field errors.
      const { message, details } = result.payload
      if (details) setErrors((current) => ({ ...current, ...details }))
      return toast({ tone: 'danger', title: drawer.editingId ? 'Could not save' : 'Could not create', description: message })
    }

    const { item: saved, warning } = result.payload
    setDrawer({ open: false, editingId: null })
    setHighlightId(saved.id)
    if (!drawer.editingId) {
      setSearch('')
      setStatus('')
        resetPage()
    }
    toast({
      tone: warning ? 'warning' : 'success',
      title: `Item ${drawer.editingId ? 'updated' : 'created'}`,
      description: warning ? `${saved.name} · ${warning}` : saved.name,
    })
  }

  /**
   * A giveaway — a pen, a bag. It is not made in the factory, so it is kept out
   * of the catalogue entirely and nothing is deducted from stock when one goes
   * out. Returns the new giveaway, or the reason it could not be saved.
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

  /* ── rate columns ─────────────────────────────────────── */

  /**
   * A new rate column goes on every item at once, so the catalogue is reloaded
   * to pick up the prices the server worked out. Returns the reason on failure,
   * which the form shows beside the discounts.
   */
  const addTier = async ({ discounts, label }) => {
    const result = await dispatch(addPriceTier({ discounts, label }))
    if (addPriceTier.rejected.match(result)) return result.payload.message

    const { tier, priced } = result.payload
    dispatch(fetchItems())
    toast({
      tone: 'success',
      title: 'Rate column added',
      description: `${tier.label} · ${priced} item${priced === 1 ? '' : 's'} priced from their MRP`,
    })
    return null
  }

  const removeTier = async (tier) => {
    const result = await dispatch(removePriceTier({ id: tier.id }))
    if (removePriceTier.rejected.match(result)) {
      return toast({ tone: 'danger', title: 'Could not remove', description: result.payload.message })
    }
    dispatch(fetchItems())
    toast({ tone: 'success', title: 'Rate column removed', description: tier.label })
  }

  /* ── row actions ──────────────────────────────────────── */

  const toggleStatus = async (item) => {
    const next = item.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE'
    const result = await dispatch(setItemStatus({ id: item.id, status: next }))
    if (setItemStatus.rejected.match(result)) {
      return toast({ tone: 'danger', title: 'Could not change the status', description: result.payload.message })
    }
    toast({ title: `Moved to ${next === 'ACTIVE' ? 'Active' : 'Draft'}`, description: item.name })
  }

  const remove = async (item) => {
    const result = await dispatch(removeItem({ id: item.id }))
    if (removeItem.rejected.match(result)) {
      return toast({ tone: 'danger', title: 'Could not delete', description: result.payload.message })
    }
    toast({ title: 'Item deleted', description: item.name })
  }

  // Handlers are stable-enough closures over state; rebuild columns when they change.
  const columns = useMemo(
    () => buildItemColumns({ onEdit: openEdit, onToggleStatus: toggleStatus, onDelete: remove, onImage: (item) => setPhoto(item) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items],
  )

  // The product photo, opened full screen.
  const [photo, setPhoto] = useState(null)

  /* ── export / import ──────────────────────────────────── */

  const today = () => new Date().toISOString().slice(0, 10)

  const exportItems = async () => {
    const workbook = await buildWorkbook({ sheetName: 'Items', columns: itemSheetColumns(priceTiers), rows: itemsToSheetRows(filtered, priceTiers) })
    await downloadWorkbook(`nirog-items-${today()}.xlsx`, workbook)
    toast({ title: 'Export ready', description: `${filtered.length} item${filtered.length === 1 ? '' : 's'} downloaded` })
  }

  const downloadSample = async () => {
    const workbook = await buildWorkbook({
      sheetName: 'Items',
      columns: itemSheetColumns(priceTiers),
      rows: ITEM_SAMPLE_ROWS,
      blankRows: 48,
      instructions: ITEM_SHEET_INSTRUCTIONS,
    })
    await downloadWorkbook('nirog-sample-import-items.xlsx', workbook)
  }

  /** Called by the Import dialog. Throws to keep the dialog open when nothing could be imported. */
  const importFile = async (file) => {
    let rows
    try {
      rows = /\.xlsx$/i.test(file.name) ? await readWorkbookRows(file) : parseCSV(await file.text())
    } catch {
      throw new Error('Couldn’t read this file. Open it in Excel and save it again as .xlsx, then retry.')
    }
    if (rows.length === 0) throw new Error('The file has no rows under the header. Use Download Sample for the format.')

    // Shape and check the rows here, then let the API have the final word —
    // it alone knows which codes are already taken.
    const { items: candidates, skipped: localSkips } = rowsToItems(rows, items, priceTiers)
    if (candidates.length === 0) {
      const why = localSkips.slice(0, 5).map((s) => `Line ${s.line}: ${s.reason}`)
      throw new Error(`No items imported. ${why.join(' · ')}${localSkips.length > 5 ? ` · …and ${localSkips.length - 5} more` : ''}`)
    }

    const result = await dispatch(importItemsThunk({ items: candidates }))
    if (importItemsThunk.rejected.match(result)) throw new Error(result.payload.message)

    const { added, skipped: serverSkips } = result.payload
    const skipped = [...localSkips, ...serverSkips]
    const reasons = skipped.slice(0, 5).map((s) => `Line ${s.line}: ${s.reason}`)
    if (added.length === 0) {
      throw new Error(`No items imported. ${reasons.join(' · ')}${skipped.length > 5 ? ` · …and ${skipped.length - 5} more` : ''}`)
    }
    // Categories from the file are picked up from the items themselves.
    setSearch('')
    setStatus('')
    resetPage()
    setNotice({
      tone: 'success',
      message: (
        <>
          Imported {added.length} item{added.length === 1 ? '' : 's'}
          {skipped.length > 0 && `, skipped ${skipped.length}`}.
          {skipped.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
              {skipped.length > 5 && <li>…and {skipped.length - 5} more</li>}
            </ul>
          )}
        </>
      ),
    })
  }

  /* ── render ───────────────────────────────────────────── */

  const empty = (
    <EmptyState
      icon={PackageSearch}
      title={hasFilters ? 'Sorry! No items found.' : 'No items yet'}
      description={
        hasFilters ? 'Try a different search, or clear the filters.' : 'Add your first item so the field team can take orders.'
      }
    >
      {hasFilters ? (
        <Button
          variant="outline"
          size="lg"
          onClick={() => {
            setSearch('')
            setStatus('')
                    resetPage()
          }}
        >
          Clear filters
        </Button>
      ) : (
        <Button size="lg" onClick={openCreate}>
          <Plus data-icon="inline-start" /> New item
        </Button>
      )}
    </EmptyState>
  )

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title="Items" subtitle={`${items.length} items in the catalogue`}>
        <ColumnSettings columns={ITEM_COLUMN_OPTIONS} visibility={columnVisibility} onChange={setColumnVisibility} />
        <Button variant="outline" size="lg" className="h-11" onClick={exportItems} disabled={filtered.length === 0}>
          <FileDown data-icon="inline-start" /> Export
        </Button>
        <Button variant="outline" size="lg" className="h-11" onClick={() => setImportOpen(true)}>
          <FileUp data-icon="inline-start" /> Import
        </Button>
        <Button size="lg" className="h-11" onClick={openCreate}>
          <Plus data-icon="inline-start" /> New
        </Button>
      </PageHeader>

      {loadStatus === 'failed' && (
        <Notice tone="danger">
          {loadError?.message ?? 'Could not load items.'}
          <button type="button" onClick={() => dispatch(fetchItems())} className="ml-2 font-semibold underline underline-offset-4">
            Try again
          </button>
        </Notice>
      )}

      {notice && (
        <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.message}
          {notice.undo && (
            <button type="button" onClick={notice.undo} className="ml-2 font-semibold underline underline-offset-4">
              Undo
            </button>
          )}
        </Notice>
      )}

      <section className="overflow-hidden rounded-2xl border border-mint-pale bg-white">
        <div className="flex flex-col gap-3 border-b border-mint-pale p-4 lg:flex-row lg:items-center">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v)
              resetPage()
            }}
            placeholder="Search name, code, category or HSN"
            className="lg:w-80"
          />
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:ml-auto lg:max-w-xl">
            <SearchSelect
              aria-label="Filter by status"
              placeholder="Select status"
              clearable
              options={ITEM_STATUSES}
              value={status}
              onChange={(v) => {
                setStatus(v)
                resetPage()
              }}
            />
          </div>
          <Pagination
            pageIndex={page.pageIndex}
            pageSize={page.pageSize}
            total={filtered.length}
            onPageChange={(pageIndex) => setPagination((p) => ({ ...p, pageIndex }))}
            className="justify-between lg:justify-end"
          />
        </div>

        {loadStatus === 'loading' && !items.length ? (
          <div className="grid min-h-60 place-items-center" role="status" aria-label="Loading items">
            <span className="size-8 animate-spin rounded-full border-3 border-mint border-t-green-deep" />
          </div>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            getRowId={getRowId}
            pagination={page}
            onPaginationChange={setPagination}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            onRowClick={openEdit}
            highlightRowId={highlightId}
            empty={empty}
          />
        )}
      </section>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import items"
        requiredNote={ITEM_IMPORT_REQUIRED}
        onDownloadSample={downloadSample}
        onSubmit={importFile}
      />

      <PhotoViewer
        open={Boolean(photo)}
        src={photo?.images?.[0]?.url}
        title={photo?.name ?? ''}
        subtitle={photo?.code}
        onClose={() => setPhoto(null)}
      />

      <FormDrawer
        open={drawer.open}
        onOpenChange={(open) => !open && setDrawer({ open: false, editingId: null })}
        title={drawer.editingId ? 'Edit item' : 'Create item'}
        description={drawer.editingId ? form.name : 'Fields marked * are required.'}
        onSubmit={save}
        saving={saving}
        saveLabel={drawer.editingId ? 'Save changes' : 'Save'}
      >
        <ItemForm
          form={form}
          errors={errors}
          onChange={updateField}
          categories={categories}
          categoryUnits={categoryUnits}
          units={units}
          onAddCategory={(name, unit) => setAddedCategories((c) => ({ ...c, [name]: unit }))}
          onAddUnit={(code) => setAddedUnits((list) => [...list, code])}
          items={items}
          onAddGift={addGift}
          onAddTier={addTier}
          onRemoveTier={removeTier}
          onImageError={(message) => setErrors((e) => ({ ...e, images: message }))}
        />
        {errors.images && <Notice tone="error">{errors.images}</Notice>}
      </FormDrawer>
    </div>
  )
}
