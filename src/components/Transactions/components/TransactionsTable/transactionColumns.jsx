import { createColumnHelper } from '@tanstack/react-table'
import { ArrowRightLeft, CheckCircle2, CircleDot, Copy, Pencil, RotateCcw, Trash2, XCircle } from 'lucide-react'
import { listFeatures } from '@/components/data/DataTable'
import { RowActions } from '@/components/data/RowActions'
import { StatusPill } from '@/components/data/StatusPill'
import { formatPrice } from '@/lib/format'

const helper = createColumnHelper(listFeatures)
const dmy = (iso) => iso.split('-').reverse().join('-')
const TONE_ICONS = { success: CheckCircle2, danger: XCircle, warning: RotateCcw }

export const TRANSACTION_COLUMN_OPTIONS = [
  { id: 'date', label: 'Date' },
  { id: 'number', label: 'Transaction No', required: true },
  { id: 'party', label: 'Party Name', required: true },
  { id: 'gstin', label: 'GSTIN' },
  { id: 'total', label: 'Amount' },
  { id: 'due', label: 'Due' },
  { id: 'comment', label: 'Comment' },
  { id: 'createdBy', label: 'Created By' },
  { id: 'status', label: 'Status' },
]
export const DEFAULT_TRANSACTION_VISIBILITY = { gstin: false }

/**
 * row = { ...doc, party, totals, creatorName }
 * convertTargets = [{ type, noun }] from config.convertsTo
 */
export function buildTransactionColumns({ config, convertTargets = [], onEdit, onDuplicate, onConvert, onSetStatus, onDelete }) {
  const statusOf = Object.fromEntries(config.statuses.map((s) => [s.value, s]))
  const excluded = new Set(config.excludedStatuses)
  const columns = [
    helper.accessor('date', { header: 'Date', cell: (i) => <span className="font-mono text-xs whitespace-nowrap">{dmy(i.getValue())}</span> }),
    helper.accessor('number', { header: 'Transaction No', cell: (i) => <span className="font-mono text-xs font-semibold whitespace-nowrap text-black">{i.getValue()}</span> }),
    helper.accessor((r) => r.party?.name ?? 'Deleted party', {
      id: 'party',
      header: 'Party Name',
      cell: ({ row, getValue }) => (
        <div className="min-w-[10rem]">
          <p className="font-semibold text-black">{getValue()}</p>
          <p className="text-xs text-ink-muted">{row.original.lines.length} item{row.original.lines.length === 1 ? '' : 's'} · {row.original.totals.qty} units</p>
        </div>
      ),
    }),
    helper.accessor((r) => r.party?.gstin ?? '', { id: 'gstin', header: 'GSTIN', cell: (i) => <span className="font-mono text-xs">{i.getValue() || '—'}</span> }),
    helper.accessor((r) => r.totals.total, {
      id: 'total',
      header: 'Amount',
      meta: { align: 'right' },
      cell: (i) => <span className="font-mono font-medium whitespace-nowrap text-black tabular-nums">{formatPrice(i.getValue())}</span>,
    }),
    helper.accessor((r) => (excluded.has(r.status) ? 0 : r.totals.total - (r.received ?? 0)), {
      id: 'due',
      header: 'Due',
      meta: { align: 'right' },
      cell: (i) => <span className="font-mono whitespace-nowrap text-ink tabular-nums">{formatPrice(i.getValue())}</span>,
    }),
    helper.accessor('comment', {
      header: 'Comment',
      enableSorting: false,
      meta: { className: 'max-w-[11rem]' },
      cell: (i) => <span title={i.getValue()} className="block truncate text-ink">{i.getValue()}</span>,
    }),
    helper.accessor('creatorName', { header: 'Created By', cell: (i) => <span className="text-xs font-semibold whitespace-nowrap text-black uppercase">{i.getValue()}</span> }),

    ...(config.statuses.length
      ? [
          helper.accessor('status', {
            header: 'Status',
            cell: (i) => {
              const s = statusOf[i.getValue()]
              return <StatusPill tone={s?.tone ?? 'neutral'}>{s?.label ?? i.getValue()}</StatusPill>
            },
          }),
        ]
      : []),
    helper.display({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      meta: { align: 'right', className: 'w-12' },
      cell: ({ row }) => {
        const d = row.original
        const actions = [{ label: 'Edit', icon: Pencil, onSelect: () => onEdit(d) }]
        config.statuses
          .filter((s) => s.value !== d.status)
          .forEach((s) => actions.push({ label: s.action, icon: TONE_ICONS[s.tone] ?? CircleDot, onSelect: () => onSetStatus(d, s.value) }))
        if (!excluded.has(d.status))
          convertTargets.forEach((t, i) =>
            actions.push({ label: `Convert to ${t.noun}`, icon: ArrowRightLeft, onSelect: () => onConvert(d, t.type), separatorBefore: i === 0 }),
          )
        actions.push({ label: 'Duplicate', icon: Copy, onSelect: () => onDuplicate(d), separatorBefore: !convertTargets.length || excluded.has(d.status) })
        actions.push({ label: 'Delete', icon: Trash2, onSelect: () => onDelete(d), destructive: true, separatorBefore: true })
        return <RowActions label={`Actions for ${d.number}`} actions={actions} />
      },
    }),
  ]
  return helper.columns(columns)
}
