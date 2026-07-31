import { useCallback, useEffect, useState } from 'react';
import { callFn, db, INSFORGE_URL } from '../lib/insforge';
import { DraftDrawer, DraftTable } from './SiteStudioTab';
import type { AdCampaign, GrowthContentDraft } from '../lib/types';

/**
 * Ad creative generation and campaign management (spec §4, Module C).
 * Attribution runs through growth_touchpoints — the same model bid-driven
 * signups use — so ad and bid conversions are comparable without special cases.
 */

interface AttributionReport {
  funnel: Record<string, { touchpoints: number; attributed_signups: number }>;
  totals: { touchpoints: number; attributed_signups: number; total_signups: number; organic_signups: number };
  campaigns: Array<{ id: string; name: string; attributed_signups: number }>;
  cost_note: string;
}

const CAMPAIGN_BADGE: Record<string, string> = {
  draft: 'gray', active: 'green', paused: 'amber', ended: 'gray',
};

export default function AdsTab({ wsId }: { wsId: string }) {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [creatives, setCreatives] = useState<GrowthContentDraft[]>([]);
  const [report, setReport] = useState<AttributionReport | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<GrowthContentDraft | null>(null);

  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('meta');
  const [objective, setObjective] = useState('');
  const [budget, setBudget] = useState('');
  const [brief, setBrief] = useState('');
  const [briefCampaign, setBriefCampaign] = useState('');

  const load = useCallback(async () => {
    const [c, d] = await Promise.all([
      callFn<{ campaigns: AdCampaign[] }>('ads-studio', { op: 'list_campaigns', workspace_id: wsId }).catch(() => ({ campaigns: [] })),
      db().from('growth_content_drafts').select('*').eq('workspace_id', wsId).eq('kind', 'ad_creative').order('created_at', { ascending: false }).limit(60),
    ]);
    setCampaigns(c.campaigns || []);
    setCreatives((d.data as GrowthContentDraft[]) || []);
  }, [wsId]);

  useEffect(() => { void load(); }, [load]);

  async function act(label: string, fn: () => Promise<unknown>) {
    setBusy(label); setError(null);
    try { await fn(); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : `${label} failed`); }
    finally { setBusy(null); }
  }

  return (
    <>
      {error && <div className="error-box mb">{error}</div>}

      <div className="card">
        <h3>Campaigns</h3>
        <p className="muted">
          Each campaign gets an attribution ref. Put <code>?seerist_ref=&lt;ref&gt;</code> on the campaign's landing URL and ad-driven signups flow through the same touchpoint model as bid-driven ones.
        </p>
        <div className="grid cols-2 mt">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" />
          <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
            {['meta', 'google', 'linkedin', 'reddit', 'x'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input type="text" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder='Objective, e.g. "trial signups from agency owners"' />
          <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Daily budget" min="0" />
        </div>
        <button className="btn primary mt" disabled={!!busy || !name.trim()}
          onClick={() => act('campaign', async () => {
            await callFn('ads-studio', {
              op: 'create_campaign', workspace_id: wsId, name, platform,
              objective: objective || undefined, daily_budget: budget ? Number(budget) : undefined,
            });
            setName(''); setObjective(''); setBudget('');
          })}>
          {busy === 'campaign' ? <span className="spinner" /> : '+ Create campaign'}
        </button>

        {campaigns.length > 0 && (
          <table className="data mt">
            <thead><tr><th>Name</th><th>Platform</th><th>Status</th><th>Budget/day</th><th>Signups</th><th>Attribution ref</th><th></th></tr></thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td><span className="badge violet">{c.platform}</span></td>
                  <td><span className={`badge ${CAMPAIGN_BADGE[c.status] || 'gray'}`}>{c.status}</span></td>
                  <td>{c.daily_budget ?? '—'}</td>
                  <td><span className="badge green">{c.attributed_signups ?? 0}</span></td>
                  <td><code style={{ fontSize: 11 }}>{c.attribution_ref?.slice(0, 8) || '—'}</code></td>
                  <td>
                    <div className="row">
                      {(['active', 'paused', 'ended'] as const).filter((s) => s !== c.status).map((s) => (
                        <button key={s} className="btn ghost sm" disabled={!!busy}
                          onClick={() => act(`status-${c.id}`, () => callFn('ads-studio', { op: 'update_campaign', campaign_id: c.id, status: s }))}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {campaigns.length > 0 && (
          <p className="faint mt">
            Landing URL pattern: <code>https://yourproduct.com/?seerist_ref={campaigns[0].attribution_ref || '<ref>'}</code> — and your signup flow calls <code>{INSFORGE_URL}/functions/track-signup</code> exactly as it already does for bids.
          </p>
        )}
      </div>

      <div className="card mt">
        <h3>Generate ad creative</h3>
        <p className="muted">Each variant takes a genuinely different angle and is grounded in your ingested positioning — no invented statistics, customers or claims.</p>
        <div className="grid cols-2 mt">
          <input type="text" value={brief} onChange={(e) => setBrief(e.target.value)}
            placeholder='Brief, e.g. "target agencies losing time on proposals"' />
          <select value={briefCampaign} onChange={(e) => setBriefCampaign(e.target.value)}>
            <option value="">No campaign</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button className="btn mt" disabled={!!busy || !brief.trim()}
          onClick={() => act('creative', () => callFn('ads-studio', {
            op: 'generate_creative', workspace_id: wsId, brief,
            campaign_id: briefCampaign || undefined, count: 3,
          }))}>
          {busy === 'creative' ? <span className="spinner" /> : '✦ Draft 3 variants'}
        </button>
      </div>

      <div className="card mt">
        <div className="spread">
          <h3 style={{ marginBottom: 0 }}>Full-funnel attribution</h3>
          <button className="btn sm" disabled={!!busy}
            onClick={() => act('report', async () => setReport(await callFn<AttributionReport>('ads-studio', { op: 'attribution_report', workspace_id: wsId })))}>
            {busy === 'report' ? <span className="spinner" /> : 'Run report'}
          </button>
        </div>
        {report ? (
          <>
            <div className="grid cols-3 mt">
              {(['bid', 'ad', 'site'] as const).map((k) => (
                <div className="card stat" key={k} style={{ background: 'var(--bg-raise)' }}>
                  <div className="label">{k} touchpoints</div>
                  <div className="value">{report.funnel[k]?.touchpoints ?? 0}</div>
                  <div className="hint">{report.funnel[k]?.attributed_signups ?? 0} attributed signups</div>
                </div>
              ))}
            </div>
            <p className="muted mt">
              {report.totals.attributed_signups} of {report.totals.total_signups} signups are attributed to a touchpoint ({report.totals.organic_signups} organic).
            </p>
            <p className="faint">{report.cost_note}</p>
          </>
        ) : <p className="faint mt">Run the report to compare bid-driven, ad-driven and site-driven signups side by side.</p>}
      </div>

      <DraftTable title={`Ad creative drafts (${creatives.length})`} drafts={creatives} onOpen={setOpen} />
      {open && <DraftDrawer draft={open} onClose={() => setOpen(null)} onChanged={() => { setOpen(null); void load(); }} />}
    </>
  );
}
