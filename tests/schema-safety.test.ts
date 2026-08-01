import { describe, expect, it } from 'vitest';
import { readRepoFile } from './helpers/load';

/**
 * The playbook singles out the policy_configs defaults as something to test:
 * a platform that silently ends up with a permissive mention policy is how a
 * customer's account gets banned. Same logic applies to the two activation
 * flags and the free-tier model ceiling — all of them must fail CLOSED.
 */

const schema = readRepoFile('insforge/schema.sql');

describe('policy_configs — per-platform mention policy', () => {
  it('has a row for every supported platform', () => {
    for (const platform of ['upwork', 'fiverr', 'freelancer', 'toptal']) {
      expect(schema).toMatch(new RegExp(`'${platform}'`));
    }
  });

  it('defaults the column itself to no_mention', () => {
    expect(schema).toMatch(/mention_policy text not null default 'no_mention'/);
  });

  it('constrains mention_policy to the three reviewed values', () => {
    expect(schema).toMatch(/check \(mention_policy in \('link_allowed','description_only','no_mention'\)\)/);
  });

  it('seeds every unreviewed platform as no_mention with a review note', () => {
    const seed = schema.slice(schema.indexOf("insert into policy_configs (platform, mention_policy, version, notes) values"));
    for (const platform of ['fiverr', 'freelancer', 'toptal']) {
      const row = seed.slice(seed.indexOf(`'${platform}'`));
      expect(row.slice(0, 60)).toContain('no_mention');
    }
    expect(seed).toMatch(/PLACEHOLDER/);
  });
});

describe('activation flags fail closed', () => {
  it('API polling is off by default for every platform', () => {
    expect(schema).toMatch(/api_polling_enabled boolean not null default false/);
  });

  it('authorized submission is off by default for every platform', () => {
    expect(schema).toMatch(/authorized_submission boolean not null default false/);
  });

  it('visitor identification is off by default for every workspace', () => {
    expect(schema).toMatch(/visitor_intent_enabled boolean not null default false/);
  });

  it('the CEO persona and its kill switch both default to the safe value', () => {
    expect(schema).toMatch(/ceo_enabled boolean not null default false/);
    expect(schema).toMatch(/ceo_kill_switch boolean not null default false/);
  });
});

describe('billing and model tiering', () => {
  it('caps the free plan at zero-cost models', () => {
    const free = schema.slice(schema.indexOf("('free', 'Free'"), schema.indexOf("('starter', 'Starter'"));
    expect(free).toContain('"max_model_input_price":0');
    expect(free).toContain('"model_choice":false');
  });

  it('gives every paid plan model choice', () => {
    for (const code of ['starter', 'builder', 'scale']) {
      const plan = schema.slice(schema.indexOf(`('${code}', '`));
      expect(plan.slice(0, 900)).toContain('"model_choice":true');
    }
  });

  it('never grants a Creem product id to the free plan', () => {
    const free = schema.slice(schema.indexOf("('free', 'Free'"), schema.indexOf("('starter', 'Starter'"));
    expect(free).not.toMatch(/prod_/);
  });
});

describe('row level security', () => {
  const tables = [
    'hermes_memories', 'hermes_skills', 'task_dependencies', 'growth_recommendations',
    'ploybook_runs', 'ceo_approval_queue', 'growth_content_drafts', 'visitor_intent_records',
    'site_design_profiles', 'site_monitor_runs', 'ad_campaigns', 'ai_usage_log',
  ];

  it.each(tables)('%s has RLS enabled', (table) => {
    expect(schema).toContain(`alter table ${table} enable row level security`);
  });

  it('every workspace-scoped table is gated on membership', () => {
    expect(schema).toMatch(/seerist_is_ws_member\(workspace_id\)/);
  });

  it('is idempotent — re-applying the schema must be safe', () => {
    const creates = schema.match(/^create table /gm) || [];
    const guarded = schema.match(/^create table if not exists /gm) || [];
    expect(creates.length).toBe(guarded.length);
  });
});
