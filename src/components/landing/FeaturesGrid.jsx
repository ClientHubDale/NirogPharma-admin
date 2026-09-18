import {
  BarChart3,
  Bell,
  Boxes,
  Camera,
  FileText,
  MapPinned,
  MessageCircle,
  Navigation,
  Store,
  WalletCards,
} from 'lucide-react'
import { Container } from '@/components/common/Container'
import { IconTile } from '@/components/common/IconTile'
import { SectionHeading } from '@/components/common/SectionHeading'

const features = [
  {
    icon: Navigation,
    title: 'Live GPS & daily KM',
    text: 'See where every executive is right now, and how far they travelled today — recorded automatically.',
  },
  {
    icon: Camera,
    title: 'Selfie check-in & check-out',
    text: 'Attendance is marked with a live location and a selfie, so the office knows who started work and where.',
  },
  {
    icon: MapPinned,
    title: 'Daily area punch',
    text: "Each morning the executive picks the distributor's area they are covering for the day.",
  },
  {
    icon: Store,
    title: 'Verified new parties',
    text: 'New retailers are added with three photos taken within 10 metres of the shop, plus GST and drug licence details.',
  },
  {
    icon: MessageCircle,
    title: 'Orders straight to WhatsApp',
    text: 'Orders are built from the approved item list and reach the assigned distributor as a WhatsApp message.',
  },
  {
    icon: Boxes,
    title: 'Stock that follows the bill',
    text: 'Billing moves stock from company to distributor; secondary sales reduce the distributor’s stock.',
  },
  {
    icon: FileText,
    title: 'GST bills, shared instantly',
    text: 'The office uploads the bill once — the distributor, manager and executive all receive a copy.',
  },
  {
    icon: WalletCards,
    title: 'Payments with office check',
    text: 'Payments punched by managers are deducted from the distributor account only after office confirmation.',
  },
  {
    icon: Bell,
    title: 'Automatic reminders',
    text: 'Daily summary for every executive, plus 30-day stock and payment reminders to distributors.',
  },
  {
    icon: BarChart3,
    title: 'Reports that answer questions',
    text: 'Outstanding by executive and manager, date-wise dues, sales and a full summary — ready when you are.',
  },
]

export function FeaturesGrid() {
  return (
    <section id="features" className="bg-white/60 py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Features"
          title="Built for the way your team works"
          subtitle="Every visit, order, payment and stock movement is captured at the source — entered once, visible to the office right away."
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-mint-pale bg-white p-5 transition-shadow hover:shadow-glow"
            >
              <IconTile icon={feature.icon} />
              <h3 className="mt-5 text-base font-bold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{feature.text}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}
