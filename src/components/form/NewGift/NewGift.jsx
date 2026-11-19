import { useState } from 'react'
import { ImageUploader } from '@/components/form/ImageUploader'
import { QuickAdd } from '@/components/form/QuickAdd'
import { SelectField } from '@/components/form/SelectField'
import { TextField } from '@/components/form/TextField'
import { UNITS } from '@/mocks/items'

/**
 * A pen, a bag, a mug: given away but never made or sold, so it is kept out of
 * the catalogue entirely — no price, no rate column, no stock to deduct.
 */
export function NewGift({ onCancel, onAdd, onPicked }) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('PCS')
  /**
   * A giveaway is whatever the company happens to be handing over, and the
   * catalogue's units were written for medicine — a kilo of sugar fits none of
   * PCS, STRIP, VIAL. So the list can be added to from here, on the spot.
   */
  const [units, setUnits] = useState(() => UNITS.map((row) => row.value))
  const [addingUnit, setAddingUnit] = useState(false)
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
        <div className="w-56">
          {addingUnit ? (
            <>
              <p className="mb-2 text-sm font-semibold text-ink">New unit</p>
              <QuickAdd
                existing={units}
                placeholder="e.g. KG"
                onCancel={() => setAddingUnit(false)}
                onAdd={(typed) => {
                  const code = typed.trim().toUpperCase()
                  setUnits((list) => [...list, code])
                  setUnit(code)
                  setAddingUnit(false)
                }}
              />
            </>
          ) : (
            <SelectField
              id="gift-unit"
              label="Counted in"
              searchable={false}
              options={units.map((code) => ({ value: code, label: UNITS.find((row) => row.value === code)?.label ?? code }))}
              value={unit}
              onChange={setUnit}
              labelAction={
                <button
                  type="button"
                  id="gift-unit-new"
                  onClick={() => setAddingUnit(true)}
                  className="text-sm font-semibold text-green-deep hover:underline hover:underline-offset-4"
                >
                  + New
                </button>
              }
            />
          )}
        </div>
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
