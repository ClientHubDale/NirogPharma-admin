import { useSelector } from 'react-redux'
import { Navigate, Outlet } from 'react-router-dom'
import { homePathForRole } from '@/constants/roles'
import { selectIsAuthenticated, selectUser } from '@/store/authSlice'

/** Pages only for signed-out users (login). Signed-in users go to their home. */
export function GuestRoute() {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectUser)
  if (isAuthenticated) return <Navigate to={homePathForRole(user.role)} replace />
  return <Outlet />
}
