import { useState } from 'react'
import { CircleCheck, CircleDashed, IndianRupee, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { PRICE_TIERS, priceFor } from '@/constants/priceTiers'
import { formatPrice } from '@/lib/format'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/** ⋯ menu at the end of an item row. Stops clicks from also opening the row. */
export function ItemRowActions({ item, onEdit, onToggleStatus, onDelete }) {
  const active = item.status === 'ACTIVE'
  const [pricesOpen, setPricesOpen] = useState(false)

  /** Stored price if there is one, else the formula, else nothing. */
  const stored = Object.fromEntries((item.tierPrices ?? []).map((row) => [row.tier, row]))
  const rows = PRICE_TIERS.map(({ value, label, hint }) => {
    const own = stored[value]
    return { value, label, hint, price: own ? own.price : priceFor(item.mrp, value), custom: Boolean(own?.isCustom) }
  })

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${item.name}`}
          className="grid size-8 place-items-center rounded-md text-ink-muted outline-none hover:bg-mint-pale hover:text-black focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => onEdit(item)} className="gap-2.5">
            <Pencil className="size-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            // Without preventDefault the closing menu dismisses the dialog it
            // just opened.
            onSelect={(event) => {
              event.preventDefault()
              setPricesOpen(true)
            }}
            className="gap-2.5"
          >
            <IndianRupee className="size-4" /> View tier prices
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onToggleStatus(item)} className="gap-2.5">
            {active ? <CircleDashed className="size-4" /> : <CircleCheck className="size-4" />}
            {active ? 'Move to draft' : 'Mark as active'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => onDelete(item)} className="gap-2.5">
            <Trash2 className="size-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal
        open={pricesOpen}
        onOpenChange={setPricesOpen}
        title="Tier prices"
        description={`${item.name}${item.mrp ? ` · MRP ${formatPrice(item.mrp)}` : ''}`}
        className="max-w-md"
      >
        <div className="overflow-hidden rounded-xl border border-mint-pale">
          {rows.map(({ value, label, hint, price, custom }, index) => (
            <div
              key={value}
              className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${index > 0 ? 'border-t border-mint-pale' : ''}`}
            >
              <div>
                <p className="text-sm font-semibold text-ink">{label}</p>
                <p className="text-xs text-ink-muted">{custom ? 'Custom price' : hint}</p>
              </div>
              <p className="font-mono text-sm font-semibold text-black">{price === null ? '—' : formatPrice(price)}</p>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
