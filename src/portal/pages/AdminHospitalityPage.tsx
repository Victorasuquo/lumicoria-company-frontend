import {
  ArrowRight,
  ArrowUpRight,
  Bed,
  CheckCircle,
  ClipboardText,
  GearSix,
  MagnifyingGlass,
  Plus,
  Warning,
  X,
} from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { portalFetch } from '../../api/client'
import type { HospitalityTemplate, HospitalityTemplateCollection } from '../../api/hospitality'
import { humanize, PortalEmpty, PortalError, PortalLoading, PortalPageHeader, StatusPill, formatPortalDate } from '../components/PortalState'

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
  const configured = template.default_channels.map(humanize).join(', ')
  return `${template.intent_count} hotel request types across ${configured}.`
}

export function AdminHospitalityPage() {
  const [search, setSearch] = useState('')
  const organizations = adminQuery<OrganizationCollection>(['organizations'], '/admin/organizations?page_size=100')
  const templates = adminQuery<HospitalityTemplateCollection>(['templates'], '/admin/hospitality/templates')
  const hotels = organizations.data?.items ?? []
  const template = templates.data?.items[0]
  const activeHotels = hotels.filter((hotel) => hotel.status.toLowerCase() === 'active').length
  const term = search.trim().toLowerCase()
  const filteredHotels = term
    ? hotels.filter((hotel) => `${hotel.name} ${hotel.slug} ${hotel.data_region} ${hotel.status}`.toLowerCase().includes(term))
    : hotels

  if (organizations.isLoading || templates.isLoading) return <PortalLoading label="Loading hospitality operations" />
  if (organizations.error) return <PortalError error={organizations.error} onRetry={() => void organizations.refetch()} />
  if (templates.error) return <PortalError error={templates.error} onRetry={() => void templates.refetch()} />

  return (
    <div className="admin-page admin-hospitality-page">
      <PortalPageHeader
        title="Hospitality operations"
        description="Manage hotel workspaces and the shared operating template."
        action={<Link className="portal-primary-button" to="/portal/admin/onboarding/new"><Plus aria-hidden="true" /> Onboard a hotel</Link>}
      />

      <section className="admin-hospitality-summary" aria-label="Hospitality overview">
        <div><span>Properties</span><strong>{hotels.length}</strong></div>
        <div><span>Active</span><strong>{activeHotels}</strong></div>
        <div><span>Request types</span><strong>{template?.intent_count ?? 0}</strong></div>
        <div><span>Template channels</span><strong>{template?.default_channels.length ?? 0}</strong></div>
      </section>

      <div className="admin-hospitality-layout">
        <section className="admin-hospitality-directory">
          <header className="admin-hospitality-section-head">
            <div><span className="admin-section-label">Hotel directory</span><h2>Properties</h2></div>
            <span className="admin-hospitality-count">{filteredHotels.length} of {hotels.length}</span>
          </header>
          {hotels.length > 0 && (
            <label className="admin-hospitality-search">
              <MagnifyingGlass aria-hidden="true" />
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by hotel, slug, or region" aria-label="Search hotel properties" />
              {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><X aria-hidden="true" /></button>}
            </label>
          )}
          {filteredHotels.length ? (
            <div className="admin-hospitality-properties">
              {filteredHotels.map((hotel) => (
                <Link className="admin-hospitality-property" to={`/portal/admin/organizations/${hotel.id}`} key={hotel.id}>
                  <span className="admin-hospitality-property-icon"><Bed aria-hidden="true" /></span>
                  <span className="admin-hospitality-property-main"><strong>{hotel.name}</strong><small>{hotel.slug} <span>·</span> {hotel.data_region.toUpperCase()}</small></span>
                  <span className="admin-hospitality-property-updated">Updated {formatPortalDate(hotel.updated_at, true)}</span>
                  <StatusPill value={hotel.status} />
                  <ArrowUpRight className="admin-hospitality-property-open" aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : hotels.length ? (
            <PortalEmpty title="No matching properties" description="Try another hotel name, workspace slug, or region." action={<button className="portal-secondary-button" type="button" onClick={() => setSearch('')}>Clear search</button>} />
          ) : (
            <PortalEmpty title="No hotels onboarded yet" description="Create the first property from the guided hospitality onboarding flow." action={<Link className="portal-secondary-button" to="/portal/admin/onboarding/new"><Plus aria-hidden="true" /> Start onboarding</Link>} />
          )}
        </section>

        <aside className="admin-hospitality-template">
          <header className="admin-hospitality-section-head">
            <div><span className="admin-section-label">Reusable template</span><h2>{template?.name ?? 'Hospitality operations'}</h2></div>
            <span className="admin-template-mark"><ClipboardText aria-hidden="true" /></span>
          </header>
          <p className="admin-hospitality-template-summary">{template ? templateSummary(template) : 'The hospitality template is not available in the current API contract.'}</p>
          {template && <div className="admin-hospitality-channels" aria-label="Template channels">{template.default_channels.map((channel) => <span key={channel}>{humanize(channel)}</span>)}</div>}
          <ul className="admin-hospitality-guardrails">
            <li><CheckCircle aria-hidden="true" /><span><strong>Hotel-specific answers</strong><small>Policies, rooms, services, and approved responses stay within each workspace.</small></span></li>
            <li><CheckCircle aria-hidden="true" /><span><strong>Staff confirmation</strong><small>Bookings, prices, payments, refunds, and sensitive requests stay with people.</small></span></li>
            <li><Warning aria-hidden="true" /><span><strong>Verified connections</strong><small>A channel is marked connected only after provider setup succeeds.</small></span></li>
          </ul>
          <Link className="portal-secondary-button" to="/portal/admin/templates"><GearSix aria-hidden="true" /> Review templates <ArrowRight aria-hidden="true" /></Link>
        </aside>
      </div>
    </div>
  )
}
