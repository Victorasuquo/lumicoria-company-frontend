import { ArrowClockwise, CheckCircle, MagnifyingGlass, Phone, ShoppingCart, WarningCircle } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { createIdempotencyKey, jsonBody, portalFetch } from '../../api/client'
import type { VoiceAgentCollection } from '../../api/types'
import type { VoiceCollection, VoicePhoneNumber } from '../../api/voice-types'
import { usePortalAuth } from '../../auth/AuthProvider'
import { useVoiceQuery } from '../hooks'
import { portalQueryClient } from '../query'
import {
  formatPortalDate,
  humanize,
  PortalEmpty,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
} from '../components/PortalState'

type Provider = 'twilio' | 'telnyx'
type NumberCapability = 'inbound' | 'outbound' | 'bidirectional'
type ProvidersResponse = {
  selected_provider: string
  providers: Array<{
    provider: Provider | 'local'
    configured: boolean
    selected_for_new_numbers: boolean
    supports_number_search: boolean
    supports_purchase: boolean
    supports_inbound_voice: boolean
    supports_outbound_voice: boolean
    reason: string | null
  }>
  note: string
}
type PSTNChannels = { items: Array<{ id: string; name: string; status: string; provider_connection_id: string | null; provider: Provider | null }> }
type AvailableNumber = {
  phone_number: string
  country_code: string
  number_type: string
  capabilities: string[]
  monthly_cost: string | null
  currency: string | null
}
type NumberSearch = { provider: Provider; country_code: string; number_type: string; items: AvailableNumber[] }
type PurchaseResponse = { number: VoicePhoneNumber; provider_order_status: string; provider_cost: string | null; provider_currency: string | null }
type CallbackResponse = { callback: { id: string; status: string; destination_last4: string }; session: { id: string; status: string } }

const sectionStyle = { display: 'grid', gap: 18 } as const
const fieldStyle = { display: 'grid', gap: 7, minWidth: 0 } as const
const inputStyle = { width: '100%', minHeight: 44, border: '1px solid var(--portal-border, #d8dce6)', borderRadius: 10, padding: '10px 12px', background: 'var(--portal-surface, white)', color: 'inherit' } as const
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, alignItems: 'end' } as const

export function VoiceTelephonyPage() {
  const { context, hasScope } = usePortalAuth()
  const [provider, setProvider] = useState<Provider>('twilio')
  const [countryCode, setCountryCode] = useState('NG')
  const [numberType, setNumberType] = useState('local')
  const [capability, setCapability] = useState<NumberCapability>('bidirectional')
  const [agentId, setAgentId] = useState('')
  const [channelId, setChannelId] = useState('')
  const [searchPath, setSearchPath] = useState<string | null>(null)
  const [selectedNumber, setSelectedNumber] = useState('')
  const [purchaseConfirmed, setPurchaseConfirmed] = useState(false)
  const [purchaseIdempotencyKey, setPurchaseIdempotencyKey] = useState<string | null>(null)
  const [channelSetupError, setChannelSetupError] = useState<Error | null>(null)
  const [outboundPhoneNumberId, setOutboundPhoneNumberId] = useState('')
  const [outboundDestination, setOutboundDestination] = useState('')
  const [outboundConsentConfirmed, setOutboundConsentConfirmed] = useState(false)
  const [outboundIdempotencyKey, setOutboundIdempotencyKey] = useState<string | null>(null)

  const query = useVoiceQuery<VoiceCollection<VoicePhoneNumber>>(
    ['voice-phone-numbers'],
    '/voice/channels/phone-numbers?page_size=100',
  )
  const providers = useVoiceQuery<ProvidersResponse>(['voice-telephony-providers'], '/voice/telephony/providers')
  const agents = useVoiceQuery<VoiceAgentCollection>(['voice-telephony-agents'], '/voice/agents?page_size=100')
  const channels = useVoiceQuery<PSTNChannels>(
    ['voice-pstn-channels', agentId],
    agentId ? `/voice/agents/${encodeURIComponent(agentId)}/pstn-channels` : null,
  )
  const search = useVoiceQuery<NumberSearch>(
    ['voice-number-search', searchPath],
    searchPath,
    { enabled: Boolean(searchPath) },
  )
  const providerStatus = providers.data?.providers.find((item) => item.provider === provider)
  const requestedCapabilityReady = Boolean(
    providerStatus &&
    ((capability === 'inbound' && providerStatus.supports_inbound_voice) ||
      (capability === 'outbound' && providerStatus.supports_outbound_voice) ||
      (capability === 'bidirectional' && providerStatus.supports_inbound_voice && providerStatus.supports_outbound_voice)),
  )
  const agentOptions = useMemo(
    () => (agents.data?.items ?? []).filter((agent) => ['published', 'draft', 'validated'].includes(agent.status)),
    [agents.data?.items],
  )
  const channelOptions = (channels.data?.items ?? []).filter((channel) => channel.provider === provider)

  const purchase = useMutation({
    mutationFn: async () => {
      if (!context?.organization_id || !agentId || !channelId || !selectedNumber) {
        throw new Error('Choose an agent, PSTN channel, and available number first.')
      }
      const idempotencyKey = purchaseIdempotencyKey ?? createIdempotencyKey()
      if (!purchaseIdempotencyKey) setPurchaseIdempotencyKey(idempotencyKey)
      const { data } = await portalFetch<PurchaseResponse>('/voice/telephony/numbers/purchase', {
        organizationId: context.organization_id,
        method: 'POST',
        idempotencyKey,
        ...jsonBody({
          provider,
          phone_number: selectedNumber,
          agent_id: agentId,
          channel_id: channelId,
          capability,
          confirm_provider_charge: purchaseConfirmed,
        }),
      })
      return data
    },
    onSuccess: async () => {
      setSelectedNumber('')
      setPurchaseConfirmed(false)
      setPurchaseIdempotencyKey(null)
      await portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-phone-numbers'] })
    },
  })
  const configureChannel = useMutation({
    mutationFn: async () => {
      if (!context?.organization_id || !agentId) throw new Error('Select an agent first.')
      const { data } = await portalFetch<{ id: string }>('/voice/agents/' + encodeURIComponent(agentId) + '/pstn-channels', {
        organizationId: context.organization_id,
        method: 'POST',
        idempotencyKey: createIdempotencyKey(),
        ...jsonBody({ provider, name: 'Business phone' }),
      })
      return data
    },
    onSuccess: async (data) => {
      setChannelId(data.id)
      setChannelSetupError(null)
      await portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-pstn-channels', agentId] })
    },
    onError: (error: Error) => setChannelSetupError(error),
  })
  const placeCall = useMutation({
    mutationFn: async () => {
      if (!context?.organization_id || !agentId || !outboundPhoneNumberId || !outboundDestination.trim()) {
        throw new Error('Select a published agent and caller ID, then enter the customer number.')
      }
      if (!outboundConsentConfirmed) throw new Error('Confirm the customer explicitly requested this immediate callback.')
      const idempotencyKey = outboundIdempotencyKey ?? createIdempotencyKey()
      if (!outboundIdempotencyKey) setOutboundIdempotencyKey(idempotencyKey)
      const { data } = await portalFetch<CallbackResponse>(`/voice/agents/${encodeURIComponent(agentId)}/callbacks`, {
        organizationId: context.organization_id,
        method: 'POST',
        idempotencyKey,
        ...jsonBody({
          phone_number_id: outboundPhoneNumberId,
          destination: outboundDestination.trim(),
          purpose: 'requested_callback',
          consent_granted: true,
          consent_text: 'The customer explicitly requested an immediate callback from this organisation at the phone number they provided.',
          consent_version: 'portal-operator-callback-v1',
          widget_key: 'portal-operator',
        }),
      })
      return data
    },
    onSuccess: () => {
      setOutboundDestination('')
      setOutboundConsentConfirmed(false)
      setOutboundIdempotencyKey(null)
    },
  })

  function searchInventory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSelectedNumber('')
    setPurchaseIdempotencyKey(null)
    const params = new URLSearchParams({ provider, country_code: countryCode.trim().toUpperCase(), number_type: numberType, limit: '20' })
    setSearchPath(`/voice/telephony/numbers/search?${params.toString()}`)
  }

  if (query.isLoading || providers.isLoading || agents.isLoading) return <PortalLoading label="Loading voice telephony" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />

  const numbers = query.data?.items ?? []
  const assignedAgent = agentOptions.find((item) => item.id === agentId)
  const outboundNumbers = numbers.filter((number) => number.agent_id === agentId && number.status === 'active' && ['outbound', 'bidirectional'].includes(number.capability))
  const canManage = hasScope('voice.channel.manage')

  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="Voice channels"
        title="Telephony"
        description="Choose a carrier, search its live inventory, then purchase and bind a number to an organisation voice agent. Carrier charges are billed directly to the configured carrier account."
        action={<span className="portal-header-stat"><strong>{numbers.length}</strong> number{numbers.length !== 1 ? 's' : ''}</span>}
      />

      <section className="portal-panel" style={sectionStyle}>
        <div>
          <span className="support-panel-kicker">Carrier connection</span>
          <h2 style={{ margin: '6px 0' }}>Choose a provider for new numbers</h2>
          <p style={{ margin: 0 }}>{providers.data?.note}</p>
        </div>
        {providers.error ? <PortalError title="Carrier configuration could not be loaded" error={providers.error} onRetry={() => void providers.refetch()} /> : (
          <>
          <div style={gridStyle}>
            {(['twilio', 'telnyx'] as const).map((key) => {
              const item = providers.data?.providers.find((candidate) => candidate.provider === key)
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!item?.configured || !canManage}
                  onClick={() => { setProvider(key); setChannelId(''); setSearchPath(null); setSelectedNumber(''); setPurchaseIdempotencyKey(null); purchase.reset() }}
                  aria-pressed={provider === key}
                  className="portal-panel"
                  style={{ textAlign: 'left', cursor: item?.configured && canManage ? 'pointer' : 'not-allowed', border: provider === key ? '2px solid #635bff' : undefined, opacity: item?.configured ? 1 : .68 }}
                >
                  <strong>{humanize(key)} {item?.selected_for_new_numbers ? '· default' : ''}</strong>
                  <span style={{ display: 'block', marginTop: 8 }}><StatusPill value={item?.configured ? 'configured' : 'not_configured'} /></span>
                  <small style={{ display: 'block', marginTop: 8 }}>{item?.reason ?? 'Search and purchase supported numbers.'}</small>
                </button>
              )
            })}
          </div>
          {agentId && channelOptions.length === 0 && !channels.isLoading && (
            <div style={sectionStyle}>
              <p>No PSTN channel is configured for this agent yet. Set up a provider-bound phone channel before buying a number.</p>
              <button type="button" className="portal-secondary-button" disabled={!providerStatus?.configured || configureChannel.isPending} onClick={() => configureChannel.mutate()}>
                <Phone aria-hidden="true" /> {configureChannel.isPending ? 'Configuring carrier channel…' : `Configure ${humanize(provider)} phone channel`}
              </button>
              {channelSetupError && <PortalError title="Phone channel setup failed" error={channelSetupError} onRetry={() => configureChannel.mutate()} />}
            </div>
          )}
          </>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: '#5f6572' }}>
          <WarningCircle aria-hidden="true" size={20} />
          <p style={{ margin: 0 }}>Changing the default affects future purchases only. Existing numbers remain with their current carrier; to change one, port it or purchase a replacement, then move the routing after testing.</p>
        </div>
      </section>

      {canManage && (
        <section className="portal-panel" style={sectionStyle}>
          <div>
            <span className="support-panel-kicker">Number provisioning</span>
            <h2 style={{ margin: '6px 0' }}>Find a number and connect it to an agent</h2>
            <p style={{ margin: 0 }}>Availability and displayed recurring price come from the carrier account at search time. Final charges, taxes, and regulatory requirements are determined by the carrier at order time.</p>
          </div>
          <form onSubmit={searchInventory} style={sectionStyle}>
            <div style={gridStyle}>
              <label style={fieldStyle}>Carrier<select style={inputStyle} value={provider} onChange={(event) => { const nextProvider = event.target.value as Provider; const nextStatus = providers.data?.providers.find((item) => item.provider === nextProvider); setProvider(nextProvider); setChannelId(''); if (!nextStatus?.supports_inbound_voice) setCapability('outbound'); setSearchPath(null); setSelectedNumber(''); setPurchaseIdempotencyKey(null); purchase.reset() }}><option value="twilio">Twilio</option><option value="telnyx">Telnyx</option></select></label>
              <label style={fieldStyle}>Country code<input style={inputStyle} value={countryCode} onChange={(event) => setCountryCode(event.target.value.toUpperCase())} minLength={2} maxLength={2} required /></label>
              <label style={fieldStyle}>Number type<select style={inputStyle} value={numberType} onChange={(event) => setNumberType(event.target.value)}><option value="local">Local</option><option value="mobile">Mobile</option><option value="toll_free">Toll-free</option><option value="any">Any supported</option></select></label>
              <label style={fieldStyle}>Call direction<select style={inputStyle} value={capability} onChange={(event) => { setCapability(event.target.value as NumberCapability); setPurchaseIdempotencyKey(null); purchase.reset() }}><option value="bidirectional" disabled={!providerStatus?.supports_inbound_voice}>Inbound and outbound</option><option value="inbound" disabled={!providerStatus?.supports_inbound_voice}>Inbound only</option><option value="outbound" disabled={!providerStatus?.supports_outbound_voice}>Outbound only</option></select></label>
              <button className="portal-primary-button" type="submit" disabled={!providerStatus?.supports_number_search || search.isFetching}><MagnifyingGlass aria-hidden="true" /> Search numbers</button>
            </div>
            <div style={gridStyle}>
              <label style={fieldStyle}>Voice agent<select style={inputStyle} value={agentId} onChange={(event) => { setAgentId(event.target.value); setChannelId('') }} required><option value="">Select an agent</option>{agentOptions.map((agent) => <option key={agent.id} value={agent.id}>{agent.name} · {humanize(agent.status)}</option>)}</select></label>
              <label style={fieldStyle}>PSTN channel<select style={inputStyle} value={channelId} onChange={(event) => setChannelId(event.target.value)} required disabled={!agentId || channels.isLoading}><option value="">Select a PSTN channel</option>{channelOptions.map((channel) => <option key={channel.id} value={channel.id}>{channel.name} · {humanize(channel.status)}</option>)}</select></label>
            </div>
          </form>
          {channels.error && <PortalError title="PSTN channels could not be loaded" error={channels.error} onRetry={() => void channels.refetch()} />}
          {searchPath && search.isLoading && <PortalLoading label="Searching provider inventory" />}
          {search.error && <PortalError title="Carrier inventory search failed" error={search.error} onRetry={() => void search.refetch()} />}
          {providerStatus && (!providerStatus.supports_inbound_voice || !providerStatus.supports_outbound_voice) && <p role="note">{providerStatus.supports_outbound_voice ? 'Inbound webhook and media verification is incomplete. Outbound-only provisioning is available; inbound capability stays disabled.' : 'The carrier call runtime is not ready. Number lookup may be available, but call-capable purchase stays disabled until public HTTPS/WSS and provider setup are complete.'}</p>}
          {search.data && (
            search.data.items.length ? (
              <div style={sectionStyle}>
                {search.data.items.map((item) => (
                  <label key={item.phone_number} className="portal-panel" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center', cursor: 'pointer' }}>
                    <input type="radio" name="available-number" value={item.phone_number} checked={selectedNumber === item.phone_number} onChange={() => { setSelectedNumber(item.phone_number); setPurchaseIdempotencyKey(null); purchase.reset() }} />
                    <span><strong>{item.phone_number}</strong><small style={{ display: 'block', marginTop: 4 }}>{humanize(item.number_type)} · {item.capabilities.map(humanize).join(', ') || 'Voice'} capable</small></span>
                    <span>{item.monthly_cost ? `${item.currency ?? ''} ${item.monthly_cost}/month` : 'Price confirmed by carrier at checkout'}</span>
                  </label>
                ))}
              </div>
            ) : <PortalEmpty title="No matching voice numbers" description="Try another number type or country. Search results reflect current carrier inventory." />
          )}
          {selectedNumber && (
            <div style={sectionStyle}>
              <p>Requested capability: <strong>{humanize(capability)}</strong>. Carrier inventory, regulatory documents, taxes, and final recurring charges are confirmed by the provider.</p>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}><input type="checkbox" checked={purchaseConfirmed} onChange={(event) => setPurchaseConfirmed(event.target.checked)} /><span>I confirm the carrier may charge its account for <strong>{selectedNumber}</strong> and that the recurring carrier price and taxes will be verified before purchase.</span></label>
              <button className="portal-primary-button" type="button" onClick={() => purchase.mutate()} disabled={!purchaseConfirmed || !requestedCapabilityReady || !agentId || !channelId || purchase.isPending}><ShoppingCart aria-hidden="true" /> {purchase.isPending ? 'Purchasing and assigning…' : `Purchase and assign ${selectedNumber}`}</button>
            </div>
          )}
          {purchase.error && <PortalError title="Number purchase did not complete" error={purchase.error} onRetry={() => purchase.mutate()} />}
          {purchase.data && <div role="status" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><CheckCircle aria-hidden="true" /> {purchase.data.number.display_number} is {humanize(purchase.data.provider_order_status)} and assigned to {assignedAgent?.name ?? 'the selected agent'}.</div>}
        </section>
      )}

      {hasScope('voice.call.start') && (
        <section className="portal-panel" style={sectionStyle}>
          <div>
            <span className="support-panel-kicker">Requested callback</span>
            <h2 style={{ margin: '6px 0' }}>Place one consented call</h2>
            <p style={{ margin: 0 }}>Use this only when the person explicitly asked for an immediate callback. The call uses the selected published agent and its assigned carrier number, and appears in call history with consent and delivery events.</p>
          </div>
          <div style={gridStyle}>
            <label style={fieldStyle}>Published voice agent<select style={inputStyle} value={agentId} onChange={(event) => { setAgentId(event.target.value); setOutboundPhoneNumberId(''); setOutboundIdempotencyKey(null); placeCall.reset() }} required><option value="">Select an agent</option>{agentOptions.filter((agent) => agent.status === 'published').map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label>
            <label style={fieldStyle}>Your assigned caller ID<select style={inputStyle} value={outboundPhoneNumberId} onChange={(event) => { setOutboundPhoneNumberId(event.target.value); setOutboundIdempotencyKey(null); placeCall.reset() }} required disabled={!agentId}><option value="">Select a number</option>{outboundNumbers.map((number) => <option key={number.id} value={number.id}>{number.display_number} · {humanize(number.provider)}</option>)}</select></label>
            <label style={fieldStyle}>Customer phone number<input style={inputStyle} value={outboundDestination} onChange={(event) => { setOutboundDestination(event.target.value); setOutboundIdempotencyKey(null); placeCall.reset() }} placeholder="Include country code, e.g. +234…" type="tel" autoComplete="tel" required /></label>
          </div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}><input type="checkbox" checked={outboundConsentConfirmed} onChange={(event) => setOutboundConsentConfirmed(event.target.checked)} /><span>I confirm the customer explicitly requested this immediate callback at this number. This is not permission for marketing or repeated calls.</span></label>
          <button type="button" className="portal-primary-button" onClick={() => placeCall.mutate()} disabled={placeCall.isPending || !outboundConsentConfirmed || !agentId || !outboundPhoneNumberId || !outboundDestination.trim()}><Phone aria-hidden="true" /> {placeCall.isPending ? 'Starting call…' : 'Call customer now'}</button>
          {placeCall.error && <PortalError title="Could not start the callback" error={placeCall.error} onRetry={() => placeCall.mutate()} />}
          {placeCall.data && <div role="status"><CheckCircle aria-hidden="true" /> Callback {placeCall.data.callback.id} is {humanize(placeCall.data.callback.status)}; the customer number ends in {placeCall.data.callback.destination_last4}.</div>}
          {!outboundNumbers.length && agentId && <PortalEmpty title="No outbound-ready number for this agent" description="Purchase and assign an active outbound-capable number above, then publish the agent before calling." />}
        </section>
      )}

      <section className="portal-panel">
        {numbers.length ? (
          <div className="portal-voice-phone-table">
            <div className="portal-voice-phone-table-header"><span>Display number</span><span>Country</span><span>Capability</span><span>Status</span><span>Agent</span><span>Provider</span><span>Updated</span></div>
            {numbers.map((number) => (
              <div key={number.id} className="portal-voice-phone-table-row">
                <span className="portal-voice-phone-number"><Phone aria-hidden="true" weight="duotone" />{number.display_number}</span>
                <span>{number.country_code}</span><span><StatusPill value={number.capability} /></span><span><StatusPill value={number.status} /></span>
                <span className="portal-voice-truncated">{agentOptions.find((item) => item.id === number.agent_id)?.name ?? number.agent_id}</span>
                <span>{humanize(number.provider)}</span><span>{formatPortalDate(number.updated_at)}</span>
              </div>
            ))}
          </div>
        ) : (
          <PortalEmpty title="No phone numbers assigned" description="Search a carrier's inventory above, or wait for a provisioning administrator to assign a number." />
        )}
        <button type="button" className="portal-secondary-button" onClick={() => void query.refetch()} style={{ marginTop: 16 }}><ArrowClockwise aria-hidden="true" /> Refresh number list</button>
      </section>
    </div>
  )
}
