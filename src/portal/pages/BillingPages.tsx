import { CreditCard, DownloadSimple, Lightning, Receipt, WarningCircle } from '@phosphor-icons/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { createIdempotencyKey, jsonBody, portalFetch } from '../../api/client'
import type { BillingCheckout, BillingCheckoutStatus, BillingInvoice, BillingLedgerEntry, BillingOverview, BillingPlan, BillingTopup, BillingUsageEvent, BillingWallet } from '../../api/billing'
import { usePortalAuth } from '../../auth/AuthProvider'
import { usePortalQuery } from '../hooks'
import { PortalEmpty, PortalError, PortalLoading, PortalPageHeader, StatusPill, formatPortalDate } from '../components/PortalState'

const naira = (minor: number) => `₦${(minor / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
const creditNaira = (units: number, unitNgn: number) => `₦${(units * unitNgn).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

function BillingAccess({ children }: { children: React.ReactNode }) {
  const { hasScope } = usePortalAuth()
  if (!hasScope('billing.read')) return <PortalEmpty title="Billing access is not enabled" description="Ask your organisation administrator to enable billing access for your account." />
  return <>{children}</>
}

export function BillingPage() {
  const { context, firebaseUser } = usePortalAuth()
  const overview = usePortalQuery<BillingOverview>(['billing', 'overview'], '/billing/overview')
  const plans = usePortalQuery<BillingPlan[]>(['billing', 'plans'], '/billing/plans')
  const checkout = useMutation({
    mutationFn: async (planKey: string) => {
      const { data } = await portalFetch<BillingCheckout>('/billing/checkout', { organizationId: context?.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ plan_key: planKey, billing_email: firebaseUser?.email }) })
      return data
    },
    onSuccess: (data) => window.location.assign(data.authorization_url),
  })
  if (overview.isLoading || plans.isLoading) return <PortalLoading label="Loading billing" />
  if (overview.error || plans.error) return <PortalError error={(overview.error || plans.error) as Error} onRetry={() => { void overview.refetch(); void plans.refetch() }} />
  const data = overview.data
  return <BillingAccess><div className="portal-page">
    <PortalPageHeader eyebrow="Billing" title="Keep your workspace funded" description="Manage your Lumicoria plan, invoices, and credits from one place." action={<Link className="portal-secondary-button" to="/portal/billing/invoices"><Receipt aria-hidden="true" /> View invoices</Link>} />
    {!data?.enabled && <div className="portal-notice"><WarningCircle aria-hidden="true" /><div><strong>Paystack is not enabled yet</strong><p>Configure the Paystack keys and webhook URL on the backend before starting a live checkout.</p></div></div>}
    {data?.grace_period && <div className="portal-notice warning"><WarningCircle aria-hidden="true" /><div><strong>Your subscription needs attention</strong><p>Your workspace is in its renewal grace period. Update payment before access is suspended.</p></div></div>}
    <div className="support-metric-grid">
      <article className="support-metric"><div className="support-metric-icon"><CreditCard aria-hidden="true" /></div><span>Current plan</span><strong>{data?.current_plan?.name ?? 'Not subscribed'}</strong><small>{data?.subscription?.next_charge_at ? `Next charge ${formatPortalDate(data.subscription.next_charge_at)}` : 'Choose a plan below'}</small></article>
      <article className="support-metric"><div className="support-metric-icon"><Lightning aria-hidden="true" /></div><span>Available credits</span><strong>{data?.wallet.balance_units.toLocaleString() ?? '0'}</strong><small>{data?.wallet.reserved_units.toLocaleString() ?? '0'} reserved for active work</small></article>
      <article className="support-metric"><div className="support-metric-icon"><Receipt aria-hidden="true" /></div><span>Recent payments</span><strong>{data?.payments.filter((item) => item.status === 'success').length ?? 0}</strong><small>Verified by Paystack</small></article>
    </div>
    <section className="portal-panel"><header><div><span className="support-panel-kicker">Plans</span><h2>Choose your workspace plan</h2><p>Prices are configured by Lumicoria and paid through Paystack.</p></div></header><div className="support-overview-grid">{plans.data?.map((plan) => <article className="portal-card" key={plan.id}><span className="support-panel-kicker">{plan.name}</span><h3>{naira(plan.monthly_amount_minor)} <small>/ month</small></h3><p>One-time setup: {naira(plan.setup_amount_minor)}</p><p><strong>{plan.included_browser_minutes || 0} browser minutes</strong> · <strong>{plan.included_phone_minutes || 0} phone minutes</strong> included monthly.</p>{plan.browser_voice_rate_units > 0 && <small>Overage: {creditNaira(plan.browser_voice_rate_units, plan.credit_unit_ngn || 1)} browser minute · {creditNaira(plan.phone_voice_rate_units, plan.credit_unit_ngn || 1)} phone minute.</small>}<button className="portal-primary-button" type="button" disabled={!data?.enabled || checkout.isPending || plan.plan_key === 'hotel_enterprise'} onClick={() => checkout.mutate(plan.plan_key)}>{plan.plan_key === 'hotel_enterprise' ? 'Contact Lumicoria' : checkout.isPending ? 'Opening Paystack…' : data?.current_plan?.plan_key === plan.plan_key ? 'Current plan' : 'Start checkout'}</button></article>)}</div>{checkout.error && <PortalError error={checkout.error as Error} />}</section>
  </div></BillingAccess>
}

export function BillingInvoicesPage() {
  const invoices = usePortalQuery<BillingInvoice[]>(['billing', 'invoices'], '/billing/invoices')
  if (invoices.isLoading) return <PortalLoading label="Loading invoices" />
  if (invoices.error) return <PortalError error={invoices.error as Error} onRetry={() => void invoices.refetch()} />
  return <BillingAccess><div className="portal-page"><PortalPageHeader eyebrow="Billing" title="Invoices" description="Every setup fee, subscription charge, and credit purchase is recorded here." /><section className="portal-panel"><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Invoice</th><th>Purpose</th><th>Total</th><th>Status</th><th>Created</th></tr></thead><tbody>{invoices.data?.map((invoice) => <tr key={invoice.id}><td><strong>{invoice.invoice_number}</strong></td><td>{invoice.purpose.replaceAll('_', ' ')}</td><td>{naira(invoice.total_minor)}</td><td><StatusPill value={invoice.status} /></td><td>{formatPortalDate(invoice.created_at)}</td></tr>)}</tbody></table>{!invoices.data?.length && <PortalEmpty title="No invoices yet" description="Your first invoice will appear after you start a checkout." />}</div></section></div></BillingAccess>
}

export function BillingCreditsPage() {
  const { context, firebaseUser } = usePortalAuth()
  const wallet = usePortalQuery<BillingWallet>(['billing', 'credits'], '/billing/credits')
  const ledger = usePortalQuery<BillingLedgerEntry[]>(['billing', 'credits', 'ledger'], '/billing/credits/ledger')
  const topups = usePortalQuery<BillingTopup[]>(['billing', 'credits', 'topups'], '/billing/credits/topups')
  const checkout = useMutation({ mutationFn: async (topupKey: string) => { const { data } = await portalFetch<BillingCheckout>('/billing/credits/checkout', { organizationId: context?.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ topup_key: topupKey, billing_email: firebaseUser?.email }) }); return data }, onSuccess: (data) => window.location.assign(data.authorization_url) })
  if (wallet.isLoading || ledger.isLoading || topups.isLoading) return <PortalLoading label="Loading credits" />
  if (wallet.error || ledger.error || topups.error) return <PortalError error={(wallet.error || ledger.error || topups.error) as Error} onRetry={() => { void wallet.refetch(); void ledger.refetch(); void topups.refetch() }} />
  return <BillingAccess><div className="portal-page"><PortalPageHeader eyebrow="Billing" title="Credits" description="Credits pay for provider usage such as voice sessions. Every change is recorded in the ledger." action={<Link className="portal-secondary-button" to="/portal/billing/usage">View voice usage</Link>} /><div className="support-metric-grid"><article className="support-metric"><div className="support-metric-icon"><Lightning aria-hidden="true" /></div><span>Balance</span><strong>{wallet.data?.balance_units.toLocaleString()}</strong><small>Available provider-cost units</small></article><article className="support-metric"><div className="support-metric-icon"><Receipt aria-hidden="true" /></div><span>Reserved</span><strong>{wallet.data?.reserved_units.toLocaleString()}</strong><small>Held by active sessions</small></article></div><section className="portal-panel"><header><div><span className="support-panel-kicker">Top up</span><h2>Add credits through Paystack</h2></div></header><div className="support-overview-grid">{topups.data?.map((topup) => <article className="portal-card" key={topup.topup_key}><h3>{topup.credit_units.toLocaleString()} credits</h3><p>{naira(topup.amount_minor)}</p><button className="portal-primary-button" type="button" onClick={() => checkout.mutate(topup.topup_key)} disabled={checkout.isPending}>Buy credits</button></article>)}</div>{!topups.data?.length && <PortalEmpty title="Credit purchases are not configured" description="Lumicoria needs a credit top-up catalog in the backend environment." />}</section><section className="portal-panel"><header><div><span className="support-panel-kicker">Ledger</span><h2>Credit activity</h2></div></header>{ledger.data?.map((item) => <div className="support-channel-row" key={item.id}><span>{item.entry_type.replaceAll('_', ' ')}</span><strong>{item.delta_units > 0 ? '+' : ''}{item.delta_units.toLocaleString()}</strong><small>{formatPortalDate(item.created_at)}</small></div>)}{!ledger.data?.length && <PortalEmpty title="No credit activity" description="Purchases, grants, and voice usage will appear here." />}</section>{checkout.error && <PortalError error={checkout.error as Error} />}</div></BillingAccess>
}

export function BillingUsagePage() {
  const usage = usePortalQuery<BillingUsageEvent[]>(['billing', 'usage'], '/billing/usage')
  if (usage.isLoading) return <PortalLoading label="Loading voice usage" />
  if (usage.error) return <PortalError error={usage.error as Error} onRetry={() => void usage.refetch()} />
  return <BillingAccess><div className="portal-page"><PortalPageHeader eyebrow="Billing" title="Voice usage" description="See the metered browser and phone minutes that consume your organisation credits." action={<Link className="portal-secondary-button" to="/portal/billing/credits">Back to credits</Link>} /><section className="portal-panel"><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Usage</th><th>Provider</th><th>Quantity</th><th>Rate</th><th>Credits</th><th>Estimated cost</th><th>Source</th><th>Recorded</th></tr></thead><tbody>{usage.data?.map((item) => <tr key={item.id}><td><strong>{item.usage_type.replaceAll('_', ' ')}</strong></td><td>{item.provider || 'Platform'}</td><td>{item.quantity}</td><td>{item.rate_units.toLocaleString()} units</td><td>{item.total_units.toLocaleString()}</td><td>₦{item.amount_ngn.toLocaleString('en-NG')}</td><td>{item.source_type.replaceAll('_', ' ')}</td><td>{formatPortalDate(item.created_at)}</td></tr>)}</tbody></table>{!usage.data?.length && <PortalEmpty title="No voice usage yet" description="Completed billable voice sessions will appear here with their channel-specific rate." />}</div></section></div></BillingAccess>
}

export function BillingCheckoutPage() {
  const [params] = useSearchParams()
  const reference = params.get('reference') || params.get('trxref')
  const status = usePortalQuery<BillingCheckoutStatus>(['billing', 'checkout', reference], reference ? `/billing/checkout/${encodeURIComponent(reference)}` : null)
  return <BillingAccess><div className="portal-page"><PortalPageHeader eyebrow="Billing" title="Checkout status" description="Paystack is the source of truth for payment confirmation." />{!reference ? <PortalEmpty title="No checkout reference" description="Return to billing and start a checkout." action={<Link className="portal-secondary-button" to="/portal/billing">Back to billing</Link>} /> : status.isLoading ? <PortalLoading label="Verifying payment" /> : status.error ? <PortalError error={status.error as Error} /> : <section className="portal-panel"><h2>{status.data?.verified ? 'Payment confirmed' : 'Payment is being verified'}</h2><p>{status.data?.verified ? 'Your invoice and entitlement will update shortly.' : 'Do not pay again. We are waiting for Paystack webhook confirmation.'}</p><Link className="portal-secondary-button" to="/portal/billing/invoices"><Receipt aria-hidden="true" /> Open invoices</Link></section>}</div></BillingAccess>
}

export function AdminBillingPage() {
  const overview = useQuery({ queryKey: ['admin', 'billing', 'overview'], queryFn: async () => (await portalFetch<{ organizations: Array<{ organization_id: string; account_status: string; subscription_status: string | null }>; totals: Record<string, number> }>('/admin/billing/overview')).data })
  if (overview.isLoading) return <PortalLoading label="Loading billing operations" />
  if (overview.error) return <PortalError error={overview.error as Error} onRetry={() => void overview.refetch()} />
  return <div className="portal-page"><PortalPageHeader eyebrow="Internal billing" title="Billing operations" description="Monitor Paystack accounts and subscription states across organisations." /><section className="portal-panel"><header><div><span className="support-panel-kicker">Organisation billing</span><h2>{overview.data?.totals.organizations ?? 0} accounts</h2></div></header><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Organisation</th><th>Account</th><th>Subscription</th></tr></thead><tbody>{overview.data?.organizations.map((item) => <tr key={item.organization_id}><td>{item.organization_id}</td><td><StatusPill value={item.account_status} /></td><td>{item.subscription_status ? <StatusPill value={item.subscription_status} /> : 'Not subscribed'}</td></tr>)}</tbody></table>{!overview.data?.organizations.length && <PortalEmpty title="No billing accounts" description="Billing accounts will appear after organisations start checkout." />}</div></section></div>
}
