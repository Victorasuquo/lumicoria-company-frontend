import { ArrowRight, PlugsConnected, ShieldCheck } from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createIdempotencyKey, jsonBody, portalFetch } from '../../api/client'
import type {
  CRMCollection,
  CRMConnector,
  CRMConnectorProvider,
  CRMConnectorProviderCollection,
  CRMOAuthStart,
} from '../../api/crm'
import { usePortalAuth } from '../../auth/AuthProvider'
import { ChannelIcon } from '../../components/ChannelIcon'
import { usePortalQuery } from '../hooks'
import {
  PortalEmpty,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
  formatPortalDate,
} from '../components/PortalState'

/**
 * Connecting a helpdesk, by the tenant rather than by us.
 *
 * The form is built from the provider catalogue the API returns, never from a
 * hardcoded list here: a provider whose OAuth client is configured server-side
 * comes back as `auth_method: "oauth"` and renders as a single button, and the
 * same provider renders as a credentials form when it is not. That is what lets
 * Zendesk switch from pasted API token to one-click sign-in the day Zendesk
 * grants our global OAuth client, with no change to this file.
 */

const CALLBACK_MESSAGES: Record<string, string> = {
  connected: 'Helpdesk connected. Tickets will begin syncing shortly.',
  invalid_state: 'That sign-in link had already been used or expired. Please try again.',
  provider_error: 'The helpdesk declined the sign-in. Please try again.',
  error: 'The sign-in did not complete. Please try again.',
}

function ProviderCard({
  provider,
  connection,
}: {
  provider: CRMConnectorProvider
  connection?: CRMConnector
}) {
  const { context, hasScope } = usePortalAuth()
  const queryClient = useQueryClient()
  const [values, setValues] = useState<Record<string, string>>({})
  const canManage = hasScope('crm.integrations.manage')

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'crm'] })
  }

  const startOAuth = useMutation({
    mutationFn: async () => {
      if (!context?.organization_id) throw new Error('Organisation context is unavailable.')
      const query = provider.requires_subdomain
        ? `?subdomain=${encodeURIComponent(values.subdomain ?? '')}`
        : ''
      const { data } = await portalFetch<CRMOAuthStart>(
        `/crm/connectors/oauth/${provider.provider}/start${query}`,
        { organizationId: context.organization_id },
      )
      window.location.assign(data.authorization_url)
    },
  })

  const connectWithToken = useMutation({
    mutationFn: async () => {
      if (!context?.organization_id) throw new Error('Organisation context is unavailable.')
      const { data } = await portalFetch<CRMConnector>('/crm/connectors/connect/token', {
        organizationId: context.organization_id,
        method: 'POST',
        ...jsonBody({
          provider: provider.provider,
          name: `${provider.label} helpdesk`,
          credentials: values,
        }),
        idempotencyKey: createIdempotencyKey(),
      })
      return data
    },
    onSuccess: () => {
      // Nothing typed is kept in memory once it has been stored.
      setValues({})
      invalidate()
    },
  })

  const disconnect = useMutation({
    mutationFn: async () => {
      if (!context?.organization_id || !connection) {
        throw new Error('Organisation context is unavailable.')
      }
      const { data } = await portalFetch<CRMConnector>(
        `/crm/connectors/${connection.id}/disconnect`,
        {
          organizationId: context.organization_id,
          method: 'POST',
          idempotencyKey: createIdempotencyKey(),
        },
      )
      return data
    },
    onSuccess: invalidate,
  })

  const isConnected = connection?.status === 'connected'
  const busy = startOAuth.isPending || connectWithToken.isPending || disconnect.isPending

  return (
    <article className="channel-ops-card">
      <div className="channel-ops-card-topline">
        <ChannelIcon channel={provider.provider} fallback={PlugsConnected} size={36} />
        <StatusPill value={connection?.status ?? (provider.enabled ? 'not_configured' : 'server_setup')} />
      </div>
      <span className="support-panel-kicker">{provider.label}</span>
      <h2>{isConnected ? 'Connected' : provider.enabled ? 'Not connected' : 'Unavailable'}</h2>

      {!provider.enabled && (
        <p>
          This helpdesk is not enabled on this deployment. Your Lumicoria administrator can switch
          it on.
        </p>
      )}

      {provider.enabled && isConnected && (
        <>
          <p>
            Credentials are stored and encrypted. Last checked{' '}
            {formatPortalDate(connection?.last_health_check_at ?? null, true)}.
          </p>
          {canManage && (
            <div className="channel-ops-card-footer">
              <button
                type="button"
                className="portal-secondary-button"
                onClick={() => disconnect.mutate()}
                disabled={busy}
              >
                {disconnect.isPending ? 'Disconnecting' : 'Disconnect'}
              </button>
            </div>
          )}
          {disconnect.error && (
            <PortalError error={disconnect.error} title="Could not disconnect" />
          )}
        </>
      )}

      {provider.enabled && !isConnected && !canManage && (
        <p>Your organisation administrator can connect this helpdesk.</p>
      )}

      {provider.enabled && !isConnected && canManage && (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (provider.auth_method === 'oauth') startOAuth.mutate()
            else connectWithToken.mutate()
          }}
        >
          {provider.auth_method === 'oauth' && (
            <p>
              Sign in to {provider.label} and approve access. Lumicoria never sees your password.
            </p>
          )}
          {provider.fields.map((field) => (
            <div className="portal-voice-create-section" key={field.name}>
              <label className="portal-voice-create-label" htmlFor={`${provider.provider}-${field.name}`}>
                {field.label}
              </label>
              <input
                id={`${provider.provider}-${field.name}`}
                className="portal-voice-create-input"
                type={field.secret ? 'password' : 'text'}
                autoComplete="off"
                spellCheck={false}
                placeholder={field.placeholder || undefined}
                value={values[field.name] ?? ''}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.name]: event.target.value }))
                }
                disabled={busy}
                required
              />
              {field.help_text && <small>{field.help_text}</small>}
            </div>
          ))}
          <div className="channel-ops-card-footer">
            <button type="submit" className="portal-primary-button" disabled={busy}>
              {busy ? 'Connecting' : `Connect ${provider.label}`}{' '}
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </form>
      )}

      {startOAuth.error && (
        <PortalError error={startOAuth.error} title={`${provider.label} sign-in could not start`} />
      )}
      {connectWithToken.error && (
        <PortalError error={connectWithToken.error} title={`${provider.label} did not connect`} />
      )}
    </article>
  )
}

export function HelpdeskConnectPage() {
  const { hasScope } = usePortalAuth()
  const [params] = useSearchParams()
  const canRead = hasScope('crm.integrations.read')

  const providers = usePortalQuery<CRMConnectorProviderCollection>(
    ['crm', 'connector-providers'],
    canRead ? '/crm/connectors/providers' : null,
  )
  const connectors = usePortalQuery<CRMCollection<CRMConnector>>(
    ['crm', 'connectors'],
    canRead ? '/crm/connectors?page_size=100' : null,
  )

  if (!canRead) {
    return (
      <PortalEmpty
        title="Access not granted"
        description="Your organisation administrator has not enabled integration management."
      />
    )
  }
  if (providers.isLoading || connectors.isLoading) {
    return <PortalLoading label="Loading helpdesk options" />
  }
  if (providers.error) {
    return <PortalError error={providers.error} onRetry={() => void providers.refetch()} />
  }

  const items = providers.data?.items ?? []
  // Most recent connection per provider wins; a provider is shown as connected
  // if any of its connections is.
  const byProvider = new Map<string, CRMConnector>()
  for (const connector of connectors.data?.items ?? []) {
    const existing = byProvider.get(connector.provider)
    if (!existing || (connector.status === 'connected' && existing.status !== 'connected')) {
      byProvider.set(connector.provider, connector)
    }
  }
  const callback = params.get('crm')

  return (
    <div className="portal-page support-page">
      <PortalPageHeader
        eyebrow="Channels"
        title="Connect your helpdesk"
        description="Link the helpdesk your team already uses. Lumicoria syncs its tickets while keeping the local support record."
      />
      {callback && (
        <div
          className="support-inline-notice"
          role={callback === 'connected' ? 'status' : 'alert'}
        >
          {CALLBACK_MESSAGES[callback] ?? CALLBACK_MESSAGES.error}
        </div>
      )}
      {connectors.error && (
        <PortalError error={connectors.error} title="Existing connections could not be loaded" />
      )}
      {items.length ? (
        <section className="channel-ops-grid">
          {items.map((provider) => (
            <ProviderCard
              key={provider.provider}
              provider={provider}
              connection={byProvider.get(provider.provider)}
            />
          ))}
        </section>
      ) : (
        <PortalEmpty
          title="No helpdesk providers available"
          description="No helpdesk integration is enabled on this deployment."
        />
      )}
      <section className="portal-panel channel-ops-limits">
        <h2>
          <ShieldCheck aria-hidden="true" /> How your credentials are held
        </h2>
        <p>
          Credentials are encrypted before they are stored and are never shown again, not even to
          you. They are used only to reach your helpdesk on your organisation&apos;s behalf, and
          disconnecting deletes them.
        </p>
      </section>
    </div>
  )
}
