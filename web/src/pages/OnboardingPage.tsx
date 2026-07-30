import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../lib/insforge';
import { useApp } from '../state/AppContext';
import type { WorkspaceType } from '../lib/types';

// Workspace onboarding — required before bidding can be enabled (spec §4).
// Agency: name, description, portfolio, tone/style, ideal-client profile.
// SaaS: all of the above + product name/description/URL, target customer,
// and per-platform policy visibility. Ends with the explicit risk disclosure.

export default function OnboardingPage() {
  const { user, activeOrg, orgs, refresh, setActiveOrg, setActiveWs } = useApp();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const creatingFirstOrg = orgs.length === 0 || params.get('new') === 'org';

  const [step, setStep] = useState(creatingFirstOrg ? 0 : 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orgName, setOrgName] = useState('');
  const [orgId, setOrgId] = useState<string | null>(activeOrg?.id || null);

  const [wsType, setWsType] = useState<WorkspaceType>('agency');
  const [wsName, setWsName] = useState('');
  const [description, setDescription] = useState('');
  const [icp, setIcp] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [tone, setTone] = useState('');
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [targetCustomer, setTargetCustomer] = useState('');
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [wsId, setWsId] = useState<string | null>(null);

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true); setError(null);
    try {
      const { data: org, error: e1 } = await db().from('organizations')
        .insert({ name: orgName, created_by: user.id }).select().single();
      if (e1) throw new Error(e1.message);
      const { error: e2 } = await db().from('organization_memberships')
        .insert({ organization_id: (org as any).id, user_id: user.id, role: 'owner' });
      if (e2) throw new Error(e2.message);
      setOrgId((org as any).id);
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the organization');
    } finally {
      setBusy(false);
    }
  }

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const org = orgId || activeOrg?.id;
    if (!org) { setError('No organization selected'); return; }
    setBusy(true); setError(null);
    try {
      const { data: ws, error: e1 } = await db().from('workspaces').insert({
        organization_id: org,
        type: wsType,
        name: wsName,
        description: description || null,
        ideal_client_profile: icp || null,
        portfolio: portfolio || null,
        tone_style: tone || null,
        product_name: wsType === 'saas' ? productName || null : null,
        product_description: wsType === 'saas' ? productDesc || null : null,
        product_url: wsType === 'saas' ? productUrl || null : null,
        target_customer: wsType === 'saas' ? targetCustomer || null : null,
        created_by: user.id,
      }).select().single();
      if (e1) throw new Error(e1.message);
      const id = (ws as any).id as string;
      setWsId(id);

      await db().from('workspace_memberships').insert({ workspace_id: id, user_id: user.id, role: 'owner' });
      await db().from('platform_connections').insert({ workspace_id: id, platform: 'upwork', status: 'not_connected' });
      // Seed the Hermes-style default delivery-stack decision rule (Module B).
      await db().from('workspace_memories').insert({
        workspace_id: id,
        key: 'default_delivery_stack_rule',
        kind: 'decision_rule',
        content: 'Default client deliverables to InstantDB for client-heavy, real-time work (dashboards, collaborative tools, chat-like features) and InsForge for work needing a fuller server-side stack (auth, storage, edge functions). Always overridable per job; never force a stack the client specified.',
        source: 'onboarding',
      });
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the workspace');
    } finally {
      setBusy(false);
    }
  }

  async function enableBidding() {
    if (!wsId || !riskAccepted) return;
    setBusy(true); setError(null);
    try {
      const { error: e1 } = await db().from('workspaces').update({
        bidding_enabled: true,
        risk_acknowledged_at: new Date().toISOString(),
      }).eq('id', wsId);
      if (e1) throw new Error(e1.message);
      await refresh();
      if (orgId) setActiveOrg(orgId);
      setActiveWs(wsId);
      nav('/queue');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enable bidding');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="onboard-wrap">
      <div className="onboard-card">
        {error && <div className="error-box mb">{error}</div>}

        {step === 0 && (
          <>
            <h1>Create your organization</h1>
            <p className="auth-sub">One identity, many organizations, many workspaces — Seerist's tenancy is built for teams that wear several hats.</p>
            <form onSubmit={createOrg}>
              <div className="field">
                <label>Organization name</label>
                <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} required placeholder="Acme Inc." />
              </div>
              <button className="btn primary" disabled={busy || !orgName.trim()} style={{ width: '100%', justifyContent: 'center' }}>
                {busy ? <span className="spinner" /> : 'Create organization'}
              </button>
            </form>
          </>
        )}

        {step === 1 && (
          <>
            <h1>Set up your first workspace</h1>
            <p className="auth-sub">A workspace is where bidding happens. Agencies bid for revenue; SaaS teams bid for revenue, signups, and brand awareness — three outcomes from one action.</p>
            <form onSubmit={createWorkspace}>
              <div className="field">
                <label>Workspace type</label>
                <div className="grid cols-2">
                  {(['agency', 'saas'] as WorkspaceType[]).map((t) => (
                    <div key={t} className="card" style={{ cursor: 'pointer', borderColor: wsType === t ? 'var(--brand)' : undefined }} onClick={() => setWsType(t)}>
                      <h3>{t === 'agency' ? '🏢 Agency' : '🚀 SaaS company'}</h3>
                      <p className="muted" style={{ fontSize: 12.5 }}>
                        {t === 'agency'
                          ? 'Services business bidding for core revenue. Speed, fit, win-rate.'
                          : 'Product company using freelance platforms as a growth channel. Every bid can win a contract, drive a signup, or build awareness.'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Workspace name</label>
                <input type="text" value={wsName} onChange={(e) => setWsName(e.target.value)} required placeholder={wsType === 'saas' ? 'Acme Product Growth' : 'Acme Studio'} />
              </div>
              <div className="field">
                <label>What does this team do?</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Full-stack product studio specializing in AI-powered dashboards…" />
              </div>
              <div className="field">
                <label>Ideal client profile</label>
                <textarea value={icp} onChange={(e) => setIcp(e.target.value)} placeholder="Funded B2B SaaS companies, $5k+ budgets, payment verified, clear scope, long-term potential…" />
                <span className="help">The Scout scores every captured job against this profile — the sharper it is, the better the scores.</span>
              </div>
              <div className="field">
                <label>Past work / portfolio highlights</label>
                <textarea value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="Rebuilt analytics for X (2x retention), shipped Y's mobile app in 6 weeks…" />
              </div>
              <div className="field">
                <label>Tone & style preferences</label>
                <input type="text" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="Direct, warm, no buzzwords, short sentences" />
              </div>

              {wsType === 'saas' && (
                <>
                  <hr className="divider" />
                  <h3 style={{ marginBottom: 10 }}>Your product (powers product-mention drafting)</h3>
                  <div className="grid cols-2">
                    <div className="field">
                      <label>Product name</label>
                      <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="AcmeBoard" />
                    </div>
                    <div className="field">
                      <label>Product URL</label>
                      <input type="url" value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder="https://acmeboard.com" />
                    </div>
                  </div>
                  <div className="field">
                    <label>Product description</label>
                    <textarea value={productDesc} onChange={(e) => setProductDesc(e.target.value)} placeholder="Real-time BI dashboards that non-technical teams can build themselves…" />
                  </div>
                  <div className="field">
                    <label>Target customer</label>
                    <input type="text" value={targetCustomer} onChange={(e) => setTargetCustomer(e.target.value)} placeholder="Ops leads at 20-200 person companies" />
                  </div>
                  <div className="info-box">
                    Product mentions in proposals follow a <strong>manually curated, versioned per-platform policy</strong> (link allowed / description only / no mention). Platforms without a configured policy default to <strong>no mention</strong>. You can review policies in Settings.
                  </div>
                </>
              )}

              <button className="btn primary mt" disabled={busy || !wsName.trim()} style={{ width: '100%', justifyContent: 'center' }}>
                {busy ? <span className="spinner" /> : 'Create workspace'}
              </button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h1>Before you enable bidding</h1>
            <p className="auth-sub">Transparent risk disclosure — required reading (spec §6).</p>
            <div className="warn-box" style={{ textAlign: 'left' }}>
              <strong>How Seerist keeps your accounts safe — and what could still get an account banned:</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: 'var(--text-dim)' }}>
                <li><strong>Seerist never submits anything for you.</strong> Every platform-facing action — capturing a job, submitting a proposal — happens on your screen with your click. There is no scripted or automated submission, ever.</li>
                <li><strong>Zero automated reads.</strong> At launch, job discovery is 100% extension-capture while you browse normally. No server-to-server traffic touches Upwork.</li>
                <li><strong>What can still get you banned:</strong> pasting AI-drafted proposals that violate a platform's spam or disclosure rules, including off-platform contact details, misrepresenting your identity or skills, or breaching a platform's ToS in ways unrelated to Seerist.</li>
                <li><strong>You stay in control:</strong> a per-platform kill switch (Settings → Platforms) instantly halts all capture and drafting for that platform if its policy changes.</li>
              </ul>
            </div>
            <label className="row mt" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={riskAccepted} onChange={(e) => setRiskAccepted(e.target.checked)} style={{ width: 'auto' }} />
              <span>I've read the disclosure and understand that all submissions are mine, made by my own click.</span>
            </label>
            <button className="btn primary mt" disabled={busy || !riskAccepted} style={{ width: '100%', justifyContent: 'center' }} onClick={() => void enableBidding()}>
              {busy ? <span className="spinner" /> : 'Enable bidding & open my Pitch Queue'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
