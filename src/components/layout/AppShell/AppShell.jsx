import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Outlet, useLocation } from 'react-router-dom'
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed'
import { cn } from '@/lib/utils'
import { flattenNav, NAV_BY_ROLE } from '@/constants/navigation'
import { DEMO_MODE } from '@/services/authService'
import { ROLES } from '@/constants/roles'
import { restoreSession, selectUser } from '@/store/authSlice'
import { ToastProvider } from '@/components/common/Toast'
import { Sidebar } from '../Sidebar'
import { Topbar } from '../Topbar'
import { WhatsAppFab } from '../WhatsAppFab'

const NO_NAV = []

/** Dashboard frame for every signed-in web role: sidebar + top bar + page. Menu comes from the user's role. */
export function AppShell() {
  const dispatch = useDispatch()
  const user = useSelector(selectUser)
  const { pathname } = useLocation()

  // The saved session may be stale — the account could have been disabled, or
  // the admin credentials changed in the backend's .env. Ask the server once,
  // and it signs the user out if the token is no longer good for anything.
  useEffect(() => {
    if (!DEMO_MODE) dispatch(restoreSession())
  }, [dispatch])

  const nav = NAV_BY_ROLE[user?.role] ?? NO_NAV
  const [collapsed, toggleCollapsed] = useSidebarCollapsed()

  // Title + section for the top bar, from the menu config.
  const current = useMemo(() => {
    const links = flattenNav(nav)
    return (
      links.find((link) => link.path === pathname) ??
      [...links].sort((a, b) => b.path.length - a.path.length).find((link) => pathname.startsWith(link.path))
    )
  }, [nav, pathname])

  return (
    <ToastProvider>
      <div className="min-h-full bg-bg">
        <Sidebar nav={nav} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
        <div className={cn('transition-[padding] duration-200', collapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-68')}>
          <Topbar
            nav={nav}
            title={current?.label ?? 'Dashboard'}
            section={current?.section}
            showQuickCreate={user?.role === ROLES.ADMIN}
          />
          <main className="px-4 py-6 pb-28 sm:px-6 lg:px-10 lg:py-8">
            <Outlet />
          </main>
        </div>
        <WhatsAppFab />
      </div>
    </ToastProvider>
  )
}
