import { Link } from 'react-router-dom'
import { Container } from '@/components/common/Container'
import { site } from '@/constants/site'
import { navLinks } from './navLinks'

const columns = [
  { title: 'Product', links: navLinks.map((link) => ({ ...link, external: true })) },
  {
    title: 'Access',
    links: [
      { label: 'Admin login', href: '/login' },
      { label: 'Distributor login', href: '/login' },
      { label: 'Download app', href: '#download', external: true },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="bg-mint">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <p className="text-2xl font-extrabold text-black">{site.name}</p>
            <p className="mt-2 max-w-xs text-sm text-forest">{site.tagline}</p>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <p className="text-sm font-bold text-black">{column.title}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a href={link.href} className="text-sm text-forest hover:text-black">
                        {link.label}
                      </a>
                    ) : (
                      <Link to={link.href} className="text-sm text-forest hover:text-black">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="text-sm font-bold text-black">Contact</p>
            <ul className="mt-4 space-y-2.5 text-sm text-forest">
              <li>{site.contact.email}</li>
              <li>{site.contact.phone}</li>
              <li>{site.contact.address}</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col justify-between gap-3 border-t border-forest/15 pt-6 text-sm text-forest sm:flex-row">
          <p>
            © {new Date().getFullYear()} {site.legalName}
          </p>
          <p>For internal use by the Nirog Pharma team.</p>
        </div>
      </Container>
    </footer>
  )
}
