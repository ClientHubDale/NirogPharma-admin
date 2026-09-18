import { Briefcase, Building2, ShieldCheck, Smartphone, Truck, Users } from 'lucide-react'
import { Container } from '@/components/common/Container'
import { IconTile } from '@/components/common/IconTile'
import { SectionHeading } from '@/components/common/SectionHeading'
import { Badge } from '@/components/ui/badge'

const roles = [
  {
    icon: ShieldCheck,
    title: 'Admin',
    where: 'Website',
    points: [
      'Adds managers and executives with salary, TA/DA and targets',
      'Manages items, rates, schemes and company stock',
      'Uploads bills and confirms payments',
      'Runs every report',
    ],
  },
  {
    icon: Truck,
    title: 'Distributor',
    where: 'Website',
    points: [
      'Receives the orders booked for them',
      'Sees their own stock and its age',
      'Views bills, ledger and outstanding dues',
      'Tracks confirmed payments',
    ],
  },
  {
    icon: Users,
    title: 'Manager',
    where: 'Mobile app',
    points: [
      'Sees the live location of their team',
      'Punches payments collected from distributors',
      'Follows team targets and daily progress',
      'Everything an executive can do',
    ],
  },
  {
    icon: Briefcase,
    title: 'Executive',
    where: 'Mobile app',
    points: [
      'Checks in with a selfie and punches the area',
      'Adds new parties with geo-verified photos',
      'Books orders and collects payments',
      'Gets a daily KM, orders and target summary',
    ],
  },
]

export function RolesSection() {
  return (
    <section id="roles" className="bg-white/60 py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Who uses it"
          title="One platform, four roles"
          subtitle="Everyone signs in with their mobile number and a password issued by the office — and sees only what their role needs."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((role) => (
            <article key={role.title} className="flex flex-col rounded-2xl border border-mint-pale bg-white p-6">
              <div className="flex items-start justify-between">
                <IconTile icon={role.icon} />
                <Badge variant="secondary" className="gap-1 font-semibold">
                  {role.where === 'Website' ? <Building2 className="size-3" /> : <Smartphone className="size-3" />}
                  {role.where}
                </Badge>
              </div>
              <h3 className="mt-5 text-xl font-bold">{role.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {role.points.map((point) => (
                  <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-ink-muted">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-green-fresh" />
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}
