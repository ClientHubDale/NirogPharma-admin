import { cn } from '@/lib/utils'

/** Small mint gradient square holding an icon (template page 2 feature grid). */
export function IconTile({ icon: Icon, className }) {
  return (
    <span
      className={cn(
        'grid size-11 place-items-center rounded-lg bg-gradient-to-br from-mint to-green-soft shadow-glow',
        className,
      )}
    >
      <Icon className="size-5 text-forest" strokeWidth={2} />
    </span>
  )
}
