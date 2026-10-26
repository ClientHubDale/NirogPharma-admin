import { useEffect, useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { FileMinus2 } from 'lucide-react'
import { DataTable, listFeatures } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { Notice } from '@/components/data/Notice'
import { PageHeader } from '@/components/data/PageHeader'
import { Pagination } from '@/components/data/Pagination'
import { SearchInput } from '@/components/data/SearchInput'
import { StatusPill } from '@/components/data/StatusPill'
import { formatINR } from '@/lib/format'
import * as creditNotesService from '@/services/creditNotesService'

const helper = createColumnHelper(listFeatures)
const PAGE_SIZE = 20
const dmy = (iso) => (iso ? iso.split('-').reverse().join('-') : '—')

/**
 * Sales › Credit Notes — what we owe distributors for stock they sent back.
 *
 * Nothing is created here: a note is raised by the return itself, on Distributor
 * Stocks. "उनका डेबिट नोट आएगा… हम क्रेडिट नोट शो करेंगे" — their debit note is
 * this, and it carries its own number, never the bill's.
 */
export default function CreditNotes() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })

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
              <p className="truncate">{row.original.itemName}</p>
              <p className="truncate font-mono text-xs text-ink-muted">
                {row.original.batchNo}
                {row.original.itemCode ? ` · ${row.original.itemCode}` : ''}
              </p>
            </div>
          ),
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
      ]),
    [],
  )

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Credit Notes"
        subtitle={`${filtered.length} ${filtered.length === 1 ? 'note' : 'notes'} · ${formatINR(owed)} owed back`}
      />

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
          A credit note is raised by a return on Distributor Stocks — it is not created here.
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
            pagination={page}
            onPaginationChange={setPagination}
            empty={
              <EmptyState
                icon={FileMinus2}
                title={search ? 'No credit notes match' : 'No credit notes yet'}
                description={
                  search
                    ? 'Nothing matches that search.'
                    : 'When a distributor sends stock back, recording the return on Distributor Stocks raises the credit note here.'
                }
              >
                {!search && <StatusPill tone="neutral">Stocks › Distributor Stocks › ⋯ › Record a return</StatusPill>}
              </EmptyState>
            }
          />
        )}
      </section>
    </div>
  )
}
