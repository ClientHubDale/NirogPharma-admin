import { Outlet } from 'react-router-dom'
import { SiteHeader } from '@/components/landing/SiteHeader'
import { SiteFooter } from '@/components/landing/SiteFooter'

/** Header + footer shell for public pages (landing, and later legal/help pages). */
export function PublicLayout() {
  return (
    <div className="flex min-h-full flex-col overflow-x-clip">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
