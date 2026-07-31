import { useCallback, useEffect, useState } from 'react';
import { callFn, db } from '../lib/insforge';
import { useApp } from '../state/AppContext';
import CEOApprovalQueue from '../components/CEOApprovalQueue';
import { PERSONAS, type PersonaAction } from '../lib/types';

export default function PersonasPage() {
  const { activeOrg, activeWs, user, refresh } = useApp();
  const [log, setLog] = useState<PersonaAction[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('');
  const [ceoResult, setCeoResult] = useState<{ executed: boolean; actionType: string; plan: string; result?: string; message?: string; status?: string; queue_id?: string } | null>(null);
  const [pmInsights, setPmInsights] = useState<string | null>(null);
  const [orgRole, setOrgRole] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [queueRefresh, setQueueRefresh] = useState(0);

  const load = useCallback(async () => {
    if (!activeOrg) return;
    const [orgLog, wsLog] = await Promise.all([
      db().from('persona_action_log').select('*').eq('organization_id', activeOrg.id).order('created_at', { ascending: false }).limit(50),
      activeWs
        ? db().from('persona_action_log').select('*').eq('workspace_id', activeWs.id).order('created_at', { ascending: false }).limit(50)
        : Promise.resolve({ data: [] } as any),
    ]);
    const merged = ([...((orgLog.data as PersonaAction[]) || []), ...((wsLog.data as PersonaAction[]) || [])] as PersonaAction[])
      .filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    setLog(merged.slice(0, 80));
  }, [activeOrg?.id, activeWs?.id]);

  // Only owners and admins may approve what the CEO queues.
  useEffect(() => {
    if (!activeOrg || !user) { setOrgRole(null); return; }
    let cancelled = false;
    void (async () => {
      const { data } = await db().from('organization_memberships').select('role')
        .eq('organization_id', activeOrg.id).eq('user_id', user.id).maybeSingle();
      if (!cancelled) setOrgRole(((data as { role?: string } | null)?.role) ?? null);
    })();
    return () => { cancelled = true; };
  }, [activeOrg?.id, user?.id]);

  useEffect(() => { void load(); }, [load]);

  async function act(label: string, fn: () => Promise<any>) {
    setBusy(label); setError(null);
    try { await fn(); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : `${label} failed`); }
    finally { setBusy(null); }
  }

  if (!activeOrg) return <div className="info-box">Select an organization first.</div>;
  const isOrgAdmin = orgRole === 'owner' || orgRole === 'admin' || activeOrg.created_by === user?.id;
  // Entries created before the approval queue existed still approve in place.
  const legacyPending = log.filter((l) => l.approval_status === 'pending' && !(l.params as Record<string, unknown>)?.queue_id);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>AI Employees</h1>
          <p className="sub">Seven named personas over one shared reasoning layer (Hermes memory + InsForge model gateway + Composio tools). Every persona action is audited below — especially the CEO's.</p>
        </div>
        <button className="btn" onClick={() => void load()}>↻ Refresh</button>
      </div>

      {error && <div className="error-box mb">{error}</div>}

      <div className="grid cols-2">
        {PERSONAS.map((p) => (
          <div className="card persona-card" key={p.name}>
            <div className="persona-emoji">{p.icon}</div>
            <div style={{ flex: 1 }}>
              <div className="spread">
                <div className="row">
                  <h3 style={{ marginBottom: 0 }}>{p.name}</h3>
                  {p.name === 'The CEO' && pendingApprovals > 0 && (
                    <span className="badge amber" title="Actions waiting for your approval">
                      {pendingApprovals} awaiting approval
                    </span>
                  )}
                </div>
                {p.name === 'The PM' && (
                  <button className="btn sm" disabled={!!busy || !activeWs}
                    onClick={() => act('pm', async () => setPmInsights((await callFn<{ insights: string }>('pm-insights', { workspace_id: activeWs!.id })).insights))}>
                    {busy === 'pm' ? <span className="spinner" /> : 'Run roadmap review'}
                  </button>
                )}
              </div>
              <div className="owns">{p.owns}</div>
              <div className="module"><span className="badge gray">{p.module}</span></div>
            </div>
          </div>
        ))}
      </div>

      {pmInsights && (
        <div className="card mt">
          <div className="spread"><h3>🧭 The PM — roadmap suggestions</h3><button className="btn ghost sm" onClick={() => setPmInsights(null)}>✕</button></div>
          <pre className="mt">{pmInsights}</pre>
        </div>
      )}

      <div className="card mt">
        <div className="spread">
          <h3>👁 The CEO — bounded autonomy console</h3>
          <div className="row">
            <button className={`btn sm ${activeOrg.ceo_enabled ? '' : 'primary'}`} disabled={!!busy}
              onClick={() => act('ceo-toggle', async () => {
                const { error } = await db().from('organizations').update({ ceo_enabled: !activeOrg.ceo_enabled }).eq('id', activeOrg.id);
                if (error) throw new Error(error.message);
                await refresh();
              })}>
              {activeOrg.ceo_enabled ? 'Disable CEO persona' : 'Enable CEO persona'}
            </button>
            <button className={`btn sm ${activeOrg.ceo_kill_switch ? 'success' : 'danger'}`} disabled={!!busy || !activeOrg.ceo_enabled}
              onClick={() => act('ceo-kill', async () => {
                const { error } = await db().from('organizations').update({ ceo_kill_switch: !activeOrg.ceo_kill_switch }).eq('id', activeOrg.id);
                if (error) throw new Error(error.message);
                await refresh();
              })}>
              {activeOrg.ceo_kill_switch ? '↺ Release kill switch' : '🛑 KILL SWITCH'}
            </button>
          </div>
        </div>

        <div className="info-box mt">
          <strong>Action boundaries (enforced server-side):</strong> the CEO can autonomously reprioritize backlogs, reallocate tasks between personas, adjust non-monetary settings, and surface cross-workspace insights. It can <strong>never</strong> act on money, legal or contractual commitments, deleting/archiving workspaces or orgs, or externally-sent communications without your explicit approval — those land in the approval queue below.
        </div>

        {activeOrg.ceo_kill_switch && <div className="error-box mt">Kill switch active — all CEO-persona activity is halted.</div>}

        <div className="row mt">
          <input type="text" value={instruction} onChange={(e) => setInstruction(e.target.value)} style={{ flex: 1, minWidth: 280 }}
            placeholder='e.g. "Reprioritize delivery backlogs to favor won contracts with the nearest deadlines"' />
          <button className="btn primary" disabled={!!busy || !instruction.trim() || !activeOrg.ceo_enabled || activeOrg.ceo_kill_switch}
            onClick={() => act('ceo', async () => {
              setCeoResult(await callFn('ceo-command', { organization_id: activeOrg.id, instruction }));
              setInstruction('');
              setQueueRefresh((n) => n + 1);
            })}>
            {busy === 'ceo' ? <span className="spinner" /> : 'Direct the CEO'}
          </button>
        </div>

        {ceoResult && (
          <div className={`card mt`} style={{ background: 'var(--bg-raise)' }}>
            <div className="row">
              <span className={`badge ${ceoResult.executed ? 'green' : 'amber'}`}>{ceoResult.executed ? 'executed autonomously' : 'queued for your approval'}</span>
              <span className="badge gray">{ceoResult.actionType}</span>
            </div>
            <p className="muted mt"><strong>Plan:</strong> {ceoResult.plan}</p>
            {ceoResult.result && <pre className="mt">{ceoResult.result}</pre>}
            {ceoResult.message && <p className="faint mt">{ceoResult.message}</p>}
          </div>
        )}

        {isOrgAdmin ? (
          <CEOApprovalQueue orgId={activeOrg.id} canApprove onPendingCountChange={setPendingApprovals} refreshToken={queueRefresh} />
        ) : (
          <div className="info-box mt">
            Actions the CEO cannot take on its own authority go to the approval queue. Only organization owners and admins can see and decide them.
          </div>
        )}

        {legacyPending.length > 0 && (
          <div className="card mt" style={{ borderColor: 'var(--amber)' }}>
            <h3>⏳ Awaiting your approval (logged before the approval queue)</h3>
            {legacyPending.map((l) => (
              <div key={l.id} className="card mt" style={{ background: 'var(--bg-raise)' }}>
                <div className="row"><span className="badge amber">{l.action}</span><span className="faint">{new Date(l.created_at).toLocaleString()}</span></div>
                <p className="muted mt">{String((l.params as any)?.plan || (l.params as any)?.instruction || '')}</p>
                <div className="row mt">
                  <button className="btn success sm" disabled={!!busy} onClick={() => act('approve', async () => {
                    const { error } = await db().from('persona_action_log')
                      .update({ approval_status: 'approved', approved_at: new Date().toISOString() }).eq('id', l.id);
                    if (error) throw new Error(error.message);
                  })}>Approve (you'll execute it)</button>
                  <button className="btn danger sm" disabled={!!busy} onClick={() => act('reject', async () => {
                    const { error } = await db().from('persona_action_log')
                      .update({ approval_status: 'rejected', approved_at: new Date().toISOString() }).eq('id', l.id);
                    if (error) throw new Error(error.message);
                  })}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card mt">
        <h3>Persona action log — full audit trail</h3>
        {!log.length ? <p className="faint">No persona actions yet. Capture and score a job to see The Scout at work.</p> : (
          <table className="data">
            <thead><tr><th>When</th><th>Persona</th><th>Action</th><th>Result</th><th>Approval</th></tr></thead>
            <tbody>
              {log.map((l) => (
                <tr key={l.id}>
                  <td className="faint" style={{ whiteSpace: 'nowrap' }}>{new Date(l.created_at).toLocaleString()}</td>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{l.persona}</td>
                  <td><code>{l.action}</code></td>
                  <td className="muted" style={{ maxWidth: 420 }}>{(l.result || '').slice(0, 180)}</td>
                  <td>
                    <span className={`badge ${l.approval_status === 'auto_approved' ? 'gray' : l.approval_status === 'pending' ? 'amber' : l.approval_status === 'approved' ? 'green' : 'red'}`}>
                      {l.approval_status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
