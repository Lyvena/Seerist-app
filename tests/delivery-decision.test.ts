import { describe, expect, it } from 'vitest';
import { loadFunctionScope, readRepoFile } from './helpers/load';

/**
 * The default-stack decision (playbook prompt 2.2) picks the backend a won
 * contract gets built on. Two properties matter more than which stack wins:
 * a client's own stack is never overridden, and an unclear answer falls back
 * to the fuller server-side stack rather than to nothing.
 */

const source = readRepoFile('insforge/functions/trigger-delivery-run.ts');
const schema = readRepoFile('insforge/schema.sql');

const { explicitStack, normalizeStackChoice, DEFAULT_STACK_RULE, DEFAULT_TARGET_STACK } =
  loadFunctionScope('insforge/functions/trigger-delivery-run.ts', [
    'explicitStack', 'normalizeStackChoice', 'DEFAULT_STACK_RULE', 'DEFAULT_TARGET_STACK',
  ]);

describe('an explicitly requested stack is honoured', () => {
  it('never overrides a client-specified stack', () => {
    const decision = explicitStack('client_specified');
    expect(decision.stack).toBe('client_specified');
    expect(decision.reasoning).toMatch(/never forces a default/i);
  });

  it('honours a workspace picking either stack by hand', () => {
    expect(explicitStack('instantdb').stack).toBe('instantdb');
    expect(explicitStack('insforge').stack).toBe('insforge');
  });

  it('ignores a stack it does not recognise instead of storing it', () => {
    // Anything unrecognised hands the decision back to the rule rather than
    // writing a value the delivery_runs check constraint would reject.
    for (const junk of ['supabase', 'firebase', 'INSTANTDB', '', null, undefined, 7, {}]) {
      expect(explicitStack(junk as unknown)).toBeNull();
    }
  });
});

describe('the model’s vote is normalised before it is stored', () => {
  it('picks InstantDB only on an exact match', () => {
    expect(normalizeStackChoice('instantdb')).toBe('instantdb');
  });

  it('falls back to the fuller server-side stack for anything else', () => {
    for (const answer of ['insforge', 'InstantDB', 'both', '', null, undefined, {}]) {
      expect(normalizeStackChoice(answer as unknown)).toBe('insforge');
    }
    expect(DEFAULT_TARGET_STACK).toBe('insforge');
  });
});

describe('the decision rule itself', () => {
  it('states both halves of the rule the spec asks for', () => {
    expect(DEFAULT_STACK_RULE).toMatch(/instantdb/i);
    expect(DEFAULT_STACK_RULE).toMatch(/real-time|collaborative/i);
    expect(DEFAULT_STACK_RULE).toMatch(/insforge/i);
    expect(DEFAULT_STACK_RULE).toMatch(/server-side/i);
  });

  it('prefers the workspace’s own learned rules over the built-in default', () => {
    expect(source).toContain('kind=eq.decision_rule');
    expect(source).toMatch(/rules\.map\(.*\)\.join\('\\n'\) \|\| DEFAULT_STACK_RULE/);
  });

  it('feeds the decision back into workspace memory so it compounds', () => {
    expect(source).toContain("kind: 'decision_rule'");
    expect(source).toContain('workspace_memories');
  });
});

describe('the decision is auditable after the fact', () => {
  it('stores the chosen stack and the reason on the run', () => {
    expect(source).toContain('target_stack: stack');
    expect(source).toContain('stack_reasoning: stackReasoning');
  });

  it('records the decision in the run trace and the persona log', () => {
    expect(source).toMatch(/event: 'run_created', stack, reasoning: stackReasoning/);
    expect(source).toContain("persona: 'The Builder'");
  });
});

describe('a delivery run only ever follows a real win', () => {
  it('refuses to start one for a proposal that has not been won', () => {
    expect(source).toMatch(/outcome !== 'won'/);
    expect(source).toMatch(/only be triggered for WON proposals/);
  });

  it('refuses to create a second run for the same proposal', () => {
    expect(source).toMatch(/already exists for this proposal/);
  });
});

describe('schema', () => {
  it('constrains target_stack to the three known values', () => {
    expect(schema).toMatch(/check \(target_stack in \('instantdb','insforge','client_specified'\)\)/);
  });

  it('defaults a run to the fuller server-side stack', () => {
    expect(schema).toMatch(/target_stack text not null default 'insforge'/);
  });

  it('keeps a column for the reasoning, so no decision is unexplained', () => {
    expect(schema).toMatch(/stack_reasoning text/);
  });
});
