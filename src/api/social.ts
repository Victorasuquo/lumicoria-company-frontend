import { createIdempotencyKey, jsonBody, portalFetch } from './client'

export type MetaConnection = {
  id: string
  organization_id: string
  channel: string
  status: string
  name: string
  auth_mode: string
  meta_user_id: string | null
  business_id: string | null
  waba_id: string | null
  phone_number_id: string | null
  page_id: string | null
  instagram_account_id: string | null
  asset_id: string | null
  granted_scopes: string[]
  credential_configured: boolean
  token_expires_at: string | null
  webhook_subscription_state: Record<string, unknown>
  routing_configuration: Record<string, unknown>
  ai_configuration: Record<string, unknown>
  last_health_check_at: string | null
  last_provider_error_code: string | null
  disconnected_at: string | null
  version: number
  created_at: string
  updated_at: string
}

export type MetaAsset = {
  id: string
  name?: string | null
  asset_type: string
  page_id?: string | null
  instagram_account_id?: string | null
  waba_id?: string | null
  phone_number_id?: string | null
}

export type MetaDelivery = {
  id: string
  organization_id: string
  connection_id: string
  conversation_id: string
  crm_message_id: string
  channel: string
  external_thread_id: string
  provider_message_id: string | null
  status: string
  attempts: number
  last_error_code: string | null
  last_error_detail: string | null
  provider_metadata: Record<string, unknown>
  version: number
  created_at: string
  updated_at: string
}

export type MetaCollection<T> = {
  items: T[]
  page: { next_cursor?: string | null; has_more: boolean }
  meta: { request_id: string; generated_at: string }
}

export async function startMetaConnect(organizationId: string) {
  const { data } = await portalFetch<{ authorization_url: string; expires_at: string }>(
    '/social/meta/connect',
    { organizationId },
  )
  return data
}
export async function activateMetaConnection(
  organizationId: string,
  connectionId: string,
  payload: Record<string, unknown>,
) {
  const { data } = await portalFetch<MetaConnection>(
    `/social/connections/${connectionId}/activate`,
    { organizationId, method: 'POST', ...jsonBody(payload), idempotencyKey: createIdempotencyKey() },
  )
  return data
}
