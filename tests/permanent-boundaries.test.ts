import { describe, expect, it } from 'vitest';
import { readRepoFile } from './helpers/load';

/**
 * Spec §12 names two boundaries that are permanent, not feature flags:
 *
 *   1. No submission bypassing a human click without explicit platform
 *      authorization.
 *   2. The CEO persona never acts alone on money, contracts or deletions.
 *
 * The playbook is explicit that a coding agent's instinct toward "more
 * autonomous by default" runs directly against both. These assertions exist so
 * that instinct fails CI instead of reaching production.
 */

describe('permanent boundary — proposal submission', () => {
  const source = readRepoFile('insforge/functions/submit-proposal.ts');

  it('gates every submission on a per-platform authorization flag', () => {
    expect(source).toContain('policy_configs');
    expect(source).toContain('authorized_submission');
    // The refusal must come before any outbound submission call.
    const refusal = source.indexOf('if (!authorized)');
    const outbound = source.indexOf('partner_submit_url');
    expect(refusal).toBeGreaterThan(-1);
    expect(outbound).toBeGreaterThan(refusal);
  });

  it('refuses with 423 and points the human back at their own click', () => {
    expect(source).toMatch(/HUMAN_CLICK_MESSAGE/);
    expect(source).toMatch(/}, 423\)/);
  });

  it('has no scripted-click path anywhere', () => {
    expect(source).not.toMatch(/\.click\(\)/);
  });

  it('keeps the authorization flag server-side only', () => {
    // policy_configs has a SELECT policy for clients and no write policy, so a
    // browser can never flip the flag.
    const schema = readRepoFile('insforge/schema.sql');
    expect(schema).toMatch(/create policy pc_select on policy_configs for select/);
    expect(schema).not.toMatch(/create policy \w+ on policy_configs for (all|insert|update)/);
  });
});

describe('permanent boundary — the CEO approval gate', () => {
  const source = readRepoFile('insforge/functions/ceo-command.ts');

  it('treats every irreversible action class as approval-required', () => {
    for (const action of [
      'spend_money',
      'create_contract',
      'delete_workspace',
      'delete_organization',
      'archive_resource',
      'send_external_communication',
      'other',
    ]) {
      expect(source).toContain(`'${action}'`);
    }
  });

  it('only ever auto-executes the four allow-listed classes', () => {
    const block = source.slice(source.indexOf('const AUTO_ALLOWED'), source.indexOf('const APPROVAL_REQUIRED'));
    for (const allowed of [
      'reprioritize_backlog',
      'reallocate_tasks',
      'adjust_nonmonetary_settings',
      'surface_insights',
    ]) {
      expect(block).toContain(allowed);
    }
    for (const forbidden of ['spend_money', 'delete_organization', 'send_external_communication']) {
      expect(block).not.toContain(forbidden);
    }
  });

  it('queues rather than executes anything outside the allow-list', () => {
    const gate = source.indexOf('if (!AUTO_ALLOWED.has(actionType))');
    const queueInsert = source.indexOf("dbInsert('ceo_approval_queue'");
    const execute = source.indexOf('await executeAction(actionType');
    expect(gate).toBeGreaterThan(-1);
    // The queue insert happens inside the gate, before the execute path.
    expect(queueInsert).toBeGreaterThan(gate);
    expect(execute).toBeGreaterThan(queueInsert);
  });

  it('returns pending_approval instead of a result for gated actions', () => {
    expect(source).toContain("status: 'pending_approval'");
  });

  it('only executes a gated action through explicit human approval', () => {
    expect(source).toContain('async function approveAction');
    expect(source).toContain('async function rejectAction');
    // Approval re-checks the org gate (enabled + kill switch) before running.
    const approve = source.slice(source.indexOf('async function approveAction'), source.indexOf('async function rejectAction'));
    expect(approve).toContain('loadOrgOrRefuse');
    expect(approve).toContain('executeAction');
  });

  it('honours the org-level kill switch', () => {
    expect(source).toContain('ceo_kill_switch');
    expect(source).toMatch(/kill switch is active/i);
  });

  it('only org admins can decide, enforced by RLS', () => {
    const schema = readRepoFile('insforge/schema.sql');
    expect(schema).toMatch(/create policy ceoq_update on ceo_approval_queue[\s\S]{0,200}seerist_is_org_admin/);
  });
});
