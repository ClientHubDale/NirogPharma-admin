import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AnnouncementPill } from '@/components/common/AnnouncementPill'
import { AppWindowMock } from '@/components/common/AppWindowMock'
import { Container } from '@/components/common/Container'
import { downloadHref } from '@/constants/site'

const team = [
  { name: 'Rahul S.', area: 'Civil Lines', km: '42.6', online: true },
  { name: 'Priya K.', area: 'Sadar Bazaar', km: '31.2', online: true },
  { name: 'Aman V.', area: 'Station Road', km: '18.9', online: true },
  { name: 'Neha T.', area: 'Checked out', km: '27.4', online: false },
]

/** Mini "live location" dashboard, drawn with Tailwind + inline SVG (no images). */
function LiveDashboardMock() {
  return (
    <AppWindowMock title="Live location · Today" status="Live">
      <div className="grid md:grid-cols-[15rem_1fr]">
        <aside className="hidden flex-col gap-1.5 border-r border-mint-pale p-4 md:flex">
          <p className="mb-2 text-sm font-bold text-black">Field team</p>
          {team.map((person, index) => (
            <div
              key={person.name}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${index === 0 ? 'bg-mint-pale' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`size-2.5 rounded-full ${person.online ? 'bg-green-fresh' : 'bg-ink-muted/40'}`} />
                <div>
                  <p className="text-sm font-semibold text-ink">{person.name}</p>
                  <p className="text-xs text-ink-muted">{person.area}</p>
                </div>
              </div>
              <span className="font-mono text-xs text-ink-muted">{person.km} km</span>
            </div>
          ))}
          <div className="mt-auto pt-4">
            <div className="rounded-md bg-black px-3 py-2.5 text-center text-sm font-semibold text-white">
              View attendance
            </div>
          </div>
        </aside>

        <div className="bg-mint-pale/60 p-4 sm:p-6">
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl border-[1.5px] border-forest/70 bg-white">
            {/* map grid */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-60 [background-image:linear-gradient(var(--mint-pale)_1px,transparent_1px),linear-gradient(90deg,var(--mint-pale)_1px,transparent_1px)] [background-size:32px_32px]"
            />
            <svg viewBox="0 0 400 250" className="absolute inset-0 size-full" aria-hidden>
              {/* roads */}
              <path d="M-10 190 C 90 170, 150 120, 230 130 S 360 70, 420 40" className="stroke-bg" strokeWidth="18" fill="none" strokeLinecap="round" />
              <path d="M60 -10 C 80 80, 120 160, 110 260" className="stroke-bg" strokeWidth="12" fill="none" />
              {/* today's route */}
              <path
                d="M40 200 C 100 180, 140 140, 200 138 S 300 110, 340 70"
                className="stroke-green-deep"
                strokeWidth="3"
                strokeDasharray="6 6"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
            {/* visited parties */}
            <span className="absolute top-[74%] left-[10%] size-3 rounded-full bg-green-soft ring-4 ring-white" />
            <span className="absolute top-[53%] left-[49%] size-3 rounded-full bg-green-soft ring-4 ring-white" />
            {/* live position */}
            <span className="absolute top-[25%] left-[84%] -translate-x-1/2 -translate-y-1/2">
              <span className="absolute inset-0 animate-ping rounded-full bg-green-fresh/50" />
              <span className="relative block size-5 rounded-full bg-green-fresh ring-4 ring-white" />
            </span>
            {/* info card */}
            <div className="absolute right-3 bottom-3 rounded-lg bg-black px-3.5 py-2.5 text-white shadow-lift sm:right-4 sm:bottom-4">
              <p className="text-xs opacity-70">Rahul S. · 3 visits · 2 orders</p>
              <p className="font-mono text-sm font-medium">42.6 km today</p>
            </div>
          </div>
        </div>
      </div>
    </AppWindowMock>
  )
}

export function Hero() {
  return (
    <section className="relative">
      <div aria-hidden className="bg-hero absolute inset-x-0 top-0 h-[44rem]" />
      <div className="relative pt-14 pb-16 sm:pt-20 sm:pb-24">
        <div className="px-4 text-center sm:px-6">
          <AnnouncementPill href="#download">Android app for the field team</AnnouncementPill>
          <h1 className="mx-auto mt-7 max-w-5xl text-[2.6rem] leading-[1.02] font-extrabold sm:text-6xl md:text-7xl lg:text-[5.25rem]">
            Run Your Field Sales From One Place
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-ink sm:text-lg">
            Track your team live, book orders at the counter, move stock from company to distributor and
            confirm every payment — without WhatsApp threads or re-typing a single entry.
          </p>
          <div className="mx-auto mt-9 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <Button asChild size="xl">
              <a href={downloadHref}>Download App</a>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link to="/login">Login to Dashboard</Link>
            </Button>
          </div>
        </div>

        <Container className="mt-14 sm:mt-20">
          <LiveDashboardMock />
        </Container>
      </div>
    </section>
  )
}
