import { ArrowUpRight, MapPin, ShoppingCart, Wallet } from 'lucide-react'
import { Container } from '@/components/common/Container'
import { FeatureCard } from '@/components/common/FeatureCard'
import { SectionHeading } from '@/components/common/SectionHeading'

function TrackMock() {
  return (
    <div className="w-full -mr-10 rounded-xl border border-white/40 bg-white/25 p-5 font-mono text-[0.8rem] leading-7 text-forest backdrop-blur-sm sm:-mr-14">
      <p>$ check-in · 09:02</p>
      <p>✓ selfie verified</p>
      <p>✓ area: Civil Lines</p>
      <p className="font-medium">✓ 42.6 km covered today</p>
      <p className="mt-2 border-t border-forest/15 pt-2">
        ❯ [3 visits · 2 orders]<span className="ml-1 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-forest" />
      </p>
    </div>
  )
}

function OrderMock() {
  const lines = [
    { text: '+ 10 × Paracetamol 650', tone: 'add' },
    { text: '+ 6 × Cough Syrup 100ml', tone: 'add' },
    { text: 'Scheme: 10+1 applied', tone: 'plain' },
    { text: '− 2 × Vitamin C (out of stock)', tone: 'remove' },
    { text: '+ 4 × ORS Sachet', tone: 'add' },
  ]
  return (
    <div className="w-full rounded-xl bg-white p-4 shadow-glow">
      <p className="text-base font-bold text-black">Order for Shree Medicals</p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
        <MapPin className="size-3" /> Distributor: Gupta Pharma · Today
      </p>
      <div className="mt-3 overflow-hidden rounded-lg border border-mint-pale font-mono text-xs">
        <div className="flex justify-between bg-bg px-3 py-2 text-ink">
          <span>order.items</span>
          <span className="text-green-deep">+20 −2</span>
        </div>
        {lines.map((line) => (
          <p
            key={line.text}
            className={
              line.tone === 'add'
                ? 'bg-mint-pale/70 px-3 py-2 text-forest'
                : line.tone === 'remove'
                  ? 'bg-bg px-3 py-2 text-ink-muted line-through'
                  : 'bg-white px-3 py-2 text-ink'
            }
          >
            {line.text}
          </p>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-ink-muted">
          <span className="size-2 rounded-full bg-green-fresh" /> Ready to send
        </span>
        <span className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white shadow-lift">
          Send on WhatsApp
        </span>
      </div>
    </div>
  )
}

function CollectMock() {
  return (
    <div className="w-full rounded-xl bg-black p-5 text-white shadow-lift">
      <p className="flex items-center gap-2 text-sm text-white/60">
        <Wallet className="size-4 text-green-fresh" /> Updated 2 minutes ago
      </p>
      <div className="mt-3 space-y-2 font-mono text-[0.8rem]">
        <p>✓ ₹18,400 punched by manager</p>
        <p>✓ Confirmed by office</p>
        <p className="text-white/60">Gupta Pharma balance updated</p>
      </div>
      <span className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold">
        View ledger <ArrowUpRight className="size-3.5" />
      </span>
    </div>
  )
}

export function FieldTeamCards() {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <SectionHeading title={<>Everything for your field team,<br className="hidden sm:block" /> in one place</>} />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <FeatureCard
            tone="green"
            icon={MapPin}
            title="Track"
            description="Selfie check-in, today's area and live GPS — with the day's kilometres worked out for you."
          >
            <TrackMock />
          </FeatureCard>
          <FeatureCard
            tone="white"
            icon={ShoppingCart}
            title="Order"
            description="Build the order from the company's item list and send it straight to the distributor on WhatsApp."
          >
            <OrderMock />
          </FeatureCard>
          <FeatureCard
            tone="plain"
            icon={Wallet}
            title="Collect"
            description="Managers punch payments, the office confirms them, and the distributor's balance updates."
          >
            <CollectMock />
          </FeatureCard>
        </div>
      </Container>
    </section>
  )
}
