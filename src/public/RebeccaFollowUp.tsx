import { useEffect, useRef, useState, type FormEvent } from 'react'
import { X } from '@phosphor-icons/react'
import { portalApiOrigin, portalBasePath } from '../api/client'

export function RebeccaFollowUp({ failed, onClose, onRetry }: { failed: boolean; onClose: () => void; onRetry: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [submissionId] = useState(() => crypto.randomUUID())
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending || sent) return
    const values = new FormData(event.currentTarget)
    setSending(true)
    setError('')
    try {
      const response = await fetch(`${portalApiOrigin}${portalBasePath}/public/support/lumicoria/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: submissionId,
          visitor_id: submissionId,
          full_name: String(values.get('name') ?? '').trim(),
          email: String(values.get('email') ?? '').trim(),
          phone: String(values.get('phone') ?? '').trim() || null,
          company_name: String(values.get('company') ?? '').trim() || null,
          primary_problem: String(values.get('message') ?? '').trim() || null,
          preferred_follow_up: 'Email',
          consent_to_contact: values.get('consent') === 'on',
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(typeof payload?.detail === 'string' ? payload.detail : 'Could not save your request. Please try again.')
      }
      setSent(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save your request.')
    } finally { setSending(false) }
  }

  return <dialog ref={dialog} className="rebecca-follow-up" aria-labelledby="rebecca-follow-up-title" aria-describedby="rebecca-follow-up-description" onCancel={onClose}>
    <header><h2 id="rebecca-follow-up-title">{sent ? 'Thank you' : failed ? 'Connection ended' : 'Thanks for talking to Rebecca'}</h2><button type="button" onClick={onClose} aria-label="Close follow-up form"><X size={20} /></button></header>
    <p id="rebecca-follow-up-description">{sent ? 'Your request is saved. The Lumicoria team can follow up by email.' : failed ? 'The voice connection could not continue. Please retry or use the follow-up form.' : 'Your call has ended. Leave your details for a follow-up, or try another call.'}</p>
    {!sent && <form onSubmit={submit}>
      <div className="rebecca-follow-up-fields"><label>Name<input name="name" autoComplete="name" required minLength={2} maxLength={240} /></label><label>Email<input name="email" type="email" autoComplete="email" required maxLength={320} /></label><label>Phone <small>Optional</small><input name="phone" type="tel" autoComplete="tel" maxLength={80} /></label><label>Company <small>Optional</small><input name="company" autoComplete="organization" maxLength={240} /></label></div>
      <label>How can we help?<textarea name="message" rows={3} maxLength={2000} /></label>
      <label className="rebecca-follow-up-consent"><input name="consent" type="checkbox" required />I agree that Lumicoria may contact me about this request.</label>
      {error && <p className="rebecca-follow-up-error" role="alert">{error}</p>}
      <div className="rebecca-follow-up-actions"><button type="submit" disabled={sending}>{sending ? 'Saving…' : 'Request follow-up'}</button><button type="button" onClick={onRetry} disabled={sending}>Try another call</button></div>
    </form>}
    {sent && <button type="button" onClick={onClose}>Done</button>}
  </dialog>
}
