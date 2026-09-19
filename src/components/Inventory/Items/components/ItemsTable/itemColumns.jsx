import { createColumnHelper } from '@tanstack/react-table'
import { listFeatures } from '@/components/data/DataTable'
import { StatusPill } from '@/components/data/StatusPill'
import { formatPrice, initialsOf } from '@/lib/format'
import { LOW_STOCK_THRESHOLD } from '@/mocks/items'
import { ItemRowActions } from './ItemRowActions'

const helper = createColumnHelper(listFeatures)

/** Column ids + labels for the ⚙ column settings menu. */
export const ITEM_COLUMN_OPTIONS = [
  { id: 'name', label: 'Item', required: true },
  { id: 'category', label: 'Category' },
  { id: 'brand', label: 'Brand' },
  { id: 'unit', label: 'Unit' },
  { id: 'mrp', label: 'MRP' },
  { id: 'sellPrice', label: 'Sell price' },
  { id: 'gst', label: 'GST %' },
  { id: 'hsn', label: 'HSN' },
  { id: 'stock', label: 'Stock' },
  { id: 'status', label: 'Status', required: true },
]

/** Hidden until switched on in ⚙. */
export const DEFAULT_ITEM_COLUMN_VISIBILITY = { brand: false, hsn: false }

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
export function buildItemColumns({ onEdit, onToggleStatus, onDelete }) {
  return helper.columns([
    helper.accessor('name', {
      header: 'Item',
      cell: ({ row }) => {
        const item = row.original
        const image = item.images?.[0]?.url
        return (
          <div className="flex min-w-[15rem] items-center gap-3">
            {image ? (
              <img src={image} alt="" className="size-10 shrink-0 rounded-lg border border-mint-pale object-cover" />
            ) : (
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-mint-pale text-xs font-bold text-forest" aria-hidden>
                {initialsOf(item.name.replace(/^Nirog\s+/, ''))}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold text-black">{item.name}</p>
              <p className="truncate font-mono text-xs text-ink-muted">{item.code || '—'}</p>
            </div>
          </div>
        )
      },
    }),
    helper.accessor('category', { header: 'Category', cell: (info) => info.getValue() || '—' }),
    helper.accessor('brand', { header: 'Brand', cell: (info) => info.getValue() || '—' }),
    helper.accessor('unit', { header: 'Unit', cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span> }),
    helper.accessor('mrp', {
      header: 'MRP',
      meta: { align: 'right' },
      cell: (info) => (info.getValue() ? <span className="font-mono tabular-nums">{formatPrice(info.getValue())}</span> : '—'),
    }),
    helper.accessor('sellPrice', {
      header: 'Sell price',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <span className="inline-flex flex-col items-end">
          <span className="font-mono font-medium text-black tabular-nums">{formatPrice(row.original.sellPrice)}</span>
          <span className="text-xs text-ink-muted">{row.original.sellTaxMode === 'INCL' ? 'incl. tax' : 'excl. tax'}</span>
          {row.original.offerText && <span className="text-xs font-semibold text-green-deep">{row.original.offerText}</span>}
        </span>
      ),
    }),
    helper.accessor('gst', {
      header: 'GST',
      meta: { align: 'center' },
      cell: (info) => <span className="font-mono">{info.getValue()}%</span>,
    }),
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
