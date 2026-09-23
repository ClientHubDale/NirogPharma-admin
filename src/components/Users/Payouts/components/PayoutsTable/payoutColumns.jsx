import { createColumnHelper } from '@tanstack/react-table'
import { BadgeIndianRupee, CheckCircle2, Pencil, RotateCcw } from 'lucide-react'
import { listFeatures } from '@/components/data/DataTable'
import { RowActions } from '@/components/data/RowActions'
import { StatusPill } from '@/components/data/StatusPill'
import { formatPrice } from '@/lib/format'
import { PAYOUT_STATUS } from '../../payoutModel'

const helper = createColumnHelper(listFeatures)
const money = (value) => <span className="font-mono text-sm whitespace-nowrap text-ink tabular-nums">{formatPrice(value)}</span>
const ACTION_ICONS = { DRAFT: RotateCcw, APPROVED: CheckCircle2, PAID: BadgeIndianRupee }

/** row = { id, user, calculated, totals, payout, edited } */
export function buildPayoutColumns({ onEdit, onSetStatus }) {
  return helper.columns([
    helper.accessor((r) => r.user.name, {
      id: 'user',
      header: 'User',
      cell: ({ row, getValue }) => (
        <div className="min-w-[10rem]">
          <p className="font-semibold text-black uppercase">{getValue()}</p>
          <p className="text-xs text-ink-muted">{row.original.user.designation || '—'}</p>
        </div>
      ),
    }),
    helper.accessor((r) => r.calculated.presentDays, {
      id: 'days',
      header: 'Days · distance',
      meta: { align: 'right' },
      cell: ({ row, getValue }) => (
        <div className="whitespace-nowrap">
          <span className="font-mono text-sm">
            {getValue()}
            <span className="text-ink-muted">/{row.original.calculated.workingDays}</span>
          </span>
          <p className="font-mono text-xs text-ink-muted">{row.original.calculated.distanceKm} km</p>
        </div>
      ),
    }),
    helper.accessor((r) => r.totals.salary, { id: 'salary', header: 'Salary', meta: { align: 'right' }, cell: (i) => money(i.getValue()) }),
    helper.accessor((r) => r.totals.ta, { id: 'ta', header: 'TA', meta: { align: 'right' }, cell: (i) => money(i.getValue()) }),
    helper.accessor((r) => r.totals.da, { id: 'da', header: 'DA', meta: { align: 'right' }, cell: (i) => money(i.getValue()) }),
    helper.accessor((r) => r.totals.incentive, { id: 'incentive', header: 'Incentive', meta: { align: 'right' }, cell: (i) => money(i.getValue()) }),
    helper.accessor((r) => r.totals.net, {
      id: 'net',
      header: 'Net payable',
      meta: { align: 'right' },
      cell: ({ row, getValue }) => (
        <div>
          <span className="font-mono font-semibold whitespace-nowrap text-black tabular-nums">{formatPrice(getValue())}</span>
          {Boolean(row.original.totals.bonuses - row.original.totals.deductions) && (
            <p className="font-mono text-[0.7rem] text-ink-muted">
              {row.original.totals.bonuses - row.original.totals.deductions > 0 ? '+' : '−'} {formatPrice(Math.abs(row.original.totals.bonuses - row.original.totals.deductions))} adj.
            </p>
          )}
          {row.original.edited && <p className="text-[0.7rem] font-semibold text-warning-ink">Edited</p>}
        </div>
      ),
    }),
    helper.accessor((r) => r.payout.status, {
      id: 'status',
      header: 'Status',
      cell: (i) => {
        const status = PAYOUT_STATUS[i.getValue()]
        return <StatusPill tone={status.tone}>{status.label}</StatusPill>
      },
    }),
    helper.display({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      meta: { align: 'right', className: 'w-12' },
      cell: ({ row }) => {
        const { payout, user } = row.original
        const actions = [{ label: 'Edit', icon: Pencil, onSelect: () => onEdit(row.original) }]
        for (const next of ['APPROVED', 'PAID', 'DRAFT']) {
          if (next === payout.status) continue
          actions.push({ label: PAYOUT_STATUS[next].action, icon: ACTION_ICONS[next], onSelect: () => onSetStatus(row.original, next) })
        }
        return <RowActions label={`Actions for ${user.name}`} actions={actions} />
      },
    }),
  ])
}
