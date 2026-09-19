import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useTable } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { listFeatures } from './features'

const resolve = (updater, current) => (typeof updater === 'function' ? updater(current) : updater)

/**
 * Generic list table. Sorting is internal; pagination and column visibility
 * are controlled by the page so the toolbar and column settings can drive them.
 *
 * Column meta: { align: 'right' | 'center', className, headerClassName }
 */
export function DataTable({
  data,
  columns,
  pagination,
  onPaginationChange,
  columnVisibility,
  onColumnVisibilityChange,
  onRowClick,
  getRowId,
  highlightRowId,
  empty,
}) {
  const table = useTable({
    features: listFeatures,
    data,
    columns,
    getRowId,
    state: { pagination, columnVisibility },
    onPaginationChange: (updater) => onPaginationChange(resolve(updater, pagination)),
    onColumnVisibilityChange: (updater) => onColumnVisibilityChange(resolve(updater, columnVisibility)),
  })

  if (data.length === 0) return empty

  return (
    // `relative` keeps absolutely-positioned children (sr-only labels) inside the
    // scroll box; otherwise they escape it and widen the page on phones.
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[56rem] text-sm">
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id} className="border-b border-mint-pale bg-bg">
              {group.headers.map((header) => {
                const meta = header.column.columnDef.meta ?? {}
                const canSort = header.column.getCanSort()
                const sorted = header.column.getIsSorted()
                const SortIcon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown
                return (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                    className={cn(
                      'px-4 py-3 text-xs font-semibold tracking-wide whitespace-nowrap text-ink-muted uppercase first:pl-5 last:pr-5',
                      meta.align === 'right' ? 'text-right' : meta.align === 'center' ? 'text-center' : 'text-left',
                      meta.headerClassName,
                    )}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          'inline-flex items-center gap-1.5 uppercase hover:text-black',
                          meta.align === 'right' && 'flex-row-reverse',
                          sorted && 'text-black',
                        )}
                      >
                        <table.FlexRender header={header} />
                        <SortIcon className={cn('size-3.5', !sorted && 'opacity-40')} />
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-mint-pale">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              className={cn(
                'transition-colors',
                onRowClick && 'cursor-pointer hover:bg-bg',
                row.id === highlightRowId && 'bg-mint-pale/60',
              )}
            >
              {row.getVisibleCells().map((cell) => {
                const meta = cell.column.columnDef.meta ?? {}
                return (
                  <td
                    key={cell.id}
                    className={cn(
                      'px-4 py-3 align-middle first:pl-5 last:pr-5',
                      meta.align === 'right' ? 'text-right' : meta.align === 'center' ? 'text-center' : 'text-left',
                      meta.className,
                    )}
                  >
                    <table.FlexRender cell={cell} />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
