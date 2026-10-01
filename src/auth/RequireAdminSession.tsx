import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { usePortalAuth } from './AuthProvider'
import { PortalLoading } from '../portal/components/PortalState'

export function RequireAdminSession() {
  const { status, adminContext, hasScope } = usePortalAuth()
  const location = useLocation()

  if (status === 'loading') return <PortalLoading label="Checking administrator access" />
  if (status !== 'authenticated') {
    return <Navigate to="/portal/login" replace state={{ from: location.pathname }} />
  }
  if (!adminContext || !hasScope('admin.portal.read')) {
    return <Navigate to="/portal" replace />
  }
  return <Outlet />
}
