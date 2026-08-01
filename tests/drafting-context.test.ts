import { describe, expect, it } from 'vitest';
import { readRepoFile } from './helpers/load';

/**
 * What The Drafter is allowed to say about the product is a compliance
 * decision, not a writing one: the policy comes from a curated row, and the
 * documentation it draws on has to still be in the context when it writes.
 */

const source = readRepoFile('insforge/functions/draft-proposal.ts');
const composio = readRepoFile('insforge/functions/composio-integrations.ts');

describe('product-mention policy is curated, never inferred', () => {
  it('starts from no_mention and only a stored row can widen it', () => {
    expect(source).toMatch(/let mentionPolicy = 'no_mention'/);
    expect(source).toContain("dbSelect(\n        'policy_configs'");
  });

  it('applies mention rules only to saas workspaces', () => {
    expect(source).toMatch(/if \(ws\.type === 'saas'\)/);
  });

  it('overrules the model when the policy forbids a mention', () => {
    // The model is asked to self-report; a no_mention platform does not trust it.
    expect(source).toMatch(/if \(mentionPolicy === 'no_mention'\) productMentioned = false/);
  });

  it('records which policy version produced the draft', () => {
    expect(source).toContain('mention_policy_applied');
    expect(source).toContain('policyVersion');
  });

  it('turns a product-mentioning bid into an attribution touchpoint', () => {
    expect(source).toContain('growth_touchpoints');
  });
});

describe('ingested product documentation survives to the draft', () => {
  it('reads product docs separately from the recency window', () => {
    // Every delivery run writes a memory, so a plain "12 most recent" read
    // would eventually contain no product documentation at all.
    expect(source).toContain('key=like.product_docs_*');
    expect(source).toMatch(/Promise\.all\(\[\s*\n\s*dbSelect\('workspace_memories'/);
  });

  it('de-duplicates the two reads so nothing is fed in twice', () => {
    expect(source).toContain('seen.has(m.id)');
  });

  it('ingests under the key prefix that the drafter looks for', () => {
    expect(composio).toContain('`product_docs_${target}_');
  });

  it('keeps document ingestion read-only', () => {
    expect(composio).toContain('NOTION_FETCH_A_PAGE');
    expect(composio).toContain('GOOGLEDOCS_GET_DOCUMENT_BY_ID');
  });
});
