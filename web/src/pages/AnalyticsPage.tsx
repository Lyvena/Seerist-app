import { useCallback, useEffect, useState } from 'react';
import { callFn } from '../lib/insforge';
import { useApp } from '../state/AppContext';
import type { AnalyticsSummary } from '../lib/types';

export default function AnalyticsPage() {
  const { activeWs } = useApp();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeWs) return;
    setLoading(true); setError(null);
    try {
      setData(await callFn<AnalyticsSummary>('analytics-summary', { workspace_id: activeWs.id }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
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
          <h1>Analytics</h1>
          <p className="sub">Sent → viewed → replied → won. {activeWs.type === 'saas' && 'Product-mention performance is tracked separately from win rate — a mention that doesn\'t win can still drive a signup.'}</p>
        </div>
        <button className="btn" onClick={() => void load()}>↻ Refresh</button>
      </div>

      {error && <div className="error-box mb">{error}</div>}
      {loading ? (
        <div className="row"><span className="spinner" /> <span className="muted">Crunching…</span></div>
      ) : data && (
        <>
          <div className="grid cols-4">
            <div className="card stat"><div className="label">Captured</div><div className="value">{data.totalCaptured}</div><div className="hint">avg fit {data.averageFitScore ?? '—'}</div></div>
            <div className="card stat"><div className="label">Sent</div><div className="value">{data.funnel.sent}</div><div className="hint">submitted by you</div></div>
            <div className="card stat"><div className="label">Replied</div><div className="value">{data.funnel.replied}</div><div className="hint">{data.funnel.replyRate ?? '—'}% reply rate</div></div>
            <div className="card stat"><div className="label">Won</div><div className="value">{data.funnel.won}</div><div className="hint">{data.funnel.winRate ?? '—'}% win rate</div></div>
          </div>

          <div className="grid cols-2 mt">
            <div className="card">
              <h3>Pipeline</h3>
              <table className="data">
                <tbody>
                  {['new', 'scored', 'drafted', 'needs_edits', 'approved', 'submitted'].map((s) => (
                    <tr key={s}>
                      <td style={{ textTransform: 'capitalize' }}>{s.replace('_', ' ')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{data.pipeline[s] || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.productMention ? (
              <div className="card">
                <h3>Product mentions (SaaS growth channel)</h3>
                <table className="data">
                  <tbody>
                    <tr><td>Drafts with a mention</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{data.productMention.draftedWithMention}</td></tr>
                    <tr><td>Sent with a mention</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{data.productMention.sentWithMention}</td></tr>
                    <tr><td>Won with a mention</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{data.productMention.wonWithMention}</td></tr>
                    <tr><td>Mention share of sent</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{data.productMention.mentionShareOfSent ?? '—'}%</td></tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card">
                <h3>Views</h3>
                <table className="data">
                  <tbody>
                    <tr><td>Viewed</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{data.funnel.viewed} ({data.funnel.viewRate ?? '—'}%)</td></tr>
                    <tr><td>Lost</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{data.funnel.lost}</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card mt">
            <h3>Growth attribution (Module C signal loop)</h3>
            <div className="grid cols-3">
              <div className="stat"><div className="label">Bid touchpoints</div><div className="value">{data.growth.touchpoints}</div><div className="hint">product-mentioning bids</div></div>
              <div className="stat"><div className="label">Attributed signups</div><div className="value">{data.growth.attributedSignups}</div><div className="hint">traced back to a specific bid</div></div>
              <div className="stat"><div className="label">Total tracked signups</div><div className="value">{data.growth.totalSignups}</div><div className="hint">via track-signup endpoint</div></div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
