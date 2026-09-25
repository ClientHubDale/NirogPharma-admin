import { Link } from 'react-router-dom'
import logo from '@/assets/images/nirog-logo.png'
import { cn } from '@/lib/utils'
import { site } from '@/constants/site'

/**
 * The client's logo. The mark already carries the NIROG wordmark, so the
 * text beside it is hidden on narrow screens and can be dropped with
 * `showName={false}` (e.g. where space is tight).
 */
export function Logo({ className, showName = true }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2.5', className)} aria-label={`${site.name} home`}>
      <img src={logo} alt="" className="h-10 w-auto shrink-0" />
      {showName && <span className="hidden text-xl font-extrabold tracking-tight text-black sm:inline">{site.name}</span>}
    </Link>
  )
}
