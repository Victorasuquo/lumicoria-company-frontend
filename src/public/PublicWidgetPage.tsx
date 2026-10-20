import { ArrowUpRight, Microphone, PaperPlaneTilt, PhoneDisconnect, X } from '@phosphor-icons/react'
import { Room, RoomEvent, Track, ConnectionState } from 'livekit-client'
import { FormEvent, type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { portalApiOrigin, portalBasePath } from '../api/client'
import type {
  PublicWidgetConfiguration,
  PublicWidgetSessionResponse,
} from '../api/voice-types'

type PublicWidgetPageProps = {
  widgetKey: string
}

type ChatMessage = {
  id: string
  body: string
  direction: 'visitor' | 'system'
  createdAt: string
}

type WidgetMessageResponse = {
  conversation_id: string
  message_id: string
  ticket_id: string | null
  customer_id: string | null
}

type PublicSessionStatus = {
  session_id: string
  status: string
  channel: string
  expires_at: string
}

function visitorIdFor(widgetKey: string): string {
  const storageKey = `lumicoria:visitor:${widgetKey}`
  const existing = window.sessionStorage.getItem(storageKey)
  if (existing) return existing
  const next = crypto.randomUUID()
  window.sessionStorage.setItem(storageKey, next)
  return next
}

function threadIdFor(widgetKey: string): string {
  const storageKey = `lumicoria:thread:${widgetKey}`
  const existing = window.sessionStorage.getItem(storageKey)
  if (existing) return existing
  const next = crypto.randomUUID()
  window.sessionStorage.setItem(storageKey, next)
  return next
}

function publicApiUrl(path: string): string {
  const requestedOrigin = new URLSearchParams(window.location.search).get('api_origin')
  const origin = requestedOrigin || portalApiOrigin || window.location.origin
  return `${origin}${portalBasePath}${path}`
}

async function publicRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const response = await fetch(publicApiUrl(path), {
    ...init,
    headers,
  })
  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('json') ? await response.json() as Record<string, unknown> : null
  if (!response.ok) {
    const detail = typeof payload?.detail === 'string'
      ? payload.detail
      : 'This support channel is not available right now.'
    throw new Error(detail)
  }
  return payload as T
}

function defaultMessages(): ChatMessage[] {
  return [{
    id: 'welcome',
    body: 'Hello. Tell us what you need help with and we will make sure it reaches the right person.',
    direction: 'system',
    createdAt: new Date().toISOString(),
  }]
}

export function PublicWidgetPage({ widgetKey }: PublicWidgetPageProps) {
  const embedded = new URLSearchParams(window.location.search).get('embed') === '1'
  const [configuration, setConfiguration] = useState<PublicWidgetConfiguration | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages)
  const [draft, setDraft] = useState('')
  const [mode, setMode] = useState<'chat' | 'voice'>('chat')
  const [sending, setSending] = useState(false)
  const [voiceStarting, setVoiceStarting] = useState(false)
  const [voiceEnding, setVoiceEnding] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState('Ready when you are.')
  const [publicSession, setPublicSession] = useState<PublicWidgetSessionResponse | null>(null)
  const roomRef = useRef<Room | null>(null)
  const audioRef = useRef<HTMLDivElement | null>(null)
  const visitorId = useMemo(() => visitorIdFor(widgetKey), [widgetKey])
  const threadId = useMemo(() => threadIdFor(widgetKey), [widgetKey])

  const disconnectRoom = useCallback(() => {
    roomRef.current?.disconnect()
    roomRef.current = null
    if (audioRef.current) audioRef.current.replaceChildren()
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    publicRequest<PublicWidgetConfiguration>(`/public/voice/widgets/${encodeURIComponent(widgetKey)}/configuration`)
      .then((data) => {
        if (active) setConfiguration(data)
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'This support channel is unavailable.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [widgetKey])

  useEffect(() => () => disconnectRoom(), [disconnectRoom])

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = draft.trim()
    if (!body || sending) return
    const localMessage: ChatMessage = {
      id: crypto.randomUUID(),
      body,
      direction: 'visitor',
      createdAt: new Date().toISOString(),
    }
    setMessages((current) => [...current, localMessage])
    setDraft('')
    setSending(true)
    setError(null)
    try {
      await publicRequest<WidgetMessageResponse>(`/public/voice/widgets/${encodeURIComponent(widgetKey)}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          message_id: localMessage.id,
          thread_id: threadId,
          visitor_id: visitorId,
          body,
          occurred_at: localMessage.createdAt,
        }),
      })
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        body: 'Your request has been received. The team will follow up with the context from this conversation.',
        direction: 'system',
        createdAt: new Date().toISOString(),
      }])
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Your message could not be sent.')
    } finally {
      setSending(false)
    }
  }

  async function startVoice() {
    if (!configuration || voiceStarting || publicSession) return
    setVoiceStarting(true)
    setError(null)
    setVoiceStatus('Connecting you to the support line…')
    try {
      const data = await publicRequest<PublicWidgetSessionResponse>(
        `/public/voice/widgets/${encodeURIComponent(widgetKey)}/browser-sessions`,
        { method: 'POST', body: JSON.stringify({}) },
      )
      const room = new Room({ adaptiveStream: true, dynacast: true })
      roomRef.current = room
      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        setVoiceStatus(state === 'connected' ? 'You are connected.' : `Connection ${state}.`)
      })
      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind !== Track.Kind.Audio || !audioRef.current) return
        audioRef.current.appendChild(track.attach())
      })
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) track.detach().forEach((element) => element.remove())
      })
      room.on(RoomEvent.Disconnected, () => setVoiceStatus('The voice session has ended.'))
      await room.connect(data.connection.url, data.connection.access_token)
      await room.localParticipant.setMicrophoneEnabled(true)
      setPublicSession(data)
      setVoiceStatus('You are connected. Speak normally and interrupt when needed.')
    } catch (reason: unknown) {
      disconnectRoom()
      setVoiceStatus('Voice is not available right now.')
      setError(reason instanceof Error ? reason.message : 'The voice session could not be started.')
    } finally {
      setVoiceStarting(false)
    }
  }

  async function endVoice() {
    if (!publicSession || voiceEnding) return
    setVoiceEnding(true)
    setError(null)
    try {
      await publicRequest<PublicSessionStatus>(
        `/public/voice/widgets/${encodeURIComponent(widgetKey)}/browser-sessions/${encodeURIComponent(publicSession.session_id)}/end`,
        { method: 'POST' },
      )
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'The voice session could not be ended safely.')
    } finally {
      disconnectRoom()
      setPublicSession(null)
      setVoiceEnding(false)
      setVoiceStatus('Voice session ended.')
    }
  }

  const theme = configuration?.theme_json ?? {}
  // theme_json is the per-widget override; the organisation's colour is the
  // default beneath it, so the panel matches the emails the visitor then gets.
  const accent =
    (typeof theme.accent === 'string' ? theme.accent : null) ??
    configuration?.primary_color ??
    '#6557f5'
  const brandName = configuration?.organization_name ?? configuration?.display_name ?? 'Support'
  const logoUrl = configuration?.logo_url ?? null
  const canVoice = configuration?.channels.includes('browser') ?? false

  if (loading) {
    return <div className={`public-widget-shell ${embedded ? 'is-embedded' : ''}`}><div className="public-widget-loading">Loading support channel…</div></div>
  }

  if (error && !configuration) {
    return <div className={`public-widget-shell ${embedded ? 'is-embedded' : ''}`}><div className="public-widget-error-card"><span>Support channel unavailable</span><p>{error}</p><a href="https://lumicoria.com" target="_blank" rel="noreferrer">Visit Lumicoria <ArrowUpRight aria-hidden="true" /></a></div></div>
  }

  return (
    <main
      className={`public-widget-shell ${embedded ? 'is-embedded' : ''}`}
      style={{ '--public-widget-accent': accent } as CSSProperties}
    >
      <section className="public-widget-card" aria-label={`${configuration?.display_name ?? 'Customer support'} public support`}>
        <header className="public-widget-header">
          <div className="public-widget-identity">
            {logoUrl
              ? <img className="public-widget-logo" src={logoUrl} alt="" />
              : <span className="public-widget-mark" aria-hidden="true">{brandName.slice(0, 1).toUpperCase()}</span>}
            <div>
              <p className="public-widget-kicker">{brandName}</p>
              <h1>{configuration?.display_name ?? 'Support'}</h1>
              <p className="public-widget-subtitle">A clear route to the right team.</p>
            </div>
          </div>
          {embedded && <button className="public-widget-icon-button" type="button" aria-label="Close support" onClick={() => window.parent.postMessage({ type: 'lumicoria-widget-close' }, '*')}><X aria-hidden="true" /></button>}
        </header>

        <div className="public-widget-tabs" role="tablist" aria-label="Support options">
          <button type="button" role="tab" aria-selected={mode === 'chat'} className={mode === 'chat' ? 'is-active' : ''} onClick={() => setMode('chat')}>Message us</button>
          {canVoice && <button type="button" role="tab" aria-selected={mode === 'voice'} className={mode === 'voice' ? 'is-active' : ''} onClick={() => setMode('voice')}>Talk to us</button>}
        </div>

        {error && <div className="public-widget-inline-error" role="alert">{error}</div>}

        {mode === 'chat' ? (
          <div className="public-widget-chat-panel">
            <div className="public-widget-message-list" aria-live="polite">
              {messages.map((message) => (
                <div className={`public-widget-message ${message.direction === 'visitor' ? 'is-visitor' : 'is-system'}`} key={message.id}>
                  {message.body}
                </div>
              ))}
            </div>
            <form className="public-widget-composer" onSubmit={sendMessage}>
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="What do you need help with?" rows={3} maxLength={10000} disabled={sending} />
              <div className="public-widget-composer-footer"><span>{sending ? 'Sending securely…' : 'Your message will be routed to the support team.'}</span><button type="submit" className="public-widget-primary-button" disabled={!draft.trim() || sending}><PaperPlaneTilt aria-hidden="true" /> {sending ? 'Sending' : 'Send message'}</button></div>
            </form>
          </div>
        ) : (
          <div className="public-widget-voice-panel">
            <div className={`public-widget-voice-orb ${publicSession ? 'is-live' : ''}`}><Microphone aria-hidden="true" weight="duotone" /></div>
            <h2>{publicSession ? 'You are connected' : 'Speak with the team'}</h2>
            <p>{voiceStatus}</p>
            <div ref={audioRef} className="public-widget-audio-host" aria-hidden="true" />
            {!publicSession ? (
              <button type="button" className="public-widget-primary-button public-widget-wide-button" onClick={() => void startVoice()} disabled={voiceStarting}>{voiceStarting ? 'Connecting…' : 'Start voice session'} <Microphone aria-hidden="true" /></button>
            ) : (
              <button type="button" className="public-widget-secondary-button public-widget-wide-button" onClick={() => void endVoice()} disabled={voiceEnding}><PhoneDisconnect aria-hidden="true" /> {voiceEnding ? 'Ending…' : 'End voice session'}</button>
            )}
            <small>Routine questions can be handled from approved business information. Sensitive or uncertain requests go to a person.</small>
          </div>
        )}

        <footer className="public-widget-footer"><span>Powered by Lumicoria</span><a href="https://lumicoria.com" target="_blank" rel="noreferrer">Learn more <ArrowUpRight aria-hidden="true" /></a></footer>
      </section>
    </main>
  )
}
