import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Container } from '@/components/common/Container'
import { SectionHeading } from '@/components/common/SectionHeading'
import { site } from '@/constants/site'

const faqs = [
  {
    q: 'Who gets a login?',
    a: 'Admins and distributors use the website. Managers and executives use the mobile app. There is no public sign-up — every account is created by the office.',
  },
  {
    q: 'How do I sign in?',
    a: 'With your registered mobile number and the password the office gives you. If you forget it, ask the office to reset it.',
  },
  {
    q: 'Why does the app need my location all the time?',
    a: 'Attendance, the daily area punch, new-party photos and the day’s kilometres all depend on it. Tracking only runs while you are checked in for work.',
  },
  {
    q: 'Which phones are supported?',
    a: 'Android phones. Keep battery optimisation switched off for the app so location tracking is not paused in the background.',
  },
  {
    q: 'Who do I contact for help?',
    a: `Reach the Nirog Pharma office at ${site.contact.phone} or ${site.contact.email}.`,
  },
]

export function FaqSection() {
  return (
    <section id="faq" className="bg-white/60 py-20 sm:py-28">
      <Container className="max-w-3xl">
        <SectionHeading eyebrow="FAQ" title="Questions from the team" />
        <Accordion type="single" collapsible className="mt-12 rounded-2xl border border-mint-pale bg-white px-6">
          {faqs.map((faq) => (
            <AccordionItem key={faq.q} value={faq.q}>
              <AccordionTrigger className="py-5 text-base font-bold text-black hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-[0.95rem] leading-relaxed text-ink-muted">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Container>
    </section>
  )
}
