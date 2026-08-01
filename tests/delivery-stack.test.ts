import { describe, expect, it } from 'vitest';
import { readRepoFile } from './helpers/load';

/**
 * Provisioning a client's backend hands over real infrastructure and a live
 * credential, so the shape of that handover matters as much as the code:
 * the client must own the project, and their API key must never be persisted.
 */

const source = readRepoFile('insforge/functions/delivery-stack.ts');
const schema = readRepoFile('insforge/schema.sql');

describe('delivery-stack — co-branded provisioning', () => {
  it('uses the co-branded endpoints, not the white-label ones', () => {
    expect(source).toContain('/connect-user');
    expect(source).toContain('sync-project');
    // White-label would hide InsForge from the client and bill Seerist.
    expect(source).not.toContain('sync-embedded-project');
  });

  it('authenticates with the partnership secret header', () => {
    expect(source).toContain('X-Partnership-Secret');
    expect(source).toContain('INSFORGE_PARTNER_ID');
    expect(source).toContain('INSFORGE_PARTNER_SECRET');
  });

  it('fails closed with a 501 and a concrete next step when unconfigured', () => {
    expect(source).toContain('SETUP_MESSAGE');
    expect(source).toContain('partnerships@insforge.dev');
    expect(source).toMatch(/setupNeeded: true \}, 501\)/);
  });

  it('never persists the project API key', () => {
    // No column for it...
    expect(schema).not.toMatch(/stack_api_key/);
    // ...and no write path that could add one.
    const writes = source.match(/dbPatch\('delivery_runs'[\s\S]{0,600}?\}, token\)/g) || [];
    expect(writes.length).toBeGreaterThan(0);
    for (const w of writes) expect(w).not.toMatch(/api_key/);
  });

  it('reads credentials live and audits every read', () => {
    const block = source.slice(source.indexOf("if (op === 'refresh' || op === 'credentials')"));
    expect(block).toContain('read_stack_credentials');
    expect(block).toContain('logPersona');
  });

  it('refuses to provision an InstantDB run rather than half-provisioning it', () => {
    expect(source).toMatch(/target_stack === 'instantdb'/);
    expect(source).toMatch(/only provisions InsForge/i);
  });

  it('handles the client plan limit by offering their existing projects', () => {
    expect(source).toContain('candidate_projects');
    expect(source).toContain("reason: 'project_limit'");
    expect(source).toContain("op === 'attach'");
  });

  it('requires a valid owner email — the project belongs to a real account', () => {
    expect(source).toMatch(/A valid client_email is required/);
  });

  it('validates region and instance type against the documented values', () => {
    for (const region of ['us-east', 'us-west', 'ap-southeast', 'eu-central']) {
      expect(source).toContain(`'${region}'`);
    }
    expect(source).toContain("'nano'");
    expect(source).toMatch(/INSTANCE_TYPES\.includes\(body\.instance_type\)/);
  });
});

describe('delivery-stack — schema', () => {
  it.each([
    'stack_account_id', 'stack_project_id', 'stack_access_host',
    'stack_region', 'stack_owner_email', 'stack_provisioned_at',
  ])('delivery_runs records %s', (column) => {
    expect(schema).toContain(`alter table delivery_runs add column if not exists ${column}`);
  });
});

describe('the Builder writes against the real backend once provisioned', () => {
  const builder = readRepoFile('insforge/functions/execute-delivery-task.ts');

  it('injects the provisioned host into the task prompt', () => {
    expect(builder).toContain('function stackBlock');
    expect(builder).toContain('stack_access_host');
    expect(builder).toContain('TARGET BACKEND');
  });

  it('never puts a credential in the prompt', () => {
    const block = builder.slice(builder.indexOf('function stackBlock'), builder.indexOf('async function loadRunContext'));
    expect(block).not.toMatch(/api_key/);
    expect(block).toMatch(/never hardcode it/i);
  });
});
