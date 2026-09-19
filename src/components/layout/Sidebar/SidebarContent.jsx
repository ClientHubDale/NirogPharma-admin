import { Headphones } from 'lucide-react'
import { Logo } from '@/components/common/Logo'
import { site } from '@/constants/site'
import { SidebarGroup } from './SidebarGroup'
import { SidebarItem } from './SidebarItem'

/** Logo, scrolling menu, then a pinned footer (Settings + support line). Used by desktop and mobile. */
export function SidebarContent({ nav, onNavigate }) {
  const main = nav.filter((item) => !item.footer)
  const footer = nav.filter((item) => item.footer)

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 shrink-0 items-center border-b border-mint-pale px-6">
        <Logo />
      </div>

      <nav aria-label="Dashboard" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {main.map((item) =>
          item.children ? (
            <SidebarGroup key={item.label} item={item} onNavigate={onNavigate} />
          ) : (
            <SidebarItem key={item.path} item={item} onNavigate={onNavigate} />
          ),
        )}
      </nav>

      <div className="shrink-0 space-y-0.5 border-t border-mint-pale px-3 py-3">
        {footer.map((item) => (
          <SidebarItem key={item.path} item={item} onNavigate={onNavigate} />
        ))}
        <p className="flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-green-deep">
          <Headphones className="size-[1.15rem]" />
          {site.contact.phone}
        </p>
      </div>
    </div>
  )
}
