import { cn } from '@/lib/utils'
import { TONE_CLASSES } from '@/lib/status'

/** Small status label: colour + text (never colour alone). */
export function StatusPill({ tone = 'neutral', children, className }) {
  const t = TONE_CLASSES[tone]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap', t.soft, t.ink, className)}>
      <span className={cn('size-1.5 rounded-full', t.bar)} />
      {children}
    </span>
  )
}
