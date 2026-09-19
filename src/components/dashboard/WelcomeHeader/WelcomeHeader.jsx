import { cn } from '@/lib/utils'

/** "Hello NAME" + subtitle at the top of a dashboard. */
export function WelcomeHeader({ name, subtitle, align = 'center', className }) {
  return (
    <div className={cn(align === 'center' ? 'text-center' : 'text-left', className)}>
      <h1 className="text-3xl font-extrabold sm:text-4xl">
        Hello <span className="text-green-deep">{name}</span>
      </h1>
      {subtitle && <p className="mt-2 text-base text-ink-muted sm:text-lg">{subtitle}</p>}
    </div>
  )
}
