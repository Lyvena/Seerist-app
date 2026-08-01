import { useCallback, useEffect, useState } from 'react';
import { callFn, db } from '../lib/insforge';
import { useApp } from '../state/AppContext';
import type { DeliveryRun, DeliveryStackStatus, DeliveryTask, ProvisionedProject } from '../lib/types';
import { Icon } from '../components/Icon';

const RUN_BADGE: Record<string, string> = {
  planning: 'gray', running: 'blue', qa: 'amber', delivered: 'green', failed: 'red', cancelled: 'gray',
};
const TASK_BADGE: Record<string, string> = {
  todo: 'gray', running: 'blue', qa_pending: 'amber', qa_approved: 'green', qa_rejected: 'red', done: 'green', failed: 'red',
};

export default function DeliveryPage() {
  const { activeWs } = useApp();
  const [runs, setRuns] = useState<DeliveryRun[]>([]);
  const [jobTitles, setJobTitles] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<DeliveryRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeWs) return;
    setLoading(true);
    try {
      const { data, error } = await db().from('delivery_runs').select('*')
        .eq('workspace_id', activeWs.id).order('created_at', { ascending: false }).limit(100);
      if (error) throw new Error(error.message);
      const list = (data as DeliveryRun[]) || [];
      setRuns(list);
      // Resolve the contract (job title) behind each run.
      if (list.length) {
        const { data: props } = await db().from('proposals')
          .select('id, job_postings(title)')
          .in('id', list.map((r) => r.proposal_id));
        const titles: Record<string, string> = {};
        for (const p of (props as any[]) || []) {
          titles[p.id] = p.job_postings?.title || 'Untitled contract';
        }
        setJobTitles(titles);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load runs');
    } finally {
      setLoading(false);
    }
  }, [activeWs?.id]);

  useEffect(() => { void load(); }, [load]);

  if (!activeWs) return <div className="info-box">Select a workspace first.</div>;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Delivery Engine</h1>
          <p className="sub">
            Contract won → The Builder decomposes tasks → sandboxed execution (OpenHands when connected, model gateway otherwise) → <strong>mandatory human QA</strong> → client handoff. Default stack: InstantDB for real-time/client-heavy work, InsForge for fuller server-side stacks — never forced on a client-specified stack.
          </p>
        </div>
        <button className="btn" onClick={() => void load()}><Icon name="refresh" /> Refresh</button>
      </div>

      {error && <div className="error-box mb">{error}</div>}
      {loading ? (
        <div className="row"><span className="spinner" /> <span className="muted">Loading…</span></div>
      ) : !runs.length ? (
        <div className="info-box">No delivery runs yet. Mark a submitted proposal as <strong>Won</strong> in the Pitch Queue, then trigger its delivery run.</div>
      ) : (
        <div className="card">
          <table className="data">
            <thead><tr><th>Contract</th><th>Status</th><th>Stack</th><th>Execution</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, maxWidth: 320 }}>{jobTitles[r.proposal_id] || <code>{r.id.slice(0, 8)}</code>}</td>
                  <td><span className={`badge ${RUN_BADGE[r.status]}`}>{r.status}</span></td>
                  <td><span className="badge violet">{r.target_stack}</span></td>
                  <td>{r.openhands_conversation_id ? <span className="badge green">OpenHands</span> : <span className="badge gray">gateway mode</span>}</td>
                  <td className="faint">{new Date(r.created_at).toLocaleString()}</td>
                  <td><button className="btn sm" onClick={() => setSelected(r)}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <RunDrawer run={selected} onClose={() => setSelected(null)} onChanged={() => void load()} />}
    </>
  );
}

/**
 * The client's real backend, provisioned through the InsForge co-branded
 * partnership. The client owns the project and signs in to InsForge with the
 * same email — Seerist hands over infrastructure the client controls, and never
 * stores their API key.
 */
function StackPanel({ run, onChanged }: { run: DeliveryRun; onChanged: () => void }) {
  const [status, setStatus] = useState<DeliveryStackStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ProvisionedProject[]>([]);
  const [creds, setCreds] = useState<{ access_host: string; api_key: string } | null>(null);
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('us-east');

  useEffect(() => {
    void callFn<DeliveryStackStatus>('delivery-stack', { op: 'status' })
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  async function act(label: string, fn: () => Promise<unknown>) {
    setBusy(label); setError(null);
    try { await fn(); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : `${label} failed`); }
    finally { setBusy(null); }
  }

  if (run.target_stack === 'instantdb') {
    return (
      <div className="card mt">
        <h3>Client backend</h3>
        <p className="muted">This run targets InstantDB. Seerist only provisions InsForge backends — set this one up manually, or switch the run to the InsForge stack.</p>
      </div>
    );
  }

  return (
    <div className="card mt">
      <div className="spread">
        <h3 style={{ marginBottom: 0 }}>Client backend (InsForge)</h3>
        {run.stack_access_host
          ? <span className="badge green">provisioned</span>
          : <span className={`badge ${status?.configured ? 'amber' : 'gray'}`}>{status?.configured ? 'not provisioned' : 'partnership not set up'}</span>}
      </div>

      {error && <div className="error-box mt">{error}</div>}

      {run.stack_access_host ? (
        <>
          <p className="muted mt">
            Live at <a href={run.stack_access_host} target="_blank" rel="noopener noreferrer">{run.stack_access_host}</a>
            {run.stack_owner_email && <> · owned by <strong>{run.stack_owner_email}</strong></>}
            {run.stack_region && <> · {run.stack_region}</>}
          </p>
          <p className="faint">
            The client owns this project. They sign in to InsForge with that email and manage it themselves — Seerist stores the host, never the API key.
          </p>
          <div className="row mt">
            <button className="btn sm" disabled={!!busy}
              onClick={() => act('creds', async () => {
                setCreds(await callFn('delivery-stack', { op: 'credentials', delivery_run_id: run.id }));
              })}>
              {busy === 'creds' ? <span className="spinner" /> : 'Reveal credentials for handoff'}
            </button>
            <button className="btn ghost sm" disabled={!!busy}
              onClick={() => act('refresh', () => callFn('delivery-stack', { op: 'refresh', delivery_run_id: run.id }))}>
              Refresh status
            </button>
          </div>
          {creds && (
            <pre className="mt">{`INSFORGE_URL=${creds.access_host}\nINSFORGE_API_KEY=${creds.api_key}`}</pre>
          )}
        </>
      ) : !status?.configured ? (
        <div className="info-box mt">
          {status?.note || 'Checking partnership status…'}
          {status?.docs && <> <a href={status.docs} target="_blank" rel="noopener noreferrer">Partnership docs</a></>}
        </div>
      ) : (
        <>
          <p className="muted mt">
            Provision a real InsForge project for this contract so The Builder writes code against a live backend. Leave the email blank to put it under your own account, or enter the client's so they own and pay for it from day one.
          </p>
          <div className="grid cols-2 mt">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com (optional)" />
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              {(status.regions || []).map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button className="btn primary mt" disabled={!!busy}
            onClick={() => act('provision', async () => {
              setCandidates([]);
              try {
                await callFn('delivery-stack', {
                  op: 'provision', delivery_run_id: run.id,
                  client_email: email || undefined, region,
                });
              } catch (e) {
                // A plan limit is not a failure — offer the existing projects.
                const msg = e instanceof Error ? e.message : '';
                if (/plan/i.test(msg)) setError(`${msg} Pick an existing project below instead.`);
                throw e;
              }
            })}>
            {busy === 'provision' ? <span className="spinner" /> : <><Icon name="bolt" /> Provision InsForge project</>}
          </button>
          {candidates.length > 0 && (
            <div className="mt">
              <p className="muted">The client's plan is at its project limit. Attach one of these instead:</p>
              {candidates.map((c) => (
                <button key={c.id} className="btn sm mt" disabled={!!busy}
                  onClick={() => act('attach', () => callFn('delivery-stack', { op: 'attach', delivery_run_id: run.id, project_id: c.id }))}>
                  Attach {c.access_host}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RunDrawer({ run, onClose, onChanged }: { run: DeliveryRun; onClose: () => void; onChanged: () => void }) {
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [current, setCurrent] = useState<DeliveryRun>(run);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [qaNotes, setQaNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data } = await db().from('delivery_tasks').select('*')
      .eq('delivery_run_id', run.id).order('position', { ascending: true });
    setTasks((data as DeliveryTask[]) || []);
    const { data: r } = await db().from('delivery_runs').select('*').eq('id', run.id).single();
    if (r) setCurrent(r as DeliveryRun);
  }, [run.id]);

  useEffect(() => { void load(); }, [load]);

  async function act(label: string, fn: () => Promise<any>) {
    setBusy(label); setError(null);
    try {
      await fn();
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : `${label} failed`);
    } finally {
      setBusy(null);
    }
  }

  const allApproved = tasks.length > 0 && tasks.every((t) => t.status === 'qa_approved');

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="spread">
          <div>
            <h2>Delivery run <code>{current.id.slice(0, 8)}</code></h2>
            <div className="row mt">
              <span className={`badge ${RUN_BADGE[current.status]}`}>{current.status}</span>
              <span className="badge violet">{current.target_stack}</span>
              {current.packaging_channel && <span className="badge blue">→ {current.packaging_channel}</span>}
            </div>
          </div>
          <button className="btn ghost" onClick={onClose}><Icon name="close" /></button>
        </div>

        {error && <div className="error-box mt">{error}</div>}

        {current.stack_reasoning && (
          <div className="card mt">
            <h3>Stack decision (Hermes memory rule)</h3>
            <p className="muted">{current.stack_reasoning}</p>
          </div>
        )}

        <StackPanel run={current} onChanged={() => { void load(); onChanged(); }} />

        <div className="card mt">
          <h3>Tasks — every one passes human QA before delivery</h3>
          {tasks.map((t) => (
            <div key={t.id} className="card mt" style={{ background: 'var(--bg-raise)' }}>
              <div className="spread">
                <div className="row">
                  <span className="faint">#{t.position + 1}</span>
                  <span className={`badge ${TASK_BADGE[t.status]}`}>{t.status.replace('_', ' ')}</span>
                </div>
                <div className="row">
                  {['todo', 'qa_rejected', 'failed'].includes(t.status) && (
                    <button className="btn sm" disabled={!!busy} onClick={() => act(`exec-${t.id}`, () => callFn('execute-delivery-task', { task_id: t.id }))}>
                      {busy === `exec-${t.id}` ? <span className="spinner" /> : '▶ Execute'}
                    </button>
                  )}
                  {t.agent_output && (
                    <button className="btn ghost sm" onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                      {expanded === t.id ? 'Hide output' : 'View output'}
                    </button>
                  )}
                </div>
              </div>
              <p style={{ marginTop: 8 }}>{t.description}</p>
              {t.qa_note && t.status === 'qa_rejected' && <div className="warn-box mt">QA feedback: {t.qa_note}</div>}
              {expanded === t.id && t.agent_output && <pre className="mt">{t.agent_output}</pre>}
              {t.status === 'qa_pending' && (
                <div className="mt">
                  <input type="text" placeholder="QA note (required to reject, optional to approve)"
                    value={qaNotes[t.id] || ''} onChange={(e) => setQaNotes({ ...qaNotes, [t.id]: e.target.value })} />
                  <div className="row mt">
                    <button className="btn success sm" disabled={!!busy}
                      onClick={() => act(`qa-${t.id}`, () => callFn('qa-task', { task_id: t.id, approve: true, note: qaNotes[t.id] || null }))}>
                      <Icon name="check" /> Approve
                    </button>
                    <button className="btn danger sm" disabled={!!busy || !(qaNotes[t.id] || '').trim()}
                      onClick={() => act(`qa-${t.id}`, () => callFn('qa-task', { task_id: t.id, approve: false, note: qaNotes[t.id] }))}>
                      <Icon name="close" /> Reject with feedback
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {current.status !== 'delivered' && (
          <div className={`card mt ${allApproved ? '' : ''}`}>
            <h3>Client handoff</h3>
            <p className="muted">{allApproved ? 'All tasks passed QA — package and deliver.' : 'Delivery unlocks once every task is QA-approved (enforced server-side).'}</p>
            <div className="row mt">
              {(['download', 'drive', 'github', 'gitlab'] as const).map((ch) => (
                <button key={ch} className="btn sm" disabled={!allApproved || !!busy}
                  onClick={() => act('complete', () => callFn('complete-delivery-run', { run_id: current.id, packaging_channel: ch }))}>
                  <Icon name="delivery" /> Deliver via {ch}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="card mt">
          <h3>Audit trace (OpenHands / execution log)</h3>
          <pre>{JSON.stringify(current.openhands_trace, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
