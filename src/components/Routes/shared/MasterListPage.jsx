import { useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { FileSpreadsheet, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { listFeatures } from '@/components/data/DataTable'
import { DataTable } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ImportDialog } from '@/components/data/ImportDialog'
import { Notice } from '@/components/data/Notice'
import { PageHeader } from '@/components/data/PageHeader'
import { Pagination } from '@/components/data/Pagination'
import { SearchInput } from '@/components/data/SearchInput'
import { Modal } from '@/components/common/Modal'
import { SelectField } from '@/components/form/SelectField'
import { TextField } from '@/components/form/TextField'
import { Button } from '@/components/ui/button'
import { parseCSV } from '@/lib/csv'
import { buildWorkbook, downloadWorkbook, readWorkbookRows } from '@/lib/xlsx'
import { recordDeleted, recordRestored, recordSaved, recordsImported } from '@/store/geographySlice'

const helper = createColumnHelper(listFeatures)
const norm = (s) => String(s ?? '').trim().toLowerCase()

/**
 * Routes masters (Regions, Cities, Areas) — one list with a search, optional
 * dropdown filters, a create/edit dialog and row edit/delete buttons.
 * `config` (see the tab folders) says what the columns, filters and fields are.
 */
export default function MasterListPage({ config }) {
  const dispatch = useDispatch()
  const rows = useSelector(config.select)
  const ctx = config.useContext()

  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({})
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [dialog, setDialog] = useState(null) // { form, errors, editingId }
  const [importOpen, setImportOpen] = useState(false)
  const [notice, setNotice] = useState(null)

  const filterDefs = useMemo(() => config.filters?.(ctx, filters) ?? [], [config, ctx, filters])
  const filtered = useMemo(() => {
    const q = norm(search)
    return rows.filter((row) => {
      for (const f of filterDefs) if (filters[f.id] && !f.match(row, filters[f.id], ctx)) return false
      return !q || config.searchText(row, ctx).toLowerCase().includes(q)
    })
  }, [rows, search, filters, filterDefs, ctx, config])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pagination.pageSize))
  const page = pagination.pageIndex < pageCount ? pagination : { ...pagination, pageIndex: pageCount - 1 }

  const openCreate = () => setDialog({ editingId: null, errors: {}, form: config.emptyForm(filters) })
  const openEdit = (row) => setDialog({ editingId: row.id, errors: {}, form: config.toForm(row) })

  const save = () => {
    const found = config.validate(dialog.form, { ...ctx, rows, editingId: dialog.editingId })
    if (Object.keys(found).some((k) => found[k])) return setDialog((d) => ({ ...d, errors: found }))
    const record = config.toRecord(dialog.form, dialog.editingId ?? `${config.idPrefix}${Date.now()}`)
    dispatch(recordSaved({ kind: config.kind, record }))
    setDialog(null)
    setNotice({ tone: 'success', message: `${record.name} ${dialog.editingId ? 'updated' : 'added'}.` })
  }

  const remove = (row) => {
    const blocked = config.inUse?.(row, ctx)
    if (blocked) return setNotice({ tone: 'warning', message: blocked })
    const index = rows.findIndex((r) => r.id === row.id)
    dispatch(recordDeleted({ kind: config.kind, id: row.id }))
    setNotice({
      tone: 'success',
      message: `${row.name} deleted.`,
      undo: () => {
        dispatch(recordRestored({ kind: config.kind, record: row, index }))
        setNotice({ tone: 'success', message: `${row.name} restored.` })
      },
    })
  }

  const columns = useMemo(() => {
    const cols = []
    if (config.serial)
      cols.push(
        helper.display({
          id: 'sno',
          header: 'S.No',
          meta: { className: 'w-16' },
          cell: ({ row }) => <span className="font-mono text-xs text-ink-muted">{row.index + 1}</span>,
        }),
      )
    for (const c of config.columns(ctx)) {
      cols.push(
        helper.accessor(c.value, {
          id: c.id,
          header: c.header,
          cell: (i) =>
            c.id === 'name' ? (
              <div>
                <p className="font-semibold text-black uppercase">{i.getValue()}</p>
                {c.sub?.(i.row.original) && <p className="text-xs text-ink-muted">{c.sub(i.row.original)}</p>}
              </div>
            ) : (
              <span className="text-ink uppercase">{i.getValue() || '—'}</span>
            ),
        }),
      )
    }
    cols.push(
      helper.display({
        id: 'actions',
        header: 'Action',
        meta: { className: 'w-28' },
        cell: ({ row }) => (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label={`Edit ${row.original.name}`}
              onClick={() => openEdit(row.original)}
              className="grid size-9 place-items-center rounded-lg border border-mint bg-white text-ink-muted hover:border-green-fresh hover:text-green-deep focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              aria-label={`Delete ${row.original.name}`}
              onClick={() => remove(row.original)}
              className="grid size-9 place-items-center rounded-lg border border-mint bg-white text-ink-muted hover:border-danger hover:text-danger focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ),
      }),
    )
    return helper.columns(cols)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, ctx, rows])

  /* ── import / export (Areas) ── */

  const exportRows = async () => {
    const wb = await buildWorkbook({
      sheetName: config.title,
      columns: config.sheetColumns,
      rows: filtered.map((row) => config.toSheetRow(row, ctx)),
    })
    await downloadWorkbook(`nirog-${config.title.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.xlsx`, wb)
    setNotice({ tone: 'success', message: `Exported ${filtered.length} ${filtered.length === 1 ? config.noun : config.plural}.` })
  }

  const downloadSample = async () => {
    const wb = await buildWorkbook({ sheetName: config.title, columns: config.sheetColumns, rows: config.sampleRows, blankRows: 30 })
    await downloadWorkbook(`nirog-sample-import-${config.plural}.xlsx`, wb)
  }

  /** Throws to keep the Import dialog open when nothing could be imported. */
  const importFile = async (file) => {
    let sheetRows
    try {
      sheetRows = /\.xlsx$/i.test(file.name) ? await readWorkbookRows(file) : parseCSV(await file.text())
    } catch {
      throw new Error('Couldn’t read this file. Open it in Excel and save it again as .xlsx, then retry.')
    }
    if (sheetRows.length === 0) throw new Error('The file has no rows under the header. Use Download Sample for the format.')
    const { records, skipped } = config.fromSheet(sheetRows, { ...ctx, rows })
    const reasons = skipped.slice(0, 5).map((x) => `Line ${x.line}: ${x.reason}`)
    if (!records.length) throw new Error(`No ${config.plural} imported. ${reasons.join(' · ')}`)
    dispatch(recordsImported({ kind: config.kind, records }))
    setNotice({
      tone: 'success',
      message: `Imported ${records.length} ${records.length === 1 ? config.noun : config.plural}${skipped.length ? `, skipped ${skipped.length}. ${reasons.join(' · ')}` : '.'}`,
    })
  }

  const fields = config.fields(ctx, dialog?.form ?? {})
  const setField = (id, value) =>
    setDialog((d) => {
      const form = { ...d.form, [id]: value }
      // e.g. changing Region empties the City that belonged to the old one.
      for (const key of fields.find((f) => f.id === id)?.clears ?? []) form[key] = ''
      return { ...d, form, errors: { ...d.errors, [id]: undefined } }
    })

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title={config.title} subtitle={`${filtered.length} ${filtered.length === 1 ? config.noun : config.plural}`}>
        {config.sheetColumns && (
          <>
            <Button variant="outline" size="lg" className="h-11" onClick={exportRows} disabled={!filtered.length}>
              <FileSpreadsheet data-icon="inline-start" /> Export
            </Button>
            <Button variant="outline" size="lg" className="h-11" onClick={() => setImportOpen(true)}>
              <Upload data-icon="inline-start" /> Import
            </Button>
          </>
        )}
        <Button size="lg" className="h-11" onClick={openCreate}>
          <Plus data-icon="inline-start" /> New
        </Button>
      </PageHeader>

      {notice && (
        <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.message}
          {notice.undo && (
            <button type="button" onClick={notice.undo} className="ml-2 font-semibold underline underline-offset-4">Undo</button>
          )}
        </Notice>
      )}

      <section className="overflow-hidden rounded-2xl border border-mint-pale bg-white">
        <div className="flex flex-col gap-3 border-b border-mint-pale p-4 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPagination((s) => ({ ...s, pageIndex: 0 })) }} placeholder={config.searchPlaceholder} className="sm:w-72" />
          {filterDefs.map((f) => (
            <SelectField
              key={f.id}
              id={`flt-${f.id}`}
              aria-label={f.label}
              placeholder={f.label}
              clearable
              options={f.options}
              value={filters[f.id] ?? ''}
              onChange={(v) => {
                setFilters((s) => ({ ...s, [f.id]: v, ...Object.fromEntries((f.clears ?? []).map((k) => [k, ''])) }))
                setPagination((s) => ({ ...s, pageIndex: 0 }))
              }}
              className="sm:w-56"
            />
          ))}
          <Pagination
            pageIndex={page.pageIndex}
            pageSize={page.pageSize}
            total={filtered.length}
            onPageChange={(pageIndex) => setPagination((s) => ({ ...s, pageIndex }))}
            className="justify-between sm:ml-auto sm:justify-end"
          />
        </div>
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(r) => r.id}
          pagination={page}
          onPaginationChange={setPagination}
          onRowClick={openEdit}
          empty={
            <EmptyState
              icon={config.icon}
              title={search || Object.values(filters).some(Boolean) ? `No ${config.plural} match` : `No ${config.plural} yet`}
              description={config.emptyText}
            >
              <Button size="lg" onClick={openCreate}>
                <Plus data-icon="inline-start" /> New {config.noun}
              </Button>
            </EmptyState>
          }
        />
      </section>

      <Modal
        open={Boolean(dialog)}
        onOpenChange={(open) => !open && setDialog(null)}
        title={`${dialog?.editingId ? 'Edit' : 'Create'} ${config.noun[0].toUpperCase()}${config.noun.slice(1)}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="lg" onClick={() => setDialog(null)}>Cancel</Button>
            <Button type="button" size="lg" onClick={save}>Save</Button>
          </div>
        }
      >
        {dialog && (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {fields.map((f) =>
              f.type === 'select' ? (
                <SelectField
                  key={f.id}
                  id={`fld-${f.id}`}
                  label={f.label}
                  required
                  placeholder={f.placeholder}
                  options={f.options}
                  value={dialog.form[f.id] ?? ''}
                  onChange={(v) => setField(f.id, v)}
                  error={dialog.errors[f.id]}
                  className={f.full ? 'sm:col-span-2' : undefined}
                />
              ) : (
                <TextField
                  key={f.id}
                  id={`fld-${f.id}`}
                  label={f.label}
                  required
                  size="md"
                  placeholder={f.placeholder}
                  value={dialog.form[f.id] ?? ''}
                  onChange={(e) => setField(f.id, e.target.value)}
                  error={dialog.errors[f.id]}
                  className={f.full ? 'sm:col-span-2' : undefined}
                />
              ),
            )}
            <button type="submit" className="hidden" />
          </form>
        )}
      </Modal>

      {config.sheetColumns && (
        <ImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          title={`Import ${config.plural}`}
          requiredNote={config.importRequiredNote}
          onDownloadSample={downloadSample}
          onSubmit={importFile}
        />
      )}
    </div>
  )
}
