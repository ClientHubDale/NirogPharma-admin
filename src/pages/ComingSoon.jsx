import { Construction } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { IconTile } from '@/components/common/IconTile'

/** Placeholder for menu pages not built yet. Each one is replaced as its module is built. */
export default function ComingSoon({ title, section, homePath }) {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-6xl place-items-center rounded-3xl bg-white p-8 text-center">
      <div>
        <IconTile icon={Construction} className="mx-auto size-14" />
        {section && <p className="mt-6 text-sm font-semibold tracking-wide text-green-deep uppercase">{section}</p>}
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-ink-muted">
          This screen is next on the build list. The menu, routing and access rules are already in place.
        </p>
        <Button asChild variant="outline" size="lg" className="mt-8">
          <Link to={homePath}>Back to dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
