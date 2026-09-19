import { useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { homePathForRole } from '@/constants/roles'
import { selectIsAuthenticated, selectUser } from '@/store/authSlice'

/**
 * Gate for a role's area.
 *  - Not signed in → /login, remembering where they were going.
 *  - Signed in with a different role → back to their own home, so a
 *    distributor can never open /admin (and vice versa).
 */
export function ProtectedRoute({ allow }) {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectUser)
  const location = useLocation()

  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  if (allow && !allow.includes(user.role)) return <Navigate to={homePathForRole(user.role)} replace />
  return <Outlet />
}
