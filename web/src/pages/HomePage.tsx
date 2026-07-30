import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/insforge';
import { useApp } from '../state/AppContext';
import type { PersonaAction, Proposal } from '../lib/types';

// Home — the first screen after sign-in: where the workspace stands, what to
// do next, and what the AI employees have been doing.

export default function HomePage() {
  const { profile, activeOrg, activeWs } = useApp();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [actions, setActions] = useState<PersonaAction[]>([]);
  const [runsCount, setRunsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeWs) { setLoading(false); return; }
    setLoading(true);
    try {
      const [p, a, r] = await Promise.all([
        db().from('proposals').select('*').eq('workspace_id', activeWs.id).order('created_at', { ascending: false }).limit(300),
        db().from('persona_action_log').select('*').eq('workspace_id', activeWs.id).order('created_at', { ascending: false }).limit(6),
        db().from('delivery_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', activeWs.id),
      ]);
      setProposals((p.data as Proposal[]) || []);
      setActions((a.data as PersonaAction[]) || []);
      setRunsCount((r as any).count || 0);
    } finally {
      setLoading(false);
    }
  }, [activeWs?.id]);

  useEffect(() => { void load(); }, [load]);

  const firstName = (profile?.name || '').split(' ')[0] || 'there';
  const captured = proposals.length;
  const inReview = proposals.filter((p) => ['drafted', 'needs_edits', 'approved'].includes(p.status)).length;
  const sent = proposals.filter((p) => p.status === 'submitted').length;
  const won = proposals.filter((p) => p.outcome === 'won').length;

  const checklist = [
    { label: 'Create your workspace', done: Boolean(activeWs), to: '/onboarding' },
    { label: 'Acknowledge the risk disclosure & enable bidding', done: Boolean(activeWs?.bidding_enabled), to: '/onboarding' },
    { label: 'Sharpen your ideal-client profile (better fit scores)', done: Boolean(activeWs?.ideal_client_profile), to: '/settings' },
    { label: 'Install the Chrome extension', done: captured > 0, to: '/extension' },
    { label: 'Capture and score your first job', done: captured > 0, to: '/queue' },
    { label: 'Submit your first proposal (your click, on the platform)', done: sent > 0, to: '/queue' },
    ...(activeWs?.type === 'saas' ? [{ label: 'Ingest your product site to ground product mentions', done: false, to: '/growth' }] : []),
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <>
      <div className="hero-banner">
        <div className="spread">
          <div>
            <h1>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {firstName} 👋</h1>
            <p>
              {activeWs
                ? <>You're in <strong>{activeWs.name}</strong> ({activeWs.type === 'saas' ? 'SaaS — every bid can win a contract, a signup, or brand awareness' : 'agency — speed, fit, and win-rate'}). {inReview > 0 ? `${inReview} proposal${inReview === 1 ? '' : 's'} waiting for your review.` : 'The queue is clear — go capture something good.'}</>
                : 'Create your first workspace to start bidding.'}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="row"><span className="spinner" /> <span className="muted">Loading your overview…</span></div>
      ) : (
        <>
          <div className="grid cols-4">
            <div className="card stat"><div className="label">Captured</div><div className="value">{captured}</div><div className="hint">jobs in the pipeline</div></div>
            <div className="card stat"><div className="label">In review</div><div className="value">{inReview}</div><div className="hint">drafted · edits · approved</div></div>
            <div className="card stat"><div className="label">Submitted</div><div className="value">{sent}</div><div className="hint">by you, on the platform</div></div>
            <div className="card stat"><div className="label">Won</div><div className="value">{won}</div><div className="hint">{runsCount} delivery run{runsCount === 1 ? '' : 's'}</div></div>
          </div>

          <div className="grid cols-2 mt">
            <div className="card">
              <div className="spread mb">
                <h3>Getting started</h3>
                <span className="badge blue">{doneCount}/{checklist.length} done</span>
              </div>
              {checklist.map((c) => (
                <Link to={c.to} key={c.label} className="checklist-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className={`check-dot ${c.done ? 'done' : 'todo'}`}>{c.done ? '✓' : '○'}</div>
                  <span style={{ fontSize: 13.5, color: c.done ? 'var(--text-faint)' : 'var(--text)', textDecoration: c.done ? 'line-through' : 'none' }}>{c.label}</span>
                </Link>
              ))}
            </div>

            <div className="stack">
              <div className="card">
                <h3>Quick actions</h3>
                <div className="stack mt" style={{ gap: 8 }}>
                  <Link to="/queue" className="quick-action"><span className="qa-icon">📋</span><div><b>Open the Pitch Queue</b><span>Capture, score, draft, and walk the Kanban</span></div></Link>
                  <Link to="/personas" className="quick-action"><span className="qa-icon">🤖</span><div><b>Meet your AI employees</b><span>Run The PM's roadmap review or direct The CEO</span></div></Link>
                  <Link to="/analytics" className="quick-action"><span className="qa-icon">📈</span><div><b>Check your funnel</b><span>Sent → viewed → replied → won{activeWs?.type === 'saas' ? ' + product mentions' : ''}</span></div></Link>
                </div>
              </div>
              {activeOrg && (
                <div className="card">
                  <div className="spread">
                    <h3>{activeOrg.name}</h3>
                    <span className={`badge ${activeOrg.plan === 'lifetime_founder' ? 'violet' : activeOrg.billing_status === 'active' ? 'green' : 'blue'}`}>
                      {activeOrg.plan === 'lifetime_founder' ? '♾ lifetime founder' : `${activeOrg.plan} · ${activeOrg.billing_status}`}
                    </span>
                  </div>
                  <p className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
                    CEO persona: {activeOrg.ceo_enabled ? (activeOrg.ceo_kill_switch ? 'halted (kill switch)' : 'enabled — bounded autonomy') : 'off'} · <Link to="/settings">Manage in Settings</Link>
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="card mt">
            <div className="spread mb"><h3>Recent AI activity</h3><Link to="/personas" style={{ fontSize: 12.5 }}>Full audit log →</Link></div>
            {!actions.length ? (
              <p className="faint">Nothing yet — capture a job and The Scout will show up here.</p>
            ) : (
              <table className="data">
                <tbody>
                  {actions.map((a) => (
                    <tr key={a.id}>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 600, width: 120 }}>{a.persona}</td>
                      <td className="muted">{(a.result || a.action).slice(0, 130)}</td>
                      <td className="faint" style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </>
  );
}
