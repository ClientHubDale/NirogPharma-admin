import { cn } from '@/lib/utils'
import { SidebarContent } from './SidebarContent'

/** Fixed desktop sidebar (lg and up). On smaller screens the Topbar opens the same content in a sheet. */
export function Sidebar({ nav, collapsed, onToggleCollapsed }) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 hidden border-r border-mint-pale transition-[width] duration-200 lg:block',
        collapsed ? 'w-[4.5rem]' : 'w-68',
      )}
    >
      <SidebarContent nav={nav} collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} />
    </aside>
  )
}
