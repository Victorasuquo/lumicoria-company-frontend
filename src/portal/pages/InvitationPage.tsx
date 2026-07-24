import { ArrowRight, EnvelopeSimple, ShieldCheck } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { type FormEvent, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { isPortalApiError } from '../../api/client'
import {
  acceptInvitation,
  createPortalSession,
  inspectInvitation,
} from '../../api/resources'
import { formatPortalDate, humanize, PortalError, PortalLoading } from '../components/PortalState'
import { isFirebaseConfigured, portalAuth } from '../../auth/firebase'

export function InvitationPage() {
  const { token } = useParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [accepted, setAccepted] = useState(false)
  const invitationQuery = useQuery({
    queryKey: ['portal-invitation', token],
    queryFn: async () => (await inspectInvitation(token!)).data,
    enabled: Boolean(token),
    retry: false,
  })

  if (!token) return <Navigate to="/portal/login" replace />
  if (invitationQuery.isLoading) return <PortalLoading label="Checking your invitation" />
  if (invitationQuery.error) return <div className="portal-public-state"><PortalError error={invitationQuery.error} title="This invitation is unavailable" /></div>
  if (!invitationQuery.data) return null

  async function handleAccept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!portalAuth) return
    setSubmitting(true)
    setError(null)
    try {
      const credential = await signInWithEmailAndPassword(portalAuth, email, password)
      if (!credential.user.emailVerified) {
        throw new Error('Verify your email address before accepting this invitation.')
      }
      const identityToken = await credential.user.getIdToken(true)
      const { data: acceptance } = await acceptInvitation(token!, identityToken)
      await createPortalSession(identityToken, acceptance.organization_id, true)
      setAccepted(true)
      window.setTimeout(() => window.location.assign('/portal'), 700)
    } catch (caught) {
      setError(caught)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="portal-invitation-page">
      <a className="portal-auth-brand" href="/">
        <img src="/brand-mark.png" alt="" />
        Lumicoria
      </a>
      <section className="portal-invitation-card">
        <div className="portal-invitation-summary">
          <ShieldCheck aria-hidden="true" weight="duotone" />
          <span className="portal-auth-kicker">Company invitation</span>
          <h1>Join {invitationQuery.data.organization_name}</h1>
          <p>You have been invited into {invitationQuery.data.portal_name || 'the client delivery portal'} as {humanize(invitationQuery.data.role)}.</p>
          <dl>
            <div><dt>For</dt><dd>{invitationQuery.data.intended_email_hint}</dd></div>
            <div><dt>Expires</dt><dd>{formatPortalDate(invitationQuery.data.expires_at, true)}</dd></div>
            <div><dt>Status</dt><dd>{humanize(invitationQuery.data.status)}</dd></div>
          </dl>
        </div>
        <div className="portal-invitation-form">
          <EnvelopeSimple aria-hidden="true" weight="duotone" />
          <h2>Confirm your account</h2>
          <p>Sign in with the verified email address that received this invitation.</p>
          {!isFirebaseConfigured && <div className="portal-config-notice">Identity configuration is required before invitations can be accepted.</div>}
          {accepted && <div className="portal-success-notice">Invitation accepted. Opening your workspace…</div>}
          {error ? (
            <div className="portal-form-error" role="alert">
              <strong>Invitation not accepted</strong>
              <span>{error instanceof Error ? error.message : 'Please try again.'}</span>
              {isPortalApiError(error) ? <small>Request ID: {error.requestId}</small> : null}
            </div>
          ) : null}
          <form onSubmit={handleAccept}>
            <label>
              Work email
              <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label>
              Password
              <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            <button className="portal-primary-button" type="submit" disabled={!isFirebaseConfigured || submitting || accepted}>
              {submitting ? 'Confirming…' : 'Accept invitation'}
              {!submitting && <ArrowRight aria-hidden="true" />}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
