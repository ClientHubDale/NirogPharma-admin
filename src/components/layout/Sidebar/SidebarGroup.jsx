import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

/** Collapsible section (Inventory, Parties, Sales…). Opens itself when one of its pages is active. */
export function SidebarGroup({ item, onNavigate }) {
  const { pathname } = useLocation()
  const hasActiveChild = item.children.some((child) => pathname.startsWith(child.path))
  const [open, setOpen] = useState(hasActiveChild)
  const Icon = item.icon

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-[0.95rem] font-medium transition-colors hover:bg-bg hover:text-black',
          hasActiveChild ? 'text-black' : 'text-ink',
        )}
      >
        <Icon className={cn('size-[1.15rem] shrink-0', hasActiveChild ? 'text-green-deep' : 'text-ink-muted')} />
        <span className="flex-1">{item.label}</span>
        <ChevronDown className={cn('size-4 text-ink-muted transition-transform', open && 'rotate-180')} />
      </button>

      {/* grid-rows trick animates height without measuring */}
      <div className={cn('grid transition-[grid-template-rows] duration-200', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="mt-0.5 mb-1 ml-[1.35rem] border-l border-mint-pale pl-3">
            {item.children.map((child) => (
              <NavLink
                key={child.path}
                to={child.path}
                onClick={onNavigate}
                tabIndex={open ? 0 : -1}
                className={({ isActive }) =>
                  cn(
                    'block rounded-md px-3 py-2 text-sm transition-colors',
                    isActive ? 'bg-mint-pale font-semibold text-black' : 'text-ink-muted hover:bg-bg hover:text-black',
                  )
                }
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
