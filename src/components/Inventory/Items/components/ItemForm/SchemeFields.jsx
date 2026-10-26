import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PhotoViewer } from '@/components/common/PhotoViewer'
import { ImageUploader } from '@/components/form/ImageUploader'
import { SelectField } from '@/components/form/SelectField'
import { TextField } from '@/components/form/TextField'
import { UNITS } from '@/mocks/items'

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

/**
 * A pen, a bag, a mug: given away but never made or sold, so it is kept out of
 * the catalogue entirely — no price, no rate column, no stock to deduct.
 */
function NewGift({ onCancel, onAdd, onPicked }) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('PCS')
  const [image, setImage] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!name.trim()) return setError('Enter a name.')
    setBusy(true)
    const result = await onAdd({ name: name.trim(), unit, image })
    setBusy(false)
    if (typeof result === 'string') return setError(result)
    onPicked(result.id)
    onCancel()
  }

  return (
    <div className="mb-3 rounded-xl border border-green-fresh bg-bg p-3.5">
      <p className="mb-2.5 text-sm font-semibold text-ink">New giveaway</p>
      <div className="flex flex-wrap items-end gap-3">
        <TextField
          id="gift-name"
          label="Name"
          size="md"
          className="w-56"
          placeholder="Pen"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
        />
        <SelectField
          id="gift-unit"
          label="Counted in"
          className="w-44"
          searchable={false}
          options={UNITS}
          value={unit}
          onChange={setUnit}
        />
        <div className="flex items-center gap-2 pb-0.5">
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="h-11 rounded-lg bg-black px-4 text-sm font-semibold text-white hover:bg-black/85 disabled:opacity-60"
          >
            {busy ? 'Adding…' : 'Add giveaway'}
          </button>
          <button type="button" onClick={onCancel} className="h-11 rounded-lg px-3 text-sm font-semibold text-ink-muted hover:bg-white">
            Cancel
          </button>
        </div>
      </div>
      {/* The staff handing it over have to recognise it. */}
      <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <ImageUploader label="Picture" images={image} onChange={setImage} max={1} onError={setError} />
      </div>

      <p className="mt-1 text-xs text-ink-muted">
        Not a catalogue item: it has no price and nothing comes out of factory stock when you give one away.
      </p>
      {error && <p className="mt-1.5 text-sm font-medium text-destructive">{error}</p>}
    </div>
  )
}
