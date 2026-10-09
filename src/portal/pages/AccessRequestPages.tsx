import { ArrowRight, CheckCircle, Clock, XCircle } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { createIdempotencyKey, jsonBody, portalFetch } from '../../api/client'
import { PortalEmpty, PortalError, PortalLoading, PortalPageHeader, StatusPill, formatPortalDate } from '../components/PortalState'

type AccessRequest = {
  id: string
  applicant_name: string
  email: string
  phone_number?: string | null
  company_name: string
  industry: string
  heard_about?: string | null
  website?: string | null
  use_cases: string[]
  notes?: string | null
  status: 'pending' | 'approved' | 'rejected'
  review_note?: string | null
  organization_id?: string | null
  invitation_id?: string | null
  invitation_email_status: 'not_sent' | 'sent' | 'pending' | 'failed'
  invitation_email_error?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  created_at: string
  updated_at: string
}

const industries = ['Hospitality', 'Logistics', 'Ecommerce', 'Appointments', 'Professional services', 'SaaS and IT', 'Other']
const referralSources = ['A referral', 'WhatsApp', 'LinkedIn', 'Instagram', 'Google search', 'An event or programme', 'A partner', 'Other']
const useCaseOptions = ['Voice agents', 'Customer enquiries', 'Follow-up and reminders', 'Team handoffs', 'WhatsApp and social messages', 'Email and shared inbox']

export function RequestAccessPage() {
  const [form, setForm] = useState({ applicant_name: '', email: '', phone_number: '', company_name: '', industry: '', website: '', heard_about: '', use_cases: [] as string[], notes: '' })
  const [request, setRequest] = useState<AccessRequest | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (form.use_cases.length === 0) { setError('Select at least one way you want to use Lumicoria.'); return }
    setSaving(true); setError(null)
    try {
      const { data } = await portalFetch<AccessRequest>('/public/access-requests', { method: 'POST', ...jsonBody({ ...form, phone_number: form.phone_number || null, website: form.website || null, heard_about: form.heard_about || null, notes: form.notes || null }) })
      setRequest(data)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Your request could not be sent.') } finally { setSaving(false) }
  }
  if (request) return <AccessRequestConfirmation request={request} />
  return (
    <div className="portal-auth-page portal-request-page">
      <Link className="portal-auth-brand" to="/"><img src="/brand-mark.png" alt="" />Lumicoria</Link>
      <section className="portal-auth-panel">
        <div className="portal-auth-copy">
          <span className="portal-auth-kicker">Start with Lumicoria</span>
          <h1>Give your team one place to move work forward.</h1>
          <p>Tell us about your company and the customer work you want to improve. We will review your request and send an invitation when your workspace is ready.</p>
          <div className="portal-request-steps" aria-label="Workspace request steps">
            <div className="portal-request-step is-active"><span>01</span><div><strong>Tell us about your company</strong><small>A few details help us prepare the right workspace.</small></div></div>
            <div className="portal-request-step"><span>02</span><div><strong>We review your request</strong><small>A Lumicoria administrator checks the details.</small></div></div>
            <div className="portal-request-step"><span>03</span><div><strong>Receive your invitation</strong><small>Create your account, verify your email, and join.</small></div></div>
          </div>
          <div className="portal-auth-assurances">
            <span><CheckCircle weight="fill" /> No password required yet</span>
            <span><CheckCircle weight="fill" /> Human review before access</span>
            <span><CheckCircle weight="fill" /> Built around your company</span>
          </div>
        </div>
        <div className="portal-auth-form-wrap portal-request-form-wrap">
          <div className="portal-auth-form-head">
            <div><span className="portal-form-eyebrow">Company access</span><h2>Create a workspace</h2><p>It takes about two minutes. We will use your email for the invitation.</p></div>
          </div>
          {error && <div className="portal-form-error" role="alert">{error}</div>}
          <form onSubmit={submit} className="portal-form">
            <fieldset>
              <label>Your name<input required placeholder="e.g. John Doe" autoComplete="name" value={form.applicant_name} onChange={(event) => update('applicant_name', event.target.value)} /></label>
              <label>Work email<span className="portal-field-hint">Use the address you want to sign in with.</span><input required type="email" autoComplete="email" placeholder="you@company.com" value={form.email} onChange={(event) => update('email', event.target.value)} /></label>
              <label>Phone number<span className="portal-field-hint">Include your country code.</span><input required type="tel" autoComplete="tel" placeholder="e.g. +234 800 000 0000" value={form.phone_number} onChange={(event) => update('phone_number', event.target.value)} /></label>
            </fieldset>
            <fieldset>
              <label>Company name<input required placeholder="e.g. Acme Labs" autoComplete="organization" value={form.company_name} onChange={(event) => update('company_name', event.target.value)} /></label>
              <div className="portal-form-grid"><label>Industry<select required value={form.industry} onChange={(event) => update('industry', event.target.value)}><option value="" disabled>Select one</option>{industries.map((industry) => <option key={industry}>{industry}</option>)}</select></label><label>How did you hear about us?<select required value={form.heard_about} onChange={(event) => update('heard_about', event.target.value)}><option value="" disabled>Select one</option>{referralSources.map((source) => <option key={source}>{source}</option>)}</select></label></div>
              <label>Company website<span className="portal-field-hint">Optional, but useful for verification.</span><input type="url" placeholder="https://company.com" value={form.website} onChange={(event) => update('website', event.target.value)} /></label>
            </fieldset>
            <fieldset><legend>What should we help with?</legend><span className="portal-field-hint">Select all that apply.</span><div className="portal-use-case-grid">{useCaseOptions.map((useCase) => <label className="portal-checkbox-card" key={useCase}><input type="checkbox" checked={form.use_cases.includes(useCase)} onChange={(event) => setForm((current) => ({ ...current, use_cases: event.target.checked ? [...current.use_cases, useCase] : current.use_cases.filter((item) => item !== useCase) }))} /><span><strong>{useCase}</strong><small>{useCase === 'Voice agents' ? 'Handle routine calls with clear escalation.' : useCase === 'Customer enquiries' ? 'Keep questions and context together.' : useCase === 'Follow-up and reminders' ? 'Make sure requests do not get forgotten.' : useCase === 'Team handoffs' ? 'Send the next action to the right person.' : useCase === 'WhatsApp and social messages' ? 'Bring conversations into one workspace.' : 'Manage incoming email and replies.'}</small></span></label>)}</div><label>Anything else to tell us?<span className="portal-field-hint">Optional.</span><textarea rows={3} placeholder="What would you like Lumicoria to help your team manage?" value={form.notes} onChange={(event) => update('notes', event.target.value)} /></label></fieldset>
            <button className="portal-primary-button" type="submit" disabled={saving}>{saving ? 'Provisioning request…' : 'Provision my workspace'} {!saving && <ArrowRight aria-hidden="true" weight="bold" />}</button>
          </form>
          <p className="portal-auth-help">Already have an invitation? <Link to="/portal/login">Sign in instead</Link></p>
        </div>
      </section>
      <footer className="portal-auth-footer"><span>© 2026 Lumicoria Inc.</span><Link to="/portal/login">Client sign in</Link></footer>
    </div>
  )
}

function AccessRequestConfirmation({ request }: { request: AccessRequest }) {
  return <div className="portal-auth-page"><Link className="portal-auth-brand" to="/"><img src="/brand-mark.png" alt="" />Lumicoria</Link><section className="portal-auth-panel"><div className="portal-auth-copy"><span className="portal-auth-kicker">Request received</span><h1>We have your workspace request.</h1><p>Your request for <strong>{request.company_name}</strong> is now with the Lumicoria team. You do not need to create a password yet.</p></div><div className="portal-auth-form-wrap"><div className="portal-form-success"><CheckCircle weight="fill" /><div><h2>Pending admin approval</h2><p>When your request is approved, we will send an invitation to <strong>{request.email}</strong>. The invitation will take you through account creation, email verification, and workspace access.</p></div></div><div className="portal-request-reference"><span>Request reference</span><code>{request.id}</code></div><Link className="portal-primary-button" to={`/portal/request-access/${request.id}`}>View request status <ArrowRight aria-hidden="true" /></Link></div></section></div>
}

export function AccessRequestStatusPage() {
  const { requestId } = useParams()
  const query = useQuery({ queryKey: ['access-request-status', requestId], queryFn: async () => (await portalFetch<AccessRequest>(`/public/access-requests/${requestId}`)).data, enabled: Boolean(requestId), refetchInterval: 30_000 })
  if (query.isLoading) return <PortalLoading label="Loading request status" />
  if (query.error) return <div className="portal-auth-page"><PortalError error={query.error} onRetry={() => void query.refetch()} /></div>
  const request = query.data
  if (!request) return <PortalEmpty title="Request not found" description="This request reference is no longer available." />
  const approved = request.status === 'approved'
  return <div className="portal-auth-page"><Link className="portal-auth-brand" to="/"><img src="/brand-mark.png" alt="" />Lumicoria</Link><section className="portal-auth-panel"><div className="portal-auth-copy"><span className="portal-auth-kicker">Workspace request</span><h1>{approved ? 'Your workspace is approved.' : request.status === 'rejected' ? 'Request closed.' : 'Your request is being reviewed.'}</h1><p>{approved ? 'Check your email for the secure invitation and follow it to create your account.' : 'We will update this request when an administrator has reviewed it.'}</p></div><div className="portal-auth-form-wrap"><div className="admin-detail-list"><div className="admin-detail-row"><div><strong>{request.company_name}</strong><small>{request.industry} · submitted {formatPortalDate(request.created_at, true)}</small></div><StatusPill value={request.status} /></div><div className="admin-detail-row"><div><strong>Invitation email</strong><small>{request.invitation_email_status === 'sent' ? `Sent to ${request.email}` : request.invitation_email_status === 'failed' ? 'Delivery needs attention' : 'Will be sent after approval'}</small></div>{request.invitation_email_status === 'sent' ? <CheckCircle /> : request.invitation_email_status === 'failed' ? <XCircle /> : <Clock />}</div></div>{request.review_note && <div className="portal-form-note">{request.review_note}</div>}{approved && request.invitation_email_status === 'sent' && <Link className="portal-primary-button" to="/portal/login">Open sign in <ArrowRight aria-hidden="true" /></Link>}</div></section></div>
}

export function AdminAccessRequestsPage() {
  const query = useQuery({ queryKey: ['admin', 'access-requests'], queryFn: async () => (await portalFetch<AccessRequest[]>('/admin/access-requests')).data, staleTime: 10_000 })
  const [working, setWorking] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const act = async (item: AccessRequest, action: 'approve' | 'reject' | 'resend') => {
    setWorking(`${action}:${item.id}`); setNotice(null)
    try { await portalFetch(`/admin/access-requests/${item.id}/${action}`, { method: 'POST', idempotencyKey: createIdempotencyKey(), ...jsonBody(action === 'reject' ? { note: 'The request does not currently match an onboarding requirement.' } : {}) }); setNotice(action === 'approve' ? `Approved ${item.company_name}. The invitation workflow has started.` : action === 'resend' ? `Invitation resent to ${item.email}.` : `Closed ${item.company_name}'s request.`); await query.refetch() } catch (caught) { setNotice(caught instanceof Error ? caught.message : 'The action could not be completed.') } finally { setWorking(null) }
  }
  if (query.isLoading) return <PortalLoading label="Loading workspace requests" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />
  const requests = query.data ?? []
  return <div className="admin-page"><PortalPageHeader eyebrow="Access requests" title="Review new workspace requests" description="Approve a request to create the organisation, client portal, engagement, invitation, and onboarding notification in one controlled action." />{notice && <div className="portal-panel admin-form-note">{notice}</div>}{requests.length ? <div className="portal-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Applicant</th><th>Company</th><th>Industry</th><th>Status</th><th>Invitation</th><th /></tr></thead><tbody>{requests.map((item) => <tr key={item.id}><td><strong>{item.applicant_name}</strong><small>{item.email}{item.phone_number ? <><br />{item.phone_number}</> : null}<br />{formatPortalDate(item.created_at, true)}</small></td><td><strong>{item.company_name}</strong><small>{item.website || 'No website supplied'}{item.heard_about ? <><br />Heard via {item.heard_about}</> : null}{item.use_cases.length ? <><br />Needs: {item.use_cases.join(', ')}</> : null}</small></td><td>{item.industry}</td><td><StatusPill value={item.status} /></td><td><StatusPill value={item.invitation_email_status} /></td><td><div className="admin-inline-form">{item.status === 'pending' && <><button className="portal-primary-button" type="button" disabled={Boolean(working)} onClick={() => void act(item, 'approve')}>{working === `approve:${item.id}` ? 'Approving…' : 'Approve'}</button><button className="portal-secondary-button" type="button" disabled={Boolean(working)} onClick={() => void act(item, 'reject')}>Decline</button></>}{item.status === 'approved' && <button className="portal-secondary-button" type="button" disabled={Boolean(working)} onClick={() => void act(item, 'resend')}>{working === `resend:${item.id}` ? 'Sending…' : 'Resend invitation'}</button>}</div></td></tr>)}</tbody></table></div> : <PortalEmpty title="No workspace requests" description="New companies will appear here after they submit the public workspace request form." />}</div>
}
