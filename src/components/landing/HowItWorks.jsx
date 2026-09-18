import { Container } from '@/components/common/Container'
import { SectionHeading } from '@/components/common/SectionHeading'

const steps = [
  { title: 'Check in', text: 'Selfie + live location start the day.' },
  { title: 'Punch the area', text: "Pick today's distributor area." },
  { title: 'Visit the party', text: 'Choose a shop, or add a new one with 3 photos.' },
  { title: 'Book the order', text: 'Items and schemes from the company list — sent to the distributor.' },
  { title: 'Bill is issued', text: 'Office bills it; stock moves to the distributor.' },
  { title: 'Payment confirmed', text: 'Manager punches it, office confirms it.' },
  { title: 'See the reports', text: 'Sales, dues and daily KM — for every person.' },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="How it works"
          title="From check-in to confirmed payment"
          subtitle="One flow, the same every day — so nothing is missed and nothing is typed twice."
        />
        <ol className="relative mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="relative rounded-2xl border border-mint-pale bg-white p-5 xl:p-4"
            >
              <span className="grid size-9 place-items-center rounded-full bg-black font-mono text-sm font-medium text-white">
                {index + 1}
              </span>
              <h3 className="mt-4 text-base font-bold">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
