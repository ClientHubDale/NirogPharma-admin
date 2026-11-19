import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PhotoViewer } from '@/components/common/PhotoViewer'
import { NewGift } from '@/components/form/NewGift'
import { SelectField } from '@/components/form/SelectField'
import { TextField } from '@/components/form/TextField'

/** How many of the catalogue to show before asking for a search term. */
const SHOWN = 10

const CATALOGUE = 'From stock · deducted when given'
const GIVEAWAY = 'Giveaways · not from stock'

const Unit = ({ children }) => (
  <span className="flex h-full items-center border-l border-mint-pale bg-bg px-3.5 text-sm font-medium text-ink-muted">{children}</span>
)

/**
 * "Buy 10, get 1 Pen free."
 *
 * Both numbers are counted in a **selling unit** — 10 bottles, 1 piece — never
 * in the pack's own ml or capsules, because that is what an order line counts
 * in. Neither unit is typed: the buy side takes this item's Unit, the free side
 * takes whatever is being given away. The scheme repeats: buy 20 and two pens
 * come with it.
 *
 * The free thing is either a **catalogue item**, which comes out of factory
 * stock, or a **giveaway** — a pen, a bag — which is not made or sold and never
 * touches stock. The dropdown keeps them apart so it is always clear which.
 */
export function SchemeFields({ form, errors, items, gifts = [], onChange, onAddGift }) {
  const [adding, setAdding] = useState(false)
  // The free item's photo, opened full screen.
  const [gift, setGift] = useState(null)
  const digits = (value) => value.replace(/\D/g, '').slice(0, 5)

  /** `item:<id>` or `gift:<id>` — one field, so only one can ever be chosen. */
  const picked = form.schemeFreeItemId ? `item:${form.schemeFreeItemId}` : form.schemeFreeGiftId ? `gift:${form.schemeFreeGiftId}` : ''

  const free =
    (form.schemeFreeItemId && (items.find((item) => item.id === form.schemeFreeItemId) ?? form.schemeFreeItem)) ||
    (form.schemeFreeGiftId && (gifts.find((gift) => gift.id === form.schemeFreeGiftId) ?? form.schemeFreeGift)) ||
    null

  const choose = (value) => {
    const [kind, id] = value ? value.split(':') : ['', '']
    onChange('schemeFreeItemId', kind === 'item' ? id : '')
    onChange('schemeFreeGiftId', kind === 'gift' ? id : '')
  }

  // In stock first — those are the ones that can actually be given away today.
  const inStock = (item) => Number(item.stock) > 0
  const options = [
    ...[...items].sort((a, b) => Number(inStock(b)) - Number(inStock(a))).map((item) => ({
      value: `item:${item.id}`,
      label: item.name,
      group: CATALOGUE,
      hint: inStock(item)
        ? `${Number(item.stock).toLocaleString('en-IN')} ${item.unit} in stock`
        : `${item.unit || '—'} · out of stock`,
    })),
    ...gifts.map((gift) => ({ value: `gift:${gift.id}`, label: gift.name, group: GIVEAWAY, hint: `${gift.unit} · given away` })),
  ]

  const set = (field) => (e) => onChange(field, digits(e.target.value))
  const sentence =
    form.schemeBuyQty && form.schemeFreeQty && free
      ? `Buy ${form.schemeBuyQty} ${form.unit || 'unit'} — get ${form.schemeFreeQty} ${free.unit || 'unit'} ${free.name} free. Repeats every ${form.schemeBuyQty}.${form.schemeFreeItemId ? ' Comes out of stock.' : ' Not from stock.'}`
      : 'Leave empty for no scheme. The quantities are packs — bottles, boxes, pieces — not ml or capsules.'

  return (
    <div className="sm:col-span-2">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">Scheme</p>
        {/* Only where a giveaway can actually be saved — the order editor shows
            this same form without a catalogue behind it. */}
        {onAddGift && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            aria-label="Add free item"
            className="inline-flex items-center gap-1 text-sm font-semibold text-green-deep hover:underline hover:underline-offset-4"
          >
            <Plus className="size-3.5" /> New
          </button>
        )}
      </div>

      {adding && <NewGift onCancel={() => setAdding(false)} onAdd={onAddGift} onPicked={(id) => choose(`gift:${id}`)} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[8rem_1fr_8rem]">
        <TextField
          id="item-scheme-buy"
          label="Buy"
          size="md"
          inputMode="numeric"
          placeholder="10"
          value={form.schemeBuyQty}
          onChange={set('schemeBuyQty')}
          error={errors.schemeBuyQty}
          suffix={<Unit>{form.unit || '—'}</Unit>}
        />
        <SelectField
          id="item-scheme-item"
          label="Free item"
          placeholder="Search the catalogue"
          clearable
          limit={SHOWN}
          options={options}
          value={picked}
          onChange={choose}
          error={errors.schemeFreeItemId}
        />
        <TextField
          id="item-scheme-free"
          label="Free"
          size="md"
          inputMode="numeric"
          placeholder="1"
          value={form.schemeFreeQty}
          onChange={set('schemeFreeQty')}
          error={errors.schemeFreeQty}
          suffix={<Unit>{free?.unit || '—'}</Unit>}
        />
      </div>

      <div className="mt-2 flex items-center gap-2.5">
        {free?.imageUrl && (
          <button
            type="button"
            onClick={() => setGift({ src: free.imageUrl, name: free.name ?? 'Free item' })}
            title={`See ${free.name ?? 'the free item'} larger`}
            className="shrink-0 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <img
              src={free.imageUrl}
              alt={free.name ?? ''}
              className="size-10 rounded-lg border border-mint-pale object-cover transition-transform hover:scale-110"
            />
          </button>
        )}
        <p className="text-xs text-ink-muted">{sentence}</p>
      </div>

      <PhotoViewer open={Boolean(gift)} src={gift?.src} title={gift?.name ?? ''} onClose={() => setGift(null)} />
    </div>
  )
}
