import { useCallback, useEffect, useState } from 'react';
import { callFn } from '../lib/insforge';
import type {
  BillingPlan,
  GatewayModelRow,
  LegalLinks,
  ModelStatus,
  SubscriptionState,
} from '../lib/types';

/**
 * Billing (Creem, Merchant of Record) and model selection.
 *
 * Creem is the legal seller: it collects payment, handles VAT/GST/sales tax in
 * 190+ countries and absorbs chargebacks. Its buyer terms therefore apply to
 * every purchase alongside Seerist's own policies, which is why all of them are
 * linked below — MoR platforms require the terms, privacy and refund policies
 * to be reachable from the point of purchase.
 */

const STATUS_BADGE: Record<string, string> = {
  active: 'green', trialing: 'blue', trial: 'blue', past_due: 'amber', canceled: 'red',
};

function money(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
}

export default function BillingPanel({ orgId }: { orgId: string }) {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [legal, setLegal] = useState<LegalLinks | null>(null);
  const [mor, setMor] = useState<string>('');
  const [sub, setSub] = useState<SubscriptionState | null>(null);
  const [model, setModel] = useState<ModelStatus | null>(null);
  const [catalog, setCatalog] = useState<GatewayModelRow[]>([]);
  const [showCatalog, setShowCatalog] = useState(false);
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, s, m] = await Promise.all([
        callFn<{ plans: BillingPlan[]; legal: LegalLinks; merchantOfRecord: string }>('creem-checkout', { op: 'plans' }),
        callFn<SubscriptionState>('creem-checkout', { op: 'subscription', organization_id: orgId }),
        callFn<ModelStatus>('model-gateway', { op: 'status', organization_id: orgId }),
      ]);
      setPlans(p.plans || []);
      setLegal(p.legal);
      setMor(p.merchantOfRecord);
      setSub(s);
      setModel(m);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load billing');
    }
  }, [orgId]);

  useEffect(() => { void load(); }, [load]);

  async function act(label: string, fn: () => Promise<unknown>) {
    setBusy(label); setError(null); setNote(null);
    try { await fn(); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : `${label} failed`); }
    finally { setBusy(null); }
  }

  const visible = plans.filter((p) => !p.is_paid || p.interval === interval);
  const currentCode = sub?.plan ?? 'free';

  return (
    <>
      <div className="card mt">
        <div className="spread">
          <h3 style={{ marginBottom: 0 }}>Billing</h3>
          <div className="row">
            <span className={`badge ${STATUS_BADGE[sub?.billing_status || ''] || 'gray'}`}>
              {sub?.billing_status || '—'}
            </span>
            <span className="badge violet">{sub?.details?.name || currentCode}</span>
            {sub?.current_period_end && (
              <span className="faint">renews {new Date(sub.current_period_end).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        {error && <div className="error-box mt">{error}</div>}
        {note && <div className="success-box mt">{note}</div>}

        {sub?.lifetime ? (
          <div className="success-box mt">
            This organization has a lifetime founder grant — everything is unlocked and nothing is ever charged.
          </div>
        ) : (
          <>
            <div className="row mt">
              <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
                {(['month', 'year'] as const).map((i) => (
                  <button key={i} className={`tab ${interval === i ? 'active' : ''}`} onClick={() => setInterval(i)}>
                    {i === 'month' ? 'Monthly' : 'Yearly'}
                    {i === 'year' && <span className="badge green" style={{ marginLeft: 8 }}>2 months free</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid cols-4 mt">
              {visible.map((p) => {
                const isCurrent = p.code === currentCode;
                return (
                  <div className="card" key={p.code}
                    style={{ background: 'var(--bg-raise)', borderColor: isCurrent ? 'var(--brand)' : undefined }}>
                    <div className="spread">
                      <h3 style={{ fontSize: 14, marginBottom: 0 }}>{p.name}</h3>
                      {isCurrent && <span className="badge blue">current</span>}
                    </div>
                    <div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 700, marginTop: 6 }}>
                      {money(p.price_cents, p.currency)}
                      <span className="faint" style={{ fontSize: 12, fontWeight: 400 }}>
                        {p.interval === 'none' ? '' : p.interval === 'year' ? '/yr' : '/mo'}
                      </span>
                    </div>
                    <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{p.description}</p>
                    <ul style={{ paddingLeft: 16, margin: '10px 0', fontSize: 12.5, color: 'var(--text-dim)' }}>
                      {(p.features || []).map((f) => <li key={f}>{f}</li>)}
                    </ul>
                    {p.is_paid && !isCurrent && (
                      <button className="btn primary sm" disabled={!!busy}
                        onClick={() => act(`buy-${p.code}`, async () => {
                          const res = await callFn<{ checkoutUrl: string }>('creem-checkout', {
                            op: 'checkout', organization_id: orgId, plan: p.code,
                            success_url: `${window.location.origin}/settings`,
                          });
                          if (res.checkoutUrl) window.open(res.checkoutUrl, '_blank', 'noopener');
                          else throw new Error('Creem did not return a checkout URL');
                        })}>
                        {busy === `buy-${p.code}` ? <span className="spinner" /> : `Choose ${p.name}`}
                      </button>
                    )}
                    {!p.is_paid && isCurrent && <span className="faint">You are on this plan.</span>}
                  </div>
                );
              })}
            </div>

            {sub?.creem_customer_id && (
              <button className="btn mt" disabled={!!busy}
                onClick={() => act('portal', async () => {
                  const res = await callFn<{ portalUrl: string | null }>('creem-checkout', { op: 'portal', organization_id: orgId });
                  if (res.portalUrl) window.open(res.portalUrl, '_blank', 'noopener');
                  else throw new Error('Creem did not return a portal link');
                })}>
                {busy === 'portal' ? <span className="spinner" /> : 'Manage billing, invoices & payment method'}
              </button>
            )}
          </>
        )}

        <p className="faint mt">{mor}</p>
        {legal && (
          <p className="faint">
            {([
              ['Terms', legal.terms],
              ['Privacy', legal.privacy],
              ['Refunds & cancellation', legal.refunds],
              ['Cookies', legal.cookies],
              ['Creem buyer terms', legal.merchant_of_record],
            ] as const).map(([label, href], i) => (
              <span key={label}>
                {i > 0 && ' · '}
                <a href={href} target="_blank" rel="noopener noreferrer">{label}</a>
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="card mt">
        <div className="spread">
          <h3 style={{ marginBottom: 0 }}>AI model</h3>
          <div className="row">
            <span className={`badge ${model?.tier === 'paid' ? 'green' : 'gray'}`}>{model?.tier || '—'} tier</span>
            <code style={{ fontSize: 12 }}>{model?.active_model || '—'}</code>
          </div>
        </div>
        <p className="muted mt">{model?.note}</p>
        {model && (
          <p className="faint">
            Chosen because: {model.reason}. Seerist re-checks the gateway every time, so when a better model ships it becomes your default automatically.
          </p>
        )}

        {model?.usage && (
          <div className="mt">
            <div className="funnel-row">
              <span className="flabel">This month</span>
              <div className="funnel-track">
                <div className="funnel-fill" style={{
                  width: model.usage.cap
                    ? `${Math.min(100, (model.usage.used / model.usage.cap) * 100)}%`
                    : '4%',
                }} />
              </div>
              <span className="fcount">{model.usage.used}{model.usage.cap ? `/${model.usage.cap}` : ''}</span>
            </div>
            <p className="faint">AI actions used, resets {new Date(model.usage.resets_on).toLocaleDateString()}.</p>
          </div>
        )}

        {model?.can_choose_model ? (
          <>
            <div className="row mt">
              <button className="btn sm" disabled={!!busy}
                onClick={() => act('catalog', async () => {
                  const res = await callFn<{ models: GatewayModelRow[] }>('model-gateway', { op: 'list_models', organization_id: orgId });
                  setCatalog(res.models || []);
                  setShowCatalog(true);
                })}>
                {busy === 'catalog' ? <span className="spinner" /> : 'Choose a different model'}
              </button>
              {model.preferred_model && (
                <button className="btn ghost sm" disabled={!!busy}
                  onClick={() => act('clear', async () => {
                    await callFn('model-gateway', { op: 'clear_model', organization_id: orgId });
                    setNote('Back to automatic — Seerist will always pick the best model available.');
                  })}>
                  Reset to automatic
                </button>
              )}
            </div>
            {showCatalog && (
              <table className="data mt">
                <thead><tr><th>Model</th><th>Input $/M</th><th>Output $/M</th><th></th></tr></thead>
                <tbody>
                  {catalog.slice(0, 60).map((m) => (
                    <tr key={m.id}>
                      <td><code style={{ fontSize: 12 }}>{m.id}</code> {m.free && <span className="badge green">free</span>}</td>
                      <td>{m.input_price}</td>
                      <td>{m.output_price}</td>
                      <td>
                        {m.is_active ? <span className="badge blue">active</span> : (
                          <button className="btn ghost sm" disabled={!!busy}
                            onClick={() => act('set', async () => {
                              await callFn('model-gateway', { op: 'set_model', organization_id: orgId, model: m.id });
                              setShowCatalog(false);
                              setNote(`Default model set to ${m.id}.`);
                            })}>
                            Use this
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ) : (
          <div className="info-box mt">
            Free plans run on the best <strong>zero-cost</strong> model the gateway offers, and it updates itself as better free models appear. Upgrade to any paid plan to use premium models and pin your own choice.
          </div>
        )}
      </div>
    </>
  );
}
