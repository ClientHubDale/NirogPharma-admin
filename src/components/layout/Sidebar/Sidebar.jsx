import { SidebarContent } from './SidebarContent'

/** Fixed desktop sidebar (lg and up). On smaller screens the Topbar opens the same content in a sheet. */
export function Sidebar({ nav }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-68 border-r border-mint-pale lg:block">
      <SidebarContent nav={nav} />
    </aside>
  )
}
