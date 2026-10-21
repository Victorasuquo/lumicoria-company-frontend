import { CheckCircle, CreditCard, DownloadSimple, Lightning, Receipt, WarningCircle } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { createIdempotencyKey, jsonBody, portalFetch } from '../../api/client'
import type { BillingCheckout, BillingCheckoutStatus, BillingInvoice, BillingLedgerEntry, BillingOverview, BillingPlan, BillingTopup, BillingUsageEvent, BillingWallet } from '../../api/billing'
import { usePortalAuth } from '../../auth/AuthProvider'
import { usePortalQuery } from '../hooks'
import { PortalEmpty, PortalError, PortalLoading, PortalPageHeader, StatusPill, formatPortalDate } from '../components/PortalState'

const naira = (minor: number) => `₦${(minor / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
const creditNaira = (units: number, unitNgn: number) => `₦${(units * unitNgn).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
const billingAmount = (minor: number, currency = 'NGN') => new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en', { style: 'currency', currency, maximumFractionDigits: currency === 'NGN' ? 0 : 2 }).format(minor / 100)
const readableLabel = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
// Keep the processor label factual without implying payment details we do not receive.
const payMethod = (provider: string | null | undefined) => !provider || provider === 'lumicoria' ? 'Included' : readableLabel(provider)

function BillingAccess({ children }: { children: React.ReactNode }) {
  const { hasScope } = usePortalAuth()
  if (!hasScope('billing.read')) return <PortalEmpty title="Billing access is not enabled" description="Ask your organisation administrator to enable billing access for your account." />
  return <>{children}</>
}

function InvoiceReceipt({ invoice, customerEmail, organizationId, onPrint }: { invoice: BillingInvoice; customerEmail?: string | null; organizationId?: string | null; onPrint: () => void }) {
  const currency = invoice.currency || 'NGN'
  const balanceDue = Math.max(invoice.total_minor - invoice.amount_paid_minor, 0)
  return <section className="billing-receipt-sheet" id={`receipt-${invoice.id}`} aria-label={`Receipt for invoice ${invoice.invoice_number}`}>
    <header className="billing-receipt-header">
      <div className="billing-receipt-brand"><img src="/brand-mark.png" alt="" /><img className="billing-receipt-wordmark" src="/lumicoria-wordmark.png" alt="Lumicoria" /></div>
      <div className="billing-receipt-heading"><span>{invoice.status === 'paid' ? 'Payment receipt' : 'Invoice'}</span><strong className={`billing-receipt-status billing-receipt-status-${invoice.status === 'paid' ? 'paid' : 'open'}`}>{readableLabel(invoice.status)}</strong></div>
    </header>
    <div className="billing-receipt-total"><span>{invoice.status === 'paid' ? 'Amount paid' : 'Invoice total'}</span><strong>{billingAmount(invoice.status === 'paid' ? invoice.amount_paid_minor : invoice.total_minor, currency)}</strong><small>{invoice.status === 'paid' && invoice.total_minor === 0 ? 'Workspace credit · no payment required' : readableLabel(invoice.purpose)}</small></div>
    <div className="billing-receipt-meta">
      <div><span>Invoice number</span><strong>{invoice.invoice_number}</strong></div>
      <div><span>Issued</span><strong>{formatPortalDate(invoice.created_at, true)}</strong></div>
      {invoice.paid_at && <div><span>Paid</span><strong>{formatPortalDate(invoice.paid_at, true)}</strong></div>}
      {invoice.due_at && <div><span>Due</span><strong>{formatPortalDate(invoice.due_at, true)}</strong></div>}
      {invoice.period_start && invoice.period_end && <div><span>Billing period</span><strong>{formatPortalDate(invoice.period_start)} – {formatPortalDate(invoice.period_end)}</strong></div>}
      <div><span>Payment processor</span><strong>{payMethod(invoice.provider)}</strong></div>
    </div>
    <div className="billing-receipt-parties">
      <div><span>From</span><strong>Lumicoria Inc.</strong><small>Nigeria</small></div>
      <div><span>Billed to</span><strong>{customerEmail || 'Workspace account'}</strong>{organizationId && <small>Workspace {organizationId}</small>}</div>
    </div>
    <div className="billing-receipt-items">
      <div className="billing-receipt-items-heading"><strong>Description</strong><strong>Amount</strong></div>
      {invoice.line_items.length ? invoice.line_items.map((item) => <div className="billing-receipt-item" key={item.id}><div><strong>{item.description}</strong><small>{item.quantity > 1 ? `${item.quantity} × ${billingAmount(item.unit_amount_minor, currency)}` : readableLabel(item.kind)}</small></div><strong>{billingAmount(item.total_amount_minor, currency)}</strong></div>) : <p className="billing-receipt-empty">No itemised details were included with this invoice.</p>}
    </div>
    <div className="billing-receipt-totals">
      <div><span>Subtotal</span><strong>{billingAmount(invoice.subtotal_minor, currency)}</strong></div>
      <div className="billing-receipt-grand-total"><span>Total</span><strong>{billingAmount(invoice.total_minor, currency)}</strong></div>
      <div><span>Amount paid</span><strong>{billingAmount(invoice.amount_paid_minor, currency)}</strong></div>
      {balanceDue > 0 && <div><span>Balance due</span><strong>{billingAmount(balanceDue, currency)}</strong></div>}
      {invoice.amount_refunded_minor > 0 && <div><span>Refunded</span><strong>{billingAmount(invoice.amount_refunded_minor, currency)}</strong></div>}
    </div>
    <footer className="billing-receipt-footer"><span>Issued by Lumicoria Inc. · Nigeria</span><span>Invoice {invoice.invoice_number}</span></footer>
    <button className="billing-receipt-print portal-secondary-button" type="button" onClick={onPrint}><DownloadSimple aria-hidden="true" /> Print / save as PDF</button>
  </section>
}

export function BillingPage() {
  const { context, firebaseUser, hasScope } = usePortalAuth()
  const queryClient = useQueryClient()
  const [provider, setProvider] = useState('')
  const overview = usePortalQuery<BillingOverview>(['billing', 'overview'], '/billing/overview')
  const plans = usePortalQuery<BillingPlan[]>(['billing', 'plans'], '/billing/plans')
  const checkout = useMutation({
    mutationFn: async (planKey: string) => {
      const { data } = await portalFetch<BillingCheckout>('/billing/checkout', { method: 'POST', organizationId: context?.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ plan_key: planKey, billing_email: firebaseUser?.email, provider: provider || overview.data?.provider }) })
      return data
    },
    onSuccess: (data) => window.location.assign(data.authorization_url),
  })
  const upgrade = useMutation({
    mutationFn: async (planKey: string) => {
      const { data } = await portalFetch<BillingCheckout>('/billing/subscription/change', {
        method: 'POST',
        organizationId: context?.organization_id,
        idempotencyKey: createIdempotencyKey(),
        ...jsonBody({ plan_key: planKey, billing_email: firebaseUser?.email, provider: overview.data?.subscription?.provider }),
      })
      return data
    },
    onSuccess: (data) => window.location.assign(data.authorization_url),
  })
  const cancelSubscription = useMutation({ mutationFn: async () => (await portalFetch('/billing/subscription/cancel', { method: 'POST', organizationId: context?.organization_id, idempotencyKey: createIdempotencyKey() })).data, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['billing'] }) } })
  if (overview.isLoading || plans.isLoading) return <PortalLoading label="Loading billing" />
  if (overview.error || plans.error) return <PortalError error={(overview.error || plans.error) as Error} onRetry={() => { void overview.refetch(); void plans.refetch() }} />
  const data = overview.data
  const subscriptionActive = ['pending', 'active', 'grace', 'past_due'].includes(data?.subscription?.status ?? '')
  const unitNgn = data?.credit_unit_ngn || 1
  const trialValue = creditNaira(data?.trial_credit_units ?? 0, unitNgn)
  return <BillingAccess><div className="portal-page">
    <PortalPageHeader eyebrow="Billing" title="Keep your workspace funded" description="Manage your Lumicoria plan, invoices, and credits from one place." action={<Link className="portal-secondary-button" to="/portal/billing/invoices"><Receipt aria-hidden="true" /> View invoices</Link>} />
    {!data?.enabled && !data?.available_providers.length && <div className="portal-notice"><WarningCircle aria-hidden="true" /><div><strong>Online checkout is not enabled yet</strong><p>Configure at least one payment provider and webhook in the backend environment.</p></div></div>}
    {data?.grace_period && <div className="portal-notice warning"><WarningCircle aria-hidden="true" /><div><strong>Your subscription needs attention</strong><p>Your workspace is in its renewal grace period. Update payment before access is suspended.</p></div></div>}
    <div className="support-metric-grid">
      <article className="support-metric"><div className="support-metric-icon"><CreditCard aria-hidden="true" /></div><span>Current plan</span><strong>{data?.current_plan?.name ?? 'Not subscribed'}</strong><small>{data?.subscription?.next_charge_at ? `Next charge ${formatPortalDate(data.subscription.next_charge_at)}` : 'Choose a plan below'}</small></article>
      <article className="support-metric"><div className="support-metric-icon"><Lightning aria-hidden="true" /></div><span>Available balance</span><strong>{creditNaira(data?.wallet.balance_units ?? 0, unitNgn)}</strong><small>{creditNaira(data?.wallet.reserved_units ?? 0, unitNgn)} reserved for active work</small></article>
      <article className="support-metric"><div className="support-metric-icon"><Receipt aria-hidden="true" /></div><span>Recent payments</span><strong>{data?.payments.filter((item) => item.status === 'success').length ?? 0}</strong><small>Provider-verified</small></article>
    </div>
    {data?.trial_granted && <section className="portal-panel"><header><div><span className="support-panel-kicker">Workspace trial</span><h2>{trialValue} free trial credit</h2><p>Added to this workspace on {formatPortalDate(data.trial_claimed_at)} — nothing to claim, no card needed. Spend it on calls, messages and tickets, and add a plan when you are ready.</p></div><Link className="portal-secondary-button" to="/portal/billing/invoices"><Receipt aria-hidden="true" /> See the receipt</Link></header></section>}
    <section className="portal-panel"><header><div><span className="support-panel-kicker">Payment activity</span><h2>Recent transactions</h2><p>Provider and verification status for each checkout.</p></div></header><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Reference</th><th>Method</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>{data?.payments.map((payment) => <tr key={payment.id}><td><strong>{payment.provider_reference}</strong></td><td>{payMethod(payment.provider)}</td><td>{naira(payment.amount_minor)}</td><td><StatusPill value={payment.status} /></td><td>{formatPortalDate(payment.created_at)}</td></tr>)}</tbody></table>{!data?.payments.length && <PortalEmpty title="No payments yet" description="Checkout and payment verification updates will appear here." />}</div></section>
    {subscriptionActive && <div className="portal-notice"><WarningCircle aria-hidden="true" /><div><strong>Upgrade billing</strong><p>Upgrades are charged at the new plan’s full monthly price today, with no second setup fee. Your current recurring subscription is cancelled only after the new payment is verified. The provider cannot be switched during an upgrade.{data?.subscription?.cancel_at_period_end ? ' Cancellation is already scheduled; contact support before starting another change.' : ''}</p>{!data?.subscription?.cancel_at_period_end && <button className="portal-secondary-button" type="button" disabled={!hasScope('billing.manage') || cancelSubscription.isPending} onClick={() => { if (window.confirm('Cancel future renewal for this workspace subscription? Your current paid period remains available.')) cancelSubscription.mutate() }}>{cancelSubscription.isPending ? 'Cancelling…' : 'Cancel subscription'}</button>}{cancelSubscription.error && <PortalError error={cancelSubscription.error as Error} />}</div></div>}
    <section className="portal-panel billing-plans-panel"><header><div><span className="support-panel-kicker">Plans</span><h2>{subscriptionActive ? 'Upgrade your workspace' : 'Choose your workspace plan'}</h2><p>{subscriptionActive ? 'Select a higher tier. Your subscription is preserved until the new payment succeeds.' : 'Clear monthly pricing, included usage, and payment terms for this workspace.'}</p></div></header>{(data?.available_providers.length ?? 0) > 1 && <label className="portal-field"><span>Payment method</span><select value={provider || data?.provider || ''} onChange={(event) => setProvider(event.target.value)} disabled={subscriptionActive}>{data?.available_providers.map((item) => <option key={item} value={item}>{item === 'flutterwave' ? 'Card, transfer or USSD' : 'Card or bank'}</option>)}</select></label>}<div className="billing-plan-grid">{plans.data?.map((plan) => {
      const current = plan.id === data?.subscription?.plan_id
      const isUpgrade = subscriptionActive && plan.monthly_amount_minor > (data?.current_plan?.monthly_amount_minor ?? 0)
      const unavailableDowngrade = subscriptionActive && !current && !isUpgrade
      const features = [
        plan.included_browser_minutes > 0 && `${plan.included_browser_minutes.toLocaleString()} browser voice minutes / month`,
        plan.included_phone_minutes > 0 && `${plan.included_phone_minutes.toLocaleString()} phone minutes / month`,
        plan.included_credit_units > 0 && `${creditNaira(plan.included_credit_units, plan.credit_unit_ngn || unitNgn)} usage credit included`,
      ].filter((feature): feature is string => Boolean(feature))
      return <article className={`billing-plan-card${current ? ' is-current' : ''}`} key={plan.id}>
        <header><div><span className="billing-plan-mark"><Lightning aria-hidden="true" /></span><h3>{plan.name}</h3></div>{current && <span className="billing-plan-current">Current plan</span>}</header>
        <p className="billing-plan-price">{billingAmount(plan.monthly_amount_minor, plan.currency)}<span> / month</span></p>
        {!subscriptionActive && <p className="billing-plan-setup">One-time setup <strong>{billingAmount(plan.setup_amount_minor, plan.currency)}</strong></p>}
        {subscriptionActive && <p className="billing-plan-setup">No additional setup fee for an upgrade.</p>}
        <ul className="billing-plan-features">{features.map((feature) => <li key={feature}><CheckCircle aria-hidden="true" weight="fill" />{feature}</li>)}{plan.browser_voice_rate_units > 0 && <li><CheckCircle aria-hidden="true" weight="fill" />Browser usage after allowance: {creditNaira(plan.browser_voice_rate_units, plan.credit_unit_ngn || unitNgn)} / minute</li>}{plan.phone_voice_rate_units > 0 && <li><CheckCircle aria-hidden="true" weight="fill" />Phone usage after allowance: {creditNaira(plan.phone_voice_rate_units, plan.credit_unit_ngn || unitNgn)} / minute</li>}</ul>
        <button className="portal-primary-button" type="button" disabled={!data?.available_providers.length || checkout.isPending || upgrade.isPending || plan.plan_key === 'hotel_enterprise' || (subscriptionActive && (!hasScope('billing.manage') || !firebaseUser?.email || !isUpgrade))} onClick={() => subscriptionActive ? upgrade.mutate(plan.plan_key) : checkout.mutate(plan.plan_key)}>{plan.plan_key === 'hotel_enterprise' ? 'Contact Lumicoria' : current ? 'Current plan' : unavailableDowngrade ? 'Downgrade unavailable' : subscriptionActive ? upgrade.isPending ? 'Opening checkout…' : `Upgrade to ${plan.name}` : checkout.isPending ? 'Opening checkout…' : 'Continue to payment'}</button>
      </article>
    })}</div>{!plans.data?.length && <PortalEmpty title="No plans are available" description="Workspace plans will appear here when the billing catalog is ready." />}{checkout.error && <PortalError error={checkout.error as Error} />}{upgrade.error && <PortalError error={upgrade.error as Error} />}</section>
  </div></BillingAccess>
}

export function BillingInvoicesPage() {
  const invoices = usePortalQuery<BillingInvoice[]>(['billing', 'invoices'], '/billing/invoices')
  const { context, firebaseUser } = usePortalAuth()
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const printReceipt = () => {
    document.body.classList.add('billing-print-mode')
    window.addEventListener('afterprint', () => document.body.classList.remove('billing-print-mode'), { once: true })
    window.print()
  }
  if (invoices.isLoading) return <PortalLoading label="Loading invoices" />
  if (invoices.error) return <PortalError error={invoices.error as Error} onRetry={() => void invoices.refetch()} />
  return <BillingAccess><div className="portal-page billing-invoices-page"><PortalPageHeader eyebrow="Billing" title="Invoices & receipts" description="A clear record of what your workspace purchased, what was paid, and when." action={<Link className="portal-secondary-button" to="/portal/billing"><CreditCard aria-hidden="true" /> Back to billing</Link>} />
    <section className="billing-invoice-list" aria-label="Invoices and receipts">{invoices.data?.map((invoice) => {
      const expanded = selectedInvoiceId === invoice.id
      return <article className={`billing-invoice-entry${expanded ? ' is-open' : ''}`} key={invoice.id}>
        <div className="billing-invoice-row"><div className="billing-invoice-identity"><img src="/brand-mark.png" alt="" /><div><strong>{invoice.invoice_number}</strong><span>{invoice.line_items[0]?.description || readableLabel(invoice.purpose)}</span><small>{formatPortalDate(invoice.created_at, true)} · {payMethod(invoice.provider)}</small></div></div><div className="billing-invoice-amount"><span>Total</span><strong>{billingAmount(invoice.total_minor, invoice.currency)}</strong></div><div className="billing-invoice-status"><StatusPill value={invoice.status} /></div><button className="portal-secondary-button billing-invoice-open" type="button" aria-expanded={expanded} aria-controls={`receipt-${invoice.id}`} onClick={() => setSelectedInvoiceId(expanded ? null : invoice.id)}>{expanded ? 'Close receipt' : 'View receipt'}</button></div>
        {expanded && <InvoiceReceipt invoice={invoice} customerEmail={firebaseUser?.email} organizationId={context?.organization_id} onPrint={printReceipt} />}
      </article>
    })}{!invoices.data?.length && <div className="billing-invoice-empty"><img src="/brand-mark.png" alt="" /><PortalEmpty title="No invoices yet" description="Your first invoice or trial-credit record will appear here after billing activity begins." action={<Link className="portal-primary-button" to="/portal/billing">Explore plans</Link>} /></div>}</section>
  </div></BillingAccess>
}

export function BillingCreditsPage() {
  const { context, firebaseUser } = usePortalAuth()
  const overview = usePortalQuery<BillingOverview>(['billing', 'overview'], '/billing/overview')
  const [provider, setProvider] = useState('')
  const wallet = usePortalQuery<BillingWallet>(['billing', 'credits'], '/billing/credits')
  const unitNgn = overview.data?.credit_unit_ngn || 1
  const ledger = usePortalQuery<BillingLedgerEntry[]>(['billing', 'credits', 'ledger'], '/billing/credits/ledger')
  const topups = usePortalQuery<BillingTopup[]>(['billing', 'credits', 'topups'], '/billing/credits/topups')
  const checkout = useMutation({ mutationFn: async (topupKey: string) => { const { data } = await portalFetch<BillingCheckout>('/billing/credits/checkout', { method: 'POST', organizationId: context?.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ topup_key: topupKey, billing_email: firebaseUser?.email, provider: provider || overview.data?.provider }) }); return data }, onSuccess: (data) => window.location.assign(data.authorization_url) })
  if (wallet.isLoading || ledger.isLoading || topups.isLoading) return <PortalLoading label="Loading credits" />
  if (wallet.error || ledger.error || topups.error) return <PortalError error={(wallet.error || ledger.error || topups.error) as Error} onRetry={() => { void wallet.refetch(); void ledger.refetch(); void topups.refetch() }} />
  return <BillingAccess><div className="portal-page"><PortalPageHeader eyebrow="Billing" title="Credits" description="Credits pay for provider usage such as voice sessions. Every change is recorded in the ledger." action={<Link className="portal-secondary-button" to="/portal/billing/usage">View voice usage</Link>} /><div className="support-metric-grid"><article className="support-metric"><div className="support-metric-icon"><Lightning aria-hidden="true" /></div><span>Balance</span><strong>{creditNaira(wallet.data?.balance_units ?? 0, unitNgn)}</strong><small>{wallet.data?.balance_units.toLocaleString()} credits available</small></article><article className="support-metric"><div className="support-metric-icon"><Receipt aria-hidden="true" /></div><span>Reserved</span><strong>{creditNaira(wallet.data?.reserved_units ?? 0, unitNgn)}</strong><small>Held by active sessions</small></article></div><section className="portal-panel"><header><div><span className="support-panel-kicker">Top up</span><h2>Add credits</h2><p>Cards, bank transfer and USSD are accepted at checkout.</p></div></header>{(overview.data?.available_providers.length ?? 0) > 1 && <label className="portal-field"><span>Payment method</span><select value={provider || overview.data?.provider || ''} onChange={(event) => setProvider(event.target.value)}>{overview.data?.available_providers.map((item) => <option key={item} value={item}>{item === 'flutterwave' ? 'Card, transfer or USSD' : 'Card or bank'}</option>)}</select></label>}<div className="support-overview-grid">{topups.data?.map((topup) => <article className="portal-card" key={topup.topup_key}><h3>{naira(topup.amount_minor)}</h3><p>{creditNaira(topup.credit_units, unitNgn)} of workspace credit.</p><button className="portal-primary-button" type="button" onClick={() => checkout.mutate(topup.topup_key)} disabled={checkout.isPending || !overview.data?.available_providers.length}>Buy credits</button></article>)}</div>{!topups.data?.length && <PortalEmpty title="Credit purchases are not configured" description="Lumicoria needs a credit top-up catalog in the backend environment." />}</section><section className="portal-panel"><header><div><span className="support-panel-kicker">Ledger</span><h2>Credit activity</h2></div></header>{ledger.data?.map((item) => <div className="support-channel-row" key={item.id}><span>{item.entry_type.replaceAll('_', ' ')}</span><strong>{item.delta_units > 0 ? '+' : ''}{item.delta_units.toLocaleString()}</strong><small>{formatPortalDate(item.created_at)}</small></div>)}{!ledger.data?.length && <PortalEmpty title="No credit activity" description="Purchases, grants, and voice usage will appear here." />}</section>{checkout.error && <PortalError error={checkout.error as Error} />}</div></BillingAccess>
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
  const transactionId = params.get('transaction_id')
  const status = usePortalQuery<BillingCheckoutStatus>(['billing', 'checkout', reference, transactionId], reference ? `/billing/checkout/${encodeURIComponent(reference)}${transactionId ? `?transaction_id=${encodeURIComponent(transactionId)}` : ''}` : null, { refetchInterval: (query) => query.state.data?.status === 'success' || query.state.data?.status === 'failed' ? false : 3000 })
  return <BillingAccess><div className="portal-page"><PortalPageHeader eyebrow="Billing" title="Checkout status" description="Your payment is being confirmed securely. This usually takes a few seconds." />{!reference ? <PortalEmpty title="No checkout reference" description="Return to billing and start a checkout." action={<Link className="portal-secondary-button" to="/portal/billing">Back to billing</Link>} /> : status.isLoading ? <PortalLoading label="Verifying payment" /> : status.error ? <PortalError error={status.error as Error} /> : <section className="portal-panel"><h2>{status.data?.verified ? 'Payment confirmed' : status.data?.status === 'failed' ? 'Payment failed' : 'Payment is being verified'}</h2><p>{status.data?.verified ? 'Your invoice and workspace credits are updating.' : status.data?.status === 'failed' ? 'This attempt did not go through. No money has left your account — return to billing and try again.' : 'Do not pay again while this payment is being checked. We are waiting for provider verification.'}</p><Link className="portal-secondary-button" to="/portal/billing/invoices"><Receipt aria-hidden="true" /> Open invoices</Link>{status.data?.status === 'failed' && <Link className="portal-secondary-button" to="/portal/billing">Try again</Link>}</section>}</div></BillingAccess>
}

export function AdminBillingPage() {
  const overview = useQuery({ queryKey: ['admin', 'billing', 'overview'], queryFn: async () => (await portalFetch<{ organizations: Array<{ organization_id: string; account_status: string; subscription_status: string | null }>; totals: Record<string, number> }>('/admin/billing/overview')).data })
  if (overview.isLoading) return <PortalLoading label="Loading billing operations" />
  if (overview.error) return <PortalError error={overview.error as Error} onRetry={() => void overview.refetch()} />
  return <div className="portal-page"><PortalPageHeader eyebrow="Internal billing" title="Billing operations" description="Monitor billing accounts and subscription states across organisations." /><section className="portal-panel"><header><div><span className="support-panel-kicker">Organisation billing</span><h2>{overview.data?.totals.organizations ?? 0} accounts</h2></div></header><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Organisation</th><th>Account</th><th>Subscription</th></tr></thead><tbody>{overview.data?.organizations.map((item) => <tr key={item.organization_id}><td>{item.organization_id}</td><td><StatusPill value={item.account_status} /></td><td>{item.subscription_status ? <StatusPill value={item.subscription_status} /> : 'Not subscribed'}</td></tr>)}</tbody></table>{!overview.data?.organizations.length && <PortalEmpty title="No billing accounts" description="Billing accounts will appear after organisations start checkout." />}</div></section></div>
}
