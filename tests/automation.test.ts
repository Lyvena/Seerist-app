import { describe, expect, it } from 'vitest';
import { loadFunctionScope, readRepoFile } from './helpers/load';

/**
 * The heartbeat is the first thing in Seerist that acts without being asked, so
 * the tests here are less about what it does than about what it may never do:
 * run for a workspace that switched it off, message a client, hand out a paid
 * feature, spend a plan's AI budget invisibly, or act without leaving a record.
 */

const tick = readRepoFile('insforge/functions/automation-tick.ts');
const schema = readRepoFile('insforge/schema.sql');
const { MAX_WORKSPACES, MAX_SCORES, MAX_NUDGES, JOBS } =
  loadFunctionScope('insforge/functions/automation-tick.ts', [
    'MAX_WORKSPACES', 'MAX_SCORES', 'MAX_NUDGES', 'JOBS',
  ]);

describe('the jobs that exist', () => {
  it('covers the jobs the tick owns', () => {
    expect([...JOBS]).toEqual(['scan', 'nudge', 'stale']);
  });

  it('leaves the weekly jobs to the functions that do the work', () => {
    // A function on this backend cannot call another over HTTP (Deno Deploy
    // answers 508 Loop Detected), so the digest and the Grower run are
    // scheduled against pm-insights and growth-feedback directly.
    const script = readRepoFile('insforge/scripts/apply-schedules.mjs');
    expect(script).toContain("fn: 'pm-insights'");
    expect(script).toContain("fn: 'growth-feedback'");
    expect(readRepoFile('insforge/functions/pm-insights.ts')).toContain("job: 'digest'");
    expect(readRepoFile('insforge/functions/growth-feedback.ts')).toContain("job: 'grower'");
  });

  it('rejects a job name it does not know', () => {
    expect(tick).toContain('job must be one of');
  });
});

describe('a workspace can always switch it off', () => {
  it('only ever selects workspaces with automation enabled', () => {
    expect(tick).toContain('automation_enabled=is.true');
  });

  it('re-checks the flag per workspace before doing any work', () => {
    expect(tick).toContain('if (!ws.automation_enabled)');
    expect(tick).toMatch(/Automation is paused for this workspace/);
  });

  it('defaults to on, but is a plain column the user owns', () => {
    expect(schema).toMatch(/automation_enabled boolean not null default true/);
  });
});

describe('work per tick is bounded', () => {
  it('caps workspaces, scores and nudges so one busy tenant cannot starve the rest', () => {
    expect(MAX_WORKSPACES).toBeLessThanOrEqual(20);
    expect(MAX_SCORES).toBeLessThanOrEqual(8);
    expect(MAX_NUDGES).toBeLessThanOrEqual(20);
  });

  it('scores concurrently, because sequential model calls would not fit the budget', () => {
    expect(tick).toContain('Promise.allSettled');
  });
});

describe('nothing tries to call another function over HTTP', () => {
  it('no edge function fetches a sibling — the platform refuses it', () => {
    // Deno Deploy answers 508 Loop Detected, and the failure is silent unless
    // the caller inspects the status. Shared work lives in _shared instead.
    const functions = import.meta.glob('../insforge/functions/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    for (const [path, src] of Object.entries(functions)) {
      expect(src, `${path} must not call another function over HTTP`).not.toContain('invokeFunction(');
    }
  });
});

describe('the boundaries still hold when nobody is watching', () => {
  it('never sends anything to a client — alerts go to the workspace owner', () => {
    // An external communication on the org's behalf is exactly what spec §12
    // reserves for an explicit human click.
    expect(tick).toMatch(/never messages the client|not message the client|will not message the client/i);
    expect(tick).not.toContain('submit-proposal');
    // Follow-ups tell the owner; the recipient is always the workspace channel.
    expect(tick).toContain('ws.alert_channel');
  });

  it('respects bidding_enabled, and the weekly Grower respects the plan', () => {
    expect(tick).toContain('ws.bidding_enabled');
    const grower = readRepoFile('insforge/functions/growth-feedback.ts');
    expect(grower).toContain('resolveEntitlement');
    expect(grower).toContain('growth_engine');
  });

  it('meters every model call against the plan like a human-triggered one', () => {
    // Scoring runs through the same shared implementation the HTTP entry point
    // uses, which passes `scope` to aiChat — a cron must not be a way around
    // the monthly cap.
    expect(tick).toContain('scoreProposal(');
    const shared = readRepoFile('insforge/functions/_shared.ts');
    expect(shared).toMatch(/scoreProposal[\s\S]{0,2600}function_slug: 'score-job'/);
  });

  it('writes every autonomous action to the audit log', () => {
    expect(tick).toContain('logPersona');
    expect(tick).toContain('recordRun');
  });
});

describe('a nudge fires once', () => {
  it('only picks bids that were viewed, went quiet, and were never nudged', () => {
    expect(tick).toContain('outcome=eq.viewed');
    expect(tick).toContain('follow_up_nudged_at=is.null');
  });

  it('stamps them so the same bids are not flagged forever', () => {
    expect(tick).toContain('follow_up_nudged_at:');
    expect(schema).toMatch(/add column if not exists follow_up_nudged_at timestamptz/);
  });
});

describe('runs are observable', () => {
  it('records a row for every tick, including the ones that did nothing', () => {
    // A scheduled job that quietly stops running is worse than none at all.
    expect(tick).toMatch(/recordRun\(ws\.id, job, r\.status/);
    expect(tick).toMatch(/recordRun\(ws\.id, job, 'failed'/);
    expect(schema).toMatch(/create table if not exists automation_runs/);
    expect(schema).toMatch(/status text not null default 'ok' check \(status in \('ok','skipped','failed'\)\)/);
  });

  it('keeps the run log readable only by workspace members', () => {
    expect(schema).toMatch(/create policy automation_runs_select on automation_runs[\s\S]{0,140}seerist_is_ws_member/);
  });

  it('one failing workspace does not stop the rest of the tick', () => {
    expect(tick).toMatch(/catch \(e\) \{[\s\S]{0,220}status: 'failed'/);
  });
});

describe('running a job by hand', () => {
  it('is scoped to a single workspace, never everyone', () => {
    expect(tick).toContain('workspace_id is required when running a job by hand');
  });
});

describe('the schedules are defined as code', () => {
  const script = readRepoFile('insforge/scripts/apply-schedules.mjs');

  it('registers one schedule per job', () => {
    for (const job of ['scan', 'nudge', 'stale']) expect(script).toContain(`job: '${job}'`);
    for (const fn of ['pm-insights', 'growth-feedback']) expect(script).toContain(`fn: '${fn}'`);
  });

  it('references the token as a secret rather than inlining it', () => {
    expect(script).toContain('${{secrets.AUTOMATION_TOKEN}}');
    expect(script).not.toMatch(/Bearer aut_[a-f0-9]/);
  });

  it('is re-runnable — an existing schedule is updated, not duplicated', () => {
    expect(script).toContain("method: 'PATCH'");
  });
});
