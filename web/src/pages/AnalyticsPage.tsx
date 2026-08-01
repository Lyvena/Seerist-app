import { useCallback, useEffect, useState } from 'react';
import { callFn } from '../lib/insforge';
import { useApp } from '../state/AppContext';
import type { AnalyticsSummary } from '../lib/types';
import { Icon } from '../components/Icon';
import { Meter } from '../components/UI';

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
        <button className="btn" onClick={() => void load()}><Icon name="refresh" /> Refresh</button>
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

          {/* What the product has learned from these results — shown so the
              user can see it getting smarter rather than take it on faith. */}
          {data.learning && (
            <div className="card accent mt">
              <div className="spread mb">
                <h3 className="row" style={{ gap: 8 }}><Icon name="brain" /> What Seerist has learned from you</h3>
                {data.learning.ready
                  ? <span className="badge blue">{data.learning.resolved} resolved bids</span>
                  : <span className="badge gray">{data.learning.resolved}/{data.learning.needed} to go</span>}
              </div>

              {!data.learning.ready ? (
                <p className="muted" style={{ fontSize: 13, margin: 0 }}>{data.learning.note}</p>
              ) : (
                <>
                  <div className="grid cols-3">
                    <div>
                      <div className="faint mb">Win rate by fit score</div>
                      {(data.learning.byScoreBand || []).map((b) => (
                        <div key={b.band} style={{ marginBottom: 9 }}>
                          <div className="spread" style={{ fontSize: 12.5 }}>
                            <span>{b.band}</span>
                            <span style={{ fontWeight: 700 }}>{b.winRate ?? '—'}% <span className="faint">of {b.n}</span></span>
                          </div>
                          <Meter value={b.winRate ?? 0} tone={(b.winRate ?? 0) >= 30 ? 'green' : undefined} />
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="faint mb">Win rate by platform</div>
                      {(data.learning.byPlatform || []).map((b) => (
                        <div key={b.platform} style={{ marginBottom: 9 }}>
                          <div className="spread" style={{ fontSize: 12.5 }}>
                            <span style={{ textTransform: 'capitalize' }}>{b.platform}</span>
                            <span style={{ fontWeight: 700 }}>{b.winRate ?? '—'}% <span className="faint">of {b.n}</span></span>
                          </div>
                          <Meter value={b.winRate ?? 0} tone={(b.winRate ?? 0) >= 30 ? 'green' : undefined} />
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="faint mb">Why bids are lost</div>
                      {(data.learning.lossReasons || []).length ? (
                        (data.learning.lossReasons || []).map((r) => (
                          <div key={r.reason} className="spread" style={{ fontSize: 12.5, padding: '3px 0' }}>
                            <span style={{ textTransform: 'capitalize' }}>{r.reason.replace('_', ' ')}</span>
                            <span className="badge gray">{r.count}</span>
                          </div>
                        ))
                      ) : (
                        <p className="faint" style={{ margin: 0 }}>
                          Nothing recorded yet. When you mark a bid lost, pick a reason — it is the
                          only thing that teaches the next draft.
                        </p>
                      )}
                    </div>
                  </div>

                  {data.learning.productMention && (
                    <div className="info-box mt">
                      <Icon name="info" />
                      <span>
                        Bids that mentioned your product won{' '}
                        <strong>{data.learning.productMention.withWinRate}%</strong> of the time
                        ({data.learning.productMention.withN} bids), against{' '}
                        <strong>{data.learning.productMention.withoutWinRate}%</strong> without
                        ({data.learning.productMention.withoutN}). That is the real cost — or
                        benefit — of using a bid as a growth channel.
                      </span>
                    </div>
                  )}
                  <p className="faint mt" style={{ margin: '10px 0 0' }}>{data.learning.note}</p>
                </>
              )}
            </div>
          )}

          <div className="card mt">
            <h3>Funnel</h3>
            <div className="mt">
              {([
                ['Captured', data.totalCaptured],
                ['Sent', data.funnel.sent],
                ['Viewed', data.funnel.viewed],
                ['Replied', data.funnel.replied],
                ['Won', data.funnel.won],
              ] as Array<[string, number]>).map(([label, count]) => {
                const max = Math.max(data.totalCaptured, 1);
                return (
                  <div className="funnel-row" key={label}>
                    <span className="flabel">{label}</span>
                    <div className="funnel-track"><div className="funnel-fill" style={{ width: `${Math.max((count / max) * 100, count > 0 ? 3 : 0)}%` }} /></div>
                    <span className="fcount">{count}</span>
                  </div>
                );
              })}
            </div>
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
