import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { usePortalAuth } from './AuthProvider'
import { PortalLoading } from '../portal/components/PortalState'

export function RequirePortalSession() {
  const { status } = usePortalAuth()
  const location = useLocation()

  if (status === 'loading') return <PortalLoading />
  if (status === 'choosing-organization') return <Navigate to="/portal/organizations" replace />
  if (status !== 'authenticated') {
    return <Navigate to="/portal/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
