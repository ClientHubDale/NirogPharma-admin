import { NavLink, useMatch } from 'react-router-dom'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * One top-level link. Active state: mint background + deep-green bar on the
 * left. On the collapsed rail it is the icon alone, named on hover.
 *
 * The active class is worked out here rather than with NavLink's render-prop
 * className, because the tooltip clones this element and would stringify a
 * function className.
 */
export function SidebarItem({ item, collapsed = false, onNavigate }) {
  const Icon = item.icon
  const isActive = Boolean(useMatch({ path: item.path, end: Boolean(item.end) }))

  const link = (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onNavigate}
      className={cn(
        'relative flex items-center rounded-lg text-[0.95rem] font-medium transition-colors',
        collapsed ? 'h-11 justify-center' : 'gap-3 px-3.5 py-2.5',
        isActive
          ? cn('bg-mint-pale text-black', !collapsed && 'before:absolute before:inset-y-1.5 before:-left-3 before:w-1 before:rounded-r-full before:bg-green-deep')
          : 'text-ink hover:bg-bg hover:text-black',
      )}
    >
      <Icon className={cn('size-[1.15rem] shrink-0', isActive ? 'text-green-deep' : 'text-ink-muted')} />
      {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
    </NavLink>
  )

  return collapsed ? <Tooltip label={item.label}>{link}</Tooltip> : link
}
