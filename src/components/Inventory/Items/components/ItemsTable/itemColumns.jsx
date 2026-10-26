import { createColumnHelper } from '@tanstack/react-table'
import { listFeatures } from '@/components/data/DataTable'
import { StatusPill } from '@/components/data/StatusPill'
import { initialsOf } from '@/lib/format'
import { LOW_STOCK_THRESHOLD, quantityUnitFor } from '@/mocks/items'
import { ItemRowActions } from './ItemRowActions'

const helper = createColumnHelper(listFeatures)

/** Column ids + labels for the ⚙ column settings menu. */
export const ITEM_COLUMN_OPTIONS = [
  { id: 'name', label: 'Item', required: true },
  { id: 'category', label: 'Category' },
  { id: 'quantity', label: 'Quantity' },
  { id: 'unit', label: 'Unit' },
  { id: 'hsn', label: 'HSN' },
  { id: 'stock', label: 'Stock' },
  { id: 'status', label: 'Status', required: true },
]

/** Hidden until switched on in ⚙. */
export const DEFAULT_ITEM_COLUMN_VISIBILITY = { hsn: false }

function StockCell({ item }) {
  if (item.stock === 0) return <StatusPill tone="danger">Out of stock</StatusPill>
  const low = item.stock <= LOW_STOCK_THRESHOLD
  return (
    <span className="inline-flex flex-col items-end">
      <span className="font-mono font-medium text-black tabular-nums">
        {item.stock.toLocaleString('en-IN')} <span className="font-sans text-xs font-normal text-ink-muted">{item.unit}</span>
      </span>
      {low && <span className="text-xs font-semibold text-warning">Low stock</span>}
    </span>
  )
}

/** Columns for the Items table. Handlers come from the page. */
export function buildItemColumns({ onEdit, onToggleStatus, onDelete, onImage }) {
  return helper.columns([
    helper.accessor('name', {
      header: 'Item',
      cell: ({ row }) => {
        const item = row.original
        const image = item.images?.[0]?.url
        return (
          <div className="flex min-w-[15rem] items-center gap-3">
            {image ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onImage(item)
                }}
                title={`See ${item.name} larger`}
                className="shrink-0 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                <img
                  src={image}
                  alt={item.name}
                  className="size-10 rounded-lg border border-mint-pale object-cover transition-transform hover:scale-110"
                />
              </button>
            ) : (
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-mint-pale text-xs font-bold text-forest" aria-hidden>
                {initialsOf(item.name.replace(/^Nirog\s+/, ''))}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold text-black">{item.name}</p>
              {item.code && <p className="truncate font-mono text-xs text-ink-muted">{item.code}</p>}
              {/* The scheme used to ride under the MRP, which is no longer a column. */}
              {item.offerText && <p className="truncate text-xs font-semibold text-green-deep">{item.offerText}</p>}
            </div>
          </div>
        )
      },
    }),
    helper.accessor('category', { header: 'Category', cell: (info) => info.getValue() || '—' }),
    helper.accessor('quantity', {
      header: 'Quantity',
      meta: { align: 'right' },
      cell: ({ row }) =>
        row.original.quantity ? (
          <span className="font-mono tabular-nums">
            {row.original.quantity} <span className="font-sans text-xs text-ink-muted">{quantityUnitFor(row.original.category)}</span>
          </span>
        ) : (
          '—'
        ),
    }),
    helper.accessor('unit', { header: 'Unit', cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span> }),
    helper.accessor('hsn', { header: 'HSN', cell: (info) => <span className="font-mono text-xs">{info.getValue() || '—'}</span> }),
    helper.accessor('stock', {
      header: 'Stock',
      meta: { align: 'right' },
      cell: ({ row }) => <StockCell item={row.original} />,
    }),
    helper.accessor('status', {
      header: 'Status',
      cell: (info) =>
        info.getValue() === 'ACTIVE' ? <StatusPill tone="success">Active</StatusPill> : <StatusPill tone="neutral">Draft</StatusPill>,
    }),
    helper.display({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      meta: { align: 'right', className: 'w-12' },
      cell: ({ row }) => (
        <ItemRowActions item={row.original} onEdit={onEdit} onToggleStatus={onToggleStatus} onDelete={onDelete} />
      ),
    }),
  ])
}
