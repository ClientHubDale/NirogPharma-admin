import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

/** One top-level link. Active state: mint background + deep-green bar on the left. */
export function SidebarItem({ item, onNavigate }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[0.95rem] font-medium transition-colors',
          isActive
            ? 'bg-mint-pale text-black before:absolute before:inset-y-1.5 before:-left-3 before:w-1 before:rounded-r-full before:bg-green-deep'
            : 'text-ink hover:bg-bg hover:text-black',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('size-[1.15rem] shrink-0', isActive ? 'text-green-deep' : 'text-ink-muted')} />
          {item.label}
        </>
      )}
    </NavLink>
  )
}
