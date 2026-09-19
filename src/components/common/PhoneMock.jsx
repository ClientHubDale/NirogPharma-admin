import { cn } from '@/lib/utils'

/** Phone showing the field app's "Today" screen. Pure Tailwind, no images. */
export function PhoneMock({ className }) {
  return (
    <div
      className={cn(
        'relative mx-auto w-[15.5rem] rounded-[2.5rem] border-[10px] border-black bg-bg p-4 shadow-glow',
        className,
      )}
    >
      <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-black/80" />
      <p className="text-xs font-medium text-ink-muted">Good morning, Rahul</p>
      <p className="text-lg font-extrabold text-black">Today</p>
      <div className="mt-3 rounded-xl bg-gradient-to-br from-mint to-green-soft p-3.5">
        <p className="text-xs font-semibold text-forest">Checked in · 09:02</p>
        <p className="mt-1 font-mono text-2xl font-medium text-forest">42.6 km</p>
        <div className="mt-2 h-1.5 rounded-full bg-white/60">
          <div className="h-full w-[68%] rounded-full bg-forest" />
        </div>
        <p className="mt-1.5 text-[0.65rem] text-forest/80">68% of monthly target</p>
      </div>
      <div className="mt-3 space-y-2">
        {['Shree Medicals', 'City Chemist', 'Gupta Pharma'].map((party, index) => (
          <div key={party} className="flex items-center justify-between rounded-lg bg-white px-3 py-2.5">
            <span className="text-xs font-semibold text-ink">{party}</span>
            <span className={`size-2 rounded-full ${index < 2 ? 'bg-green-fresh' : 'bg-mint'}`} />
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-full bg-black py-2.5 text-center text-xs font-semibold text-white">
        Book order
      </div>
    </div>
  )
}
