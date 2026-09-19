import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Outlet, useLocation } from 'react-router-dom'
import { flattenNav, NAV_BY_ROLE } from '@/constants/navigation'
import { ROLES } from '@/constants/roles'
import { selectUser } from '@/store/authSlice'
import { Sidebar } from '../Sidebar'
import { Topbar } from '../Topbar'
import { WhatsAppFab } from '../WhatsAppFab'

const NO_NAV = []

/** Dashboard frame for every signed-in web role: sidebar + top bar + page. Menu comes from the user's role. */
export function AppShell() {
  const user = useSelector(selectUser)
  const { pathname } = useLocation()
  const nav = NAV_BY_ROLE[user.role] ?? NO_NAV

  // Title + section for the top bar, from the menu config.
  const current = useMemo(() => {
    const links = flattenNav(nav)
    return (
      links.find((link) => link.path === pathname) ??
      [...links].sort((a, b) => b.path.length - a.path.length).find((link) => pathname.startsWith(link.path))
    )
  }, [nav, pathname])

  return (
    <div className="min-h-full bg-bg">
      <Sidebar nav={nav} />
      <div className="lg:pl-68">
        <Topbar
          nav={nav}
          title={current?.label ?? 'Dashboard'}
          section={current?.section}
          showQuickCreate={user.role === ROLES.ADMIN}
        />
        <main className="px-4 py-6 pb-28 sm:px-6 lg:px-10 lg:py-8">
          <Outlet />
        </main>
      </div>
      <WhatsAppFab />
    </div>
  )
}
