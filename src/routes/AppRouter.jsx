import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { adminNav, distributorNav, flattenNav } from '@/constants/navigation'
import { ROLES } from '@/constants/roles'
import { PublicLayout } from '@/layouts/PublicLayout'
import ComingSoon from '@/pages/ComingSoon'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import { GuestRoute } from './GuestRoute'
import { ProtectedRoute } from './ProtectedRoute'

// Dashboards pull in the charting library — load them only after sign-in so
// the landing and login pages stay light.
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const DistributorDashboard = lazy(() => import('@/pages/distributor/DistributorDashboard'))
const LiveLocation = lazy(() => import('@/pages/admin/LiveLocation'))
const Items = lazy(() => import('@/components/Inventory/Items/Items'))
const Schemes = lazy(() => import('@/components/Inventory/Schemes/Schemes'))
const SchemeEditor = lazy(() => import('@/components/Inventory/Schemes/SchemeEditor'))
const PriceLists = lazy(() => import('@/components/Inventory/PriceLists/PriceLists'))
const PriceListEditor = lazy(() => import('@/components/Inventory/PriceLists/PriceListEditor'))

function PageLoader() {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status" aria-label="Loading">
      <span className="size-8 animate-spin rounded-full border-3 border-mint border-t-green-deep" />
    </div>
  )
}

/**
 * Screens that are built. Every other menu link falls back to <ComingSoon>,
 * so adding a module = add one line here.
 */
const BUILT = {
  '/admin': AdminDashboard,
  '/admin/live-location': LiveLocation,
  '/admin/inventory/items': Items,
  '/admin/inventory/schemes': Schemes,
  '/admin/inventory/price-lists': PriceLists,
  '/distributor': DistributorDashboard,
}

function Lazy({ page: Page }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Page />
    </Suspense>
  )
}

/** One <Route> per menu link, generated from the nav config. */
function roleRoutes(nav, homePath) {
  return flattenNav(nav).map(({ path, label, section }) => {
    const Page = BUILT[path]
    const element = Page ? (
      <Suspense fallback={<PageLoader />}>
        <Page />
      </Suspense>
    ) : <ComingSoon title={label} section={section} homePath={homePath} />
    return path === homePath ? <Route key={path} index element={element} /> : <Route key={path} path={path} element={element} />
  })
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Landing />} />
        </Route>

        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>

        <Route element={<ProtectedRoute allow={[ROLES.ADMIN]} />}>
          <Route path="/admin" element={<AppShell />}>
            {roleRoutes(adminNav, '/admin')}
            {/* Sub-pages that aren't menu entries. */}
            <Route path="/admin/inventory/schemes/new" element={<Lazy page={SchemeEditor} />} />
            <Route path="/admin/inventory/schemes/:schemeId/edit" element={<Lazy page={SchemeEditor} />} />
            <Route path="/admin/inventory/price-lists/new" element={<Lazy page={PriceListEditor} />} />
            <Route path="/admin/inventory/price-lists/:priceListId/edit" element={<Lazy page={PriceListEditor} />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allow={[ROLES.DISTRIBUTOR]} />}>
          <Route path="/distributor" element={<AppShell />}>
            {roleRoutes(distributorNav, '/distributor')}
            <Route path="*" element={<Navigate to="/distributor" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
