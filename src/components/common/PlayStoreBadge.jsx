import { cn } from '@/lib/utils'
import { downloadHref, hasPlayStoreLink } from '@/constants/site'

/** Black "Get it on Google Play" badge. Says "Coming soon" until the link is set. */
export function PlayStoreBadge({ className }) {
  return (
    <a
      href={downloadHref}
      target={hasPlayStoreLink ? '_blank' : undefined}
      rel={hasPlayStoreLink ? 'noreferrer' : undefined}
      className={cn(
        'inline-flex h-14 items-center gap-3 rounded-lg bg-black px-5 text-white shadow-lift transition-transform hover:-translate-y-0.5',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
        <path fill="currentColor" d="M4 2.8v18.4c0 .4.4.6.7.4l15.6-9.2a.5.5 0 0 0 0-.8L4.7 2.4c-.3-.2-.7 0-.7.4Z" />
      </svg>
      <span className="text-left leading-tight">
        <span className="block text-[0.65rem] font-medium tracking-wider uppercase opacity-80">
          {hasPlayStoreLink ? 'Get it on' : 'Coming soon on'}
        </span>
        <span className="block text-lg font-bold">Google Play</span>
      </span>
    </a>
  )
}
