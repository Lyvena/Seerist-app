import { useCallback, useEffect, useState } from 'react';
import { callFn, db } from '../lib/insforge';
import type { GrowthContentDraft, SiteDesignProfile, SiteMonitorRun } from '../lib/types';
import { Icon } from './Icon';

/**
 * Autonomous site generation and maintenance (spec §4, Module C).
 * Everything produced here is a draft — Seerist never publishes site content.
 */

const STATUS_BADGE: Record<string, string> = {
  draft: 'amber', in_review: 'blue', approved: 'green', published: 'green', dismissed: 'gray',
};

export default function SiteStudioTab({ wsId }: { wsId: string }) {
  const [profile, setProfile] = useState<SiteDesignProfile | null>(null);
  const [drafts, setDrafts] = useState<GrowthContentDraft[]>([]);
  const [runs, setRuns] = useState<SiteMonitorRun[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<GrowthContentDraft | null>(null);

  const [siteUrl, setSiteUrl] = useState('');
  const [topic, setTopic] = useState('');
  const [pageType, setPageType] = useState('landing');
  const [monitorUrl, setMonitorUrl] = useState('');
  const [competitors, setCompetitors] = useState('');

  const load = useCallback(async () => {
    const [p, d, r] = await Promise.all([
      db().from('site_design_profiles').select('*').eq('workspace_id', wsId).order('updated_at', { ascending: false }).limit(1),
      db().from('growth_content_drafts').select('*').eq('workspace_id', wsId).in('kind', ['page', 'fix', 'metadata']).order('created_at', { ascending: false }).limit(60),
      db().from('site_monitor_runs').select('*').eq('workspace_id', wsId).order('created_at', { ascending: false }).limit(10),
    ]);
    setProfile(((p.data as SiteDesignProfile[]) || [])[0] || null);
    setDrafts((d.data as GrowthContentDraft[]) || []);
    setRuns((r.data as SiteMonitorRun[]) || []);
  }, [wsId]);

  useEffect(() => { void load(); }, [load]);

  async function act(label: string, fn: () => Promise<unknown>) {
    setBusy(label); setError(null);
    try { await fn(); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : `${label} failed`); }
    finally { setBusy(null); }
  }

  const pages = drafts.filter((d) => d.kind === 'page');
  const fixes = drafts.filter((d) => d.kind === 'fix');

  return (
    <>
      {error && <div className="error-box mb">{error}</div>}

      <div className="card">
        <h3>Design system</h3>
        <p className="muted">
          Seerist reads your live site and reconstructs its palette, typography and component style, so generated pages look like they belong to your site rather than to a template.
        </p>
        <div className="row mt">
          <input type="url" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="https://yourproduct.com" style={{ flex: 1, minWidth: 260 }} />
          <button className="btn primary" disabled={!!busy || !siteUrl.trim()}
            onClick={() => act('design', () => callFn('site-studio', { op: 'extract_design_system', workspace_id: wsId, url: siteUrl }))}>
            {busy === 'design' ? <span className="spinner" /> : <><Icon name="sparkle" /> Reconstruct</>}
          </button>
        </div>
        {profile ? (
          <div className="mt">
            <div className="row">
              {(profile.palette?.observed_colors as string[] | undefined)?.slice(0, 8).map((c) => (
                <span key={c} title={c} style={{
                  width: 26, height: 26, borderRadius: 6, background: c,
                  border: '1px solid var(--border-strong)', display: 'inline-block',
                }} />
              ))}
              <span className="faint">{profile.source_url}</span>
            </div>
            {profile.voice && <p className="muted mt">{profile.voice}</p>}
            <details className="mt"><summary className="faint">Raw profile</summary>
              <pre className="mt">{JSON.stringify({ palette: profile.palette, typography: profile.typography, components: profile.components }, null, 2)}</pre>
            </details>
          </div>
        ) : <p className="faint mt">No design profile yet.</p>}
      </div>

      <div className="card mt">
        <h3>Generate an optimized page</h3>
        <p className="muted">Produces page copy, meta title and description, an FAQ block, and valid JSON-LD schema markup — as a draft for you to review.</p>
        <div className="grid cols-2 mt">
          <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder='Topic, e.g. "Upwork alternative for SaaS teams"' />
          <select value={pageType} onChange={(e) => setPageType(e.target.value)}>
            {['landing', 'comparison', 'feature', 'guide', 'faq'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button className="btn mt" disabled={!!busy || !topic.trim()}
          onClick={() => act('page', () => callFn('site-studio', { op: 'generate_page', workspace_id: wsId, topic, page_type: pageType }))}>
          {busy === 'page' ? <span className="spinner" /> : <><Icon name="pen" /> Draft the page</>}
        </button>
      </div>

      <div className="card mt">
        <h3>Monitor performance & competitors</h3>
        <p className="muted">Runs real technical checks against a live URL (title, meta, H1, JSON-LD, Open Graph, canonical, viewport, image alt text, page weight, response time), or reads competitor pages and finds the gaps. Anything that fails becomes a drafted fix.</p>
        <div className="grid cols-2 mt">
          <div className="row">
            <input type="url" value={monitorUrl} onChange={(e) => setMonitorUrl(e.target.value)}
              placeholder="https://yourproduct.com (defaults to product URL)" style={{ flex: 1 }} />
            <button className="btn" disabled={!!busy}
              onClick={() => act('perf', () => callFn('site-studio', { op: 'monitor', workspace_id: wsId, kind: 'performance', url: monitorUrl || undefined }))}>
              {busy === 'perf' ? <span className="spinner" /> : <><Icon name="bolt" /> Performance</>}
            </button>
          </div>
          <div className="row">
            <input type="text" value={competitors} onChange={(e) => setCompetitors(e.target.value)}
              placeholder="Competitor URLs, comma separated" style={{ flex: 1 }} />
            <button className="btn" disabled={!!busy || !competitors.trim()}
              onClick={() => act('comp', () => callFn('site-studio', {
                op: 'monitor', workspace_id: wsId, kind: 'competitor',
                competitors: competitors.split(',').map((c) => c.trim()).filter(Boolean),
              }))}>
              {busy === 'comp' ? <span className="spinner" /> : <><Icon name="search" /> Competitors</>}
            </button>
          </div>
        </div>
        {runs.length > 0 && (
          <table className="data mt">
            <thead><tr><th>When</th><th>Kind</th><th>Checks</th><th>Failing</th><th>Drafted fixes</th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className="faint" style={{ whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleString()}</td>
                  <td><span className="badge violet">{r.kind}</span></td>
                  <td>{r.findings?.length ?? 0}</td>
                  <td>{(r.findings || []).filter((f) => f.severity === 'fix').length}</td>
                  <td>{r.drafts_created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DraftTable title={`Page drafts (${pages.length})`} drafts={pages} onOpen={setOpen} />
      <DraftTable title={`Drafted fixes (${fixes.length})`} drafts={fixes} onOpen={setOpen} />

      {open && <DraftDrawer draft={open} onClose={() => setOpen(null)} onChanged={() => { setOpen(null); void load(); }} />}
    </>
  );
}

export function DraftTable({ title, drafts, onOpen }: {
  title: string;
  drafts: GrowthContentDraft[];
  onOpen: (d: GrowthContentDraft) => void;
}) {
  if (!drafts.length) return null;
  return (
    <div className="card mt">
      <h3>{title}</h3>
      <table className="data">
        <thead><tr><th>Title</th><th>Status</th><th>Created</th><th></th></tr></thead>
        <tbody>
          {drafts.map((d) => (
            <tr key={d.id}>
              <td style={{ fontWeight: 600, maxWidth: 420 }}>{d.title}</td>
              <td><span className={`badge ${STATUS_BADGE[d.status] || 'gray'}`}>{d.status.replace('_', ' ')}</span></td>
              <td className="faint" style={{ whiteSpace: 'nowrap' }}>{new Date(d.created_at).toLocaleString()}</td>
              <td><button className="btn sm" onClick={() => onOpen(d)}>Review</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DraftDrawer({ draft, onClose, onChanged }: {
  draft: GrowthContentDraft;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = draft.meta || {};

  async function setStatus(status: string) {
    setBusy(true); setError(null);
    try {
      await callFn('site-studio', { op: 'set_draft_status', draft_id: draft.id, status });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="spread">
          <div>
            <h2>{draft.title}</h2>
            <div className="row mt">
              <span className="badge violet">{draft.kind.replace('_', ' ')}</span>
              <span className={`badge ${STATUS_BADGE[draft.status] || 'gray'}`}>{draft.status.replace('_', ' ')}</span>
              {meta.priority ? <span className="badge amber">priority {String(meta.priority)}</span> : null}
            </div>
          </div>
          <button className="btn ghost" onClick={onClose}><Icon name="close" /></button>
        </div>

        {error && <div className="error-box mt">{error}</div>}

        {(meta.meta_title || meta.meta_description) && (
          <div className="card mt">
            <h3>Metadata</h3>
            <p className="muted"><strong>Title:</strong> {String(meta.meta_title || '—')}</p>
            <p className="muted"><strong>Description:</strong> {String(meta.meta_description || '—')}</p>
            {meta.slug ? <p className="muted"><strong>Slug:</strong> <code>/{String(meta.slug)}</code></p> : null}
            {Array.isArray(meta.target_keywords) && meta.target_keywords.length > 0 && (
              <div className="row mt">{meta.target_keywords.map((k) => <span className="badge gray" key={k}>{k}</span>)}</div>
            )}
          </div>
        )}

        <div className="card mt"><h3>Content</h3><pre>{draft.body || '(empty)'}</pre></div>

        {meta.json_ld ? (
          <div className="card mt">
            <h3>Schema markup (JSON-LD)</h3>
            <pre>{JSON.stringify(meta.json_ld, null, 2)}</pre>
          </div>
        ) : null}

        {draft.evidence && Object.keys(draft.evidence).length > 0 && (
          <div className="card mt"><h3>Evidence</h3><pre>{JSON.stringify(draft.evidence, null, 2)}</pre></div>
        )}

        <div className="row mt">
          {(['in_review', 'approved', 'published', 'dismissed'] as const).map((s) => (
            <button key={s} className={`btn sm ${s === 'published' ? 'success' : s === 'dismissed' ? 'danger' : ''}`}
              disabled={busy || draft.status === s} onClick={() => void setStatus(s)}>
              Mark {s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <p className="faint mt">"Published" only records that YOU shipped it — Seerist never publishes site or ad content itself.</p>
      </div>
    </div>
  );
}
