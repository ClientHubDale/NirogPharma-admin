import { useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Collapsible section (Inventory, Parties, Sales…). The sidebar decides which
 * one is open, so opening a section closes the others.
 *
 * On the collapsed rail there is no room for the list, so the icon opens a
 * flyout of the section's pages instead — picking one goes straight there and
 * the rail stays narrow.
 */
export function SidebarGroup({ item, open, collapsed = false, onToggle, onNavigate }) {
  const { pathname } = useLocation()
  const hasActiveChild = item.children.some((child) => pathname.startsWith(child.path))
  const Icon = item.icon
  const flyout = useRef(null)

  // A tab whose path is the start of a sibling's (Users vs Users › Payouts)
  // must match exactly, or both would light up.
  const endOf = (child) => child.end ?? item.children.some((other) => other.path.startsWith(`${child.path}/`))
  const isCurrent = (child) => (endOf(child) ? pathname === child.path : pathname.startsWith(child.path))

  const header = (
    <button
      type="button"
      onClick={collapsed ? undefined : onToggle}
      aria-expanded={collapsed ? undefined : open}
      className={cn(
        'flex w-full items-center rounded-lg text-left text-[0.95rem] font-medium transition-colors hover:bg-bg hover:text-black',
        collapsed ? 'h-11 justify-center' : 'gap-3 px-3.5 py-2.5',
        hasActiveChild ? cn('text-black', collapsed && 'bg-mint-pale') : 'text-ink',
      )}
    >
      <Icon className={cn('size-[1.15rem] shrink-0', hasActiveChild ? 'text-green-deep' : 'text-ink-muted')} />
      {collapsed ? (
        <span className="sr-only">{item.label}</span>
      ) : (
        <>
          <span className="flex-1">{item.label}</span>
          <ChevronDown className={cn('size-4 text-ink-muted transition-transform', open && 'rotate-180')} />
        </>
      )}
    </button>
  )

  // On the rail the section is its icon alone; clicking it lists the pages beside it.
  if (collapsed) {
    return (
      <DropdownMenu>
        <Tooltip label={item.label}>
          <DropdownMenuTrigger asChild>{header}</DropdownMenuTrigger>
        </Tooltip>
        <DropdownMenuContent
          ref={flyout}
          side="right"
          align="start"
          sideOffset={10}
          className="w-60 p-1.5"
          // Radix highlights the first item on open, which reads as "already
          // selected". Focus the panel itself instead — arrow keys still work.
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            flyout.current?.focus()
          }}
        >
          <DropdownMenuLabel className="pointer-events-none px-2.5 pt-1.5 pb-2 text-[0.7rem] font-bold tracking-[0.08em] text-ink-muted uppercase select-none">
            {item.label}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="mb-1" />
          {item.children.map((child) => (
            // focus:bg-transparent: the menu's own highlight is mint too, which
            // would make a hovered page look like the current one.
            <DropdownMenuItem key={child.path} asChild className="cursor-pointer px-0 py-0 focus:bg-transparent">
              {/* Link, not NavLink: the menu item clones this element and would
                  stringify NavLink's function className. */}
              <Link
                to={child.path}
                onClick={onNavigate}
                className={cn(
                  'block w-full rounded-md px-2.5 py-2 text-sm transition-colors',
                  isCurrent(child)
                    ? 'bg-mint-pale font-semibold text-black'
                    : 'text-ink hover:bg-bg hover:text-black data-highlighted:bg-bg data-highlighted:text-black',
                )}
              >
                {child.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div>
      {header}

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
                end={endOf(child)}
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
