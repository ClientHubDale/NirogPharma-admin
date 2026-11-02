import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { createColumnHelper } from '@tanstack/react-table'
import { Ban, Download, FileMinus2, FileText, Pencil, Plus, Send } from 'lucide-react'
import { DataTable, listFeatures } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { Notice } from '@/components/data/Notice'
import { PageHeader } from '@/components/data/PageHeader'
import { Pagination } from '@/components/data/Pagination'
import { SearchInput } from '@/components/data/SearchInput'
import { RowActions } from '@/components/data/RowActions'
import { StatusPill } from '@/components/data/StatusPill'
import { useToast } from '@/components/common/Toast'
import { Button } from '@/components/ui/button'
import { selectUser } from '@/store/authSlice'
import { formatINR } from '@/lib/format'
import { basePathFor, STATUS_LABEL, STATUS_TONE } from './creditNoteModel'
import * as creditNotesService from '@/services/creditNotesService'

const helper = createColumnHelper(listFeatures)
const PAGE_SIZE = 20
const dmy = (iso) => (iso ? iso.split('-').reverse().join('-') : '—')

/**
 * Sales › Credit Notes — what we owe distributors for stock they sent back.
 *
 * This is where a sales return lives now: the note is the document the client
 * actually raises, so the two menu entries became one. A note is written here
 * the way a bill is written, and a return recorded on Distributor Stocks
 * raises one too. "उनका डेबिट नोट आएगा… हम क्रेडिट नोट शो करेंगे" — their
 * debit note is this, and it carries its own number, never the bill's.
 */
export default function CreditNotes() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })
  const toast = useToast()
  const navigate = useNavigate()
  const base = basePathFor(useLocation().pathname)
  const isOffice = useSelector(selectUser)?.role !== 'DISTRIBUTOR'

  useEffect(() => {
    let alive = true
    creditNotesService
      .listCreditNotes({ limit: 200 })
      .then(({ notes: rows }) => alive && setNotes(rows))
      .catch((e) => alive && setError(creditNotesService.errorFrom(e).message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return notes
    return notes.filter((n) =>
      [n.noteNo, n.distributorName, n.itemName, n.batchNo, n.againstInvoiceNo].some((v) => (v ?? '').toLowerCase().includes(q)),
    )
  }, [notes, search])

  const owed = filtered.reduce((sum, n) => sum + Number(n.total || 0), 0)

  /** The note as it prints, on its own page — and the PDF, from the same page. */
  const openNote = (note, print = false) =>
    window.open(`${base}/${note.id}/print${print ? '?print=1' : ''}`, '_blank', 'noopener')

  /** Issuing is what brings the goods back onto our shelf. */
  const issue = async (note) => {
    try {
      const fresh = await creditNotesService.issueCreditNote(note.id)
      setNotes((rows) => rows.map((row) => (row.id === note.id ? { ...row, status: fresh.status } : row)))
      toast({ tone: 'success', title: `${note.noteNo} issued — the stock is back with us` })
    } catch (e) {
      toast({ tone: 'danger', title: creditNotesService.errorFrom(e).message })
    }
  }

  /**
   * A return recorded by mistake has to be undoable: cancelling takes the note
   * away and puts the goods back on the distributor's books.
   */
  const cancel = async (note) => {
    if (!window.confirm(`Cancel ${note.noteNo}? The stock goes back to ${note.distributorName}.`)) return
    try {
      await creditNotesService.cancelCreditNote(note.id)
      setNotes((rows) => rows.filter((row) => row.id !== note.id))
      toast({ tone: 'success', title: `${note.noteNo} cancelled` })
    } catch (e) {
      toast({ tone: 'danger', title: creditNotesService.errorFrom(e).message })
    }
  }

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor('noteNo', {
          header: 'Credit Note',
          cell: ({ row }) => (
            <div className="min-w-[9rem]">
              <p className="font-mono text-sm font-bold text-black">{row.original.noteNo}</p>
              <p className="text-xs text-ink-muted">{dmy(row.original.at)}</p>
            </div>
          ),
        }),
        helper.accessor('distributorName', {
          header: 'Distributor',
          cell: (i) => <span className="font-semibold text-black">{i.getValue() || '—'}</span>,
        }),
        helper.accessor('itemName', {
          header: 'Item',
          cell: ({ row }) => (
            <div className="min-w-[11rem]">
              <p className="truncate">
                {row.original.itemName}
                {/* A note typed by hand carries several items; the table names
                    the first and counts the rest. */}
                {row.original.lineCount > 1 && (
                  <span className="text-ink-muted"> +{row.original.lineCount - 1} more</span>
                )}
              </p>
              <p className="truncate font-mono text-xs text-ink-muted">
                {row.original.batchNo}
                {row.original.itemCode ? ` · ${row.original.itemCode}` : ''}
              </p>
            </div>
          ),
        }),
        helper.accessor('status', {
          header: 'Status',
          cell: (i) => <StatusPill tone={STATUS_TONE[i.getValue()]}>{STATUS_LABEL[i.getValue()] ?? i.getValue()}</StatusPill>,
        }),
        helper.accessor('againstInvoiceNo', {
          header: 'Against bill',
          cell: (i) => <span className="font-mono text-xs text-ink-muted">{i.getValue() || '—'}</span>,
        }),
        helper.accessor('quantity', {
          header: 'Came back',
          meta: { align: 'right' },
          cell: ({ row }) => (
            <span className="inline-flex flex-col items-end">
              <span className="font-mono font-semibold tabular-nums">{row.original.quantity}</span>
              <span className="text-xs text-ink-muted">{row.original.unit}</span>
            </span>
          ),
        }),
        helper.accessor('rate', {
          header: 'Rate',
          meta: { align: 'right' },
          cell: ({ row }) => (
            <span className="inline-flex flex-col items-end">
              <span className="font-mono tabular-nums">{formatINR(row.original.rate)}</span>
              <span className="text-xs text-ink-muted">+{row.original.gstRate}% GST</span>
            </span>
          ),
        }),
        helper.accessor('total', {
          header: 'We owe',
          meta: { align: 'right' },
          cell: (i) => <span className="font-mono font-bold text-black tabular-nums">{formatINR(i.getValue())}</span>,
        }),
        helper.display({
          id: 'actions',
          header: () => <span className="sr-only">Actions</span>,
          meta: { align: 'right', className: 'w-12' },
          cell: ({ row }) => {
            const note = row.original
            return (
              <div onClick={(e) => e.stopPropagation()}>
                <RowActions
                  label={`Actions for ${note.noteNo}`}
                  actions={[
                    { label: 'Open', icon: Pencil, onSelect: () => navigate(`${base}/${note.id}/edit`) },
                    { label: 'View note', icon: FileText, onSelect: () => openNote(note) },
                    { label: 'Download PDF', icon: Download, onSelect: () => openNote(note, true) },
                    ...(isOffice && note.status === 'PENDING'
                      ? [{ label: 'Issue', icon: Send, separatorBefore: true, onSelect: () => issue(note) }]
                      : []),
                    ...(note.status === 'CANCELLED'
                      ? []
                      : [{ label: 'Cancel note', icon: Ban, destructive: true, separatorBefore: true, onSelect: () => cancel(note) }]),
                  ]}
                />
              </div>
            )
          },
        }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Credit Notes"
        subtitle={`${filtered.length} ${filtered.length === 1 ? 'note' : 'notes'} · ${formatINR(owed)} owed back`}
      >
        <Button onClick={() => navigate(`${base}/new`)}>
          <Plus data-icon="inline-start" /> Create credit note
        </Button>
      </PageHeader>

      {error && <Notice tone="danger">{error}</Notice>}

      <section className="rounded-2xl border border-mint-pale bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            }}
            placeholder="Search note, distributor, item or bill"
            className="sm:max-w-sm"
          />
          <Pagination
            pageIndex={page.pageIndex}
            pageSize={page.pageSize}
            total={filtered.length}
            onPageChange={(pageIndex) => setPagination((p) => ({ ...p, pageIndex }))}
            className="justify-between sm:ml-auto sm:justify-end"
          />
        </div>

        <p className="mb-3 text-xs text-ink-muted">
          Save records the note; Issue is what brings the stock back. A return recorded on Distributor Stocks raises one too.
        </p>

        {loading ? (
          <div className="grid min-h-60 place-items-center" role="status" aria-label="Loading credit notes">
            <span className="size-8 animate-spin rounded-full border-3 border-mint border-t-green-deep" />
          </div>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            getRowId={(row) => row.id}
            onRowClick={(note) => navigate(`${base}/${note.id}/edit`)}
            pagination={page}
            onPaginationChange={setPagination}
            empty={
              <EmptyState
                icon={FileMinus2}
                title={search ? 'No credit notes match' : 'No credit notes yet'}
                description={
                  search
                    ? 'Nothing matches that search.'
                    : 'Write one when a distributor sends stock back — or record the return on Distributor Stocks and the note is raised here.'
                }
              >
                {!search && (
                  <Button onClick={() => navigate(`${base}/new`)}>
                    <Plus data-icon="inline-start" /> Create credit note
                  </Button>
                )}
              </EmptyState>
            }
          />
        )}
      </section>
    </div>
  )
}
