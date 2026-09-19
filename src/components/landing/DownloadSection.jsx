import { BatteryCharging, LocateFixed, ShieldCheck, Smartphone } from 'lucide-react'
import { Container } from '@/components/common/Container'
import { PhoneMock } from '@/components/common/PhoneMock'
import { PlayStoreBadge } from '@/components/common/PlayStoreBadge'

const notes = [
  { icon: Smartphone, text: 'Android phone for managers and executives' },
  { icon: LocateFixed, text: 'Location access set to “Allow all the time”' },
  { icon: BatteryCharging, text: 'Battery optimisation off, so tracking never pauses' },
  { icon: ShieldCheck, text: 'Login details are issued by the office' },
]

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
