import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon'
import { whatsappHref } from '@/constants/site'
import { SidebarContent } from '../Sidebar'
import { QuickCreateMenu } from './QuickCreateMenu'
import { UserMenu } from './UserMenu'

/**
 * Sticky top bar. Mobile: hamburger opens the sidebar in a sheet.
 * `showQuickCreate` is admin-only (distributors don't create records).
 */
export function Topbar({ nav, title, section, showQuickCreate }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-mint-pale bg-white/85 px-4 backdrop-blur-md sm:px-6">
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-lg" className="-ml-2 lg:hidden" aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SidebarContent nav={nav} onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1">
        {section && <p className="truncate text-xs font-medium text-ink-muted">{section}</p>}
        <p className="truncate text-base font-bold text-black">{title}</p>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        {showQuickCreate && <QuickCreateMenu />}
        <a
          href={whatsappHref ?? '#'}
          target={whatsappHref ? '_blank' : undefined}
          rel={whatsappHref ? 'noreferrer' : undefined}
          title={whatsappHref ? 'Chat with the office on WhatsApp' : 'Add the office WhatsApp number in constants/site.js'}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-green-fresh px-3.5 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-green-deep"
        >
          <WhatsAppIcon className="size-4" />
          <span className="hidden sm:inline">Help?</span>
        </a>
        <UserMenu />
      </div>
    </header>
  )
}
