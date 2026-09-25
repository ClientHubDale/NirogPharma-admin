import { useEffect, useState } from 'react'
import { Headphones, PanelLeft } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import logoMark from '@/assets/images/nirog-logo.png'
import { Logo } from '@/components/common/Logo'
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip'
import { site } from '@/constants/site'
import { cn } from '@/lib/utils'
import { SidebarGroup } from './SidebarGroup'
import { SidebarItem } from './SidebarItem'

/**
 * Logo, scrolling menu, then a pinned footer (Settings + support line).
 * Used by the desktop sidebar and the mobile sheet. When `collapsed` it
 * becomes a narrow rail of icons, each naming itself on hover.
 */
export function SidebarContent({ nav, onNavigate, collapsed = false, onToggleCollapsed }) {
  const { pathname } = useLocation()
  const main = nav.filter((item) => !item.footer)
  const footer = nav.filter((item) => item.footer)

  // One section open at a time — the one holding the current page, until you pick another.
  const sectionOf = (path) => main.find((item) => item.children?.some((child) => path.startsWith(child.path)))?.label ?? null
  const [openSection, setOpenSection] = useState(() => sectionOf(pathname))
  useEffect(() => {
    const active = sectionOf(pathname)
    if (active) setOpenSection(active)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col bg-white">
        <div className={cn('flex h-16 shrink-0 items-center border-b border-mint-pale', collapsed ? 'justify-center px-2' : 'gap-2 px-4')}>
          {collapsed ? (
            // The logo doubles as the button: hovering it shows "open sidebar".
            <Tooltip label="Open sidebar">
              <button
                type="button"
                onClick={onToggleCollapsed}
                aria-label="Open sidebar"
                aria-expanded={false}
                className="group grid size-11 place-items-center rounded-lg hover:bg-bg focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                <img src={logoMark} alt="" className="col-start-1 row-start-1 h-9 w-auto transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0" />
                <PanelLeft className="col-start-1 row-start-1 size-[1.15rem] text-ink-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
              </button>
            </Tooltip>
          ) : (
            <>
              <Logo showName={false} className="h-11" />
              {onToggleCollapsed && (
                <Tooltip label="Close sidebar">
                  <button
                    type="button"
                    onClick={onToggleCollapsed}
                    aria-label="Close sidebar"
                    aria-expanded
                    className="ml-auto grid size-9 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-bg hover:text-black focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
                  >
                    <PanelLeft className="size-[1.15rem]" />
                  </button>
                </Tooltip>
              )}
            </>
          )}
        </div>

        <nav aria-label="Dashboard" className={cn('flex-1 space-y-0.5 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}>
          {main.map((item) =>
            item.children ? (
              <SidebarGroup
                key={item.label}
                item={item}
                collapsed={collapsed}
                open={openSection === item.label}
                onToggle={() => setOpenSection((current) => (current === item.label ? null : item.label))}
                onNavigate={onNavigate}
              />
            ) : (
              <SidebarItem key={item.path} item={item} collapsed={collapsed} onNavigate={onNavigate} />
            ),
          )}
        </nav>

        <div className={cn('shrink-0 space-y-0.5 border-t border-mint-pale py-3', collapsed ? 'px-2' : 'px-3')}>
          {footer.map((item) => (
            <SidebarItem key={item.path} item={item} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
          {collapsed ? (
            <Tooltip label={site.contact.phone}>
              <a href={`tel:${site.contact.phone}`} className="grid h-11 place-items-center rounded-lg text-green-deep hover:bg-bg" aria-label={`Call ${site.contact.phone}`}>
                <Headphones className="size-[1.15rem]" />
              </a>
            </Tooltip>
          ) : (
            <p className="flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-green-deep">
              <Headphones className="size-[1.15rem]" />
              {site.contact.phone}
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
