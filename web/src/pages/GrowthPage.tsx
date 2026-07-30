import { useCallback, useEffect, useState } from 'react';
import { callFn, db, INSFORGE_URL } from '../lib/insforge';
import { useApp } from '../state/AppContext';
import type { DeploySyncDraft, Ploybook, SiteIngestionJob } from '../lib/types';

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
  const [jobs, setJobs] = useState<SiteIngestionJob[]>([]);
  const [ploybooks, setPloybooks] = useState<Ploybook[]>([]);
  const [drafts, setDrafts] = useState<DeploySyncDraft[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [url, setUrl] = useState('');
  const [pbName, setPbName] = useState('');
  const [pbDesc, setPbDesc] = useState('');
  const [deployRef, setDeployRef] = useState('');
  const [changes, setChanges] = useState('');
  const [openDraft, setOpenDraft] = useState<DeploySyncDraft | null>(null);

  const load = useCallback(async () => {
    const [j, p, d] = await Promise.all([
      db().from('site_ingestion_jobs').select('*').eq('workspace_id', wsId).order('created_at', { ascending: false }).limit(20),
      db().from('ploybooks').select('*').eq('workspace_id', wsId).order('created_at', { ascending: false }).limit(50),
      db().from('deploy_sync_drafts').select('*').eq('workspace_id', wsId).order('created_at', { ascending: false }).limit(20),
    ]);
    setJobs((j.data as SiteIngestionJob[]) || []);
    setPloybooks((p.data as Ploybook[]) || []);
    setDrafts((d.data as DeploySyncDraft[]) || []);
  }, [wsId]);

  useEffect(() => { void load(); }, [load]);

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

      {error && <div className="error-box mb">{error}</div>}

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
      </div>

      <div className="card mt">
        <h3>Ploybooks — reusable named strategies</h3>
        <div className="grid cols-2 mt">
          <input type="text" value={pbName} onChange={(e) => setPbName(e.target.value)} placeholder='Name, e.g. "Competitor-migration angle"' />
          <input type="text" value={pbDesc} onChange={(e) => setPbDesc(e.target.value)} placeholder='Strategy, e.g. "Bid on jobs mentioning [competitor]; lead with migration"' />
        </div>
        <button className="btn mt" disabled={!!busy || !pbName.trim()} onClick={() => act('ploybook', async () => {
          const { error } = await db().from('ploybooks').insert({
            workspace_id: wsId, name: pbName, description: pbDesc || null,
            strategy_config: { instruction: pbDesc || pbName },
          });
          if (error) throw new Error(error.message);
          setPbName(''); setPbDesc('');
        })}>+ Save ploybook</button>
        {ploybooks.length > 0 && (
          <table className="data mt">
            <thead><tr><th>Name</th><th>Strategy</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {ploybooks.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td className="muted">{p.description || JSON.stringify(p.strategy_config)}</td>
                  <td><span className={`badge ${p.active ? 'green' : 'gray'}`}>{p.active ? 'active' : 'paused'}</span></td>
                  <td>
                    <button className="btn ghost sm" disabled={!!busy} onClick={() => act('toggle', async () => {
                      const { error } = await db().from('ploybooks').update({ active: !p.active }).eq('id', p.id);
                      if (error) throw new Error(error.message);
                    })}>{p.active ? 'Pause' : 'Activate'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
    </>
  );
}
