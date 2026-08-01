import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { callFn, db } from '../lib/insforge';
import { useApp } from '../state/AppContext';
import BillingPanel from '../components/BillingPanel';
import type { PlatformConnection, WorkspaceMemory } from '../lib/types';

interface PolicyRow { id: string; platform: string; mention_policy: string; version: number; notes: string | null }
interface MemberRow { id: string; user_id: string; role: string; profiles?: { email: string; name: string | null } }

export default function SettingsPage() {
  const { activeOrg, activeWs, user, refresh } = useApp();
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [memories, setMemories] = useState<WorkspaceMemory[]>([]);
  const [composio, setComposio] = useState<{ authConfigs: any[]; connectedAccounts: any[] } | null>(null);
  const [composioErr, setComposioErr] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');

  const [wsForm, setWsForm] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!activeOrg) return;
    const pol = await db().from('policy_configs').select('*').order('platform');
    setPolicies((pol.data as PolicyRow[]) || []);
    const mem = await db().from('organization_memberships').select('*, profiles:user_id(*)').eq('organization_id', activeOrg.id);
    // PostgREST embedding by column name may not resolve; fall back to raw memberships.
    setMembers(((mem.data as any[]) || []).map((m) => ({ ...m })));
    if (activeWs) {
      const conns = await db().from('platform_connections').select('*').eq('workspace_id', activeWs.id);
      setConnections((conns.data as PlatformConnection[]) || []);
      const mems = await db().from('workspace_memories').select('*').eq('workspace_id', activeWs.id).order('updated_at', { ascending: false }).limit(30);
      setMemories((mems.data as WorkspaceMemory[]) || []);
      setWsForm({
        name: activeWs.name || '', description: activeWs.description || '',
        ideal_client_profile: activeWs.ideal_client_profile || '', portfolio: activeWs.portfolio || '',
        tone_style: activeWs.tone_style || '', product_name: activeWs.product_name || '',
        product_description: activeWs.product_description || '', product_url: activeWs.product_url || '',
        target_customer: activeWs.target_customer || '',
      });
    }
    try {
      setComposio(await callFn('composio-integrations', { action: 'status' }));
      setComposioErr(null);
    } catch (e) {
      setComposioErr(e instanceof Error ? e.message : 'Composio unavailable');
    }
  }, [activeOrg?.id, activeWs?.id]);

  useEffect(() => { void load(); }, [load]);

  async function act(label: string, fn: () => Promise<any>) {
    setBusy(label); setError(null);
    try { await fn(); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : `${label} failed`); }
    finally { setBusy(null); }
  }

  if (!activeOrg) return <div className="info-box">Select an organization first.</div>;

  return (
    <>
      <div className="page-head">
        <div><h1>Settings</h1><p className="sub">Organization, billing (Creem), members, workspace profile, platform kill switches, policies, and integrations.</p></div>
        <button className="btn" onClick={() => nav('/onboarding')}>+ New workspace</button>
      </div>

      {error && <div className="error-box mb">{error}</div>}

      <div className="card">
        <h3>Organization — {activeOrg.name}</h3>
        <div className="row mt">
          <span className={`badge ${activeOrg.billing_status === 'active' ? 'green' : activeOrg.billing_status === 'trial' ? 'blue' : 'red'}`}>
            billing: {activeOrg.billing_status}
          </span>
          <span className="badge gray">plan: {activeOrg.plan}</span>
          {activeOrg.creem_customer_id && <span className="badge gray">creem: {activeOrg.creem_customer_id.slice(0, 12)}…</span>}
        </div>
      </div>

      <BillingPanel orgId={activeOrg.id} />

      <div className="card mt">
        <h3>Members</h3>
        <table className="data">
          <thead><tr><th>User</th><th>Role</th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.user_id === user?.id ? `${user.email} (you)` : m.user_id}</td>
                <td><span className="badge gray">{m.role}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="row mt">
          <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@company.com" style={{ flex: 1, minWidth: 240 }} />
          <button className="btn" disabled={!!busy || !inviteEmail.trim()} onClick={() => act('invite', async () => {
            const { data: prof } = await db().from('profiles').select('id').eq('email', inviteEmail.trim()).maybeSingle();
            if (!prof) throw new Error('No Seerist account with that email yet — ask them to sign up first, then invite them.');
            const { error } = await db().from('organization_memberships').insert({ organization_id: activeOrg.id, user_id: (prof as any).id, role: 'member' });
            if (error) throw new Error(error.message);
            if (activeWs) await db().from('workspace_memberships').insert({ workspace_id: activeWs.id, user_id: (prof as any).id, role: 'member' });
            setInviteEmail('');
          })}>+ Add member</button>
        </div>
        <p className="faint mt">Same email, many orgs, many workspaces — roles live on the membership, not the user.</p>
      </div>

      {activeWs && (
        <>
          <div className="card mt">
            <h3>Workspace profile — {activeWs.name} <span className="badge gray">{activeWs.type}</span></h3>
            <div className="grid cols-2 mt">
              <div className="field"><label>Name</label><input type="text" value={wsForm.name || ''} onChange={(e) => setWsForm({ ...wsForm, name: e.target.value })} /></div>
              <div className="field"><label>Tone & style</label><input type="text" value={wsForm.tone_style || ''} onChange={(e) => setWsForm({ ...wsForm, tone_style: e.target.value })} /></div>
            </div>
            <div className="field"><label>Description</label><textarea value={wsForm.description || ''} onChange={(e) => setWsForm({ ...wsForm, description: e.target.value })} /></div>
            <div className="field"><label>Ideal client profile</label><textarea value={wsForm.ideal_client_profile || ''} onChange={(e) => setWsForm({ ...wsForm, ideal_client_profile: e.target.value })} /></div>
            <div className="field"><label>Portfolio / past work</label><textarea value={wsForm.portfolio || ''} onChange={(e) => setWsForm({ ...wsForm, portfolio: e.target.value })} /></div>
            {activeWs.type === 'saas' && (
              <div className="grid cols-2">
                <div className="field"><label>Product name</label><input type="text" value={wsForm.product_name || ''} onChange={(e) => setWsForm({ ...wsForm, product_name: e.target.value })} /></div>
                <div className="field"><label>Product URL</label><input type="url" value={wsForm.product_url || ''} onChange={(e) => setWsForm({ ...wsForm, product_url: e.target.value })} /></div>
                <div className="field"><label>Product description</label><textarea value={wsForm.product_description || ''} onChange={(e) => setWsForm({ ...wsForm, product_description: e.target.value })} /></div>
                <div className="field"><label>Target customer</label><input type="text" value={wsForm.target_customer || ''} onChange={(e) => setWsForm({ ...wsForm, target_customer: e.target.value })} /></div>
              </div>
            )}
            <button className="btn primary" disabled={!!busy} onClick={() => act('ws-save', async () => {
              const { error } = await db().from('workspaces').update({
                name: wsForm.name, description: wsForm.description || null,
                ideal_client_profile: wsForm.ideal_client_profile || null,
                portfolio: wsForm.portfolio || null, tone_style: wsForm.tone_style || null,
                product_name: wsForm.product_name || null, product_description: wsForm.product_description || null,
                product_url: wsForm.product_url || null, target_customer: wsForm.target_customer || null,
              }).eq('id', activeWs.id);
              if (error) throw new Error(error.message);
              await refresh();
            })}>{busy === 'ws-save' ? <span className="spinner" /> : 'Save workspace profile'}</button>
          </div>

          <div className="card mt">
            <h3>Platforms & kill switches</h3>
            <p className="muted">Credentials stay unused until a platform's developer API access exists (the Upwork key application is a parallel, non-blocking track). The kill switch instantly halts capture & drafting for a platform.</p>
            <table className="data mt">
              <thead><tr><th>Platform</th><th>API status</th><th>Kill switch</th><th></th></tr></thead>
              <tbody>
                {connections.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{c.platform}</td>
                    <td><span className="badge gray">{c.status.replace('_', ' ')}</span></td>
                    <td><span className={`badge ${c.kill_switch ? 'red' : 'green'}`}>{c.kill_switch ? 'ENGAGED' : 'off'}</span></td>
                    <td>
                      <button className={`btn sm ${c.kill_switch ? 'success' : 'danger'}`} disabled={!!busy} onClick={() => act('kill', async () => {
                        const { error } = await db().from('platform_connections').update({
                          kill_switch: !c.kill_switch,
                          status: !c.kill_switch ? 'killed' : 'not_connected',
                        }).eq('id', c.id);
                        if (error) throw new Error(error.message);
                      })}>
                        {c.kill_switch ? 'Re-enable' : '🛑 Kill'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card mt">
            <h3>Product-mention policies (manually curated, versioned)</h3>
            <p className="muted">Never auto-inferred from scraped ToS text. A platform without a row defaults to <strong>no mention</strong>. Curation happens at the Seerist platform level.</p>
            <table className="data mt">
              <thead><tr><th>Platform</th><th>Policy</th><th>Version</th><th>Notes</th></tr></thead>
              <tbody>
                {policies.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{p.platform}</td>
                    <td><span className={`badge ${p.mention_policy === 'link_allowed' ? 'green' : p.mention_policy === 'description_only' ? 'amber' : 'red'}`}>{p.mention_policy.replace('_', ' ')}</span></td>
                    <td>v{p.version}</td>
                    <td className="muted">{p.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card mt">
            <h3>Workspace memory (Hermes layer)</h3>
            <p className="muted">Client preferences, prior decisions, style guidance, the delivery-stack rule, and skills learned from completed runs.</p>
            {!memories.length ? <p className="faint">No memories yet.</p> : (
              <table className="data mt">
                <thead><tr><th>Kind</th><th>Key</th><th>Content</th></tr></thead>
                <tbody>
                  {memories.map((m) => (
                    <tr key={m.id}>
                      <td><span className={`badge ${m.kind === 'skill' ? 'green' : m.kind === 'decision_rule' ? 'violet' : 'gray'}`}>{m.kind.replace('_', ' ')}</span></td>
                      <td><code>{m.key}</code></td>
                      <td className="muted" style={{ maxWidth: 460 }}>{m.content.slice(0, 220)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      <div className="card mt">
        <h3>Integrations (Composio managed OAuth)</h3>
        <p className="muted">Slack / Telegram / Discord alerts, Gmail, Calendar, CRM, Drive, Notion. Creem and GitHub/GitLab are NOT here by design — Creem is native, GitHub/GitLab go through OpenHands.</p>
        {composioErr && <div className="warn-box mt">{composioErr}</div>}
        {composio && (
          <>
            <div className="row mt">
              {['slack', 'gmail', 'googlecalendar', 'notion', 'googledrive', 'hubspot', 'telegram', 'discord', 'linkedin'].map((tk) => {
                const connected = composio.connectedAccounts.some((a) => (a.toolkit || '').toLowerCase() === tk && (a.status || '').toUpperCase() === 'ACTIVE');
                return (
                  <button key={tk} className={`btn sm ${connected ? 'success' : ''}`} disabled={!!busy} onClick={() => act(`connect-${tk}`, async () => {
                    const res = await callFn<{ redirectUrl: string | null }>('composio-integrations', { action: 'connect', toolkit: tk, callback_url: window.location.href });
                    if (res.redirectUrl) window.open(res.redirectUrl, '_blank');
                  })}>
                    {connected ? `✓ ${tk}` : `Connect ${tk}`}
                  </button>
                );
              })}
            </div>
            <p className="faint mt">
              {composio.connectedAccounts.length} connected account(s), {composio.authConfigs.length} auth config(s). Connecting a service requires its auth config in the Composio dashboard (OAuth app per service — start early, verification takes days to weeks).
            </p>
          </>
        )}
      </div>

      <div className="card mt">
        <h3>OpenHands & Hermes (delivery infrastructure)</h3>
        <p className="muted">
          Delivery-task execution runs in an <strong>OpenHands</strong> sandbox when the <code>OPENHANDS_API_KEY</code> project secret is set (OpenHands Cloud or a self-hosted Agent Server via <code>OPENHANDS_BASE_URL</code>); otherwise tasks execute through the InsForge model gateway with the same mandatory QA gate. The <strong>Hermes-style memory layer</strong> (workspace memories above) is always on and grounds scoring, drafting, and stack decisions.
        </p>
      </div>
    </>
  );
}
