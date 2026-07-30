import { useCallback, useEffect, useMemo, useState } from 'react';
import { callFn, db } from '../lib/insforge';
import { useApp } from '../state/AppContext';
import type { Proposal, ProposalStatus } from '../lib/types';

const COLUMNS: Array<{ key: ProposalStatus; label: string }> = [
  { key: 'new', label: 'New' },
  { key: 'scored', label: 'Scored' },
  { key: 'drafted', label: 'Drafted' },
  { key: 'needs_edits', label: 'Needs edits' },
  { key: 'approved', label: 'Approved' },
  { key: 'submitted', label: 'Submitted' },
];

const OUTCOME_BADGE: Record<string, string> = {
  pending: 'gray', viewed: 'blue', replied: 'violet', won: 'green', lost: 'red',
};

function ScorePill({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;
  const cls = score >= 70 ? 'score-high' : score >= 45 ? 'score-mid' : 'score-low';
  return <span className={`score-pill ${cls}`}>{score}</span>;
}

export default function PitchQueuePage() {
  const { activeWs } = useApp();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Proposal | null>(null);
  const [showCapture, setShowCapture] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeWs) return;
    setLoading(true);
    try {
      const { data, error } = await db()
        .from('proposals')
        .select('*, job_postings(*)')
        .eq('workspace_id', activeWs.id)
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw new Error(error.message);
      setProposals((data as Proposal[]) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [activeWs?.id]);

  useEffect(() => { void load(); }, [load]);

  const byStatus = useMemo(() => {
    const map: Record<string, Proposal[]> = {};
    for (const c of COLUMNS) map[c.key] = [];
    for (const p of proposals) (map[p.status] ||= []).push(p);
    return map;
  }, [proposals]);

  if (!activeWs) {
    return <div className="info-box">Create a workspace first (Settings → Workspaces).</div>;
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Pitch Queue</h1>
          <p className="sub">
            Capture jobs while you browse → The Scout scores fit → The Drafter writes the proposal → you review, approve, and submit with your own click.
            {!activeWs.bidding_enabled && ' Bidding is disabled until onboarding is complete.'}
          </p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => void load()}>↻ Refresh</button>
          <button className="btn primary" onClick={() => setShowCapture(true)}>+ Capture a job</button>
        </div>
      </div>

      {error && <div className="error-box mb">{error}</div>}
      {!activeWs.bidding_enabled && (
        <div className="warn-box mb">
          Bidding isn't enabled for this workspace yet. Finish onboarding (risk disclosure) in <a href="/onboarding">Onboarding</a> or Settings.
        </div>
      )}

      {loading ? (
        <div className="row"><span className="spinner" /> <span className="muted">Loading the queue…</span></div>
      ) : (
        <div className="kanban">
          {COLUMNS.map((col) => (
            <div className="kanban-col" key={col.key}>
              <h4>{col.label} <span>{byStatus[col.key]?.length || 0}</span></h4>
              {(byStatus[col.key] || []).map((p) => (
                <div className="kanban-card" key={p.id} onClick={() => setSelected(p)}>
                  <div className="title">{p.job_postings?.title || 'Untitled job'}</div>
                  <div className="meta">
                    <ScorePill score={p.fit_score} />
                    {p.product_mentioned && <span className="badge violet">product ✦</span>}
                    {p.status === 'submitted' && <span className={`badge ${OUTCOME_BADGE[p.outcome]}`}>{p.outcome}</span>}
                    <span className="faint">{p.job_postings?.budget || ''}</span>
                  </div>
                </div>
              ))}
              {!(byStatus[col.key] || []).length && <div className="faint" style={{ padding: '4px 6px' }}>—</div>}
            </div>
          ))}
        </div>
      )}

      {showCapture && <CaptureModal onClose={() => setShowCapture(false)} onDone={() => { setShowCapture(false); void load(); }} />}
      {selected && (
        <ProposalDrawer
          proposal={selected}
          onClose={() => setSelected(null)}
          onChanged={(p) => { setSelected(p); void load(); }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

function CaptureModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { activeWs } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function capture(e: React.FormEvent) {
    e.preventDefault();
    if (!activeWs) return;
    setBusy(true); setError(null);
    try {
      await callFn('capture-job', {
        workspace_id: activeWs.id,
        title, description, budget: budget || null, url: url || null,
        source: 'manual',
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Capture failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay modal-center" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Capture a job</h2>
        <p className="muted mb">Paste a job you found while browsing — or use the Chrome extension to capture it in one click from the job page itself.</p>
        {error && <div className="error-box mb">{error}</div>}
        <form onSubmit={capture}>
          <div className="field">
            <label>Job title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Build a real-time analytics dashboard" />
          </div>
          <div className="field">
            <label>Job description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} placeholder="Paste the full posting text — the more context, the better the scoring and drafting." />
          </div>
          <div className="grid cols-2">
            <div className="field">
              <label>Budget</label>
              <input type="text" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="$5,000 fixed / $60-80 hr" />
            </div>
            <div className="field">
              <label>Job URL</label>
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.upwork.com/jobs/…" />
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" disabled={busy || !title.trim()}>
              {busy ? <span className="spinner" /> : 'Capture'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ProposalDrawer({ proposal, onClose, onChanged }: {
  proposal: Proposal;
  onClose: () => void;
  onChanged: (p: Proposal) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(proposal.draft_content || '');
  const [copied, setCopied] = useState(false);
  const job = proposal.job_postings;

  useEffect(() => { setDraft(proposal.draft_content || ''); }, [proposal.id, proposal.draft_content]);

  async function run(label: string, fn: () => Promise<any>) {
    setBusy(label); setError(null);
    try {
      const res = await fn();
      const updated = res?.proposal ? { ...proposal, ...res.proposal, job_postings: job } : proposal;
      onChanged(updated as Proposal);
    } catch (err) {
      setError(err instanceof Error ? err.message : `${label} failed`);
    } finally {
      setBusy(null);
    }
  }

  const move = (to: ProposalStatus, extra: Record<string, unknown> = {}) =>
    run(`move-${to}`, () => callFn('update-proposal-status', { proposal_id: proposal.id, to_status: to, ...extra }));

  async function copyDraft() {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="spread">
          <div>
            <h2>{job?.title || 'Proposal'}</h2>
            <div className="row mt" style={{ gap: 8 }}>
              <span className="badge blue">{proposal.status.replace('_', ' ')}</span>
              {proposal.status === 'submitted' && <span className={`badge ${OUTCOME_BADGE[proposal.outcome]}`}>{proposal.outcome}</span>}
              {proposal.product_mentioned && <span className="badge violet">product mentioned · {proposal.mention_policy_applied}</span>}
              <span className="faint">{job?.platform} · {job?.source?.replace('_', ' ')} · {job?.budget || 'no budget stated'}</span>
            </div>
          </div>
          <button className="btn ghost" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-box mt">{error}</div>}

        {job?.url && <p className="mt"><a href={job.url} target="_blank" rel="noreferrer">Open the original posting ↗</a></p>}

        {job?.description && (
          <div className="card mt">
            <h3>Job description</h3>
            <p className="muted" style={{ whiteSpace: 'pre-wrap', maxHeight: 180, overflow: 'auto' }}>{job.description}</p>
          </div>
        )}

        <div className="card mt">
          <div className="spread">
            <h3>Fit score — The Scout</h3>
            <button className="btn sm" disabled={!!busy} onClick={() => run('score', () => callFn('score-job', { proposal_id: proposal.id }))}>
              {busy === 'score' ? <span className="spinner" /> : proposal.fit_score !== null ? '↻ Re-score' : '⚡ Score this job'}
            </button>
          </div>
          {proposal.fit_score !== null ? (
            <div className="row mt">
              <ScorePill score={proposal.fit_score} />
              <p className="muted" style={{ flex: 1, minWidth: 240 }}>{proposal.fit_reasoning}</p>
            </div>
          ) : (
            <p className="faint">Not scored yet. The Scout scores against your ideal-client profile and always explains why — never just a number.</p>
          )}
        </div>

        <div className="card mt">
          <div className="spread">
            <h3>Proposal draft — The Drafter</h3>
            <div className="row">
              {draft && <button className="btn sm" onClick={() => void copyDraft()}>{copied ? '✓ Copied' : '⧉ Copy'}</button>}
              <button className="btn sm" disabled={!!busy || proposal.status === 'new'} onClick={() => run('draft', () => callFn('draft-proposal', { proposal_id: proposal.id }))}>
                {busy === 'draft' ? <span className="spinner" /> : proposal.draft_content ? '↻ Redraft' : '✍ Draft proposal'}
              </button>
            </div>
          </div>
          {proposal.status === 'new' && <p className="faint">Score the job first — drafts are grounded in the fit analysis.</p>}
          {(proposal.draft_content || draft) && (
            <>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={12} className="mt" />
              {draft !== (proposal.draft_content || '') && (
                <div className="row mt" style={{ justifyContent: 'flex-end' }}>
                  <span className="faint">Unsaved edits</span>
                  <button className="btn sm" disabled={!!busy} onClick={() => run('save-edit', async () => {
                    const { data, error } = await db().from('proposals').update({ draft_content: draft }).eq('id', proposal.id).select().single();
                    if (error) throw new Error(error.message);
                    return { proposal: data };
                  })}>Save edits</button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="card mt">
          <h3>Review queue actions</h3>
          <div className="row mt">
            {proposal.status === 'drafted' && (
              <>
                <button className="btn success" disabled={!!busy} onClick={() => void move('approved')}>✓ Approve</button>
                <button className="btn" disabled={!!busy} onClick={() => void move('needs_edits')}>Needs edits</button>
              </>
            )}
            {proposal.status === 'needs_edits' && (
              <>
                <button className="btn success" disabled={!!busy} onClick={() => void move('approved', { draft_content: draft })}>✓ Approve with edits</button>
                <button className="btn" disabled={!!busy} onClick={() => run('draft', () => callFn('draft-proposal', { proposal_id: proposal.id }))}>↻ Redraft</button>
              </>
            )}
            {proposal.status === 'approved' && (
              <>
                <button className="btn" disabled={!!busy} onClick={() => void move('needs_edits')}>Back to edits</button>
                <button className="btn primary" disabled={!!busy} onClick={() => void move('submitted')}>I submitted it on the platform →</button>
              </>
            )}
            {proposal.status === 'submitted' && (
              <>
                {(['viewed', 'replied', 'won', 'lost'] as const).map((o) => (
                  <button key={o} className={`btn ${o === 'won' ? 'success' : o === 'lost' ? 'danger' : ''}`} disabled={!!busy || proposal.outcome === o}
                    onClick={() => run(`outcome-${o}`, () => callFn('record-outcome', { proposal_id: proposal.id, outcome: o }))}>
                    {o === 'viewed' ? '👁 Viewed' : o === 'replied' ? '💬 Replied' : o === 'won' ? '🏆 Won' : '✕ Lost'}
                  </button>
                ))}
              </>
            )}
          </div>
          {proposal.status === 'approved' && (
            <p className="faint mt">
              Use the Chrome extension's <strong>Autofill</strong> on the platform's proposal editor, then click the platform's own Submit button. Seerist never submits for you.
            </p>
          )}
          {proposal.outcome === 'won' && (
            <div className="success-box mt spread">
              <span>Contract won — hand off to the Delivery Engine (Module B).</span>
              <button className="btn success sm" disabled={!!busy} onClick={() => run('delivery', () => callFn('trigger-delivery-run', { proposal_id: proposal.id }))}>
                {busy === 'delivery' ? <span className="spinner" /> : '🚚 Trigger delivery run'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
