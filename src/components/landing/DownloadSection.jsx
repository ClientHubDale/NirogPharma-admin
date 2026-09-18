import { BatteryCharging, LocateFixed, ShieldCheck, Smartphone } from 'lucide-react'
import { Container } from '@/components/common/Container'
import { PlayStoreBadge } from '@/components/common/PlayStoreBadge'

const notes = [
  { icon: Smartphone, text: 'Android phone for managers and executives' },
  { icon: LocateFixed, text: 'Location access set to “Allow all the time”' },
  { icon: BatteryCharging, text: 'Battery optimisation off, so tracking never pauses' },
  { icon: ShieldCheck, text: 'Login details are issued by the office' },
]

function PhoneMock() {
  return (
    <div className="relative mx-auto w-[15.5rem] rounded-[2.5rem] border-[10px] border-black bg-bg p-4 shadow-glow">
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

export function DownloadSection() {
  return (
    <section id="download" className="py-20 sm:py-28">
      <Container>
        <div className="grid items-center gap-12 overflow-hidden rounded-3xl border border-mint-pale bg-white p-8 sm:p-12 lg:grid-cols-2 lg:p-16">
          <div>
            <p className="text-sm font-semibold tracking-wide text-green-deep uppercase">Mobile app</p>
            <h2 className="mt-3 text-4xl leading-[1.05] font-extrabold sm:text-5xl">
              Put the app in your team’s pocket
            </h2>
            <p className="mt-4 max-w-md text-lg text-ink-muted">
              Managers and executives use the Nirog Pharma app in the field. Install it, sign in with the
              details from the office, and start the day with a check-in.
            </p>
            <ul className="mt-8 space-y-3.5">
              {notes.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-[0.95rem] text-ink">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-mint-pale">
                    <Icon className="size-4 text-green-deep" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
            <PlayStoreBadge className="mt-9" />
          </div>
          <PhoneMock />
        </div>
      </Container>
    </section>
  )
}
