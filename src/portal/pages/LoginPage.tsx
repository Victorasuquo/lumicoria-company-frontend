import { ArrowRight, CheckCircle, LockKey, Pulse } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { portalFetch, isPortalApiError } from '../../api/client'
import { requestPasswordReset } from '../../api/resources'
import { usePortalAuth } from '../../auth/AuthProvider'

type LocationState = { from?: string }

export function LoginPage() {
  const { firebaseConfigured, signIn, status } = usePortalAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const healthQuery = useQuery({
    queryKey: ['portal-health'],
    queryFn: async () => (await portalFetch<{ status: string }>('/health/live')).data,
    staleTime: 60_000,
    retry: 1,
  })

  useEffect(() => {
    document.title = 'Client Portal | Lumicoria'
  }, [])

  if (status === 'authenticated') {
    const destination = (location.state as LocationState | null)?.from || '/portal'
    return <Navigate to={destination} replace />
  }
  if (status === 'choosing-organization') {
    return <Navigate to="/portal/organizations" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setRequestId(null)
    try {
      const result = await signIn(email, password, rememberMe)
      navigate(result.needsOrganization ? '/portal/organizations' : '/portal', { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign in could not be completed.')
      if (isPortalApiError(caught)) setRequestId(caught.requestId)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReset() {
    if (!email) {
      setError('Enter your email address first.')
      return
    }
    setError(null)
    try {
      await requestPasswordReset(email)
      setResetSent(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The reset request could not be sent.')
    }
  }

  return (
    <div className="portal-auth-page">
      <a className="portal-auth-brand" href="/">
        <img src="/brand-mark.png" alt="" />
        Lumicoria
      </a>
      <section className="portal-auth-panel">
        <div className="portal-auth-copy">
          <span className="portal-auth-kicker">Client delivery portal</span>
          <h1>See the work. Make the decisions that move it forward.</h1>
          <p>Milestones, approvals, deliverables, status, and the people responsible—kept in one governed workspace.</p>
          <div className="portal-auth-assurances">
            <span><CheckCircle weight="fill" /> Organization-isolated access</span>
            <span><CheckCircle weight="fill" /> Decision and delivery history</span>
            <span><CheckCircle weight="fill" /> Human approval where it matters</span>
          </div>
          <div className="portal-auth-health">
            <Pulse aria-hidden="true" weight="duotone" />
            <div>
              <strong>Portal API</strong>
              <small>{healthQuery.isSuccess ? 'Available' : healthQuery.isError ? 'Unavailable' : 'Checking connection'}</small>
            </div>
            <span className={healthQuery.isSuccess ? 'online' : ''} />
          </div>
        </div>

        <div className="portal-auth-form-wrap">
          <div className="portal-auth-form-head">
            <LockKey aria-hidden="true" weight="duotone" />
            <div>
              <h2>Welcome back</h2>
              <p>Use the account provided for your company portal.</p>
            </div>
          </div>
          {!firebaseConfigured && (
            <div className="portal-config-notice" role="status">
              Identity configuration is not present in this frontend environment. Add the Firebase web variables before enabling sign-in.
            </div>
          )}
          {resetSent && (
            <div className="portal-success-notice" role="status">
              If this address has an account, password reset instructions are on the way.
            </div>
          )}
          {error && (
            <div className="portal-form-error" role="alert">
              <strong>Sign in was not completed</strong>
              <span>{error}</span>
              {requestId && <small>Request ID: {requestId}</small>}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <label>
              Work email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <div className="portal-auth-options">
              <label>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                Keep me signed in
              </label>
              <button type="button" onClick={() => void handleReset()}>Reset password</button>
            </div>
            <button className="portal-primary-button" type="submit" disabled={!firebaseConfigured || submitting}>
              {submitting ? 'Signing in…' : 'Open your workspace'}
              {!submitting && <ArrowRight aria-hidden="true" weight="bold" />}
            </button>
          </form>
          <p className="portal-auth-help">Access is invitation-only. Contact your Lumicoria engagement lead if you need an account.</p>
        </div>
      </section>
      <footer className="portal-auth-footer">
        <span>© 2026 Lumicoria Inc.</span>
        <a href="/privacy">Privacy</a>
        <a href="/security">Security</a>
      </footer>
    </div>
  )
}
