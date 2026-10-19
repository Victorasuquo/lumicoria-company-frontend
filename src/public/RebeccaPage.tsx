import { ArrowDown, ArrowUpRight, Check, Microphone, MicrophoneSlash, Phone, PhoneDisconnect } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { portalApiOrigin, portalBasePath } from '../api/client'
import { RebeccaFluid } from './RebeccaFluid'
import { playCallSound } from './rebeccaCallSounds'
import { RebeccaFollowUp } from './RebeccaFollowUp'
import './rebecca.css'

type Caption = { id: string; role: 'user' | 'assistant'; text: string; final: boolean }
type Resources = {
  socket?: WebSocket
  stream?: MediaStream
  context?: AudioContext
  capture?: AudioWorkletNode
  source?: MediaStreamAudioSourceNode
  silent?: GainNode
  playback: Set<AudioBufferSourceNode>
  nextAudio: number
  epoch: number
  ready: boolean
  endAfterPlayback: boolean
  timer?: ReturnType<typeof setTimeout>
  startedAt?: number
  analyser?: AnalyserNode
}

export function RebeccaExperience({ embedded = false }: { embedded?: boolean }) {
  const [available, setAvailable] = useState<boolean | null>(null)
  const [state, setState] = useState('Ready when you are')
  const [connecting, setConnecting] = useState(false)
  const [active, setActive] = useState(false)
  const [error, setError] = useState('')
  const [captions, setCaptions] = useState<Caption[]>([])
  const [saved, setSaved] = useState(false)
  const [muted, setMuted] = useState(false)
  const [expanded, setExpanded] = useState(!embedded || window.location.hash === '#talk-to-rebecca')
  const [elapsed, setElapsed] = useState(0)
  const [microphone, setMicrophone] = useState<'not_requested' | 'allowed' | 'blocked'>('not_requested')
  const [levels, setLevels] = useState<number[]>(Array(20).fill(0))
  const [voiceLevel, setVoiceLevel] = useState(0)
  const [timings, setTimings] = useState<{ text?: number; audio?: number }>({})
  const [sessionId, setSessionId] = useState('')
  const [fullTranscript, setFullTranscript] = useState(false)
  const [followUp, setFollowUp] = useState<{ failed: boolean } | null>(null)
  const micLevel = useRef(0)
  const resources = useRef<Resources | null>(null)
  const captionList = useRef<HTMLDivElement>(null)

  function cleanup(current = resources.current, announceEnd = false, failed = false) {
    if (!current) return
    if (announceEnd && resources.current === current) setFollowUp({ failed })
    current.ready = false
    micLevel.current = 0
    if (current.startedAt) setElapsed(Math.floor((Date.now() - current.startedAt) / 1000))
    clearTimeout(current.timer)
    current.playback.forEach(source => { try { source.stop() } catch {} })
    current.playback.clear()
    current.capture?.disconnect()
    current.source?.disconnect()
    current.silent?.disconnect()
    current.analyser?.disconnect()
    current.stream?.getTracks().forEach(track => track.stop())
    current.socket?.close()
    if (current.context && current.context.state !== 'closed') {
      const context = current.context
      let duration = 0
      if (announceEnd && current.startedAt) {
        try { duration = playCallSound(context, 'ended') } catch {}
      }
      const close = () => { if (context.state !== 'closed') void context.close().catch(() => undefined) }
      if (duration) window.setTimeout(close, duration * 1000)
      else close()
    }
    if (resources.current === current) resources.current = null
  }

  useEffect(() => {
    const controller = new AbortController()
    if (!embedded) document.title = 'Talk to Rebecca | Lumicoria'
    fetch(`${portalApiOrigin}${portalBasePath}/public/rebecca/configuration`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('Voice configuration is unavailable.'); return response.json() })
      .then(data => setAvailable(Boolean(data.available)))
      .catch(reason => { if (!controller.signal.aborted) { setAvailable(false); setError(reason.message) } })
    return () => { controller.abort(); cleanup() }
  }, [embedded])

  useEffect(() => {
    const reveal = () => { if (window.location.hash === '#talk-to-rebecca') setExpanded(true) }
    window.addEventListener('hashchange', reveal)
    return () => window.removeEventListener('hashchange', reveal)
  }, [])

  useEffect(() => {
    if (!active) { setLevels(Array(20).fill(0)); setVoiceLevel(0); return }
    const interval = setInterval(() => {
      const current = resources.current
      if (!current?.startedAt) return
      setElapsed(Math.floor((Date.now() - current.startedAt) / 1000))
      const waveform = new Uint8Array(64)
      current.analyser?.getByteFrequencyData(waveform)
      const samples = new Float32Array(current.analyser?.fftSize ?? 128)
      current.analyser?.getFloatTimeDomainData(samples)
      const energy = samples.reduce((total, sample) => total + sample * sample, 0) / samples.length
      const playbackVolume = Math.min(1, Math.max(0, Math.sqrt(energy) - .006) * 7)
      const microphoneVolume = current.stream?.getAudioTracks().some(track => track.enabled) ? micLevel.current : 0
      setVoiceLevel(Math.max(playbackVolume, microphoneVolume))
      setLevels(Array.from({ length: 20 }, (_, index) => Math.min(1, Math.max(waveform[index * 2] / 255, microphoneVolume))))
    }, 50)
    return () => clearInterval(interval)
  }, [active])

  useEffect(() => {
    if (captions.length && captionList.current) captionList.current.scrollTop = captionList.current.scrollHeight
  }, [captions])

  function playbackDone(current: Resources) {
    if (current.endAfterPlayback && current.playback.size === 0 && current.socket?.readyState === WebSocket.OPEN) {
      current.socket.send(JSON.stringify({ type: 'playback_done', epoch: current.epoch }))
    } else if (current.playback.size === 0 && !current.endAfterPlayback) setState('Listening')
  }

  function handleEvent(event: Record<string, unknown>, current: Resources) {
    if (resources.current !== current) return
    if (event.type === 'ready') {
      if (current.ready) return
      clearTimeout(current.timer)
      current.ready = true
      current.startedAt = Date.now()
      if (current.context) { try { playCallSound(current.context, 'connected') } catch {} }
      setSessionId(String(event.session_id || ''))
      setConnecting(false)
      setActive(true)
      setState('Rebecca is greeting you')
    } else if (event.type === 'transcript') {
      const caption = event as unknown as Caption
      setCaptions(previous => {
        const found = previous.findIndex(item => item.id === caption.id && item.role === caption.role)
        const next = previous.slice()
        if (found < 0) next.push(caption)
        else next[found] = caption
        return next
      })
    } else if (event.type === 'audio' && event.epoch === current.epoch && current.context) {
      const bytes = Uint8Array.from(atob(String(event.pcm)), character => character.charCodeAt(0))
      const samples = new DataView(bytes.buffer)
      const rate = Number(event.sample_rate)
      if (bytes.length % 2 || !Number.isInteger(rate) || rate < 8000 || rate > 96000) throw new Error('Unsupported voice audio format.')
      const buffer = current.context.createBuffer(1, bytes.length / 2, rate)
      const output = buffer.getChannelData(0)
      for (let index = 0; index < output.length; index++) output[index] = samples.getInt16(index * 2, true) / 32768
      const source = current.context.createBufferSource()
      source.buffer = buffer
      source.connect(current.analyser || current.context.destination)
      current.playback.add(source)
      current.nextAudio = Math.max(current.nextAudio, current.context.currentTime + 0.04)
      // Synthesis outruns playback by design: a whole reply arrives in a second or two and is
      // scheduled back to back, so this lead is roughly the LENGTH OF THE REPLY, not a backlog.
      // A reply can legitimately run ~100s (max_output_tokens 350), so only an absurd lead means
      // trouble. A context that stopped advancing (backgrounded tab) is the real stall - resume it
      // rather than tearing the conversation down.
      if (current.context.state === 'suspended') void current.context.resume().catch(() => undefined)
      if (current.nextAudio - current.context.currentTime > 180) throw new Error('Voice playback fell behind. Please reconnect.')
      source.start(current.nextAudio)
      current.nextAudio += buffer.duration
      source.onended = () => { current.playback.delete(source); source.disconnect(); playbackDone(current) }
      setState('Rebecca is speaking')
    } else if (event.type === 'interrupt') {
      current.epoch = Number(event.epoch)
      current.endAfterPlayback = false
      current.playback.forEach(source => { source.onended = null; try { source.stop() } catch {} source.disconnect() })
      current.playback.clear()
      current.nextAudio = current.context?.currentTime ?? 0
      setState('Listening')
    } else if (event.type === 'audio_drained' && event.epoch === current.epoch) {
      current.endAfterPlayback = Boolean(event.ending)
      playbackDone(current)
    } else if (event.type === 'ending') {
      setState('Finishing the conversation')
    } else if (event.type === 'lead') {
      setSaved(Boolean(event.saved))
    } else if (event.type === 'timing' && Number.isFinite(event.milliseconds)) {
      const milliseconds = Number(event.milliseconds)
      if (event.stage === 'first_text_after_speech') setTimings(previous => ({ ...previous, text: milliseconds }))
      if (event.stage === 'tts_first_audio') setTimings(previous => ({ ...previous, audio: milliseconds }))
    } else if (event.type === 'state') {
      setState(event.state === 'thinking' ? 'Preparing a reply' : 'Listening')
    } else if (event.type === 'voice_changed') {
      // Deliberately silent. Both providers speak as a Nigerian woman, so a
      // switch is not something the caller needs to act on - telling them would
      // interrupt the conversation to report a detail that changes nothing for
      // them. The server still logs it, which is where it is actually useful.
      console.info('Rebecca switched synthesis provider', event.provider)
    } else if (event.type === 'notice') {
      setError(String(event.message))
    } else if (event.type === 'error') {
      setError(String(event.message))
      cleanup(current, true, true)
      setConnecting(false)
      setActive(false)
      setState('Connection ended')
    } else if (event.type === 'ended') {
      cleanup(current, true)
      setConnecting(false)
      setActive(false)
      setState('Conversation ended')
    }
  }

  async function start() {
    if (resources.current || available !== true) return
    const current: Resources = { playback: new Set(), nextAudio: 0, epoch: 0, ready: false, endAfterPlayback: false }
    resources.current = current
    setConnecting(true)
    setFollowUp(null)
    setError('')
    setCaptions([])
    setSaved(false)
    setMuted(false)
    setState('Connecting securely')
    setElapsed(0)
    setSessionId('')
    setTimings({})
    try {
      current.context = new AudioContext()
      await current.context.resume()
      current.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      setMicrophone('allowed')
      if (resources.current !== current) { cleanup(current); return }
      await current.context.audioWorklet.addModule('/rebecca-capture.js')
      current.capture = new AudioWorkletNode(current.context, 'rebecca-capture')
      current.source = current.context.createMediaStreamSource(current.stream)
      current.silent = current.context.createGain()
      current.silent.gain.value = 0
      current.analyser = current.context.createAnalyser()
      current.analyser.fftSize = 128
      current.analyser.smoothingTimeConstant = .75
      current.analyser.connect(current.context.destination)
      current.source.connect(current.capture)
      current.capture.connect(current.silent).connect(current.context.destination)
      const response = await fetch(`${portalApiOrigin}${portalBasePath}/public/rebecca/sessions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent_to_transcript: true, consent_to_contact: false }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Rebecca could not connect.')
      if (resources.current !== current) { cleanup(current); return }
      const url = new URL(data.websocket_path, portalApiOrigin || window.location.origin)
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
      current.socket = new WebSocket(url)
      current.socket.onopen = () => current.socket?.send(JSON.stringify({ ticket: data.ticket }))
      current.socket.onmessage = event => {
        try { handleEvent(JSON.parse(event.data), current) }
        catch (reason) {
          // Keep the specific reason: a swallowed message here is indistinguishable from a
          // decode failure, a stalled context or a malformed frame.
          console.error('Rebecca playback failed', reason)
          setError(reason instanceof Error && reason.message
            ? reason.message
            : 'The voice stream could not be played. Please try again.')
          cleanup(current, true, true); setActive(false); setConnecting(false)
        }
      }
      current.socket.onerror = () => setError('The voice connection failed. Check your connection and try again.')
      current.socket.onclose = () => {
        if (resources.current === current) {
          cleanup(current, true, true)
          setActive(false)
          setConnecting(false)
          setState('Connection ended')
        }
      }
      current.capture.port.onmessage = event => {
        if (!current.ready || current.socket?.readyState !== WebSocket.OPEN) return
        if (current.socket.bufferedAmount > 128000) { setError('Your connection cannot keep up with live audio.'); end(true); return }
        const bytes = new Uint8Array(event.data)
        const samples = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
        let energy = 0
        for (let index = 0; index < bytes.length; index += 2) energy += (samples.getInt16(index, true) / 32768) ** 2
        micLevel.current = Math.min(1, Math.max(0, Math.sqrt(energy / (bytes.length / 2)) - .008) * 6)
        let binary = ''
        bytes.forEach(byte => { binary += String.fromCharCode(byte) })
        current.socket.send(JSON.stringify({ type: 'audio', pcm: btoa(binary) }))
      }
      current.timer = setTimeout(() => { if (!current.ready) { setError('Rebecca took too long to connect. Please try again.'); cleanup(current, true, true); setConnecting(false); setActive(false) } }, 15000)
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'NotAllowedError') setMicrophone('blocked')
      cleanup(current, true, true)
      setConnecting(false)
      setActive(false)
      setState('Not connected')
      setError(reason instanceof Error ? reason.message : 'Microphone or voice connection unavailable.')
    }
  }

  function end(failed = false) {
    const current = resources.current
    if (current?.socket?.readyState === WebSocket.OPEN) current.socket.send(JSON.stringify({ type: 'end' }))
    cleanup(current, true, failed)
    setConnecting(false)
    setActive(false)
    setState('Conversation ended')
  }

  function toggleMute() {
    resources.current?.stream?.getAudioTracks().forEach(track => { track.enabled = muted })
    setMuted(value => !value)
  }

  const duration = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`
  const sessionState = active ? 'Connected' : connecting ? 'Connecting' : sessionId ? 'Ended' : 'Not connected'
  const showingConversation = active || connecting || captions.length > 0

  return <section id="talk-to-rebecca" className={`rebecca-stage ${embedded ? 'is-embedded' : 'is-standalone'} ${showingConversation ? 'has-conversation' : ''}`} aria-label="Talk to Rebecca voice demo">
    <div className="rebecca-atmosphere" aria-hidden="true"><span /><span /></div>
    <div className="rebecca-stage-topline"><span><i className={active ? 'is-live' : ''} />{active ? 'Live conversation' : 'Voice demo'}</span><span>Nigerian English · Browser voice</span></div>
    <div className="rebecca-stage-grid">
      <div className="rebecca-stage-copy">
        <h1>{showingConversation ? <>You’re with<br /><em>Rebecca.</em></> : <>Talk to <em>Rebecca.</em></>}</h1>
        <p className="rebecca-stage-lede">{showingConversation ? 'Ask away. You can interrupt anytime.' : 'Receive a live call from our agent and discover how our AI caller transforms customer conversations.'}</p>
        {!expanded && !active && !connecting && <div className="rebecca-hero-actions"><button type="button" className="rebecca-primary" onClick={() => setExpanded(true)}>Talk to Rebecca <ArrowUpRight size={18} /></button><a className="rebecca-text-link" href={embedded ? '#solutions' : '/#solutions'}>Explore the platform <ArrowDown size={17} /></a></div>}
        {expanded && !active && !connecting && <div className="rebecca-setup">
          <button type="button" className="rebecca-primary" onClick={() => void start()} disabled={available !== true} aria-describedby="rebecca-processing-notice">{available === null ? 'Checking connection…' : 'Start conversation'}<Phone size={18} weight="fill" /></button>
        </div>}
        {(active || connecting || sessionId) && <div className="rebecca-call-dock">
          {(active || connecting) && <button type="button" className="rebecca-hangup" onClick={() => end()} aria-label={connecting ? 'Cancel connection' : 'End conversation'}><PhoneDisconnect size={23} weight="fill" /></button>}
          <div className="rebecca-call-signal" aria-hidden="true">{levels.map((level, index) => <span key={index} style={{ height: `${3 + level * 23}px` }} />)}</div>
          <span className="rebecca-call-clock" aria-label={`Call duration ${Math.floor(elapsed / 60)} minutes ${elapsed % 60} seconds`}>{duration}</span>
          {active && <button type="button" className="rebecca-mute" onClick={toggleMute} aria-label={muted ? 'Unmute microphone' : 'Mute microphone'} aria-pressed={muted}>{muted ? <MicrophoneSlash size={20} /> : <Microphone size={20} />}</button>}
        </div>}
        <p className="rebecca-call-status" role="status"><i className={active ? 'is-live' : ''} />{active && muted ? 'Microphone muted · Rebecca can still speak' : connecting ? 'Establishing your voice connection…' : active || sessionId ? state : 'Microphone requested on start.'}</p>
        {available === false && <p className="rebecca-inline-message">Voice is unavailable right now. <a href="/portal/request-access">Leave a request instead.</a></p>}
        {error && <p className="rebecca-inline-message is-error" role="alert">{error}</p>}
        {saved && <p className="rebecca-inline-message"><Check size={16} />Your follow-up details are saved for the team.</p>}
      </div>
      <div className="rebecca-visual"><RebeccaFluid level={voiceLevel} active={active} /><div className="rebecca-visual-caption"><span>Rebecca</span><p>{active ? muted ? 'Microphone muted' : state : 'Lumicoria’s AI voice assistant'}</p></div></div>
      <aside className="rebecca-metadata" aria-label="Rebecca session details">
        <dl><div><dt>Use case</dt><dd>Customer support</dd></div><div><dt>Voice</dt><dd>Rebecca<small>Nigerian English</small></dd></div><div><dt>Session</dt><dd><i className={active ? 'is-live' : ''} />{sessionState}{sessionId && <small>ID {sessionId.slice(0, 12)}</small>}</dd></div><div><dt>Microphone</dt><dd>{microphone === 'allowed' ? muted ? 'Muted' : 'Permission granted' : microphone === 'blocked' ? 'Permission blocked' : 'Not requested'}</dd></div></dl>
        {(timings.text !== undefined || timings.audio !== undefined) && <div className="rebecca-observed-timing"><span>Measured this session</span>{timings.text !== undefined && <p>Latest text response <strong>{timings.text} ms</strong></p>}{timings.audio !== undefined && <p>Latest speech first byte <strong>{timings.audio} ms</strong></p>}<small>Separate processing stages, not total call latency.</small></div>}
      </aside>
      <section className={`rebecca-transcript ${fullTranscript ? 'is-expanded' : ''} ${captions.length ? 'has-captions' : ''}`} aria-label="Live conversation transcript"><header><span><i className={active ? 'is-live' : ''} />Live transcript</span><button type="button" onClick={() => setFullTranscript(value => !value)} aria-expanded={fullTranscript}>{fullTranscript ? 'Collapse' : 'Expand'} <ArrowDown size={14} /></button></header><div ref={captionList} className="rebecca-caption-list" role="log" aria-live="off" tabIndex={0}>{!captions.length ? <p className="rebecca-transcript-empty">{connecting ? 'Connecting. Rebecca will speak first.' : 'Your conversation appears here.'}</p> : captions.map(caption => <article key={`${caption.role}:${caption.id}`} className={`rebecca-caption ${caption.role}`}><strong>{caption.role === 'user' ? 'You' : 'Rebecca'}</strong><p>{caption.text}{!caption.final && <span aria-label="transcribing"> …</span>}</p></article>)}</div>{captions.length > 0 && <footer>Live captions are approximate and may appear before the audio plays.</footer>}</section>
    </div>
    <p id="rebecca-processing-notice" className="rebecca-privacy">AI demo · Audio processed · Text transcript saved.</p>
    <div className="rebecca-stage-footer"><span><Microphone size={15} />Headphones recommended</span><span>End anytime.</span><a href="/portal/request-access">Get Lumicoria <ArrowUpRight size={15} /></a></div>
    {followUp && <RebeccaFollowUp failed={followUp.failed} onClose={() => setFollowUp(null)} onRetry={() => { setFollowUp(null); setExpanded(true) }} />}
  </section>
}

export function RebeccaPage() {
  return <div className="rebecca-page"><header className="rebecca-nav"><a href="/" aria-label="Lumicoria homepage"><img src="/brand-mark.png" alt="" />Lumicoria</a><a href="/">Back to Lumicoria <ArrowUpRight size={16} /></a></header><main className="rebecca-main"><RebeccaExperience /></main></div>
}
