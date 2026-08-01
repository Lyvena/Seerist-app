// @include _shared
// ============================================================================
// growth-feedback — Module C, The Grower's learning loop.
//
// Closes the circle on attribution: growth_touchpoints already record which
// bids mentioned the product and which of those produced an attributed signup.
// This function slices those touchpoints by segment (platform, mention policy,
// product-link flag, job type, workspace mode), computes win-rate and
// signup-rate per segment against the workspace baseline, and turns the
// segments that actually move the needle into plain-language recommendations.
//
// Runs on demand from the Growth page, and automatically after every new
// signup attribution (track-signup fires it best-effort).
//
// Requests (POST):
//   { workspace_id }                              analyse and rewrite recs
//   { workspace_id, op: 'get_recommendations' }   read the current recs
// ============================================================================

/** A segment needs this many bids before it is allowed to claim a pattern. */
const MIN_BIDS_PER_SEGMENT = 3;
/** Lift thresholds for "worth doing more of" / "worth stopping". */
const STRONG_LIFT = 1.25;
const WEAK_LIFT = 0.6;
const MAX_RECOMMENDATIONS = 8;

const JOB_TYPES: Array<{ type: string; terms: string[] }> = [
  { type: 'web app', terms: ['web app', 'webapp', 'saas', 'dashboard', 'portal', 'frontend', 'react', 'next.js'] },
  { type: 'automation', terms: ['automation', 'automate', 'zapier', 'workflow', 'integration', 'scraper', 'bot'] },
  { type: 'ai/ml', terms: ['ai ', 'llm', 'gpt', 'machine learning', 'chatbot', 'rag', 'embedding'] },
  { type: 'data', terms: ['data', 'etl', 'analytics', 'pipeline', 'sql', 'warehouse', 'report'] },
  { type: 'mobile', terms: ['ios', 'android', 'mobile app', 'react native', 'flutter'] },
  { type: 'design', terms: ['design', 'ui/ux', 'figma', 'branding', 'landing page'] },
  { type: 'content', terms: ['content', 'copywriting', 'seo', 'blog', 'article'] },
];

export default async function (req: Request): Promise<Response> {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const token = bearer(req);
  if (!token) return json({ error: 'Sign in required' }, 401);
  const userId = userIdFromToken(token);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { workspace_id } = body;
  if (!workspace_id) return json({ error: 'workspace_id is required' }, 400);
  const op = String(body.op || body.action || 'analyze');

  try {
    if (op === 'get_recommendations') {
      const recommendations = await dbSelect(
        'growth_recommendations',
        `workspace_id=eq.${workspace_id}&order=priority.asc,created_at.desc&limit=50`,
        token,
      );
      return json({ recommendations, count: recommendations.length });
    }
    if (op !== 'analyze') return json({ error: 'op must be "analyze" or "get_recommendations"' }, 400);

    return await analyze(workspace_id, token, userId, Boolean(body.automatic));
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'growth feedback failed' }, 500);
  }
}

// ---------------------------------------------------------------------------

async function analyze(
  workspaceId: string,
  token: string,
  userId: string | null,
  automatic: boolean,
): Promise<Response> {
  const ws = (await dbSelect('workspaces', `id=eq.${workspaceId}&select=id,name,type,product_name&limit=1`, token))[0];
  if (!ws) return json({ error: 'Workspace not found' }, 404);

  const touchpoints = await dbSelect(
    'growth_touchpoints',
    `workspace_id=eq.${workspaceId}&order=created_at.desc&limit=1000`,
    token,
  );
  if (!touchpoints.length) {
    return json({
      analysed: 0,
      recommendations: [],
      message: 'No bid touchpoints yet. Draft and submit product-mentioning proposals, then run this again — the Grower learns from real bids, never from guesses.',
    });
  }

  // Join the bid context each touchpoint needs: outcome, policy, platform, title.
  const proposalIds = [...new Set(touchpoints.map((t: any) => t.proposal_id).filter(Boolean))];
  const proposals = proposalIds.length
    ? await dbSelect('proposals', `id=in.(${proposalIds.join(',')})&limit=1000`, token)
    : [];
  const proposalById: Record<string, any> = {};
  for (const p of proposals) proposalById[p.id] = p;

  const jobIds = [...new Set(proposals.map((p: any) => p.job_posting_id).filter(Boolean))];
  const jobs = jobIds.length
    ? await dbSelect('job_postings', `id=in.(${jobIds.join(',')})&select=id,platform,title&limit=1000`, token)
    : [];
  const jobById: Record<string, any> = {};
  for (const j of jobs) jobById[j.id] = j;

  const rows = touchpoints.map((t: any) => {
    const proposal = proposalById[t.proposal_id] || {};
    const job = jobById[proposal.job_posting_id] || {};
    return {
      platform: job.platform || 'unknown',
      mention_policy: t.mention_policy || proposal.mention_policy_applied || 'no_mention',
      product_link: t.product_mentioned ? 'product mentioned' : 'no product mention',
      job_type: classifyJob(job.title),
      mode: proposal.mode || ws.type,
      won: proposal.outcome === 'won',
      submitted: Boolean(proposal.submitted_at) || proposal.status === 'submitted' || proposal.outcome !== 'pending',
      signup: Boolean(t.attributed_signup_id),
    };
  });

  const baseline = {
    bids: rows.length,
    wins: rows.filter((r) => r.won).length,
    signups: rows.filter((r) => r.signup).length,
  };
  const baseWinRate = rate(baseline.wins, baseline.bids);
  const baseSignupRate = rate(baseline.signups, baseline.bids);

  const dimensions = ['platform', 'mention_policy', 'product_link', 'job_type', 'mode'] as const;
  const segments: Segment[] = [];
  for (const dimension of dimensions) {
    const groups: Record<string, typeof rows> = {};
    for (const row of rows) {
      const key = String(row[dimension] || 'unknown');
      (groups[key] ||= []).push(row);
    }
    // A dimension with a single value explains nothing — skip it.
    if (Object.keys(groups).length < 2) continue;
    for (const [value, group] of Object.entries(groups)) {
      if (group.length < MIN_BIDS_PER_SEGMENT) continue;
      const wins = group.filter((r) => r.won).length;
      const signups = group.filter((r) => r.signup).length;
      segments.push({
        dimension,
        value,
        bids: group.length,
        wins,
        signups,
        win_rate: rate(wins, group.length),
        signup_rate: rate(signups, group.length),
        win_lift: lift(rate(wins, group.length), baseWinRate),
        signup_lift: lift(rate(signups, group.length), baseSignupRate),
      });
    }
  }

  segments.sort((a, b) => (b.signup_lift ?? 0) - (a.signup_lift ?? 0) || b.signups - a.signups);

  const winners = segments
    .filter((s) => (s.signup_lift !== null && s.signup_lift >= STRONG_LIFT && s.signups > 0)
      || (s.win_lift !== null && s.win_lift >= STRONG_LIFT && s.wins > 0))
    .slice(0, MAX_RECOMMENDATIONS);
  const laggards = segments
    .filter((s) => !winners.includes(s) && s.bids >= MIN_BIDS_PER_SEGMENT
      && s.signup_lift !== null && s.signup_lift <= WEAK_LIFT && baseline.signups > 0)
    .slice(0, 3);

  const candidates = [...winners, ...laggards];
  if (!candidates.length) {
    await replaceRecommendations(workspaceId, [{
      workspace_id: workspaceId,
      recommendation: `Not enough signal yet: ${baseline.bids} tracked bid${baseline.bids === 1 ? '' : 's'} produced ${baseline.signups} attributed signup${baseline.signups === 1 ? '' : 's'}. Keep bidding with the attribution ref attached — the Grower needs at least ${MIN_BIDS_PER_SEGMENT} bids in a segment before it will call a pattern.`,
      priority: 5,
      evidence: { baseline, segments: segments.slice(0, 10), reason: 'insufficient_signal' },
    }], token);
    const recommendations = await dbSelect(
      'growth_recommendations',
      `workspace_id=eq.${workspaceId}&order=priority.asc,created_at.desc&limit=50`,
      token,
    );
    return json({ analysed: rows.length, baseline, segments, recommendations });
  }

  const phrased = await phrase(candidates, { ws, baseline, baseWinRate, baseSignupRate }, token);

  const records = candidates.map((segment, i) => ({
    workspace_id: workspaceId,
    recommendation: phrased[i] || fallbackPhrase(segment, baseSignupRate, baseWinRate),
    priority: priorityOf(segment, i, winners.includes(segment)),
    evidence: {
      dimension: segment.dimension,
      value: segment.value,
      bids: segment.bids,
      wins: segment.wins,
      attributed_signups: segment.signups,
      win_rate: segment.win_rate,
      signup_rate: segment.signup_rate,
      win_lift: segment.win_lift,
      signup_lift: segment.signup_lift,
      baseline: { ...baseline, win_rate: baseWinRate, signup_rate: baseSignupRate },
      summary: evidenceSummary(segment),
    },
  }));

  await replaceRecommendations(workspaceId, records, token);

  await logPersona({
    workspace_id: workspaceId,
    persona: 'The Grower',
    action: automatic ? 'growth_feedback_auto' : 'growth_feedback_analyze',
    params: {
      touchpoints: rows.length,
      segments: segments.length,
      recommendations: records.length,
      trigger: automatic ? 'signup_attribution' : 'manual',
    },
    result: records.map((r) => r.recommendation).join(' | ').slice(0, 3000),
    created_by: userId,
  }, token);

  const recommendations = await dbSelect(
    'growth_recommendations',
    `workspace_id=eq.${workspaceId}&order=priority.asc,created_at.desc&limit=50`,
    token,
  );

  return json({
    analysed: rows.length,
    baseline: { ...baseline, win_rate: baseWinRate, signup_rate: baseSignupRate },
    segments,
    recommendations,
  });
}

// ---------------------------------------------------------------------------
// Phrasing — the numbers are computed here; the model only puts them in words.
// ---------------------------------------------------------------------------

interface Segment {
  dimension: string;
  value: string;
  bids: number;
  wins: number;
  signups: number;
  win_rate: number | null;
  signup_rate: number | null;
  win_lift: number | null;
  signup_lift: number | null;
}

async function phrase(
  segments: Segment[],
  ctx: { ws: any; baseline: any; baseWinRate: number | null; baseSignupRate: number | null },
  token: string,
): Promise<string[]> {
  try {
    const parsed = await aiJson([
      {
        role: 'system',
        content: `You are The Grower, Seerist's growth analyst. Turn each measured bid segment into ONE plain-language recommendation a founder can act on tomorrow. Rules: state the action first, then the evidence with its real numbers. Never invent a number that is not given. Never promise a result. One or two sentences each, no markdown, no bullet characters.
Respond with STRICT JSON: {"recommendations": ["<one per segment, same order>"]}`,
      },
      {
        role: 'user',
        content: `Workspace: ${ctx.ws.name} (${ctx.ws.type})${ctx.ws.product_name ? `, product "${ctx.ws.product_name}"` : ''}
Baseline across ${ctx.baseline.bids} tracked bids: ${pct(ctx.baseWinRate)} win rate, ${pct(ctx.baseSignupRate)} attributed-signup rate.

Segments (same order as your output must be):
${segments.map((s, i) => `${i + 1}. ${s.dimension} = "${s.value}" — ${s.bids} bids, ${s.wins} wins (${pct(s.win_rate)}), ${s.signups} attributed signups (${pct(s.signup_rate)}), signup lift ${liftLabel(s.signup_lift)} vs baseline, win lift ${liftLabel(s.win_lift)}.`).join('\n')}`,
      },
    ], token, { maxTokens: 900, temperature: 0.35, scope: { workspace_id: ctx.ws.id, function_slug: 'growth-feedback' } });
    const list = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
    return segments.map((_, i) => String(list[i] || '').trim().slice(0, 600));
  } catch (e) {
    console.error('recommendation phrasing failed:', e instanceof Error ? e.message : e);
    return segments.map(() => '');
  }
}

function fallbackPhrase(s: Segment, baseSignupRate: number | null, baseWinRate: number | null): string {
  const strong = (s.signup_lift ?? 0) >= STRONG_LIFT || (s.win_lift ?? 0) >= STRONG_LIFT;
  const label = `${s.dimension.replace('_', ' ')} "${s.value}"`;
  if (strong) {
    return `Send more bids where ${label}: ${s.bids} bids there produced ${s.signups} attributed signup${s.signups === 1 ? '' : 's'} (${pct(s.signup_rate)}) and ${s.wins} win${s.wins === 1 ? '' : 's'} (${pct(s.win_rate)}), against a ${pct(baseSignupRate)} signup / ${pct(baseWinRate)} win baseline.`;
  }
  return `Rethink bids where ${label}: ${s.bids} bids produced only ${s.signups} attributed signup${s.signups === 1 ? '' : 's'} (${pct(s.signup_rate)}) against a ${pct(baseSignupRate)} baseline. Either change the angle or spend the effort elsewhere.`;
}

function evidenceSummary(s: Segment): string {
  const label = `${s.dimension.replace('_', ' ')} "${s.value}"`;
  if (s.signup_lift !== null && s.signup_lift !== 1) {
    return `Bids with ${label} had ${liftLabel(s.signup_lift)} attributed signups (${s.signups}/${s.bids}, ${pct(s.signup_rate)}).`;
  }
  return `${s.bids} bids with ${label}: ${s.wins} wins, ${s.signups} attributed signups.`;
}

/** Priority 1 is the loudest signal; laggards sit below every winner. */
function priorityOf(s: Segment, index: number, isWinner: boolean): number {
  if (!isWinner) return 4;
  if ((s.signup_lift ?? 0) >= 2 && s.signups >= 2) return 1;
  if (index < 2) return 2;
  return 3;
}

async function replaceRecommendations(
  workspaceId: string,
  records: Array<Record<string, unknown>>,
  token: string,
): Promise<void> {
  // Recommendations are a snapshot of what the data says right now, not a log —
  // stale advice from an older data shape would compete with the current read.
  try {
    await dbDelete('growth_recommendations', `workspace_id=eq.${workspaceId}`, token);
  } catch (e) {
    console.error('clearing old recommendations failed:', e instanceof Error ? e.message : e);
  }
  if (records.length) await dbInsert('growth_recommendations', records, token);
}

// ---------------------------------------------------------------------------
// Maths & labels
// ---------------------------------------------------------------------------

function rate(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 1000) / 1000;
}

function lift(segmentRate: number | null, baseRate: number | null): number | null {
  if (segmentRate === null || baseRate === null || baseRate === 0) return null;
  return Math.round((segmentRate / baseRate) * 100) / 100;
}

function pct(value: number | null): string {
  return value === null ? 'n/a' : `${Math.round(value * 1000) / 10}%`;
}

function liftLabel(value: number | null): string {
  if (value === null) return 'no comparable baseline';
  return `${value.toFixed(1)}x`;
}

function classifyJob(title: unknown): string {
  const text = String(title || '').toLowerCase();
  if (!text) return 'unknown';
  for (const { type, terms } of JOB_TYPES) {
    if (terms.some((term) => text.includes(term))) return type;
  }
  return 'other';
}
