import {
  ArrowRight,
  Bed,
  CheckCircle,
  ClipboardText,
  GearSix,
  Plus,
  Warning,
} from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { portalFetch } from '../../api/client'
import type { HospitalityTemplate, HospitalityTemplateCollection } from '../../api/hospitality'
import { PortalEmpty, PortalError, PortalLoading, PortalPageHeader, StatusPill, formatPortalDate } from '../components/PortalState'

type Organization = {
  id: string
  name: string
  slug: string
  status: string
  data_region: string
  created_at: string
  updated_at: string
}

type OrganizationCollection = {
  items: Organization[]
  page: { next_cursor?: string | null; has_more?: boolean }
}

function adminQuery<T>(key: string[], path: string) {
  return useQuery<T, Error>({
    queryKey: ['admin', 'hospitality', ...key],
    queryFn: async () => (await portalFetch<T>(path)).data,
    staleTime: 20_000,
  })
}

function templateSummary(template: HospitalityTemplate) {
  const configured = template.default_channels.map((channel) => channel.replaceAll('_', ' ')).join(', ')
  return `${template.intent_count} hotel request types across ${configured}.`
}

export function AdminHospitalityPage() {
  const organizations = adminQuery<OrganizationCollection>(['organizations'], '/admin/organizations?page_size=100')
  const templates = adminQuery<HospitalityTemplateCollection>(['templates'], '/admin/hospitality/templates')

  if (organizations.isLoading || templates.isLoading) return <PortalLoading label="Loading hospitality operations" />
  if (organizations.error) return <PortalError error={organizations.error} onRetry={() => void organizations.refetch()} />
  if (templates.error) return <PortalError error={templates.error} onRetry={() => void templates.refetch()} />

  const hotels = organizations.data?.items ?? []
  const template = templates.data?.items[0]
  return <div className="admin-page">
    <PortalPageHeader
      eyebrow="Hospitality platform"
      title="Operate many hotels from one control centre"
      description="Start each hotel from the same operating template, then configure its identity, knowledge, channels, queues, and staff without sharing data between properties."
      action={<Link className="portal-primary-button" to="/portal/admin/onboarding/new"><Plus aria-hidden="true" /> Onboard a hotel</Link>}
    />

    <section className="admin-metric-grid">
      <article className="portal-panel admin-metric"><small>Provisioned properties</small><strong>{hotels.length}</strong><span>All organisations in the admin directory</span></article>
      <article className="portal-panel admin-metric"><small>Hospitality intent catalogue</small><strong>{template?.intent_count ?? 0}</strong><span>Data-driven guest requests</span></article>
      <article className="portal-panel admin-metric"><small>Template channels</small><strong>{template?.default_channels.length ?? 0}</strong><span>Provider status is checked per hotel</span></article>
    </section>

    <div className="admin-detail-grid">
      <section className="portal-panel">
        <div className="admin-panel-heading"><div><span>Hotel directory</span><h2>Properties in this workspace</h2></div><Bed aria-hidden="true" /></div>
        {hotels.length ? <div className="admin-detail-list">{hotels.map((hotel) => <Link className="admin-detail-row" to={`/portal/admin/organizations/${hotel.id}`} key={hotel.id}><div><strong>{hotel.name}</strong><small>{hotel.slug} · {hotel.data_region.toUpperCase()} · Updated {formatPortalDate(hotel.updated_at, true)}</small></div><div className="admin-inline-form"><StatusPill value={hotel.status} /><ArrowRight aria-hidden="true" /></div></Link>)}</div> : <PortalEmpty title="No hotels onboarded yet" description="Create the first hotel from the reusable hospitality onboarding wizard." action={<Link className="portal-primary-button" to="/portal/admin/onboarding/new">Start hotel onboarding</Link>} />}
      </section>

      <section className="portal-panel">
        <div className="admin-panel-heading"><div><span>Reusable template</span><h2>{template?.name ?? 'Hospitality operations'}</h2></div><ClipboardText aria-hidden="true" /></div>
        <p className="admin-muted">{template ? templateSummary(template) : 'The hospitality template is not available in the current API contract.'}</p>
        <div className="admin-detail-list">
          <div className="admin-detail-row"><div><strong>Hotel-specific answers</strong><small>Policies, rooms, services, facilities, and approved responses stay tenant-scoped.</small></div><CheckCircle aria-hidden="true" /></div>
          <div className="admin-detail-row"><div><strong>Human confirmation</strong><small>Bookings, availability, prices, payments, refunds, and sensitive requests stay with staff.</small></div><CheckCircle aria-hidden="true" /></div>
          <div className="admin-detail-row"><div><strong>Provider truth</strong><small>A channel is only shown as connected after its own provider setup succeeds.</small></div><Warning aria-hidden="true" /></div>
        </div>
        <Link className="portal-secondary-button" to="/portal/admin/templates"><GearSix aria-hidden="true" /> Review all templates</Link>
      </section>
    </div>
  </div>
}
