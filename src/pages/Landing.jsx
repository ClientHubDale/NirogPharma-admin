import { Button } from '@/components/ui/button'
import { CtaBand } from '@/components/common/CtaBand'
import { DownloadSection } from '@/components/landing/DownloadSection'
import { FaqSection } from '@/components/landing/FaqSection'
import { FeaturesGrid } from '@/components/landing/FeaturesGrid'
import { FieldTeamCards } from '@/components/landing/FieldTeamCards'
import { Hero } from '@/components/landing/Hero'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { RolesSection } from '@/components/landing/RolesSection'
import { downloadHref } from '@/constants/site'

export default function Landing() {
  return (
    <>
      <Hero />
      <FieldTeamCards />
      <FeaturesGrid />
      <HowItWorks />
      <RolesSection />
      <DownloadSection />
      <FaqSection />
      <CtaBand
        title="Get your whole team on Nirog Pharma"
        subtitle="Install the app, sign in with the details from the office, and start today with a check-in."
      >
        <Button asChild size="xl">
          <a href={downloadHref}>DownloadApp</a>
        </Button>
      </CtaBand>
    </>
  )
}
