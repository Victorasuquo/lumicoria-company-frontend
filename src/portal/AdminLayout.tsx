import {
  Buildings,
  ChartLine,
  ClipboardText,
  FileText,
  Fingerprint,
  GearSix,
  ListChecks,
  Megaphone,
  Pulse,
  ShieldCheck,
  SquaresFour,
  SignOut,
  UsersThree,
} from '@phosphor-icons/react'
import { NavLink, Outlet } from 'react-router-dom'
import { usePortalAuth } from '../auth/AuthProvider'

const navigation = [
  { label: 'Overview', to: '/portal/admin', icon: SquaresFour, scope: 'admin.portal.read', end: true },
  { label: 'Organizations', to: '/portal/admin/organizations', icon: Buildings, scope: 'admin.organizations.read' },
  { label: 'Onboarding', to: '/portal/admin/onboarding/new', icon: ListChecks, scope: 'admin.onboarding.manage' },
  { label: 'Drafts', to: '/portal/admin/onboarding/drafts', icon: FileText, scope: 'admin.onboarding.manage' },
  { label: 'Templates', to: '/portal/admin/templates', icon: ClipboardText, scope: 'admin.templates.read' },
  { label: 'Communications', to: '/portal/admin/communications', icon: Megaphone, scope: 'admin.communications.read' },
  { label: 'Administrators', to: '/portal/admin/administrators', icon: UsersThree, scope: 'admin.administrators.manage' },
  { label: 'Audit', to: '/portal/admin/audit', icon: ShieldCheck, scope: 'admin.audit.read' },
  { label: 'Provisioning', to: '/portal/admin/operations', icon: Pulse, scope: 'admin.portal.read' },
  { label: 'Firebase identity', to: '/portal/admin/identity', icon: Fingerprint, scope: 'admin.portal.read' },
  { label: 'Settings', to: '/portal/admin/settings', icon: GearSix, scope: 'admin.portal.read' },
]

export function AdminLayout() {
  const { context, firebaseUser, hasScope, logout } = usePortalAuth()
  return (
    <div className="portal-app-shell admin-app-shell">
      <aside className="portal-sidebar">
        <div className="portal-sidebar-head">
          <a className="portal-brand" href="/" aria-label="Return to Lumicoria.com">
            <img src="/brand-mark.png" alt="" />
            <span>Lumicoria</span>
          </a>
        </div>
        <div className="admin-sidebar-label">Internal operations</div>
        <nav className="portal-navigation" aria-label="Lumicoria administration">
          {navigation.filter((item) => hasScope(item.scope)).map((item) => {
            const Icon = item.icon
            return <NavLink className={({ isActive }) => isActive ? 'active' : undefined} to={item.to} end={item.end} key={item.to}>
              <Icon aria-hidden="true" weight="duotone" />
              <span>{item.label}</span>
            </NavLink>
          })}
        </nav>
        <div className="portal-sidebar-user">
          <div>
            <span>{(firebaseUser?.email || context?.principal_id || 'A').slice(0, 1).toUpperCase()}</span>
            <p><strong>{firebaseUser?.email || 'Administrator'}</strong><small>Internal administrator</small></p>
          </div>
          <button type="button" onClick={() => void logout()} aria-label="Sign out"><SignOut aria-hidden="true" /></button>
        </div>
      </aside>
      <div className="portal-workspace">
        <header className="portal-topbar">
          <div><small>Operations console</small><strong>Customer onboarding and care</strong></div>
          <NavLink className="portal-secondary-button" to="/portal">Open client portal</NavLink>
        </header>
        <main className="portal-main"><Outlet /></main>
      </div>
    </div>
  )
}
