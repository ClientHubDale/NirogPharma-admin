import { TrendingDown, TrendingUp } from 'lucide-react'
import { formatPrice } from '@/lib/format'
import { adjustedPrice, listPriceFor } from '../../priceListModel'

const SHOW = 8

/** Preview of a percentage strategy on the first few active items. */
export function PercentPreview({ items, strategy, percent }) {
  const active = items.filter((i) => i.status === 'ACTIVE')
  const valid = Number(percent) > 0
  const Icon = strategy === 'INCREASE' ? TrendingUp : TrendingDown

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-mint bg-mint-pale p-4 text-sm text-forest">
        <Icon className="mt-0.5 size-5 shrink-0" />
        <p>
          {valid ? (
            <>
              Every item’s price will be its catalog price{' '}
              <span className="font-semibold">
                {strategy === 'INCREASE' ? 'plus' : 'minus'} {percent}%
              </span>
              . New items added to the catalog later are included automatically.
            </>
          ) : (
            'Enter a percentage to preview the new prices.'
          )}
        </p>
      </div>
      {valid && (
        <div className="relative overflow-x-auto rounded-xl border border-mint-pale">
          <table className="w-full min-w-[30rem] text-sm">
            <thead className="bg-bg">
              <tr className="border-b border-mint-pale text-left text-xs font-semibold tracking-wide text-ink-muted uppercase">
                <th className="px-4 py-2.5">Item</th>
                <th className="px-3 py-2.5 text-right">Catalog</th>
                <th className="px-4 py-2.5 text-right">In this list</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mint-pale">
              {active.slice(0, SHOW).map((item) => {
                const overMrp = item.mrp && adjustedPrice(item.sellPrice, strategy, percent) > item.mrp
                const price = listPriceFor(item, strategy, percent)
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-2.5 font-medium text-black">{item.name}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-ink-muted">{formatPrice(item.sellPrice)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium text-black">
                      {formatPrice(price)}
                      {overMrp && <span className="ml-1.5 text-xs font-sans font-semibold text-warning">capped at MRP</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {active.length > SHOW && (
            <p className="border-t border-mint-pale bg-bg px-4 py-2.5 text-xs text-ink-muted">…and {active.length - SHOW} more active items.</p>
          )}
        </div>
      )}
    </div>
  )
}
