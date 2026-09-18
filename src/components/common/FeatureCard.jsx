import { cn } from '@/lib/utils'

const TONES = {
  // Soft green gradient card (template card 1).
  green: 'bg-gradient-to-b from-green-soft/80 to-mint text-forest',
  // White card fading into green at the bottom (template card 2).
  white: 'bg-gradient-to-b from-white via-white to-green-fresh/70 text-ink',
  // Plain white card with a soft glow (template card 3).
  plain: 'bg-white text-ink',
}

/**
 * Tall rounded card: a UI mock on top (children), then icon + title + text.
 * `tone` picks one of the three template card styles.
 */
export function FeatureCard({ tone = 'plain', icon: Icon, title, description, children, className }) {
  return (
    <article
      className={cn(
        'relative flex min-h-[26rem] flex-col overflow-hidden rounded-2xl p-6 shadow-glow sm:p-7',
        TONES[tone],
        className,
      )}
    >
      {tone === 'plain' && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-8 left-1/2 size-56 -translate-x-1/2 rounded-full bg-green-fresh/25 blur-3xl"
        />
      )}
      <div className="relative flex flex-1 items-center justify-center py-4">{children}</div>
      <div className="relative mt-4">
        <h3 className="flex items-center gap-2.5 text-2xl font-bold">
          {Icon && <Icon className="size-5" strokeWidth={2} />}
          {title}
        </h3>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-muted">{description}</p>
      </div>
    </article>
  )
}
