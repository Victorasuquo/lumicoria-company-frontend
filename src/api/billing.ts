export type BillingPlan = {
  id: string
  plan_key: string
  name: string
  currency: string
  setup_amount_minor: number
  monthly_amount_minor: number
  included_credit_units: number
  included_browser_minutes: number
  included_phone_minutes: number
  browser_voice_rate_units: number
  phone_voice_rate_units: number
  credit_unit_ngn: number
  paystack_plan_code: string | null
  flutterwave_plan_id: string | null
  status: string
  version: number
  effective_at: string
}

export type BillingInvoice = {
  id: string
  invoice_number: string
  provider: string
  purpose: string
  status: string
  currency: string
  subtotal_minor: number
  total_minor: number
  amount_paid_minor: number
  amount_refunded_minor: number
  period_start: string | null
  period_end: string | null
  due_at: string | null
  paid_at: string | null
  created_at: string
  line_items: Array<{
    id: string
    kind: string
    description: string
    quantity: number
    unit_amount_minor: number
    total_amount_minor: number
  }>
}

export type BillingPayment = {
  id: string
  invoice_id: string
  provider: string
  provider_reference: string
  purpose: string
  status: string
  amount_minor: number
  currency: string
  provider_fee_minor: number | null
  verified_at: string | null
  paid_at: string | null
  failed_at: string | null
  created_at: string
}

export type BillingSubscription = {
  id: string
  provider: string
  plan_id: string
  provider_subscription_code: string | null
  status: string
  current_period_start: string | null
  current_period_end: string | null
  next_charge_at: string | null
  grace_until: string | null
  scheduled_plan_id: string | null
  cancel_at_period_end: boolean
}

export type BillingWallet = {
  id: string
  balance_units: number
  reserved_units: number
  lifetime_granted_units: number
  lifetime_consumed_units: number
}

export type BillingOverview = {
  enabled: boolean
  provider: string
  available_providers: string[]
  trial_credit_units: number
  credit_unit_ngn: number
  /** Retained for older responses; the trial is granted automatically now. */
  trial_available: boolean
  trial_granted: boolean
  trial_claimed_at: string | null
  currency: string
  current_plan: BillingPlan | null
  subscription: BillingSubscription | null
  wallet: BillingWallet
  invoices: BillingInvoice[]
  payments: BillingPayment[]
  grace_period: boolean
}

export type BillingCheckout = {
  invoice_id: string
  reference: string
  authorization_url: string
  access_code: string | null
  status: string
}

export type BillingTrialClaim = {
  claimed: boolean
  credit_units: number
  balance_units: number
  claimed_at: string | null
}

export type BillingCheckoutStatus = {
  reference: string
  invoice_id: string | null
  status: string
  verified: boolean
  amount_minor: number | null
  currency: string | null
}

export type BillingLedgerEntry = {
  id: string
  entry_type: string
  delta_units: number
  balance_after_units: number
  source_type: string
  source_id: string
  created_at: string
}

export type BillingUsageEvent = {
  id: string
  usage_type: string
  provider: string | null
  quantity: number
  rate_units: number
  total_units: number
  source_type: string
  source_id: string
  created_at: string
  credit_unit_ngn: number
  amount_ngn: number
}

export type BillingTopup = {
  topup_key: string
  amount_minor: number
  credit_units: number
}
