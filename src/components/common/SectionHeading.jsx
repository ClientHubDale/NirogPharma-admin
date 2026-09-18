import { cn } from '@/lib/utils'

/** Big tight-tracked section title with optional eyebrow and subtitle. */
export function SectionHeading({ eyebrow, title, subtitle, align = 'center', className }) {
  return (
    <div className={cn('max-w-3xl', align === 'center' ? 'mx-auto text-center' : 'text-left', className)}>
      {eyebrow && (
        <p className="mb-3 text-sm font-semibold tracking-wide text-green-deep uppercase">{eyebrow}</p>
      )}
      <h2 className="text-3xl leading-[1.08] font-extrabold sm:text-4xl md:text-5xl">{title}</h2>
      {subtitle && <p className="mt-4 text-base text-ink-muted sm:text-lg">{subtitle}</p>}
    </div>
  )
}
