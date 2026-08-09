export type VoiceCollection<T> = {
  items: T[]
  page: { next_cursor?: string | null; has_more?: boolean }
  meta: { request_id?: string; generated_at?: string }
}

// ── Knowledge ────────────────────────────────────────────────────────

export type VoiceKnowledgeBase = {
  id: string
  organization_id: string
  engagement_id: string | null
  name: string
  description: string | null
  status: string
  default_locale: string
  published_release_id: string | null
  source_count: number
  version: number
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

export type VoiceKnowledgeSourceVersion = {
  id: string
  organization_id: string
  source_id: string
  version_number: number
  processing_status: string
  filename: string | null
  media_type: string | null
  size_bytes: number | null
  content_sha256: string | null
  scan_status: string
  parser_version: string | null
  chunker_version: string | null
  embedding_provider: string | null
  embedding_model: string | null
  language: string | null
  encoding: string | null
  pii_findings: Record<string, unknown>[]
  secret_findings: Record<string, unknown>[]
  duplicate_of_version_id: string | null
  retry_count: number
  retryable: boolean
  failure_code: string | null
  failure_detail: string | null
  processed_at: string | null
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

export type VoiceKnowledgeSource = {
  id: string
  organization_id: string
  knowledge_base_id: string
  name: string
  source_type: string
  status: string
  uri: string | null
  connector_key: string | null
  current_version_id: string | null
  latest_version: number
  language: string | null
  safe_metadata: Record<string, unknown>
  last_error_code: string | null
  last_error_detail: string | null
  version: number
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
  current_version: VoiceKnowledgeSourceVersion | null
}

export type VoiceKnowledgeUploadIntentResponse = {
  source_version_id: string
  upload_url: string
  method: string
  required_headers: Record<string, string>
  expires_at: string
}

export type VoiceKnowledgeSourceProcessResponse = {
  source: VoiceKnowledgeSource
  version: VoiceKnowledgeSourceVersion | null
  document_id: string | null
  chunk_count: number
  rule_count: number
  decision_table_count: number
  warnings: string[]
}

export type VoiceKnowledgeTestCaseResponse = {
  id: string
  organization_id: string
  knowledge_base_id: string
  name: string
  query: string
  expected_source_ids: string[]
  expected_phrases: string[]
  forbidden_phrases: string[]
  filters: Record<string, unknown>
  minimum_confidence: number
  status: string
  version: number
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

export type VoiceKnowledgePassage = {
  content: string
  score: number
  lexical_score: number
  vector_score: number
  citation: {
    source_id: string
    source_version_id: string
    source_name: string
    document_id: string
    chunk_id: string
    chunk_ordinal: number
    content_sha256: string
    heading_path: string[]
  }
  treat_as_untrusted_data: true
  prompt_injection_detected: boolean
}

export type VoiceKnowledgeTestQueryResponse = {
  knowledge_base_id: string
  release_id: string | null
  passages: VoiceKnowledgePassage[]
  confidence: number
  insufficient: boolean
  conflicts: {
    category: string
    rule_ids: string[]
    source_version_ids: string[]
    detail: string
  }[]
  retrieval_audit_id: string
}

export type VoiceKnowledgeReleaseItemResponse = {
  id: string
  source_id: string
  source_version_id: string
  document_id: string
  content_sha256: string
  source_name: string
}

export type VoiceKnowledgeReleaseResponse = {
  id: string
  organization_id: string
  knowledge_base_id: string
  release_number: number
  name: string
  status: string
  release_sha256: string | null
  item_count: number
  published_at: string | null
  published_by: string | null
  version: number
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
  items: VoiceKnowledgeReleaseItemResponse[]
}

export type VoiceKnowledgeEvaluationResponse = {
  id: string
  organization_id: string
  knowledge_base_id: string
  release_id: string
  status: string
  total_cases: number
  passed_cases: number
  failed_cases: number
  score: number | null
  results: Record<string, unknown>[]
  started_at: string | null
  completed_at: string | null
  failure_code: string | null
  failure_detail: string | null
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

// ── Runtime ──────────────────────────────────────────────────────────

export type VoiceSession = {
  id: string
  organization_id: string
  agent_id: string
  agent_version_id: string
  channel_id: string
  session_type: string
  status: string
  provider: string
  correlation_id: string
  language: string
  runtime_configuration_checksum_sha256: string
  max_duration_seconds: number
  started_at: string | null
  ended_at: string | null
  last_heartbeat_at: string | null
  end_reason: string | null
  retention_expires_at: string
  feedback_rating: number | null
  feedback_tags: string[]
  feedback_comment: string | null
  version: number
  created_at: string
  updated_at: string
}

export type VoiceBrowserConnectionGrant = {
  provider: string
  url: string
  room_name: string
  participant_identity: string
  access_token: string
  expires_at: string
  grants: Record<string, unknown>
}

export type VoiceBrowserSessionResponse = {
  session: VoiceSession
  connection: VoiceBrowserConnectionGrant
}

export type VoiceSessionEvent = {
  id: string
  session_id: string
  sequence_number: number
  event_type: string
  actor_type: string
  correlation_id: string
  visibility: string
  payload: Record<string, unknown>
  created_at: string
}

export type VoiceConversationTurn = {
  id: string
  session_id: string
  participant_id: string | null
  ordinal: number
  speaker: string
  status: string
  language: string
  transcript: string
  started_at: string
  finalized_at: string | null
  interrupted_at: string | null
  retrieval_trace_ids: string[]
  tool_execution_ids: string[]
}

export type VoiceTranscriptResponse = {
  session_id: string
  language: string
  status: string
  turns: VoiceConversationTurn[]
  meta: { request_id?: string; generated_at?: string }
}

// ── Telephony ────────────────────────────────────────────────────────

export type VoicePhoneNumber = {
  id: string
  organization_id: string
  agent_id: string
  channel_id: string
  provider_connection_id: string | null
  provider: string
  display_number: string
  country_code: string
  capability: string
  status: string
  allowed_purposes: string[]
  safe_configuration: Record<string, unknown>
  version: number
  created_at: string
  updated_at: string
}

export type VoiceCallback = {
  id: string
  organization_id: string
  agent_id: string
  phone_number_id: string
  session_id: string | null
  destination_last4: string
  destination_country: string
  purpose: string
  status: string
  customer_status: string | null
  requested_at: string
  terminal_at: string | null
  cancellation_reason: string | null
  version: number
  created_at: string
  updated_at: string
}

export type VoiceCallbackCreatedResponse = {
  callback: VoiceCallback
  session: VoiceSession
}

// ── Tools ────────────────────────────────────────────────────────────

export type VoiceToolDefinition = {
  id: string
  organization_id: string | null
  key: string
  display_name: string
  description: string
  category: string
  ownership: string
  status: string
  latest_version: number
  version: number
  created_at: string
  updated_at: string
}

export type VoiceToolVersion = {
  id: string
  tool_id: string
  organization_id: string | null
  version_number: number
  schema_version: string
  lifecycle_status: string
  bapit_document: Record<string, unknown>
  checksum_sha256: string
  published_at: string
  created_at: string
}

export type VoiceToolDetail = VoiceToolDefinition & {
  latest: VoiceToolVersion | null
}

export type VoiceToolBinding = {
  id: string
  organization_id: string
  agent_id: string
  tool_id: string
  tool_version_id: string
  credential_id: string | null
  approval_policy_id: string
  execution_policy_id: string
  status: string
  safe_configuration: Record<string, unknown>
  version: number
  created_at: string
  updated_at: string
}

export type VoiceToolExecutionResult = {
  execution_id: string
  outcome: 'succeeded' | 'denied' | 'failed'
  tool_id: string
  binding_id: string | null
  output: Record<string, unknown> | null
  safe_error_code: string | null
  latency_ms: number
  replayed: boolean
}

export type VoiceToolHealth = {
  tool_id: string
  binding_id: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  circuit_state: 'closed' | 'open' | 'half_open'
  consecutive_failures: number
  latency_ms: number | null
  safe_error_code: string | null
  checked_at: string
}

// ── Analytics ────────────────────────────────────────────────────────

export type VoiceCallRecord = {
  id: string
  organization_id: string
  session_id: string
  agent_id: string
  agent_version_id: string
  channel_id: string
  direction: string
  provider: string
  status: string
  processing_status: string
  language: string
  started_at: string
  ended_at: string
  duration_seconds: number
  primary_intent: string | null
  secondary_intents: string[]
  resolution_status: string | null
  disposition: string | null
  summary: string | null
  summary_evidence_ids: string[]
  metrics: Record<string, unknown>
  transcript_expires_at: string | null
  insights_ready_at: string | null
  process_version: number
  safe_error: Record<string, unknown> | null
  version: number
  created_at: string
  updated_at: string
}

export type VoiceTranscriptSegment = {
  id: string
  call_id: string
  source_turn_id: string | null
  supersedes_segment_id: string | null
  ordinal: number
  revision: number
  speaker: string
  status: string
  language: string
  text: string
  redacted: boolean
  redaction_types: string[]
  evidence: Record<string, unknown>
  started_at: string
  ended_at: string | null
  expires_at: string | null
}

export type VoiceCallTranscript = {
  call_id: string
  processing_status: string
  segments: VoiceTranscriptSegment[]
  page: { next_cursor?: string | null; has_more?: boolean }
  meta: { request_id?: string; generated_at?: string }
}

export type VoiceRetrievalTrace = {
  id: string
  call_id: string
  segment_id: string | null
  retrieval_reference: string
  knowledge_base_id: string | null
  release_id: string | null
  query_sha256: string
  citations: Record<string, unknown>[]
  top_confidence: number | null
  latency_ms: number | null
  created_at: string
}

export type VoiceCallToolExecution = {
  id: string
  call_id: string
  segment_id: string | null
  execution_reference: string
  tool_id: string | null
  binding_id: string | null
  outcome: string
  safe_error_code: string | null
  input_evidence: Record<string, unknown>
  output_evidence: Record<string, unknown>
  latency_ms: number | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export type VoiceCallActionItem = {
  id: string
  call_id: string
  title: string
  description: string
  owner_type: string
  owner_id: string | null
  due_at: string | null
  status: string
  evidence_segment_ids: string[]
  completed_at: string | null
  version: number
  created_at: string
  updated_at: string
}

export type VoiceCallEvaluation = {
  id: string
  call_id: string
  suite_key: string
  evaluation_version: number
  status: string
  score_percent: number
  findings: Record<string, unknown>[]
  evidence_segment_ids: string[]
  created_at: string
}

export type VoiceRecordingAccess = {
  recording_id: string
  download_url: string
  expires_at: string
  media_type: string
}

export type VoiceAnalyticsSummary = {
  from_date: string
  to_date: string
  timezone: string
  total_calls: number
  completed_calls: number
  resolved_calls: number
  resolution_rate: number
  total_duration_seconds: number
  average_duration_seconds: number
  total_cost_micros: number
  currency: string
  processing_failures: number
  meta: { request_id?: string; generated_at?: string }
}

export type VoiceAnalyticsTimeseriesPoint = {
  date: string
  total_calls: number
  completed_calls: number
  resolved_calls: number
  total_duration_seconds: number
  total_cost_micros: number
}

export type VoiceAnalyticsTimeseries = {
  from_date: string
  to_date: string
  timezone: string
  points: VoiceAnalyticsTimeseriesPoint[]
  meta: { request_id?: string; generated_at?: string }
}

export type VoiceAnalyticsDispositions = {
  from_date: string
  to_date: string
  total: number
  items: { code: string; count: number; percentage: number }[]
  meta: { request_id?: string; generated_at?: string }
}

// ── Handoffs (M8) ────────────────────────────────────────────────────

export type VoiceHandoffDestination = {
  id: string
  organization_id: string
  name: string
  destination_type: string
  routing_skills: string[]
  locale: string | null
  capacity: number
  status: string
  external_endpoint: string | null
  safe_configuration: Record<string, unknown>
  version: number
  created_at: string
  updated_at: string
}

export type VoiceHandoffPolicy = {
  id: string
  organization_id: string
  agent_id: string
  trigger_type: string
  priority: number
  destination_selection: string
  destination_id: string | null
  business_hours_json: Record<string, unknown>
  fallback_mode: string
  warm_transfer: boolean
  enabled: boolean
  version: number
  created_at: string
  updated_at: string
}

export type VoiceHandoffAttempt = {
  id: string
  organization_id: string
  session_id: string
  destination_id: string | null
  policy_id: string | null
  trigger_type: string
  status: string
  warm_transfer: boolean
  wait_seconds: number
  connected_at: string | null
  completed_at: string | null
  failure_reason: string | null
  fallback_resource_type: string | null
  fallback_resource_id: string | null
  version: number
  created_at: string
  updated_at: string
}

export type VoiceHandoffBrief = {
  id: string
  attempt_id: string
  session_id: string
  identity_verification_state: string
  intent: string
  customer_references: string[]
  completed_actions: string[]
  failed_actions: string[]
  sop_citations: string[]
  outstanding_question: string | null
  customer_commitments: string[]
  required_next_decision: string | null
  created_at: string
}

export type VoiceSupervisorSession = {
  id: string
  organization_id: string
  session_id: string
  supervisor_principal_id: string
  mode: string
  status: string
  ended_at: string | null
  end_reason: string | null
  version: number
  created_at: string
  updated_at: string
}

// ── Widgets (M9) ────────────────────────────────────────────────────

export type VoiceWidgetOrigin = {
  id: string
  origin: string
  status: string
  created_at: string
}

export type VoiceWidgetConfig = {
  id: string
  organization_id: string
  agent_id: string
  display_name: string
  theme_json: Record<string, unknown>
  channels: string[]
  status: string
  kill_switch: string
  captcha_enabled: boolean
  csp_frame_ancestors: string | null
  customer_context_required: boolean
  safe_configuration: Record<string, unknown>
  key_prefix: string | null
  origins: VoiceWidgetOrigin[]
  version: number
  created_at: string
  updated_at: string
}

export type VoiceWidgetKeyRotation = {
  widget_id: string
  key_prefix: string
  plain_key: string
  rotated_at: string
  meta: { request_id?: string; generated_at?: string }
}

export type VoiceWidgetPause = {
  widget_id: string
  status: string
  updated_at: string
  meta: { request_id?: string; generated_at?: string }
}

// ── WhatsApp (M10) ──────────────────────────────────────────────────

export type VoiceWhatsAppSender = {
  id: string
  organization_id: string
  phone_number: string
  display_name: string
  waba_id: string | null
  country_code: string
  status: string
  verified: boolean
  provider_sender_id: string | null
  safe_configuration: Record<string, unknown>
  version: number
  created_at: string
  updated_at: string
}

export type VoiceWhatsAppEligibilityEntry = {
  country_code: string
  capability: string
  allowed: boolean
  reason: string | null
}

export type VoiceWhatsAppEligibility = {
  sender_id: string
  country_code: string
  entries: VoiceWhatsAppEligibilityEntry[]
  meta: { request_id?: string; generated_at?: string }
}

export type VoiceWhatsAppPermission = {
  id: string
  sender_id: string
  status: string
  granted_at: string | null
  expires_at: string | null
  template_id: string | null
  created_at: string
}
