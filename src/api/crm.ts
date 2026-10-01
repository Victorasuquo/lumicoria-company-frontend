import type { components } from './generated/schema'

export type CRMCustomer = components['schemas']['CRMCustomerResponse']
export type CRMConversation = components['schemas']['CRMConversationResponse']
export type CRMMessage = components['schemas']['CRMMessageResponse']
export type CRMTicket = components['schemas']['CRMTicketResponse']
export type CRMTicketEvent = components['schemas']['CRMTicketEventResponse']
export type CRMQueue = components['schemas']['CRMQueueResponse']
export type CRMAnalyticsReport = components['schemas']['CRMAnalyticsReportResponse']
export type CRMConnector = components['schemas']['CRMConnectorResponse']
export type CRMWorkflowTemplate = components['schemas']['CRMWorkflowTemplateResponse']
type CRMWorkflowRunResponse = components['schemas']['CRMWorkflowRunResponse']
export type CRMWorkflowRun = Omit<CRMWorkflowRunResponse, 'state'> & {
  state: CRMWorkflowRunResponse['state'] & {
    fields?: Record<string, unknown>
    missing_required?: string[]
    escalation_reason?: string
  }
}
export type CRMWorkflowCatalog = components['schemas']['CRMWorkflowCatalogResponse']
export type CRMNotificationDelivery = components['schemas']['CRMNotificationDeliveryResponse']
export type CRMNotificationRetryResponse = components['schemas']['CRMNotificationRetryResponse']
export type CRMConnectorUpdate = components['schemas']['CRMConnectorUpdate']
export type CRMConnectorHealth = components['schemas']['CRMConnectorHealthResponse']
export type CRMConnectorSyncResponse = components['schemas']['CRMConnectorSyncResponse']
export type CRMOperation = components['schemas']['OperationResponse']

export type CRMCollection<T> = {
  items: T[]
  page: components['schemas']['Page']
  meta: components['schemas']['ResponseMeta']
}

export type CRMListQuery = {
  page_size?: number
  page_after?: string | null
  search?: string | null
  status?: string | null
  priority?: string | null
  category?: string | null
  source_channel?: string | null
  queue_id?: string | null
  assignee_id?: string | null
  vertical?: string | null
  template_id?: string | null
}

export type CRMTicketCreate = components['schemas']['CRMTicketCreate']
export type CRMTicketUpdate = components['schemas']['CRMTicketUpdate']
export type CRMMessageCreate = components['schemas']['CRMMessageCreate']
export type CRMAnalyticsFilters = components['schemas']['CRMAnalyticsFilters']
export type CRMWorkflowRunCreate = components['schemas']['CRMWorkflowRunCreate']

export const crmScopes = {
  customersRead: 'crm.customers.read',
  customersManage: 'crm.customers.manage',
  conversationsRead: 'crm.conversations.read',
  conversationsManage: 'crm.conversations.manage',
  messagesRead: 'crm.messages.read',
  messagesManage: 'crm.messages.manage',
  ticketsRead: 'crm.tickets.read',
  ticketsManage: 'crm.tickets.manage',
  queuesRead: 'crm.queues.read',
  queuesManage: 'crm.queues.manage',
  timelineRead: 'crm.timeline.read',
  auditRead: 'crm.audit.read',
  workflowsRead: 'crm.workflows.read',
  workflowsManage: 'crm.workflows.manage',
  analyticsRead: 'crm.analytics.read',
  analyticsExport: 'crm.analytics.export',
  notificationsRead: 'crm.notifications.read',
  notificationsManage: 'crm.notifications.manage',
  integrationsRead: 'crm.integrations.read',
  integrationsManage: 'crm.integrations.manage',
} as const

export function crmQueryString(query: CRMListQuery = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const encoded = params.toString()
  return encoded ? `?${encoded}` : ''
}

export function analyticsQueryString(filters: CRMAnalyticsFilters = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const encoded = params.toString()
  return encoded ? `?${encoded}` : ''
}
