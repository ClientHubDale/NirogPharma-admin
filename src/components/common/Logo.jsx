import { Leaf } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { site } from '@/constants/site'

/** Gradient leaf mark + wordmark. Stands in until the client's logo file arrives. */
export function Logo({ className }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2.5', className)} aria-label={`${site.name} home`}>
      <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-mint to-green-fresh shadow-glow">
        <Leaf className="size-4 text-forest" strokeWidth={2.25} />
      </span>
      <span className="text-xl font-extrabold tracking-tight text-black">{site.name}</span>
    </Link>
  )
}
