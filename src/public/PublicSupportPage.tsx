import { Room, RoomEvent, Track, ConnectionState } from 'livekit-client'
import { FormEvent, type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { portalApiOrigin, portalBasePath } from '../api/client'
import './public-support.css'
import './public-support-lead.css'
import './public-support-voice.css'

type PublicSupportPageProps = {
  slug: string
  view?: string
  articleSlug?: string
  ticketId?: string
}

type SupportConfig = {
  organization_id: string
  public_slug: string
  display_name: string
  logo_url: string | null
  favicon_url: string | null
  hero_title: string
  hero_description: string
  primary_color: string
  accent_color: string
  support_email: string | null
  response_time_minutes: number
  public_categories: string[]
  enabled_channels: string[]
  customer_context_required: boolean
  help_center_enabled: boolean
  voice_agent_enabled: boolean
  voice_agent_name: string | null
  lead_capture: {
    enabled: boolean
    fields: string[]
    consent_required: boolean
    headline: string
  }
}

type Article = {
  id: string
  slug: string
  title: string
  summary: string | null
  content: string
  category: string | null
  published: boolean
  helpful_count: number
  not_helpful_count: number
}

type ChatResult = {
  conversation_id: string
  message_id: string
  ticket_id: string | null
  response: string
  response_mode: 'auto' | 'human_handoff'
  citations: string[]
  handoff_required: boolean
}

type LeadValues = {
  full_name: string
  email: string
  phone: string
  company_name: string
  company_website: string
  industry: string
  job_title: string
  support_staff_count: string
  monthly_enquiry_volume: string
  current_channels: string[]
  primary_problem: string
  preferred_follow_up: string
  preferred_demo_time: string
  consent_to_contact: boolean
}

const leadLabels: Record<keyof LeadValues, string> = {
  full_name: 'Full name',
  email: 'Work email',
  phone: 'Phone or WhatsApp number',
  company_name: 'Company name',
  company_website: 'Company website',
  industry: 'Industry',
  job_title: 'Your role',
  support_staff_count: 'Support team size',
  monthly_enquiry_volume: 'Approximate monthly enquiries',
  current_channels: 'Current support channels',
  primary_problem: 'What would you like to improve?',
  preferred_follow_up: 'Preferred follow-up',
  preferred_demo_time: 'Preferred demo time',
  consent_to_contact: 'I agree that the Lumicoria team may contact me about this request.',
}

const emptyLeadValues: LeadValues = {
  full_name: '', email: '', phone: '', company_name: '', company_website: '', industry: '',
  job_title: '', support_staff_count: '', monthly_enquiry_volume: '', current_channels: [],
  primary_problem: '', preferred_follow_up: '', preferred_demo_time: '', consent_to_contact: false,
}

const api = `${portalApiOrigin}${portalBasePath}`

function Link({ to, children, ...props }: { to: string; children: ReactNode; className?: string }) {
  return <a href={to} {...props}>{children}</a>
}

async function supportRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${api}${path}`, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.detail || 'Support page is temporarily unavailable.')
  return payload as T
}

function storageKey(slug: string, field: string) {
  return `lumicoria-support:${slug}:${field}`
}

function getOrCreate(slug: string, field: string) {
  const key = storageKey(slug, field)
  const saved = window.sessionStorage.getItem(key)
  if (saved) return saved
  const value = crypto.randomUUID()
  window.sessionStorage.setItem(key, value)
  return value
}

function LeadCaptureForm({ config, slug, visitorId }: { config: SupportConfig; slug: string; visitorId: string }) {
  const [values, setValues] = useState<LeadValues>(emptyLeadValues)
  const [sending, setSending] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  if (!config.lead_capture.enabled) return null

  const fields = config.lead_capture.fields as Array<keyof LeadValues>
  const setValue = (field: keyof LeadValues, value: string | boolean | string[]) => setValues(current => ({ ...current, [field]: value }))
  const toggleChannel = (channel: string) => setValue('current_channels', values.current_channels.includes(channel) ? values.current_channels.filter(item => item !== channel) : [...values.current_channels, channel])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (sending) return
    setSending(true)
    setError('')
    try {
      await supportRequest(`/public/support/${encodeURIComponent(slug)}/leads`, {
        method: 'POST',
        body: JSON.stringify({ ...values, submission_id: crypto.randomUUID(), visitor_id: visitorId }),
      })
      setSubmitted(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not save your details.')
    } finally { setSending(false) }
  }

  if (submitted) return <div className="public-support-lead-success"><span>✓</span><div><strong>Thanks — your details are with the team.</strong><p>A Lumicoria team member can follow up using the preference you selected.</p></div></div>

  return <form className="public-support-lead" onSubmit={submit}>
    <div><span className="public-support-eyebrow">Next step</span><h2>{config.lead_capture.headline}</h2><p>Share only what you are comfortable providing. We use these details to prepare a relevant conversation.</p></div>
    <div className="public-support-lead-grid">
      {fields.filter(field => field !== 'current_channels' && field !== 'consent_to_contact').map(field => field === 'primary_problem' ? <label key={field} className="public-support-lead-wide">{leadLabels[field]}<textarea value={values[field] as string} onChange={event => setValue(field, event.target.value)} rows={3} /></label> : <label key={field}>{leadLabels[field]}<input type={field === 'email' ? 'email' : field === 'company_website' ? 'url' : 'text'} value={values[field] as string} onChange={event => setValue(field, event.target.value)} required={field === 'full_name' || field === 'email'} /></label>)}
    </div>
    {fields.includes('current_channels') && <fieldset className="public-support-lead-options"><legend>{leadLabels.current_channels}</legend>{['Phone calls', 'WhatsApp', 'Instagram', 'Facebook', 'Email', 'Web chat'].map(channel => <label key={channel}><input type="checkbox" checked={values.current_channels.includes(channel)} onChange={() => toggleChannel(channel)} />{channel}</label>)}</fieldset>}
    {fields.includes('consent_to_contact') && <label className="public-support-lead-consent"><input type="checkbox" checked={values.consent_to_contact} onChange={event => setValue('consent_to_contact', event.target.checked)} required={config.lead_capture.consent_required} />{leadLabels.consent_to_contact}</label>}
    {error && <p className="public-support-error" role="alert">{error}</p>}
    <button className="public-support-button" type="submit" disabled={sending}>{sending ? 'Saving…' : 'Request a conversation'} <span>→</span></button>
  </form>
}

function Layout({ config, slug, children }: { config: SupportConfig; slug: string; children: React.ReactNode }) {
  useEffect(() => {
    document.title = `${config.display_name} support`
    if (config.favicon_url) {
      const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]') ?? document.createElement('link')
      link.rel = 'icon'
      link.href = config.favicon_url
      document.head.appendChild(link)
    }
  }, [config])

  return <div className="public-support-shell" style={{ '--support-primary': config.primary_color, '--support-accent': config.accent_color } as CSSProperties}>
    <header className="public-support-nav">
      <Link className="public-support-brand" to={`/support/${encodeURIComponent(slug)}`}>
        {config.logo_url ? <img src={config.logo_url} alt="" /> : <span className="public-support-mark">{config.display_name.slice(0, 1).toUpperCase()}</span>}
        <span>{config.display_name}</span>
      </Link>
      <nav aria-label="Support navigation">
        <Link to={`/support/${encodeURIComponent(slug)}/help`}>Help centre</Link>
        {config.voice_agent_enabled && <Link to={`/support/${encodeURIComponent(slug)}/voice`}>Talk to {config.voice_agent_name || 'support'}</Link>}
        <Link className="public-support-nav-button" to={`/support/${encodeURIComponent(slug)}/chat`}>Contact support</Link>
      </nav>
    </header>
    <main className="public-support-main">{children}</main>
    <footer className="public-support-footer"><span>{config.display_name} support</span><span>Typical response: {config.response_time_minutes < 60 ? `${config.response_time_minutes} minutes` : `${Math.round(config.response_time_minutes / 60)} hours`}</span></footer>
  </div>
}

function Loading() { return <div className="public-support-state"><span className="public-support-spinner" /> Loading support…</div> }

function Home({ config, slug }: { config: SupportConfig; slug: string }) {
  return <section className="public-support-home">
    <div className="public-support-hero">
      <div className="public-support-eyebrow">Customer support</div>
      <h1>{config.hero_title}</h1>
      <p>{config.hero_description}</p>
      <div className="public-support-actions">
        <Link className="public-support-button" to={`/support/${encodeURIComponent(slug)}/chat`}>Start a conversation <span>↗</span></Link>
        {config.voice_agent_enabled && <Link className="public-support-button secondary" to={`/support/${encodeURIComponent(slug)}/voice`}>Talk to {config.voice_agent_name || 'support'} <span>↗</span></Link>}
        {config.help_center_enabled && <Link className="public-support-button secondary" to={`/support/${encodeURIComponent(slug)}/help`}>Browse help centre</Link>}
      </div>
      <p className="public-support-assurance">You can ask a question, leave a request, or ask for a member of the team.</p>
    </div>
    <div className="public-support-home-grid">
      <div className="public-support-card dark"><span className="public-support-card-label">Need an answer?</span><h2>Ask support directly.</h2><p>Get a quick answer for routine questions or leave the full context for a person to follow up.</p><Link to={`/support/${encodeURIComponent(slug)}/chat`}>Open chat <span>→</span></Link></div>
      {config.voice_agent_enabled && <div className="public-support-card"><span className="public-support-card-label">Prefer to speak?</span><h2>Talk to {config.voice_agent_name || 'support'}.</h2><p>Use your browser microphone for a live voice conversation. Important matters can still be handed to a person.</p><Link to={`/support/${encodeURIComponent(slug)}/voice`}>Start voice support <span>→</span></Link></div>}
      {config.help_center_enabled && <div className="public-support-card"><span className="public-support-card-label">Self service</span><h2>Find a helpful article.</h2><p>Browse the published answers and guidance from {config.display_name}.</p><Link to={`/support/${encodeURIComponent(slug)}/help`}>View help centre <span>→</span></Link></div>}
      <div className="public-support-card"><span className="public-support-card-label">Human follow-up</span><h2>Important matters stay with people.</h2><p>Complaints, payments, disputes, and requests needing a decision are routed to the team.</p>{config.support_email ? <a href={`mailto:${config.support_email}`}>Email the team <span>→</span></a> : <Link to={`/support/${encodeURIComponent(slug)}/chat`}>Leave a message <span>→</span></Link>}</div>
    </div>
    {config.public_categories.length > 0 && <div className="public-support-topics"><div><span className="public-support-eyebrow">What can we help with?</span><h2>Choose a starting point.</h2></div><div className="public-support-topic-list">{config.public_categories.map(category => <Link key={category} to={`/support/${encodeURIComponent(slug)}/chat?topic=${encodeURIComponent(category)}`}>{category}<span>↗</span></Link>)}</div></div>}
  </section>
}

function Voice({ config, slug }: { config: SupportConfig; slug: string }) {
  const visitorId = useMemo(() => getOrCreate(slug, 'visitor'), [slug])
  const [starting, setStarting] = useState(false)
  const [ending, setEnding] = useState(false)
  const [status, setStatus] = useState('Ready when you are.')
  const [error, setError] = useState('')
  const [showLeadCapture, setShowLeadCapture] = useState(false)
  const [session, setSession] = useState<{ session_id: string; connection: { url: string; access_token: string } } | null>(null)
  const roomRef = useRef<Room | null>(null)
  const audioRef = useRef<HTMLDivElement | null>(null)

  const disconnect = useCallback(() => {
    roomRef.current?.disconnect()
    roomRef.current = null
    audioRef.current?.replaceChildren()
  }, [])

  useEffect(() => () => disconnect(), [disconnect])

  async function startVoice() {
    if (starting || session) return
    setStarting(true)
    setError('')
    setStatus('Connecting you to support…')
    try {
      const data = await supportRequest<{ session_id: string; connection: { url: string; access_token: string } }>(`/public/voice/support/${encodeURIComponent(slug)}/browser-sessions`, { method: 'POST', body: JSON.stringify({ visitor_id: visitorId }) })
      const room = new Room({ adaptiveStream: true, dynacast: true })
      roomRef.current = room
      room.on(RoomEvent.ConnectionStateChanged, state => setStatus(state === ConnectionState.Connected ? 'You are connected.' : `Connection ${state}.`))
      room.on(RoomEvent.TrackSubscribed, track => { if (track.kind === Track.Kind.Audio && audioRef.current) audioRef.current.appendChild(track.attach()) })
      room.on(RoomEvent.TrackUnsubscribed, track => { if (track.kind === Track.Kind.Audio) track.detach().forEach(element => element.remove()) })
      room.on(RoomEvent.Disconnected, () => setStatus('The voice session has ended.'))
      await room.connect(data.connection.url, data.connection.access_token)
      await room.localParticipant.setMicrophoneEnabled(true)
      setSession(data)
      setStatus('You are connected. Speak normally and interrupt when needed.')
    } catch (reason) {
      disconnect()
      setStatus('Voice is not available right now.')
      setError(reason instanceof Error ? reason.message : 'The voice session could not be started.')
    } finally { setStarting(false) }
  }

  async function endVoice() {
    if (!session || ending) return
    setEnding(true)
    setError('')
    try {
      await supportRequest(`/public/voice/support/${encodeURIComponent(slug)}/browser-sessions/${encodeURIComponent(session.session_id)}/end`, { method: 'POST' })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The voice session could not be ended safely.')
    } finally {
      disconnect()
      setSession(null)
      setShowLeadCapture(config.lead_capture.enabled)
      setEnding(false)
      setStatus('Voice session ended.')
    }
  }

  return <section className="public-support-voice-page">
    <Link className="public-support-back" to={`/support/${encodeURIComponent(slug)}`}>← Back to support</Link>
    <div className="public-support-voice-intro"><span className="public-support-eyebrow">Live voice support</span><h1>Talk to {config.voice_agent_name || 'support'}.</h1><p>{config.hero_description}</p></div>
    <div className="public-support-voice-card">
      <div className={`public-support-voice-orb ${session ? 'is-live' : ''}`} aria-hidden="true">◉</div>
      <h2>{session ? 'You are connected.' : 'Start a browser voice session.'}</h2>
      <p>{status}</p>
      <div ref={audioRef} aria-hidden="true" />
      {error && <p className="public-support-error" role="alert">{error}</p>}
      {!session ? <button className="public-support-button" type="button" onClick={() => void startVoice()} disabled={starting}>{starting ? 'Connecting…' : `Talk to ${config.voice_agent_name || 'support'}`} <span>↗</span></button> : <button className="public-support-button secondary" type="button" onClick={() => void endVoice()} disabled={ending}>{ending ? 'Ending…' : 'End voice session'}</button>}
      <small>Routine questions use published business information. Sensitive or uncertain requests go to a person.</small>
    </div>
    {showLeadCapture && <LeadCaptureForm config={config} slug={slug} visitorId={visitorId} />}
  </section>
}

function Chat({ config, slug }: { config: SupportConfig; slug: string }) {
  const visitorId = useMemo(() => getOrCreate(slug, 'visitor'), [slug])
  const threadId = useMemo(() => getOrCreate(slug, 'thread'), [slug])
  const [messages, setMessages] = useState<Array<{ role: 'visitor' | 'support'; body: string; meta?: string }>>([])
  const [draft, setDraft] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [ticketId, setTicketId] = useState<string | null>(null)

  async function send(event: FormEvent) {
    event.preventDefault()
    if (!draft.trim() || sending) return
    const body = draft.trim()
    setDraft('')
    setMessages(current => [...current, { role: 'visitor', body }])
    setSending(true)
    setError('')
    try {
      const result = await supportRequest<ChatResult>(`/public/support/${encodeURIComponent(slug)}/conversations`, { method: 'POST', body: JSON.stringify({ message_id: crypto.randomUUID(), thread_id: threadId, visitor_id: visitorId, body, display_name: name || null, email: email || null }) })
      setTicketId(result.ticket_id)
      setMessages(current => [...current, { role: 'support', body: result.response, meta: result.response_mode === 'auto' ? 'Answered from published support information' : 'Sent to the support team for follow-up' }])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'We could not send that message.')
    } finally { setSending(false) }
  }

  return <section className="public-support-chat-page">
    <div className="public-support-chat-intro"><Link className="public-support-back" to={`/support/${encodeURIComponent(slug)}`}>← Back to support</Link><span className="public-support-eyebrow">Support conversation</span><h1>How can we help?</h1><p>{config.hero_description}</p><div className="public-support-chat-meta"><span className="public-support-live-dot" /> Usually replies within {config.response_time_minutes < 60 ? `${config.response_time_minutes} minutes` : `${Math.round(config.response_time_minutes / 60)} hours`}</div></div>
    <div className="public-support-chat-card">
      <div className="public-support-messages" aria-live="polite">
        {messages.length === 0 && <div className="public-support-empty-chat"><div className="public-support-empty-icon">✦</div><h2>Start with your question</h2><p>Tell us what you need. Routine questions can receive an immediate answer, while important matters are sent to the team.</p></div>}
        {messages.map((message, index) => <div className={`public-support-message ${message.role}`} key={`${message.role}-${index}`}><div>{message.body}</div>{message.meta && <small>{message.meta}</small>}</div>)}
      </div>
      <form className="public-support-composer" onSubmit={send}>
        <div className="public-support-contact-fields"><input value={name} onChange={event => setName(event.target.value)} placeholder="Your name (optional)" aria-label="Your name" /><input value={email} onChange={event => setEmail(event.target.value)} placeholder="Email for follow-up (optional)" aria-label="Email for follow-up" type="email" /></div>
        <textarea value={draft} onChange={event => setDraft(event.target.value)} placeholder="Write your message…" aria-label="Message" rows={3} />
        {error && <p className="public-support-error">{error}</p>}
        <div className="public-support-composer-footer"><span>Never share passwords or card details.</span><button className="public-support-button" disabled={sending || !draft.trim()}>{sending ? 'Sending…' : 'Send message'} <span>→</span></button></div>
      </form>
      {ticketId && <div className="public-support-ticket-note">Your request is recorded. <Link to={`/support/${encodeURIComponent(slug)}/status/${encodeURIComponent(ticketId)}`}>Check its status</Link>.</div>}
    </div>
    <LeadCaptureForm config={config} slug={slug} visitorId={visitorId} />
  </section>
}

function Help({ articles, slug }: { articles: Article[]; slug: string }) {
  return <section className="public-support-help-page"><div className="public-support-page-intro"><Link className="public-support-back" to={`/support/${encodeURIComponent(slug)}`}>← Back to support</Link><span className="public-support-eyebrow">Help centre</span><h1>Answers for common questions.</h1><p>Published guidance from the {slug} support team.</p></div><div className="public-support-article-grid">{articles.length === 0 ? <div className="public-support-empty-card"><h2>Help centre is being prepared.</h2><p>Start a conversation and the support team will help you directly.</p><Link className="public-support-button" to={`/support/${encodeURIComponent(slug)}/chat`}>Contact support</Link></div> : articles.map(article => <Link className="public-support-article-card" key={article.id} to={`/support/${encodeURIComponent(slug)}/help/${encodeURIComponent(article.slug)}`}><span>{article.category || 'Guidance'}</span><h2>{article.title}</h2><p>{article.summary || article.content.slice(0, 140)}</p><strong>Read article →</strong></Link>)}</div></section>
}

function Article({ article, slug }: { article: Article; slug: string }) {
  const [feedback, setFeedback] = useState<boolean | null>(null)
  async function sendFeedback(helpful: boolean) { setFeedback(helpful); await supportRequest(`/public/support/${encodeURIComponent(slug)}/help/${encodeURIComponent(article.slug)}/feedback`, { method: 'POST', body: JSON.stringify({ helpful }) }).catch(() => undefined) }
  return <section className="public-support-article-page"><Link className="public-support-back" to={`/support/${encodeURIComponent(slug)}/help`}>← Back to help centre</Link><article className="public-support-article"><span className="public-support-eyebrow">{article.category || 'Guidance'}</span><h1>{article.title}</h1>{article.summary && <p className="public-support-article-summary">{article.summary}</p>}<div className="public-support-article-content">{article.content.split(/\n\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><div className="public-support-feedback"><strong>Was this helpful?</strong><button className={feedback === true ? 'selected' : ''} onClick={() => void sendFeedback(true)}>Yes</button><button className={feedback === false ? 'selected' : ''} onClick={() => void sendFeedback(false)}>No</button></div></article></section>
}

function Status({ slug, ticketId }: { slug: string; ticketId: string }) {
  const visitorId = getOrCreate(slug, 'visitor')
  const [status, setStatus] = useState<{ subject: string; status: string; priority: string; last_activity_at: string } | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { supportRequest<{ subject: string; status: string; priority: string; last_activity_at: string }>(`/public/support/${encodeURIComponent(slug)}/status/${encodeURIComponent(ticketId)}?visitor_id=${encodeURIComponent(visitorId)}`).then(setStatus).catch(errorValue => setError(errorValue instanceof Error ? errorValue.message : 'Status is unavailable.')) }, [slug, ticketId, visitorId])
  return <section className="public-support-status-page"><Link className="public-support-back" to={`/support/${encodeURIComponent(slug)}`}>← Back to support</Link><div className="public-support-status-card"><span className="public-support-eyebrow">Request status</span>{error ? <><h1>We could not find that request.</h1><p>{error}</p><Link className="public-support-button" to={`/support/${encodeURIComponent(slug)}/chat`}>Start a new conversation</Link></> : status ? <><div className="public-support-status-icon">✓</div><h1>{status.subject}</h1><p>Your request is <strong>{status.status.replaceAll('_', ' ')}</strong>. The support team has the context from your conversation.</p><div className="public-support-status-meta"><span>Priority <strong>{status.priority}</strong></span><span>Updated <strong>{new Date(status.last_activity_at).toLocaleString()}</strong></span></div><Link className="public-support-button secondary" to={`/support/${encodeURIComponent(slug)}/chat`}>Continue conversation</Link></> : <Loading />}</div></section>
}

export function PublicSupportPage({ slug, view, articleSlug, ticketId }: PublicSupportPageProps) {
  const [config, setConfig] = useState<SupportConfig | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [article, setArticle] = useState<Article | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { supportRequest<SupportConfig>(`/public/support/${encodeURIComponent(slug)}/configuration`).then(setConfig).catch(errorValue => setError(errorValue instanceof Error ? errorValue.message : 'Support page is unavailable.')) }, [slug])
  useEffect(() => { if (!config || !config.help_center_enabled) return; if (view === 'help' && articleSlug) supportRequest<Article>(`/public/support/${encodeURIComponent(slug)}/help/${encodeURIComponent(articleSlug)}`).then(setArticle).catch(() => setError('This help article is unavailable.')); else if (view === 'help') supportRequest<{ items: Article[] }>(`/public/support/${encodeURIComponent(slug)}/help`).then(data => setArticles(data.items)).catch(() => setError('Help centre is unavailable.')) }, [config, slug, view, articleSlug])
  if (error) return <div className="public-support-error-page"><h1>Support channel unavailable</h1><p>{error}</p><a href="/">Return to Lumicoria</a></div>
  if (!config) return <Loading />
  return <Layout config={config} slug={slug}>{view === 'chat' || view === 'embed' ? <Chat config={config} slug={slug} /> : view === 'voice' && config.voice_agent_enabled ? <Voice config={config} slug={slug} /> : view === 'help' && article ? <Article article={article} slug={slug} /> : view === 'help' ? <Help articles={articles} slug={slug} /> : view === 'status' && ticketId ? <Status slug={slug} ticketId={ticketId} /> : <Home config={config} slug={slug} />}</Layout>
}
