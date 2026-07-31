import { useCallback, useEffect, useState } from 'react';
import { callFn, db, INSFORGE_URL } from '../lib/insforge';
import { useApp } from '../state/AppContext';
import type {
  DeploySyncDraft,
  GrowthRecommendation,
  Ploybook,
  PloybookRun,
  PloybookTemplate,
  SiteIngestionJob,
} from '../lib/types';

type Tab = 'overview' | 'recommendations' | 'ploybooks';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'recommendations', label: 'Recommendations' },
  { id: 'ploybooks', label: 'Ploybooks' },
];

export default function GrowthPage() {
  const { activeWs } = useApp();

  if (!activeWs) return <div className="info-box">Select a workspace first.</div>;
  if (activeWs.type !== 'saas') {
    return (
      <>
        <div className="page-head"><div><h1>Growth Engine</h1></div></div>
        <div className="info-box">
          The Growth Engine (Module C) is for <strong>SaaS workspaces</strong> — it grounds product-mention drafting, attributes signups back to bids, and drafts post-deploy docs/site updates. This is an agency workspace; switch to (or create) a SaaS workspace to use it.
        </div>
      </>
    );
  }
  return <GrowthInner wsId={activeWs.id} />;
}

function GrowthInner({ wsId }: { wsId: string }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [jobs, setJobs] = useState<SiteIngestionJob[]>([]);
  const [ploybooks, setPloybooks] = useState<Ploybook[]>([]);
  const [drafts, setDrafts] = useState<DeploySyncDraft[]>([]);
  const [recommendations, setRecommendations] = useState<GrowthRecommendation[]>([]);
  const [runs, setRuns] = useState<PloybookRun[]>([]);
  const [templates, setTemplates] = useState<PloybookTemplate[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [url, setUrl] = useState('');
  const [pbName, setPbName] = useState('');
  const [pbDesc, setPbDesc] = useState('');
  const [deployRef, setDeployRef] = useState('');
  const [changes, setChanges] = useState('');
  const [openDraft, setOpenDraft] = useState<DeploySyncDraft | null>(null);
  const [openRun, setOpenRun] = useState<PloybookRun | null>(null);

  const load = useCallback(async () => {
    const [j, p, d, r, pr] = await Promise.all([
      db().from('site_ingestion_jobs').select('*').eq('workspace_id', wsId).order('created_at', { ascending: false }).limit(20),
      db().from('ploybooks').select('*').eq('workspace_id', wsId).order('created_at', { ascending: false }).limit(50),
      db().from('deploy_sync_drafts').select('*').eq('workspace_id', wsId).order('created_at', { ascending: false }).limit(20),
      db().from('growth_recommendations').select('*').eq('workspace_id', wsId).order('priority', { ascending: true }).limit(50),
      db().from('ploybook_runs').select('*').eq('workspace_id', wsId).order('started_at', { ascending: false }).limit(30),
    ]);
    setJobs((j.data as SiteIngestionJob[]) || []);
    setPloybooks((p.data as Ploybook[]) || []);
    setDrafts((d.data as DeploySyncDraft[]) || []);
    setRecommendations((r.data as GrowthRecommendation[]) || []);
    setRuns((pr.data as PloybookRun[]) || []);
  }, [wsId]);

  useEffect(() => { void load(); }, [load]);

  // Templates ship with the engine, so they only need fetching once.
  useEffect(() => {
    if (tab !== 'ploybooks' || templates.length) return;
    void (async () => {
      try {
        const data = await callFn<{ templates: PloybookTemplate[] }>('ploybooks-execute', { op: 'get_templates' });
        setTemplates(data.templates || []);
      } catch { /* templates are a convenience; the tab works without them */ }
    })();
  }, [tab, templates.length]);

  async function act(label: string, fn: () => Promise<any>) {
    setBusy(label); setError(null);
    try { await fn(); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : `${label} failed`); }
    finally { setBusy(null); }
  }

  const trackSnippet = `fetch('${INSFORGE_URL}/functions/track-signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workspace_id: '${wsId}',
    email: newUserEmail,                       // optional
    ref: new URLSearchParams(location.search).get('seerist_ref'), // ?seerist_ref=<proposal_id>
  }),
});`;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Growth Engine</h1>
          <p className="sub">The Grower feeds the Brain your bidder draws from: site ingestion grounds product mentions, every mentioning bid becomes a tracked touchpoint, signups attribute back to specific bids, and deploys draft docs/site updates — always as drafts, never auto-published.</p>
        </div>
        <button className="btn" onClick={() => void load()}>↻ Refresh</button>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'recommendations' && recommendations.length > 0 && (
              <span className="badge blue" style={{ marginLeft: 8 }}>{recommendations.length}</span>
            )}
            {t.id === 'ploybooks' && ploybooks.length > 0 && (
              <span className="badge blue" style={{ marginLeft: 8 }}>{ploybooks.length}</span>
            )}
          </button>
        ))}
      </div>

      {error && <div className="error-box mb">{error}</div>}

      {tab === 'overview' && (
        <>
          <div className="card">
            <h3>Site & product ingestion</h3>
            <p className="muted">Pull in your site or docs once — the positioning lands in workspace memory and grounds The Drafter's product mentions.</p>
            <div className="row mt">
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourproduct.com" style={{ flex: 1, minWidth: 260 }} />
              <button className="btn primary" disabled={!!busy || !url.trim()} onClick={() => act('ingest', () => callFn('site-ingest', { workspace_id: wsId, url }))}>
                {busy === 'ingest' ? <span className="spinner" /> : '⇣ Ingest'}
              </button>
            </div>
            {jobs.length > 0 && (
              <table className="data mt">
                <thead><tr><th>URL</th><th>Status</th><th>Positioning</th><th>Synced</th></tr></thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id}>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}><a href={j.url} target="_blank" rel="noreferrer">{j.url}</a></td>
                      <td><span className={`badge ${j.status === 'complete' ? 'green' : j.status === 'failed' ? 'red' : 'amber'}`}>{j.status}</span></td>
                      <td className="muted" style={{ maxWidth: 380 }}>{j.positioning || j.error || '—'}</td>
                      <td className="faint">{j.last_synced_at ? new Date(j.last_synced_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card mt">
            <h3>Signup attribution — the bid → signup signal loop</h3>
            <p className="muted">Add <code>?seerist_ref=&lt;proposal_id&gt;</code> to product links you share with prospects, and call the public tracking endpoint from your signup flow:</p>
            <pre className="mt">{trackSnippet}</pre>
            <p className="faint mt">Every attributed signup re-runs the Grower's feedback analysis automatically — see the Recommendations tab.</p>
          </div>

          <div className="card mt">
            <h3>Deploy-triggered docs & site sync</h3>
            <p className="muted">
              Point your CI at <code>{INSFORGE_URL}/functions/deploy-sync?token=&lt;DEPLOY_SYNC_TOKEN&gt;</code> (POST <code>{'{ workspace_id, deploy_ref, change_summary | diff }'}</code>) — or trigger a draft manually below. Output is always a draft for human review.
            </p>
            <div className="grid cols-2 mt">
              <input type="text" value={deployRef} onChange={(e) => setDeployRef(e.target.value)} placeholder="Deploy ref, e.g. v2.4.0 or commit sha" />
              <input type="text" value={changes} onChange={(e) => setChanges(e.target.value)} placeholder="What changed? e.g. Added SSO, renamed /v1/reports endpoint" />
            </div>
            <button className="btn mt" disabled={!!busy || !changes.trim()} onClick={() => act('deploysync', () => callFn('deploy-sync', { workspace_id: wsId, deploy_ref: deployRef || null, change_summary: changes }))}>
              {busy === 'deploysync' ? <span className="spinner" /> : '📝 Draft docs & site updates'}
            </button>
            {drafts.length > 0 && (
              <table className="data mt">
                <thead><tr><th>Deploy</th><th>Summary</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {drafts.map((d) => (
                    <tr key={d.id}>
                      <td><code>{d.deploy_ref || d.trigger_source}</code></td>
                      <td className="muted" style={{ maxWidth: 380 }}>{d.change_summary}</td>
                      <td><span className={`badge ${d.status === 'draft' ? 'amber' : d.status === 'published' ? 'green' : 'gray'}`}>{d.status}</span></td>
                      <td><button className="btn sm" onClick={() => setOpenDraft(d)}>Review</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'recommendations' && (
        <RecommendationsTab
          wsId={wsId}
          recommendations={recommendations}
          busy={busy}
          onAnalyze={() => act('feedback', () => callFn('growth-feedback', { workspace_id: wsId, op: 'analyze' }))}
        />
      )}

      {tab === 'ploybooks' && (
        <PloybooksTab
          wsId={wsId}
          ploybooks={ploybooks}
          templates={templates}
          runs={runs}
          busy={busy}
          pbName={pbName}
          pbDesc={pbDesc}
          setPbName={setPbName}
          setPbDesc={setPbDesc}
          act={act}
          onOpenRun={setOpenRun}
        />
      )}

      {openDraft && (
        <div className="overlay" onClick={() => setOpenDraft(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="spread">
              <h2>Deploy sync draft — {openDraft.deploy_ref || 'manual'}</h2>
              <button className="btn ghost" onClick={() => setOpenDraft(null)}>✕</button>
            </div>
            <p className="muted mt">{openDraft.change_summary}</p>
            <div className="card mt"><h3>Docs draft</h3><pre>{openDraft.docs_draft || '(empty)'}</pre></div>
            <div className="card mt"><h3>Marketing site draft</h3><pre>{openDraft.site_draft || '(empty)'}</pre></div>
            <div className="row mt">
              {(['in_review', 'published', 'dismissed'] as const).map((s) => (
                <button key={s} className={`btn sm ${s === 'published' ? 'success' : s === 'dismissed' ? 'danger' : ''}`}
                  disabled={openDraft.status === s}
                  onClick={() => act(`draft-${s}`, async () => {
                    const { error } = await db().from('deploy_sync_drafts').update({ status: s }).eq('id', openDraft.id);
                    if (error) throw new Error(error.message);
                    setOpenDraft({ ...openDraft, status: s });
                  })}>
                  Mark {s.replace('_', ' ')}
                </button>
              ))}
            </div>
            <p className="faint mt">"Published" here only records that YOU shipped it — Seerist never auto-publishes docs or site changes.</p>
          </div>
        </div>
      )}

      {openRun && <PloybookRunDrawer run={openRun} ploybook={ploybooks.find((p) => p.id === openRun.ploybook_id)} onClose={() => setOpenRun(null)} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Recommendations — what the attribution data actually says to do next
// ---------------------------------------------------------------------------

const PRIORITY_BADGE: Record<number, string> = { 1: 'red', 2: 'amber', 3: 'blue', 4: 'gray', 5: 'gray' };

function RecommendationsTab({
  wsId, recommendations, busy, onAnalyze,
}: {
  wsId: string;
  recommendations: GrowthRecommendation[];
  busy: string | null;
  onAnalyze: () => void;
}) {
  const [openEvidence, setOpenEvidence] = useState<string | null>(null);

  return (
    <>
      <div className="card">
        <div className="spread">
          <h3 style={{ marginBottom: 0 }}>What the data says to do next</h3>
          <button className="btn primary" disabled={!!busy} onClick={onAnalyze}>
            {busy === 'feedback' ? <span className="spinner" /> : '🔄 Run fresh analysis'}
          </button>
        </div>
        <p className="muted mt">
          The Grower slices every tracked bid by platform, mention policy, product-link and job type, compares each segment's win and attributed-signup rate against this workspace's baseline, and only reports a pattern once a segment has enough bids behind it. It also re-runs itself after every new signup attribution.
        </p>
      </div>

      {!recommendations.length ? (
        <div className="info-box mt">
          No recommendations yet. Run an analysis once you have tracked bids with the <code>?seerist_ref=</code> attribution link attached — the Grower reports patterns from real signups, never guesses.
        </div>
      ) : (
        <div className="stack mt">
          {recommendations.map((r) => {
            const e = r.evidence || {};
            return (
              <div className="card" key={r.id}>
                <div className="spread">
                  <div className="row">
                    <span className={`badge ${PRIORITY_BADGE[r.priority] || 'gray'}`}>priority {r.priority}</span>
                    {e.dimension && <span className="badge violet">{String(e.dimension).replace('_', ' ')}: {String(e.value)}</span>}
                  </div>
                  <span className="faint">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <p className="mt" style={{ marginBottom: 0, fontWeight: 500 }}>{r.recommendation}</p>
                {e.summary && <p className="muted" style={{ marginTop: 6 }}>{e.summary}</p>}
                {typeof e.bids === 'number' && (
                  <div className="row mt">
                    <span className="badge gray">{e.bids} bids</span>
                    <span className="badge gray">{e.wins ?? 0} wins</span>
                    <span className="badge green">{e.attributed_signups ?? 0} attributed signups</span>
                    {typeof e.signup_lift === 'number' && (
                      <span className={`badge ${e.signup_lift >= 1 ? 'green' : 'red'}`}>{e.signup_lift.toFixed(1)}× signup lift</span>
                    )}
                    <button className="btn ghost sm" onClick={() => setOpenEvidence(openEvidence === r.id ? null : r.id)}>
                      {openEvidence === r.id ? 'Hide evidence' : 'Show evidence'}
                    </button>
                  </div>
                )}
                {openEvidence === r.id && <pre className="mt">{JSON.stringify(r.evidence, null, 2)}</pre>}
              </div>
            );
          })}
        </div>
      )}

      <p className="faint mt">Workspace <code>{wsId.slice(0, 8)}</code> — recommendations are replaced wholesale on each analysis so nothing stale competes with the current read.</p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Ploybooks — saved plays, shipped templates, and run history
// ---------------------------------------------------------------------------

const RUN_BADGE: Record<string, string> = {
  running: 'blue', completed: 'green', failed: 'red', cancelled: 'gray',
};

function PloybooksTab({
  wsId, ploybooks, templates, runs, busy, pbName, pbDesc, setPbName, setPbDesc, act, onOpenRun,
}: {
  wsId: string;
  ploybooks: Ploybook[];
  templates: PloybookTemplate[];
  runs: PloybookRun[];
  busy: string | null;
  pbName: string;
  pbDesc: string;
  setPbName: (v: string) => void;
  setPbDesc: (v: string) => void;
  act: (label: string, fn: () => Promise<any>) => Promise<void>;
  onOpenRun: (run: PloybookRun) => void;
}) {
  const latestRunFor = (ploybookId: string) => runs.find((r) => r.ploybook_id === ploybookId);

  return (
    <>
      <div className="card">
        <h3>Your Ploybooks</h3>
        <p className="muted">A Ploybook is a named, reusable play the Grower runs step by step, recording what each step found. Nothing it produces is published or sent — output lands as drafts and recommendations for you.</p>
        {!ploybooks.length ? (
          <div className="info-box mt">No Ploybooks yet. Start from a template below, or write your own.</div>
        ) : (
          <table className="data mt">
            <thead><tr><th>Name</th><th>Strategy</th><th>Steps</th><th>Last run</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {ploybooks.map((p) => {
                const last = latestRunFor(p.id);
                const steps = p.steps?.length || 0;
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td className="muted" style={{ maxWidth: 320 }}>{p.description || JSON.stringify(p.strategy_config)}</td>
                    <td><span className="badge gray">{steps || '—'}</span></td>
                    <td>
                      {last ? (
                        <button className="btn ghost sm" onClick={() => onOpenRun(last)}>
                          <span className={`badge ${RUN_BADGE[last.status] || 'gray'}`}>
                            {last.status === 'running' ? `step ${last.current_step + 1}` : last.status}
                          </span>
                        </button>
                      ) : <span className="faint">never</span>}
                    </td>
                    <td><span className={`badge ${p.active ? 'green' : 'gray'}`}>{p.active ? 'active' : 'paused'}</span></td>
                    <td>
                      <div className="row">
                        <button className="btn primary sm" disabled={!!busy || !steps}
                          title={steps ? 'Run every step in order' : 'This Ploybook has no executable steps yet'}
                          onClick={() => act(`run-${p.id}`, () => callFn('ploybooks-execute', { op: 'run_ploybook', ploybook_id: p.id, workspace_id: wsId }))}>
                          {busy === `run-${p.id}` ? <span className="spinner" /> : '▶ Run'}
                        </button>
                        <button className="btn ghost sm" disabled={!!busy} onClick={() => act('toggle', async () => {
                          const { error } = await db().from('ploybooks').update({ active: !p.active }).eq('id', p.id);
                          if (error) throw new Error(error.message);
                        })}>{p.active ? 'Pause' : 'Activate'}</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card mt">
        <h3>Templates</h3>
        <p className="muted">Three plays ship with the engine. Adding one copies its steps into this workspace, where you own and can edit it.</p>
        {!templates.length ? (
          <p className="faint mt">Loading templates…</p>
        ) : (
          <div className="grid cols-3 mt">
            {templates.map((t) => (
              <div className="card" key={t.id} style={{ background: 'var(--bg-raise)' }}>
                <h3 style={{ fontSize: 14 }}>{t.name}</h3>
                <p className="muted" style={{ fontSize: 12.5 }}>{t.description}</p>
                <ol style={{ paddingLeft: 18, margin: '10px 0', fontSize: 12.5, color: 'var(--text-dim)' }}>
                  {t.steps.map((s) => <li key={s.key}>{s.title}</li>)}
                </ol>
                <button className="btn sm" disabled={!!busy}
                  onClick={() => act(`tpl-${t.id}`, () => callFn('ploybooks-execute', { op: 'create_from_template', workspace_id: wsId, template_id: t.id }))}>
                  {busy === `tpl-${t.id}` ? <span className="spinner" /> : '+ Add to workspace'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card mt">
        <h3>Write your own</h3>
        <p className="muted">A Ploybook saved here has no steps until you add them — use it to record the strategy, or start from a template and edit.</p>
        <div className="grid cols-2 mt">
          <input type="text" value={pbName} onChange={(e) => setPbName(e.target.value)} placeholder='Name, e.g. "Competitor-migration angle"' />
          <input type="text" value={pbDesc} onChange={(e) => setPbDesc(e.target.value)} placeholder='Strategy, e.g. "Bid on jobs mentioning [competitor]; lead with migration"' />
        </div>
        <button className="btn mt" disabled={!!busy || !pbName.trim()} onClick={() => act('ploybook', async () => {
          const { error } = await db().from('ploybooks').insert({
            workspace_id: wsId, name: pbName, description: pbDesc || null,
            strategy_config: { instruction: pbDesc || pbName },
            steps: [],
          });
          if (error) throw new Error(error.message);
          setPbName(''); setPbDesc('');
        })}>+ Save ploybook</button>
      </div>

      {runs.length > 0 && (
        <div className="card mt">
          <h3>Run history</h3>
          <table className="data">
            <thead><tr><th>Started</th><th>Ploybook</th><th>Status</th><th>Progress</th><th></th></tr></thead>
            <tbody>
              {runs.map((r) => {
                const pb = ploybooks.find((p) => p.id === r.ploybook_id);
                const total = pb?.steps?.length || r.results?.length || 0;
                return (
                  <tr key={r.id}>
                    <td className="faint" style={{ whiteSpace: 'nowrap' }}>{new Date(r.started_at).toLocaleString()}</td>
                    <td style={{ fontWeight: 600 }}>{pb?.name || <code>{r.ploybook_id.slice(0, 8)}</code>}</td>
                    <td><span className={`badge ${RUN_BADGE[r.status] || 'gray'}`}>{r.status}</span></td>
                    <td className="muted">
                      {r.status === 'running'
                        ? `step ${r.current_step + 1}${total ? ` of ${total}` : ''}`
                        : `${(r.results || []).filter((s) => s.status === 'completed').length}${total ? `/${total}` : ''} steps`}
                    </td>
                    <td><button className="btn sm" onClick={() => onOpenRun(r)}>Open</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function PloybookRunDrawer({ run, ploybook, onClose }: { run: PloybookRun; ploybook?: Ploybook; onClose: () => void }) {
  const results = run.results || [];
  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="spread">
          <div>
            <h2>{ploybook?.name || 'Ploybook run'}</h2>
            <div className="row mt">
              <span className={`badge ${RUN_BADGE[run.status] || 'gray'}`}>{run.status}</span>
              <span className="faint">
                started {new Date(run.started_at).toLocaleString()}
                {run.completed_at ? ` · finished ${new Date(run.completed_at).toLocaleString()}` : ''}
              </span>
            </div>
          </div>
          <button className="btn ghost" onClick={onClose}>✕</button>
        </div>

        {run.error && <div className="error-box mt">{run.error}</div>}

        {!results.length ? (
          <div className="info-box mt">No step results recorded yet.</div>
        ) : results.map((s) => (
          <div className="card mt" key={`${s.step}-${s.key}`}>
            <div className="spread">
              <div className="row">
                <span className="faint">#{s.step + 1}</span>
                <strong>{s.title}</strong>
                <span className="badge violet">{s.kind}</span>
              </div>
              <span className={`badge ${s.status === 'completed' ? 'green' : 'red'}`}>{s.status}</span>
            </div>
            <pre className="mt">{s.output || '(no output)'}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
