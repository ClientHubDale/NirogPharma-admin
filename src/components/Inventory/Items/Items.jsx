import { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { FileDown, FileUp, PackageSearch, Plus } from 'lucide-react'
import { ColumnSettings } from '@/components/data/ColumnSettings'
import { DataTable } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { FormDrawer } from '@/components/data/FormDrawer'
import { ImportDialog } from '@/components/data/ImportDialog'
import { Notice } from '@/components/data/Notice'
import { PageHeader } from '@/components/data/PageHeader'
import { Pagination } from '@/components/data/Pagination'
import { SearchInput } from '@/components/data/SearchInput'
import { SearchSelect } from '@/components/form/SearchSelect'
import { emptyItemForm, formToItem, ItemForm, itemToForm, validateItemForm } from '@/components/Inventory/Items/components/ItemForm'
import {
  ITEM_IMPORT_REQUIRED,
  ITEM_SAMPLE_ROWS,
  ITEM_SHEET_COLUMNS,
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
import { INITIAL_BRANDS, INITIAL_CATEGORIES, ITEM_STATUSES, WAREHOUSES } from '@/mocks/items'
import { selectItems, setItems as setItemsAction } from '@/store/itemsSlice'

const PAGE_SIZE = 10

/** Form field → input id, to focus the first invalid field on Save. */
const FIELD_IDS = {
  name: 'item-name',
  unit: 'item-unit',
  sellPrice: 'item-sell-price',
  code: 'item-code',
  mrp: 'item-mrp',
  purchasePrice: 'item-purchase-price',
  hsn: 'item-hsn',
  discount: 'item-discount',
  stock: 'item-stock',
  warehouseId: 'item-warehouse',
  openingStockDate: 'item-opening-stock-date',
  secondaryUnit: 'item-secondary-unit',
  conversionFactor: 'item-conversion',
}
const getRowId = (item) => item.id

export default function Items() {
  // Catalogue lives in Redux so other screens (schemes, orders) see the same items.
  const dispatch = useDispatch()
  const items = useSelector(selectItems)
  const setItems = (updater) => dispatch(setItemsAction(updater))
  const [categories, setCategories] = useState(INITIAL_CATEGORIES)
  const [brands, setBrands] = useState(INITIAL_BRANDS)

  // List controls.
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [warehouse, setWarehouse] = useState('')
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
        (!status || item.status === status) &&
        (!warehouse || item.warehouseId === warehouse),
    )
  }, [items, search, status, warehouse])

  // Keep the page in range when rows disappear (delete, filter).
  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize))
  const page = pagination.pageIndex < pageCount ? pagination : { ...pagination, pageIndex: pageCount - 1 }

  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }))
  const hasFilters = Boolean(search || status || warehouse)

  /* ── drawer ───────────────────────────────────────────── */

  const openCreate = () => {
    setForm(emptyItemForm({ warehouseId: WAREHOUSES[0].value }))
    setErrors({})
    setDrawer({ open: true, editingId: null })
  }

  const openEdit = (item) => {
    setForm(itemToForm(item))
    setErrors({})
    setDrawer({ open: true, editingId: item.id })
  }

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
    await new Promise((resolve) => setTimeout(resolve, 400)) // mock network
    const id = drawer.editingId ?? `itm-${Date.now()}`
    const saved = formToItem(form, id)
    setItems((current) => (drawer.editingId ? current.map((i) => (i.id === id ? saved : i)) : [saved, ...current]))
    setSaving(false)
    setDrawer({ open: false, editingId: null })
    setHighlightId(id)
    if (!drawer.editingId) {
      setSearch('')
      setStatus('')
      setWarehouse('')
      resetPage()
    }
    setNotice({ tone: 'success', message: `${saved.name} ${drawer.editingId ? 'updated' : 'created'}.` })
  }

  /* ── row actions ──────────────────────────────────────── */

  const toggleStatus = (item) => {
    const next = item.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE'
    setItems((current) => current.map((i) => (i.id === item.id ? { ...i, status: next } : i)))
    setNotice({ tone: 'success', message: `${item.name} moved to ${next === 'ACTIVE' ? 'Active' : 'Draft'}.` })
  }

  const remove = (item) => {
    const index = items.findIndex((i) => i.id === item.id)
    setItems((current) => current.filter((i) => i.id !== item.id))
    setNotice({
      tone: 'success',
      message: `${item.name} deleted.`,
      undo: () => {
        setItems((current) => [...current.slice(0, index), item, ...current.slice(index)])
        setNotice({ tone: 'success', message: `${item.name} restored.` })
      },
    })
  }

  // Handlers are stable-enough closures over state; rebuild columns when they change.
  const columns = useMemo(
    () => buildItemColumns({ onEdit: openEdit, onToggleStatus: toggleStatus, onDelete: remove }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items],
  )

  /* ── export / import ──────────────────────────────────── */

  const today = () => new Date().toISOString().slice(0, 10)

  const exportItems = async () => {
    const workbook = await buildWorkbook({ sheetName: 'Items', columns: ITEM_SHEET_COLUMNS, rows: itemsToSheetRows(filtered) })
    await downloadWorkbook(`nirog-items-${today()}.xlsx`, workbook)
    setNotice({ tone: 'success', message: `Exported ${filtered.length} item${filtered.length === 1 ? '' : 's'} to Excel.` })
  }

  const downloadSample = async () => {
    const workbook = await buildWorkbook({
      sheetName: 'Items',
      columns: ITEM_SHEET_COLUMNS,
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

    const { items: added, skipped } = rowsToItems(rows, items)
    const reasons = skipped.slice(0, 5).map((s) => `Line ${s.line}: ${s.reason}`)
    if (added.length === 0) {
      throw new Error(`No items imported. ${reasons.join(' · ')}${skipped.length > 5 ? ` · …and ${skipped.length - 5} more` : ''}`)
    }

    setItems((current) => [...added, ...current])
    // New categories / brands from the file become selectable in the form.
    const addNew = (list, values) => [...list, ...[...new Set(values)].filter((v) => v && !list.some((x) => x.toLowerCase() === v.toLowerCase()))]
    setCategories((list) => addNew(list, added.map((i) => i.category)))
    setBrands((list) => addNew(list, added.map((i) => i.brand)))
    setSearch('')
    setStatus('')
    setWarehouse('')
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
            setWarehouse('')
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
            <SearchSelect
              aria-label="Filter by warehouse"
              placeholder="Select warehouse"
              clearable
              options={WAREHOUSES}
              value={warehouse}
              onChange={(v) => {
                setWarehouse(v)
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
      </section>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import items"
        requiredNote={ITEM_IMPORT_REQUIRED}
        onDownloadSample={downloadSample}
        onSubmit={importFile}
      />

      <FormDrawer
        open={drawer.open}
        onOpenChange={(open) => !open && setDrawer({ open: false, editingId: null })}
        title={drawer.editingId ? 'Edit item' : 'Create item'}
        description={drawer.editingId ? form.code || form.name : 'Fields marked * are required.'}
        onSubmit={save}
        saving={saving}
        saveLabel={drawer.editingId ? 'Save changes' : 'Save'}
      >
        <ItemForm
          form={form}
          errors={errors}
          onChange={updateField}
          categories={categories}
          brands={brands}
          onAddCategory={(name) => setCategories((c) => [...c, name])}
          onAddBrand={(name) => setBrands((b) => [...b, name])}
          onImageError={(message) => setErrors((e) => ({ ...e, images: message }))}
        />
        {errors.images && <Notice tone="error">{errors.images}</Notice>}
      </FormDrawer>
    </div>
  )
}
