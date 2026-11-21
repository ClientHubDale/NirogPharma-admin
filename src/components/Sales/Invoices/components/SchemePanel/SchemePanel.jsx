import { Gift, Minus, Plus, Sparkles } from 'lucide-react'
import { formatINR } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * What this bill has earned, and whether to give it.
 *
 * A scheme is an offer, not a rule: the executive may hand it over or not,
 * depending on the deal he struck — "एग्जीक्यूटिव स्कीम दे भी सकता है, नहीं
 * भी दे सकता". So nothing applies silently; each one is shown with what it
 * gives and a switch beside it.
 *
 * Nothing applies on its own: a scheme is handed over when somebody presses
 * Apply, and not before — "डू यू वॉन्ट टू अप्लाई दिस स्कीम".
 *
 * `nearly` is the rung the bill has not reached. It is here because the
 * distributor cannot want what he does not know about — "यूज़र को पता कैसे
 * चलेगा कि [और] डालेगा तो यह मिलने वाला है".
 */
export function SchemePanel({ offers = [], nearly = [], chosen, onToggle, onLots, disabled }) {
  if (!offers.length && !nearly.length) return null

  return (
    <section id="bill-schemes" className="rounded-2xl border border-mint bg-mint-pale/60 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-forest">
        <Sparkles className="size-4" /> Schemes on this bill
      </p>

      {offers.length > 0 && (
        <ul className="mt-3 space-y-2">
          {offers.map((offer) => {
            // Goods are spent, not counted twice: a scheme the bill no longer
            // has the quantity for cannot be handed over however much the
            // admin wants to, so it says what it is short of instead of
            // offering a button that would do nothing.
            const fits = offer.enough !== false
            const on = fits && chosen.includes(offer.id)

            return (
              <li
                key={offer.id}
                className={cn(
                  'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5',
                  !fits ? 'border-mint-pale bg-bg' : on ? 'border-green-fresh bg-white' : 'border-mint-pale bg-white',
                )}
              >
                <span className="min-w-0">
                  <span className={cn('block text-sm font-semibold', fits ? 'text-black' : 'text-ink-muted')}>{offer.name}</span>
                  <span className={cn('block text-xs', fits ? 'text-ink-muted' : 'text-warning-ink')}>{offer.effect}</span>
                </span>
                {fits ? (
                  <span className="flex shrink-0 items-center gap-2">
                    {/* How many lots of this scheme to hand over. Only a
                        scheme that can repeat has more than one to give, and
                        the quantity is shared, so taking more here leaves
                        less for the others. */}
                    {on && offer.canRepeat && (
                      <span className="flex items-center gap-1 rounded-lg border border-mint bg-white px-1 py-0.5">
                        <button
                          type="button"
                          id={`scheme-less-${offer.id}`}
                          aria-label={`One lot fewer of ${offer.name}`}
                          disabled={disabled || (offer.lots ?? 1) <= 1}
                          onClick={() => onLots(offer.id, (offer.lots ?? 1) - 1)}
                          className="grid size-6 place-items-center rounded text-ink-muted hover:bg-mint-pale disabled:opacity-30"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="min-w-6 text-center font-mono text-sm font-semibold text-black">× {offer.lots ?? 1}</span>
                        <button
                          type="button"
                          id={`scheme-more-${offer.id}`}
                          aria-label={`One lot more of ${offer.name}`}
                          disabled={disabled || !offer.couldTakeMore}
                          onClick={() => onLots(offer.id, (offer.lots ?? 1) + 1)}
                          className="grid size-6 place-items-center rounded text-ink-muted hover:bg-mint-pale disabled:opacity-30"
                        >
                          <Plus className="size-3" />
                        </button>
                      </span>
                    )}
                    <button
                      type="button"
                      id={`scheme-toggle-${offer.id}`}
                      disabled={disabled}
                      onClick={() => onToggle(offer.id)}
                      className={cn(
                        'rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50',
                        on ? 'bg-black text-white hover:bg-black/85' : 'border border-mint bg-white text-ink hover:border-green-soft',
                      )}
                    >
                      {on ? 'Applied' : 'Apply'}
                    </button>
                  </span>
                ) : (
                  <span className="shrink-0 rounded-lg border border-dashed border-mint px-3.5 py-1.5 text-sm font-semibold text-ink-muted">
                    Not enough
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* What a little more would earn. */}
      {nearly.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {nearly.map((row, index) => (
            <li key={index} className="flex items-start gap-2 text-xs text-forest">
              <Gift className="mt-0.5 size-3.5 shrink-0" />
              <span>
                <span className="font-semibold">
                  {row.kind === 'AMOUNT' ? `${formatINR(row.short)} more` : `${row.short} more`}
                </span>{' '}
                → {row.gives}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
