import { useCallback, useEffect, useState } from 'react';
import { callFn, db } from '../lib/insforge';
import { useApp } from '../state/AppContext';
import type { DeliveryRun, DeliveryTask } from '../lib/types';

const RUN_BADGE: Record<string, string> = {
  planning: 'gray', running: 'blue', qa: 'amber', delivered: 'green', failed: 'red', cancelled: 'gray',
};
const TASK_BADGE: Record<string, string> = {
  todo: 'gray', running: 'blue', qa_pending: 'amber', qa_approved: 'green', qa_rejected: 'red', done: 'green', failed: 'red',
};

export default function DeliveryPage() {
  const { activeWs } = useApp();
  const [runs, setRuns] = useState<DeliveryRun[]>([]);
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
      setRuns((data as DeliveryRun[]) || []);
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
        <button className="btn" onClick={() => void load()}>↻ Refresh</button>
      </div>

      {error && <div className="error-box mb">{error}</div>}
      {loading ? (
        <div className="row"><span className="spinner" /> <span className="muted">Loading…</span></div>
      ) : !runs.length ? (
        <div className="info-box">No delivery runs yet. Mark a submitted proposal as <strong>Won</strong> in the Pitch Queue, then trigger its delivery run.</div>
      ) : (
        <div className="card">
          <table className="data">
            <thead><tr><th>Run</th><th>Status</th><th>Stack</th><th>OpenHands</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td><code>{r.id.slice(0, 8)}</code></td>
                  <td><span className={`badge ${RUN_BADGE[r.status]}`}>{r.status}</span></td>
                  <td><span className="badge violet">{r.target_stack}</span></td>
                  <td>{r.openhands_conversation_id ? <span className="badge green">connected</span> : <span className="badge gray">gateway mode</span>}</td>
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
          <button className="btn ghost" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-box mt">{error}</div>}

        {current.stack_reasoning && (
          <div className="card mt">
            <h3>Stack decision (Hermes memory rule)</h3>
            <p className="muted">{current.stack_reasoning}</p>
          </div>
        )}

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
                      ✓ Approve
                    </button>
                    <button className="btn danger sm" disabled={!!busy || !(qaNotes[t.id] || '').trim()}
                      onClick={() => act(`qa-${t.id}`, () => callFn('qa-task', { task_id: t.id, approve: false, note: qaNotes[t.id] }))}>
                      ✕ Reject with feedback
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
                  📦 Deliver via {ch}
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
