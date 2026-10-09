import { portalFetch } from './client'

export type HospitalityChannelStatus = {
  key: string
  label: string
  provider: string
  status: string
  configured: boolean
  last_event_at?: string | null
  last_error_code?: string | null
  detail?: string | null
}

export type HospitalityConfiguration = {
  id: string
  organization_id: string
  hotel_name: string
  slug: string
  description?: string | null
  timezone: string
  currency: string
  default_language: string
  address: Record<string, unknown>
  operating_hours: Record<string, unknown>
  inventory: Record<string, unknown>
  policies: Record<string, unknown>
  escalation_rules: Record<string, unknown>
  enabled_channels: string[]
  channel_bindings: Record<string, unknown>
  approved_response_rules: Record<string, unknown>
  status: string
  published_at?: string | null
  published_by?: string | null
  version: number
  created_at: string
  updated_at: string
}

export type HospitalityIntent = {
  key: string
  name: string
  required_fields: Array<{ key: string; label: string; required?: boolean }>
  queue_key?: string | null
  human_approval_required: boolean
  escalation_rules: Record<string, unknown>
  definition: Record<string, unknown>
  status: string
  definition_version: number
  override_id?: string | null
  version?: number | null
  published_at?: string | null
}

export type HospitalityTemplate = {
  key: string
  name: string
  vertical: string
  intent_count: number
  intents: HospitalityIntent[]
  default_channels: string[]
  human_confirmation_required: boolean
}

export type GmailStatus = {
  connection_id?: string | null
  status: string
  mailbox?: string | null
  last_sync_at?: string | null
  last_success_at?: string | null
  sync_cursor?: string | null
  last_error_code?: string | null
  requires_reauthorization: boolean
}

export type HospitalityHealth = {
  organization_id: string
  property_status: string
  published_knowledge: boolean
  channels: HospitalityChannelStatus[]
  intent_count: number
  warnings: string[]
}

export type HospitalityTemplateCollection = { items: HospitalityTemplate[] }
export type HospitalityChannelCollection = { items: HospitalityChannelStatus[] }
export type HospitalityIntentCollection = { items: HospitalityIntent[] }

export type HospitalityConfigInput = Partial<Pick<HospitalityConfiguration,
  'hotel_name' | 'slug' | 'description' | 'timezone' | 'currency' | 'default_language' |
  'address' | 'operating_hours' | 'inventory' | 'policies' | 'escalation_rules' |
  'enabled_channels' | 'channel_bindings' | 'approved_response_rules'
>>

export function adminHospitalityPath(organizationId: string, suffix = '') {
  return `/admin/organizations/${organizationId}/hospitality${suffix}`
}

export async function getHospitalityConfiguration() {
  return portalFetch<HospitalityConfiguration>('/hospitality/configuration')
}
