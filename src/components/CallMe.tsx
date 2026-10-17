import { useEffect, useState } from 'react'
import { PhoneCall } from '@phosphor-icons/react'
import { portalApiOrigin, portalBasePath } from '../api/client'

type Configuration = {
  call_me_available?: boolean
  call_me_countries?: string[]
}

/**
 * "Rebecca calls you" — the inverse of the Talk to Rebecca button.
 *
 * The form stays hidden unless the API says outbound dialling is configured,
 * so a half-configured deployment shows nothing rather than a button that
 * fails. Consent is explicit because this rings a real phone.
 */
export function CallMe() {
  const [available, setAvailable] = useState(false)
  const [countries, setCountries] = useState<string[]>([])
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState<'idle' | 'calling' | 'done'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${portalApiOrigin}${portalBasePath}/public/rebecca/configuration`, {
      signal: controller.signal,
    })
      .then(response => (response.ok ? response.json() : null))
      .then((data: Configuration | null) => {
        setAvailable(Boolean(data?.call_me_available))
        setCountries(data?.call_me_countries ?? [])
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  if (!available) return null

  async function requestCall(event: React.FormEvent) {
    event.preventDefault()
    if (!consent || status === 'calling') return
    setStatus('calling')
    setError('')
    try {
      const response = await fetch(
        `${portalApiOrigin}${portalBasePath}/public/rebecca/call-me`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, consent_to_call: true }),
        },
      )
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.detail || 'Rebecca could not place the call.')
      setStatus('done')
    } catch (reason) {
      setStatus('idle')
      setError(reason instanceof Error ? reason.message : 'The call could not be placed.')
    }
  }

  return (
    <form className="call-me" onSubmit={requestCall}>
      <label className="call-me-field">
        <span>Or let Rebecca call you</span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+234 800 000 0000"
          value={phone}
          onChange={event => setPhone(event.target.value)}
          disabled={status !== 'idle'}
          required
        />
      </label>
      <label className="call-me-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={event => setConsent(event.target.checked)}
          disabled={status !== 'idle'}
        />
        Rebecca may call this number now. She is an AI assistant.
      </label>
      <button type="submit" className="button button-white" disabled={!consent || status !== 'idle'}>
        {status === 'calling' ? 'Calling…' : 'Call me'}
        <PhoneCall aria-hidden="true" weight="bold" />
      </button>
      {status === 'done' && (
        <p role="status" className="call-me-status">
          Rebecca is calling you now. Please pick up.
        </p>
      )}
      {error && (
        <p role="alert" className="call-me-error">
          {error}
        </p>
      )}
      {countries.length > 0 && status === 'idle' && !error && (
        <p className="call-me-note">
          Available for numbers in {countries.join(', ')}.
        </p>
      )}
    </form>
  )
}
