import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowUpRight, CheckCircle, Clock, Fingerprint, FloppyDisk, LockKeyOpen, Megaphone, PaperPlaneTilt, Plus, RocketLaunch, ShieldCheck, UserPlus, UsersThree, WarningCircle } from '@phosphor-icons/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { createIdempotencyKey, jsonBody, portalFetch } from '../../api/client'
import { usePortalAuth } from '../../auth/AuthProvider'
import { PortalEmpty, PortalError, PortalLoading, PortalPageHeader, StatusPill, formatPortalDate } from '../components/PortalState'

type Meta = { request_id: string; generated_at: string }
type Overview = { organizations: number; active_organizations: number; pending_invitations: number; onboarding_drafts: number; failed_deliveries: number; open_operations: number; meta: Meta }
type Organization = { id: string; name: string; slug: string; status: string; data_region: string; created_at: string; updated_at: string }
type Collection<T> = { items: T[]; page: { next_cursor?: string | null; has_more?: boolean }; meta: Meta }
type Template = { key: string; name: string; vertical: string; queue_key: string; fields: Array<{ key: string; label: string; required: boolean }>; steps: Array<{ key: string; label: string }>; escalation_rules: Array<{ reason: string }> }
type Draft = { id: string; organization_id?: string | null; organization_name: string; organization_slug: string; data_region: string; portal_name: string; account_name: string; engagement_name: string; vertical: string; template_key: string; template_version: number; primary_contact: { name: string; email: string }; additional_contacts?: Array<{ name: string; email: string; role?: string }>; status: string; validation_errors: string[]; published_operation_id?: string | null; created_at: string; updated_at: string }
type Membership = { id: string; principal_id: string; role: string; status: string; engagement_ids: string[]; version: number; created_at: string }
type Engagement = { id: string; name: string; status: string }
type Invitation = { id: string; email: string; role: string; status: string; expires_at: string; created_at: string }
type CommunicationMessage = { id: string; sender_principal_id: string; sender_kind: string; body: string; created_at: string }
type CommunicationDetail = { thread: { id: string; subject: string; status: string; last_activity_at: string; version: number }; messages: CommunicationMessage[]; meta: Meta }
type AdminMember = { id: string; principal_id: string; email: string; role: string; scopes: string[]; status: string; created_at: string; updated_at: string }
type AdminInvitation = { id: string; email: string; role: string; scopes: string[]; status: string; expires_at: string; invited_by: string; created_at: string; updated_at: string }
type AdminAuditEvent = { id: string; actor_id: string; action: string; resource_type: string; resource_id: string; request_id: string; changes: Record<string, unknown>; occurred_at: string }
type AdminOperation = { id: string; organization_id?: string | null; kind: string; status: string; progress: number; created_at: string; completed_at?: string | null }
type AccessGrant = { id: string; organization_id: string; principal_id: string; reason: string; scopes: string[]; status: string; expires_at: string; revoked_at?: string | null; created_at: string }

function adminQuery<T>(key: string[], path: string, enabled = true) {
  return useQuery<T, Error>({
    queryKey: ['admin', ...key],
    queryFn: async () => (await portalFetch<T>(path)).data,
    enabled,
    staleTime: 20_000,
  })
}

export function AdminOverviewPage() {
  const query = adminQuery<Overview>(['overview'], '/admin/overview')
  if (query.isLoading) return <PortalLoading label="Loading operations overview" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />
  const data = query.data
  if (!data) return <PortalEmpty title="No operations data" description="The administrator overview is not available yet." />
  const metrics = [
    ['Active organizations', data.active_organizations], ['Pending invitations', data.pending_invitations], ['Onboarding drafts', data.onboarding_drafts], ['Failed deliveries', data.failed_deliveries],
  ]
  return <div className="admin-page"><PortalPageHeader eyebrow="Internal operations" title="Keep every client next step visible" description="Provision workspaces, guide onboarding, and communicate with Lumicoria clients from one controlled place." action={<Link className="portal-primary-button" to="/portal/admin/onboarding/new"><Plus aria-hidden="true" /> New onboarding</Link>} />
    <section className="admin-metric-grid">{metrics.map(([label, value]) => <article className="portal-panel admin-metric" key={label as string}><small>{label}</small><strong>{value}</strong></article>)}</section>
    <section className="admin-overview-grid"><article className="portal-panel"><div className="admin-panel-heading"><div><span>Provisioning queue</span><h2>What needs attention</h2></div><Clock aria-hidden="true" /></div><ul className="admin-check-list"><li><CheckCircle aria-hidden="true" /> Existing client access stays invitation based.</li><li><CheckCircle aria-hidden="true" /> Vertical templates come from the approved workflow catalogue.</li><li><CheckCircle aria-hidden="true" /> Cross-organisation support access requires a reason and expiry.</li></ul></article><article className="portal-panel"><div className="admin-panel-heading"><div><span>Safety boundary</span><h2>Control before coverage</h2></div><ShieldIcon /></div><p className="admin-muted">Client records, CRM work, and internal communications remain separate. Admin actions are scoped, retry-safe, and written to the audit trail.</p><Link className="portal-secondary-button" to="/portal/admin/templates">Review templates <ArrowUpRight aria-hidden="true" /></Link></article></section>
  </div>
}

function ShieldIcon() { return <WarningCircle aria-hidden="true" /> }

export function AdminOrganizationsPage() {
  const query = adminQuery<Collection<Organization>>(['organizations'], '/admin/organizations?page_size=100')
  if (query.isLoading) return <PortalLoading label="Loading organizations" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />
  const organizations = query.data?.items ?? []
  return <div className="admin-page"><PortalPageHeader eyebrow="Client directory" title="Organizations" description="See every provisioned workspace and its current access state." action={<Link className="portal-primary-button" to="/portal/admin/onboarding/new"><Plus aria-hidden="true" /> New onboarding</Link>} />
    {organizations.length ? <div className="portal-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Organization</th><th>Status</th><th>Region</th><th>Updated</th><th /></tr></thead><tbody>{organizations.map((org) => <tr key={org.id}><td><strong>{org.name}</strong><small>{org.slug} · {org.id}</small></td><td><StatusPill value={org.status} /></td><td>{org.data_region.toUpperCase()}</td><td>{formatPortalDate(org.updated_at, true)}</td><td><Link className="portal-secondary-button" to={`/portal/admin/organizations/${org.id}`}>Open <ArrowUpRight aria-hidden="true" /></Link></td></tr>)}</tbody></table></div> : <PortalEmpty title="No organizations yet" description="Create the first client workspace through the staged onboarding flow." action={<Link className="portal-primary-button" to="/portal/admin/onboarding/new">Start onboarding</Link>} />}
  </div>
}

export function AdminOrganizationDetailPage() {
  const { organizationId } = useParams()
  const organization = adminQuery<Organization>(['organization', organizationId ?? ''], `/admin/organizations/${organizationId ?? ''}`, Boolean(organizationId))
  const memberships = adminQuery<Membership[]>(['memberships', organizationId ?? ''], `/admin/organizations/${organizationId ?? ''}/memberships`, Boolean(organizationId))
  const engagements = adminQuery<Engagement[]>(['engagements', organizationId ?? ''], `/admin/organizations/${organizationId ?? ''}/engagements`, Boolean(organizationId))
  const invitations = adminQuery<Invitation[]>(['invitations', organizationId ?? ''], `/admin/organizations/${organizationId ?? ''}/invitations`, Boolean(organizationId))
  const grants = adminQuery<AccessGrant[]>(['access-grants', organizationId ?? ''], `/admin/organizations/${organizationId ?? ''}/access-grants`, Boolean(organizationId))
  const threads = adminQuery<Collection<{ id: string; subject: string; status: string; last_activity_at: string }>>(['communications', organizationId ?? ''], `/admin/organizations/${organizationId ?? ''}/communications`, Boolean(organizationId))
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('client_portal_admin')
  const [inviteEngagementId, setInviteEngagementId] = useState('')
  const [engagementSelection, setEngagementSelection] = useState<Record<string, string>>({})
  const [accessReason, setAccessReason] = useState('')
  const [accessMinutes, setAccessMinutes] = useState('60')
  const [sending, setSending] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)
  const [grantingAccess, setGrantingAccess] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [invitationLink, setInvitationLink] = useState<string | null>(null)
  const [assigningMembership, setAssigningMembership] = useState<string | null>(null)
  if (organization.isLoading) return <PortalLoading label="Loading client workspace" />
  if (organization.error) return <PortalError error={organization.error} onRetry={() => void organization.refetch()} />
  const send = async (event: React.FormEvent) => {
    event.preventDefault(); if (!organizationId || !subject.trim() || !body.trim()) return
    setSending(true); setMessage(null)
    try {
      await portalFetch(`/admin/organizations/${organizationId}/communications`, { method: 'POST', idempotencyKey: createIdempotencyKey(), ...jsonBody({ subject: subject.trim(), body: body.trim() }) })
      setSubject(''); setBody(''); setMessage('Message saved to the client portal. An email notice is queued only when Resend is configured.'); void threads.refetch()
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : 'The message could not be sent.') } finally { setSending(false) }
  }
  const invite = async (event: React.FormEvent) => {
    event.preventDefault(); if (!organizationId || !inviteEmail.trim()) return
    setInviting(true); setMessage(null)
    try {
      const { data } = await portalFetch<{ invitation_token: string; expires_at: string }>(`/admin/organizations/${organizationId}/invitations`, { method: 'POST', idempotencyKey: createIdempotencyKey(), ...jsonBody({ email: inviteEmail.trim(), role: inviteRole, engagement_ids: inviteEngagementId ? [inviteEngagementId] : [] }) })
      setInviteEmail(''); setInvitationLink(`${window.location.origin}/portal/invitations/${data.invitation_token}`); setMessage('Client invitation created. Send the secure link to the invited user.')
      void invitations.refetch()
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : 'The invitation could not be created.') } finally { setInviting(false) }
  }
  const assignEngagement = async (membership: Membership) => {
    if (!organizationId) return
    const engagementId = engagementSelection[membership.id] ?? membership.engagement_ids[0] ?? ''
    setAssigningMembership(membership.id); setMessage(null)
    try {
      await portalFetch(`/admin/organizations/${organizationId}/memberships/${membership.id}/engagements`, { method: 'PATCH', idempotencyKey: createIdempotencyKey(), ifMatch: `"v${membership.version}"`, ...jsonBody({ engagement_ids: engagementId ? [engagementId] : [] }) })
      setMessage('Engagement access updated. Ask the client to refresh the portal.')
      void memberships.refetch()
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : 'The engagement access could not be updated.') } finally { setAssigningMembership(null) }
  }
  const changeStatus = async () => {
    if (!organizationId || !organization.data) return
    setChangingStatus(true); setMessage(null)
    try {
      await portalFetch(`/admin/organizations/${organizationId}/${organization.data.status === 'active' ? 'suspend' : 'restore'}`, { method: 'POST', idempotencyKey: createIdempotencyKey() })
      setMessage(organization.data.status === 'active' ? 'Organization suspended.' : 'Organization restored.')
      void organization.refetch()
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : 'The organization status could not be changed.') } finally { setChangingStatus(false) }
  }
  const grantAccess = async (event: React.FormEvent) => {
    event.preventDefault(); if (!organizationId || accessReason.trim().length < 10) return
    setGrantingAccess(true); setMessage(null)
    try {
      await portalFetch(`/admin/organizations/${organizationId}/access-grant`, { method: 'POST', idempotencyKey: createIdempotencyKey(), ...jsonBody({ reason: accessReason.trim(), scopes: ['crm.customers.read', 'crm.conversations.read', 'crm.tickets.read', 'crm.timeline.read', 'voice.call.read'], expires_in_minutes: Number(accessMinutes) }) })
      setAccessReason(''); setMessage('Audited support access granted with an expiry.'); void grants.refetch()
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : 'The access grant could not be created.') } finally { setGrantingAccess(false) }
  }
  return <div className="admin-page"><PortalPageHeader eyebrow="Client workspace" title={organization.data?.name ?? 'Organization'} description={`${organization.data?.id} · ${organization.data?.data_region.toUpperCase()} · ${organization.data?.status}`} action={<Link className="portal-secondary-button" to="/portal/admin/organizations">Back to directory</Link>} />
    <section className="admin-detail-grid"><article className="portal-panel"><div className="admin-panel-heading"><div><span>Portal access</span><h2>Members and invitations</h2></div><UsersThree aria-hidden="true" /></div><div className="admin-detail-list">{(memberships.data ?? []).map((item) => <div className="admin-detail-row" key={item.id}><div><strong>{item.principal_id}</strong><small>{item.role} · {item.engagement_ids.length ? 'Engagement assigned' : 'No engagement assigned'}</small></div><div className="admin-inline-form"><select aria-label={`Engagement for ${item.principal_id}`} value={engagementSelection[item.id] ?? item.engagement_ids[0] ?? ''} onChange={(event) => setEngagementSelection((current) => ({ ...current, [item.id]: event.target.value }))}><option value="">No engagement</option>{(engagements.data ?? []).map((engagement) => <option key={engagement.id} value={engagement.id}>{engagement.name}</option>)}</select><button className="portal-secondary-button" type="button" disabled={assigningMembership === item.id} onClick={() => void assignEngagement(item)}>{assigningMembership === item.id ? 'Saving...' : 'Assign'}</button><StatusPill value={item.status} /></div></div>)}{(invitations.data ?? []).map((item) => <div className="admin-detail-row" key={item.id}><div><strong>{item.email}</strong><small>Invitation · {formatPortalDate(item.expires_at)}</small></div><StatusPill value={item.status} /></div>)}{!memberships.data?.length && !invitations.data?.length && <p className="admin-muted">No access records yet.</p>}</div><form className="admin-inline-form admin-access-form" onSubmit={invite}><input aria-label="Client email" required type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="client@example.com" /><select aria-label="Client role" value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}><option value="client_portal_admin">Portal admin</option><option value="client_project_owner">Project owner</option><option value="client_operator">Operator</option></select><select aria-label="Engagement for invitation" value={inviteEngagementId} onChange={(event) => setInviteEngagementId(event.target.value)}><option value="">Assign later</option>{(engagements.data ?? []).map((engagement) => <option key={engagement.id} value={engagement.id}>{engagement.name}</option>)}</select><button className="portal-secondary-button" type="submit" disabled={inviting}><UserPlus aria-hidden="true" /> {inviting ? 'Inviting...' : 'Invite client'}</button></form>{invitationLink && <div className="admin-invitation-link"><strong>Secure invitation link</strong><a href={invitationLink}>{invitationLink}</a><button className="portal-secondary-button" type="button" onClick={() => void navigator.clipboard?.writeText(invitationLink)}>Copy link</button></div>}</article><form className="portal-panel admin-form" onSubmit={send}><div className="admin-panel-heading"><div><span>Client communication</span><h2>Send a message</h2></div><PaperPlaneTilt aria-hidden="true" /></div><label>Subject<input required value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Next step for your support workspace" /></label><label>Message<textarea required value={body} onChange={(event) => setBody(event.target.value)} rows={6} placeholder="Write a clear update for the client portal." /></label><div className="admin-inline-form"><button className="portal-primary-button" type="submit" disabled={sending}><PaperPlaneTilt aria-hidden="true" /> {sending ? 'Sending...' : 'Send to portal'}</button><button className="portal-secondary-button" type="button" disabled={changingStatus} onClick={() => void changeStatus()}>{changingStatus ? 'Updating...' : organization.data?.status === 'active' ? 'Suspend organization' : 'Restore organization'}</button></div>{message && <p className="admin-form-note">{message}</p>}</form></section>
    <section className="portal-panel admin-access-panel"><div className="admin-panel-heading"><div><span>Audited support access</span><h2>Temporary workspace grants</h2></div><LockKeyOpen aria-hidden="true" /></div><form className="admin-inline-form admin-access-form" onSubmit={grantAccess}><input aria-label="Access reason" required minLength={10} value={accessReason} onChange={(event) => setAccessReason(event.target.value)} placeholder="Reason for reviewing this client workspace" /><select aria-label="Access duration" value={accessMinutes} onChange={(event) => setAccessMinutes(event.target.value)}><option value="30">30 minutes</option><option value="60">1 hour</option><option value="240">4 hours</option><option value="480">8 hours</option></select><button className="portal-secondary-button" type="submit" disabled={grantingAccess}>{grantingAccess ? 'Granting...' : 'Grant support access'}</button></form><div className="admin-detail-list">{(grants.data ?? []).map((grant) => <div className="admin-detail-row" key={grant.id}><div><strong>{grant.principal_id}</strong><small>{grant.reason} · expires {formatPortalDate(grant.expires_at)}</small></div><StatusPill value={grant.status} /></div>)}{!grants.data?.length && <p className="admin-muted">No temporary support grants for this workspace.</p>}</div></section>
    <section className="portal-panel"><div className="admin-panel-heading"><div><span>Conversation history</span><h2>Recent threads</h2></div><Megaphone aria-hidden="true" /></div>{threads.data?.items.length ? <div className="admin-message-list">{threads.data.items.map((thread) => <div className="admin-message-row" key={thread.id}><div><strong>{thread.subject}</strong><small>{formatPortalDate(thread.last_activity_at, true)}</small></div><StatusPill value={thread.status} /></div>)}</div> : <PortalEmpty title="No client messages yet" description="Your first message will appear here after it is created." />}</section>
  </div>
}

export function AdminTemplatesPage() {
  const query = adminQuery<{ items: Template[]; meta: Meta }>(['templates'], '/admin/templates')
  if (query.isLoading) return <PortalLoading label="Loading workflow templates" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />
  return <div className="admin-page"><PortalPageHeader eyebrow="Onboarding catalogue" title="Workflow templates" description="Use the same controlled vertical workflows in every new client workspace." />
    <div className="admin-template-grid">{(query.data?.items ?? []).map((template) => <article className="portal-panel admin-template-card" key={template.key}><div className="admin-template-top"><span>{template.vertical.replaceAll('_', ' ')}</span><StatusPill value="published" /></div><h2>{template.name}</h2><p>Queue: {template.queue_key}</p><div className="admin-template-stats"><span>{template.fields.length} required fields</span><span>{template.steps.length} workflow steps</span><span>{template.escalation_rules.length} escalation rules</span></div></article>)}</div>
  </div>
}

export function AdminAdministratorsPage() {
  const members = adminQuery<AdminMember[]>(['administrators'], '/admin/administrators')
  const invitations = adminQuery<AdminInvitation[]>(['administrator-invitations'], '/admin/administrators/invitations')
  const [form, setForm] = useState({ email: '', role: 'account_manager' })
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const sendInvitation = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setNotice(null)
    try {
      await portalFetch('/admin/administrators/invitations', { method: 'POST', idempotencyKey: createIdempotencyKey(), ...jsonBody(form) })
      setForm({ email: '', role: 'account_manager' }); setNotice('Administrator invitation recorded. Complete the Firebase claim step before the user can enter.')
      void invitations.refetch()
    } catch (caught) { setNotice(caught instanceof Error ? caught.message : 'The invitation could not be created.') } finally { setSaving(false) }
  }
  if (members.isLoading || invitations.isLoading) return <PortalLoading label="Loading administrator access" />
  if (members.error) return <PortalError error={members.error} onRetry={() => void members.refetch()} />
  return <div className="admin-page"><PortalPageHeader eyebrow="Internal access" title="Administrators" description="Keep internal roles, claims, and operational access deliberate and reviewable." action={<form className="admin-inline-form" onSubmit={sendInvitation}><input aria-label="Administrator email" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@lumicoria.com" /><select aria-label="Administrator role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="account_manager">Account manager</option><option value="support_operator">Support operator</option><option value="platform_admin">Platform admin</option></select><button className="portal-primary-button" type="submit" disabled={saving}><UserPlus aria-hidden="true" /> {saving ? 'Saving...' : 'Invite'}</button></form>} />{notice && <div className="portal-panel admin-form-note">{notice}</div>}<section className="admin-detail-grid"><article className="portal-panel"><div className="admin-panel-heading"><div><span>Active access</span><h2>Internal team</h2></div><ShieldCheck aria-hidden="true" /></div><div className="admin-detail-list">{(members.data ?? []).map((member) => <div className="admin-detail-row" key={member.id}><div><strong>{member.email}</strong><small>{member.role.replaceAll('_', ' ')} · {member.principal_id}</small></div><StatusPill value={member.status} /></div>)}{!members.data?.length && <p className="admin-muted">No internal administrators have been provisioned.</p>}</div></article><article className="portal-panel"><div className="admin-panel-heading"><div><span>Pending access</span><h2>Invitations</h2></div><UserPlus aria-hidden="true" /></div><div className="admin-detail-list">{(invitations.data ?? []).map((invitation) => <div className="admin-detail-row" key={invitation.id}><div><strong>{invitation.email}</strong><small>{invitation.role.replaceAll('_', ' ')} · expires {formatPortalDate(invitation.expires_at)}</small></div><StatusPill value={invitation.status} /></div>)}{!invitations.data?.length && <p className="admin-muted">No pending administrator invitations.</p>}</div></article></section></div>
}

export function AdminAuditPage() {
  const query = adminQuery<Collection<AdminAuditEvent>>(['audit'], '/admin/audit?page_size=100')
  if (query.isLoading) return <PortalLoading label="Loading administrator audit" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />
  return <div className="admin-page"><PortalPageHeader eyebrow="Governance" title="Admin audit" description="Review provisioning, access grants, organisation changes, and communication actions without exposing private customer content." />{query.data?.items.length ? <div className="portal-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Action</th><th>Resource</th><th>Actor</th><th>Request</th><th>Time</th></tr></thead><tbody>{query.data.items.map((event) => <tr key={event.id}><td><strong>{event.action}</strong><small>{event.id}</small></td><td>{event.resource_type}<small>{event.resource_id}</small></td><td>{event.actor_id}</td><td>{event.request_id}</td><td>{formatPortalDate(event.occurred_at, true)}</td></tr>)}</tbody></table></div> : <PortalEmpty title="No admin actions yet" description="Provisioning and support actions will appear here once the console is used." />}</div>
}

export function AdminSettingsPage() {
  const query = adminQuery<{ principal_id: string; email?: string; role: string; scopes: string[] }>(['context'], '/admin/context')
  if (query.isLoading) return <PortalLoading label="Loading admin settings" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />
  return <div className="admin-page"><PortalPageHeader eyebrow="Control plane" title="Admin settings" description="This console uses backend permissions and feature state as the source of truth." /><section className="admin-detail-grid"><article className="portal-panel"><div className="admin-panel-heading"><div><span>Signed-in administrator</span><h2>{query.data?.email ?? query.data?.principal_id}</h2></div><LockKeyOpen aria-hidden="true" /></div><dl className="admin-definition-list"><div><dt>Role</dt><dd>{query.data?.role.replaceAll('_', ' ')}</dd></div><div><dt>Scopes</dt><dd>{query.data?.scopes.length ?? 0} granted</dd></div></dl></article><article className="portal-panel"><div className="admin-panel-heading"><div><span>Safety rules</span><h2>Before you act</h2></div><ShieldCheck aria-hidden="true" /></div><ul className="admin-check-list"><li><CheckCircle aria-hidden="true" /> Client access is invitation based.</li><li><CheckCircle aria-hidden="true" /> Cross-organisation support requires a reason and expiry.</li><li><CheckCircle aria-hidden="true" /> Provider credentials are never shown after submission.</li></ul></article></section></div>
}

export function AdminIdentityPage() {
  const { adminContext, firebaseUser } = usePortalAuth()
  return <div className="admin-page"><PortalPageHeader eyebrow="Identity setup" title="Firebase identity" description="The signed-in Firebase identity is resolved automatically. Use this page to confirm the UID used by the internal administrator record." /><section className="admin-detail-grid"><article className="portal-panel"><div className="admin-panel-heading"><div><span>Current identity</span><h2>{firebaseUser?.email ?? 'No Firebase email'}</h2></div><Fingerprint aria-hidden="true" /></div><dl className="admin-definition-list"><div><dt>Firebase UID</dt><dd><code>{firebaseUser?.uid ?? 'Unavailable'}</code></dd></div><div><dt>Email verified</dt><dd>{firebaseUser?.emailVerified ? 'Yes' : 'No'}</dd></div><div><dt>Admin role</dt><dd>{adminContext?.role?.replaceAll('_', ' ') ?? 'Unavailable'}</dd></div><div><dt>Admin scopes</dt><dd>{adminContext?.scopes.length ?? 0} granted</dd></div></dl></article><article className="portal-panel"><div className="admin-panel-heading"><div><span>How identity is used</span><h2>No UID field for client invites</h2></div><ShieldCheck aria-hidden="true" /></div><ul className="admin-check-list"><li><CheckCircle aria-hidden="true" /> Client users create or sign in to Firebase from their invitation link.</li><li><CheckCircle aria-hidden="true" /> The backend links their Firebase UID when they accept the invitation.</li><li><CheckCircle aria-hidden="true" /> The UID is only needed for server-side admin bootstrap or identity support.</li></ul><p className="admin-muted">Do not paste service-account credentials into this portal. Use the UID only when a secure server-side bootstrap or support task explicitly requests it.</p></article></section></div>
}

export function AdminOperationsPage() {
  const query = adminQuery<AdminOperation[]>(['operations'], '/admin/operations')
  if (query.isLoading) return <PortalLoading label="Loading admin operations" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />
  return <div className="admin-page"><PortalPageHeader eyebrow="Execution" title="Operations" description="Track provisioning, invitation, export, and delivery work without guessing whether a background action finished." />{query.data?.length ? <div className="portal-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Operation</th><th>Organization</th><th>Status</th><th>Progress</th><th>Started</th></tr></thead><tbody>{query.data.map((operation) => <tr key={operation.id}><td><strong>{operation.kind.replaceAll('_', ' ')}</strong><small>{operation.id}</small></td><td>{operation.organization_id ?? 'Platform'}</td><td><StatusPill value={operation.status} /></td><td>{operation.progress}%</td><td>{formatPortalDate(operation.created_at, true)}</td></tr>)}</tbody></table></div> : <PortalEmpty title="No operations yet" description="Long-running admin actions will appear here when work is queued." />}</div>
}

export function AdminOnboardingPage() {
  const navigate = useNavigate()
  const templates = adminQuery<{ items: Template[]; meta: Meta }>(['templates', 'onboarding'], '/admin/templates')
  const [form, setForm] = useState({ organization_name: '', organization_slug: '', portal_name: '', account_name: '', engagement_name: '', vertical: 'logistics', template_key: 'logistics_delivery_exception', name: '', email: '' })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const selected = templates.data?.items.find((template) => template.key === form.template_key)
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(null)
    try {
      const { data } = await portalFetch<Draft>('/admin/onboarding/drafts', { method: 'POST', idempotencyKey: createIdempotencyKey(), ...jsonBody({ organization_name: form.organization_name, organization_slug: form.organization_slug, portal_name: form.portal_name, account_name: form.account_name, engagement_name: form.engagement_name, vertical: form.vertical, template_key: form.template_key, primary_contact: { name: form.name, email: form.email } }) })
      await portalFetch(`/admin/onboarding/drafts/${data.id}/validate`, { method: 'POST', idempotencyKey: createIdempotencyKey() })
      navigate(`/portal/admin/onboarding/drafts/${data.id}`)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The onboarding draft could not be saved.') } finally { setSaving(false) }
  }
  return <div className="admin-page"><PortalPageHeader eyebrow="Staged onboarding" title="Create a client workspace" description="Save the details first, review the workflow, then publish the portal and send verified invitations." />
    <form className="portal-panel admin-form" onSubmit={save}><div className="admin-form-grid"><label>Organization name<input required value={form.organization_name} onChange={(e) => update('organization_name', e.target.value)} /></label><label>Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.organization_slug} onChange={(e) => update('organization_slug', e.target.value)} /></label><label>Portal name<input required value={form.portal_name} onChange={(e) => update('portal_name', e.target.value)} /></label><label>Client account name<input required value={form.account_name} onChange={(e) => update('account_name', e.target.value)} /></label><label>Engagement name<input required value={form.engagement_name} onChange={(e) => update('engagement_name', e.target.value)} /></label><label>Vertical<select value={form.vertical} onChange={(e) => { update('vertical', e.target.value); const match = templates.data?.items.find((item) => item.vertical === e.target.value); if (match) update('template_key', match.key) }}>{Array.from(new Set((templates.data?.items ?? []).map((item) => item.vertical))).map((vertical) => <option key={vertical}>{vertical.replaceAll('_', ' ')}</option>)}</select></label><label>Primary contact name<input required value={form.name} onChange={(e) => update('name', e.target.value)} /></label><label>Primary contact email<input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></label></div><div className="admin-form-preview"><div><span>Selected workflow</span><h2>{selected?.name ?? 'Loading template'}</h2><p>{selected ? `${selected.fields.length} fields, ${selected.steps.length} steps, ${selected.escalation_rules.length} escalation rules.` : 'Choose a template from the approved catalogue.'}</p></div><button className="portal-primary-button" type="submit" disabled={saving || templates.isLoading}><FloppyDisk aria-hidden="true" /> {saving ? 'Saving...' : 'Save onboarding draft'}</button></div>{error && <p className="admin-form-error">{error}</p>}</form>
  </div>
}

export function AdminDraftsPage() {
  const query = adminQuery<Collection<Draft>>(['onboarding-drafts'], '/admin/onboarding/drafts?page_size=100')
  if (query.isLoading) return <PortalLoading label="Loading onboarding drafts" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />
  const drafts = query.data?.items ?? []
  return <div className="admin-page"><PortalPageHeader eyebrow="Staged onboarding" title="Draft workspaces" description="Review saved onboarding work before provisioning a client organisation." action={<Link className="portal-primary-button" to="/portal/admin/onboarding/new"><Plus aria-hidden="true" /> New onboarding</Link>} />{drafts.length ? <div className="portal-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Organisation</th><th>Vertical</th><th>Primary contact</th><th>Status</th><th>Updated</th><th /></tr></thead><tbody>{drafts.map((draft) => <tr key={draft.id}><td><strong>{draft.organization_name}</strong><small>{draft.organization_slug} · {draft.id}</small></td><td>{draft.vertical.replaceAll('_', ' ')}</td><td>{draft.primary_contact.email}</td><td><StatusPill value={draft.status} /></td><td>{formatPortalDate(draft.updated_at, true)}</td><td><Link className="portal-secondary-button" to={`/portal/admin/onboarding/drafts/${draft.id}`}>Open review <ArrowUpRight aria-hidden="true" /></Link></td></tr>)}</tbody></table></div> : <PortalEmpty title="No onboarding drafts" description="Saved workspaces will appear here before they are published." action={<Link className="portal-primary-button" to="/portal/admin/onboarding/new">Start onboarding</Link>} />}</div>
}

export function AdminOnboardingDraftPage() {
  const { draftId } = useParams()
  const navigate = useNavigate()
  const draft = adminQuery<Draft>(['onboarding-draft', draftId ?? ''], `/admin/onboarding/drafts/${draftId ?? ''}`, Boolean(draftId))
  const templates = adminQuery<{ items: Template[]; meta: Meta }>(['templates', 'draft', draftId ?? ''], '/admin/templates', Boolean(draftId))
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [valid, setValid] = useState(false)
  const selected = templates.data?.items.find((template) => template.key === draft.data?.template_key)

  if (draft.isLoading || templates.isLoading) return <PortalLoading label="Loading onboarding review" />
  if (draft.error) return <PortalError error={draft.error} onRetry={() => void draft.refetch()} />
  if (!draft.data) return <PortalEmpty title="Draft not found" description="This onboarding draft is no longer available." action={<Link className="portal-secondary-button" to="/portal/admin/onboarding/new">Start again</Link>} />

  const validate = async () => {
    setWorking(true); setError(null); setNotice(null)
    try {
      const result = await portalFetch<{ valid: boolean; errors: string[] }>(`/admin/onboarding/drafts/${draft.data.id}/validate`, { method: 'POST', idempotencyKey: createIdempotencyKey() })
      setValid(result.data.valid)
      setNotice(result.data.valid ? 'Everything is ready. Review the details, then publish the client workspace.' : 'Fix the items shown below before publishing.')
      await draft.refetch()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The draft could not be validated.') } finally { setWorking(false) }
  }

  const publish = async () => {
    setWorking(true); setError(null); setNotice(null)
    try {
      const result = await portalFetch<{ operation: string; status: string; result?: { organization_id?: string } }>(`/admin/onboarding/drafts/${draft.data.id}/publish`, { method: 'POST', idempotencyKey: createIdempotencyKey() })
      const organizationId = result.data.result?.organization_id || draft.data.organization_id
      setNotice(`Workspace published. Operation ${result.data.operation} is ${result.data.status}.`)
      await draft.refetch()
      if (organizationId) navigate(`/portal/admin/organizations/${organizationId}`)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The workspace could not be published.') } finally { setWorking(false) }
  }

  const errors = draft.data.validation_errors ?? []
  const published = draft.data.status === 'published'
  const readyToPublish = valid || (draft.data.status === 'review' && errors.length === 0)
  return <div className="admin-page"><PortalPageHeader eyebrow="Onboarding review" title={`Prepare ${draft.data.organization_name}`} description="The draft is saved and checked automatically. Publish once to create the organisation, portal, workflow, queue, and first invitation." action={<Link className="portal-secondary-button" to="/portal/admin/onboarding/new"><ArrowLeft aria-hidden="true" /> New draft</Link>} />
    <section className="admin-detail-grid"><article className="portal-panel"><div className="admin-panel-heading"><div><span>Workspace setup</span><h2>Provisioning details</h2></div><CheckCircle aria-hidden="true" /></div><dl className="admin-definition-list"><div><dt>Organisation</dt><dd>{draft.data.organization_name} <small>{draft.data.organization_slug}</small></dd></div><div><dt>Portal</dt><dd>{draft.data.portal_name}</dd></div><div><dt>Client account</dt><dd>{draft.data.account_name}</dd></div><div><dt>Engagement</dt><dd>{draft.data.engagement_name}</dd></div><div><dt>Primary contact</dt><dd>{draft.data.primary_contact.name}<small>{draft.data.primary_contact.email}</small></dd></div><div><dt>Region</dt><dd>{draft.data.data_region.toUpperCase()}</dd></div><div><dt>Status</dt><dd><StatusPill value={draft.data.status} /></dd></div></dl></article><article className="portal-panel"><div className="admin-panel-heading"><div><span>Selected workflow</span><h2>{selected?.name ?? draft.data.template_key}</h2></div><RocketLaunch aria-hidden="true" /></div>{selected ? <><p className="admin-muted">{draft.data.vertical.replaceAll('_', ' ')} workflow with {selected.fields.length} fields, {selected.steps.length} steps, and {selected.escalation_rules.length} escalation rules.</p><div className="admin-detail-list">{selected.steps.map((step) => <div className="admin-detail-row" key={step.key}><div><strong>{step.label}</strong><small>Controlled workflow step</small></div><StatusPill value="ready" /></div>)}</div></> : <p className="admin-muted">The selected workflow is not available in the current catalogue.</p>}</article></section>
    {(errors.length > 0 || error) && <div className="portal-panel admin-form-error"><strong>Review required</strong>{errors.map((item) => <p key={item}>{item}</p>)}{error && <p>{error}</p>}</div>}
    {notice && <div className="portal-panel admin-form-note">{notice}</div>}
    <section className="portal-panel admin-form-preview"><div><span>Next action</span><h2>{published ? 'Workspace published' : readyToPublish ? 'Ready to publish' : 'Review required'}</h2><p>{published ? 'Open the organisation to invite more users and send the first client message.' : 'Publishing is deliberate because it creates access, records, and a live client workspace.'}</p></div><div className="admin-inline-form">{!published && !readyToPublish && <button className="portal-secondary-button" type="button" onClick={() => void validate()} disabled={working}><CheckCircle aria-hidden="true" /> {working ? 'Checking...' : 'Validate details'}</button>}{!published && readyToPublish && <button className="portal-primary-button" type="button" onClick={() => void publish()} disabled={working}><RocketLaunch aria-hidden="true" /> {working ? 'Publishing...' : 'Publish workspace'}</button>}{published && draft.data.organization_id && <Link className="portal-primary-button" to={`/portal/admin/organizations/${draft.data.organization_id}`}>Open client workspace <ArrowUpRight aria-hidden="true" /></Link>}</div></section>
  </div>
}

export function AdminCommunicationsPage() {
  return <div className="admin-page"><PortalPageHeader eyebrow="Client relationship" title="Communications" description="Select an organization from the directory to open a client communication thread. Messages stay in the portal and email notices point clients back here." /><PortalEmpty title="Choose a client workspace" description="Client communications are scoped to an organization so messages, recipients, and audit records never cross workspaces." action={<Link className="portal-secondary-button" to="/portal/admin/organizations">Open organizations <ArrowUpRight aria-hidden="true" /></Link>} /></div>
}

export function AdminPlaceholderPage({ title, description }: { title: string; description: string }) {
  return <div className="admin-page"><PortalPageHeader eyebrow="Internal operations" title={title} description={description} /><PortalEmpty title="Ready for the next control" description="This area is protected by the admin contract and will show live records once its backend resource is enabled." /></div>
}

export function ClientCommunicationsPage() {
  const query = adminQuery<Collection<{ id: string; subject: string; status: string; last_activity_at: string }>>(['client-communications'], '/communications')
  if (query.isLoading) return <PortalLoading label="Loading Lumicoria messages" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />
  return <div className="admin-page"><PortalPageHeader eyebrow="Lumicoria messages" title="Messages from your team" description="The portal is the source of truth for announcements, questions, and replies." />{query.data?.items.length ? <div className="portal-panel admin-message-list">{query.data.items.map((thread) => <Link to={`/portal/communications/${thread.id}`} className="admin-message-row" key={thread.id}><div><strong>{thread.subject}</strong><small>{formatPortalDate(thread.last_activity_at, true)}</small></div><StatusPill value={thread.status} /></Link>)}</div> : <PortalEmpty title="No messages yet" description="Updates from Lumicoria will appear here." />}</div>
}

export function ClientCommunicationThreadPage() {
  const { threadId } = useParams()
  const query = adminQuery<CommunicationDetail>(['client-communication', threadId ?? ''], `/communications/${threadId ?? ''}`, Boolean(threadId))
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  if (query.isLoading) return <PortalLoading label="Loading message thread" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />
  const send = async (event: React.FormEvent) => {
    event.preventDefault(); if (!threadId || !body.trim()) return
    setSending(true)
    try { await portalFetch(`/communications/${threadId}/messages`, { method: 'POST', idempotencyKey: createIdempotencyKey(), ...jsonBody({ body: body.trim() }) }); setBody(''); void query.refetch() } finally { setSending(false) }
  }
  return <div className="admin-page"><PortalPageHeader eyebrow="Client communication" title={query.data?.thread.subject ?? 'Message thread'} description="Reply from the portal so the client and Lumicoria team keep one visible history." action={<Link className="portal-secondary-button" to="/portal/communications">Back to messages</Link>} /><section className="portal-panel admin-thread">{(query.data?.messages ?? []).map((item) => <article className={`admin-thread-message ${item.sender_kind === 'client' ? 'is-client' : ''}`} key={item.id}><span>{item.sender_kind === 'client' ? 'Client' : 'Lumicoria'}</span><p>{item.body}</p><small>{formatPortalDate(item.created_at, true)}</small></article>)}<form className="admin-thread-reply" onSubmit={send}><textarea required rows={4} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a reply" /><button className="portal-primary-button" disabled={sending} type="submit">{sending ? 'Sending...' : 'Reply'}</button></form></section></div>
}
