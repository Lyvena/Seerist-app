import { describe, expect, it } from 'vitest';
import { loadFunctionScope, readRepoFile } from './helpers/load';

/**
 * The learning loop is what makes month six better than month one. Two things
 * have to be true for it to be honest: it must use the workspace's own results
 * rather than a general prior, and it must stay silent until there are enough
 * of them to mean something.
 */

const draft = readRepoFile('insforge/functions/draft-proposal.ts');
// Scoring and its calibration live in _shared: the scheduled scan needs the
// same behaviour, and this platform forbids one function calling another.
const score = readRepoFile('insforge/functions/_shared.ts');
const analytics = readRepoFile('insforge/functions/analytics-summary.ts');
const outcome = readRepoFile('insforge/functions/record-outcome.ts');
const schema = readRepoFile('insforge/schema.sql');

const { keywords } = loadFunctionScope('insforge/functions/draft-proposal.ts', ['keywords']);

describe('recording why a bid ended the way it did', () => {
  it('accepts a reason and a category alongside the outcome', () => {
    expect(outcome).toContain('outcome_reason');
    expect(outcome).toContain('outcome_category');
  });

  it('keeps both optional — never block recording an outcome on the why', () => {
    expect(outcome).toMatch(/if \(typeof body\.outcome_reason === 'string'/);
    expect(outcome).toMatch(/if \(CATEGORIES\.includes\(body\.outcome_category\)\)/);
  });

  it('constrains the category so the data stays countable', () => {
    expect(schema).toMatch(/proposals_outcome_category_check/);
    expect(schema).toMatch(/'price','timing','fit','scope','competitor','no_response','client_silent','other'/);
  });

  it('puts the reason in the status history, so the trail explains itself', () => {
    expect(outcome).toMatch(/\[patch\.outcome_category, patch\.outcome_reason\]/);
  });
});

describe('drafting from what actually won', () => {
  it('retrieves the workspace’s own resolved bids', () => {
    expect(draft).toContain('outcome=in.(won,lost)');
    expect(draft).toContain('wonProposalEvidence');
  });

  it('prefers wins on the same platform and similar jobs', () => {
    expect(draft).toMatch(/j\.platform === job\?\.platform/);
    expect(draft).toContain('keywords(');
  });

  it('carries recent losses and their reasons so they are not repeated', () => {
    expect(draft).toMatch(/WHY RECENT BIDS WERE LOST/);
  });

  it('tells the model to reuse the angle, never the sentences', () => {
    expect(draft).toMatch(/never copy the wording|never the sentences/i);
  });

  it('changes nothing for a workspace with no history', () => {
    // A first-time user must get exactly today's behaviour, not a prompt full
    // of apologies about missing data.
    expect(draft).toMatch(/const empty = \{ block: '', rules: '' \}/);
    expect(draft).toMatch(/if \(!resolved\.length\) return empty/);
  });

  it('never lets missing history break a draft', () => {
    expect(draft).toMatch(/catch \{[\s\S]{0,160}return empty/);
  });

  it('compares jobs on content words, ignoring filler', () => {
    const k = keywords('Looking for a React developer to help with our dashboard');
    expect(k.has('react')).toBe(true);
    expect(k.has('dashboard')).toBe(true);
    expect(k.has('the')).toBe(false);
    expect(k.has('looking')).toBe(false);
    expect(k.has('for')).toBe(false);
  });
});

describe('calibrating the fit score against real outcomes', () => {
  it('says nothing until the sample is big enough to be honest', () => {
    expect(score).toMatch(/const MIN_SAMPLE = \d+/);
    expect(score).toMatch(/if \(resolved\.length < MIN_SAMPLE\) return quiet/);
  });

  it('measures conversion by score band, which is what makes a score mean something', () => {
    expect(score).toMatch(/\[\[80, 100\], \[60, 79\], \[0, 59\]\]/);
    expect(score).toContain('by_band');
  });

  it('feeds the most common loss reasons back into scoring', () => {
    expect(score).toContain('top_loss_reasons');
  });

  it('degrades to today’s behaviour if the history cannot be read', () => {
    expect(score).toMatch(/catch \{\s*return quiet;\s*\}/);
  });
});

describe('showing the user what was learned', () => {
  it('explains the wait instead of showing an empty panel', () => {
    expect(analytics).toContain('ready: false');
    expect(analytics).toMatch(/starts calibrating on your own results/);
  });

  it('breaks results down by score band, platform and loss reason', () => {
    expect(analytics).toContain('byScoreBand');
    expect(analytics).toContain('byPlatform');
    expect(analytics).toContain('lossReasons');
  });

  it('answers whether mentioning the product costs contracts', () => {
    // A SaaS workspace is trading two outcomes against each other and deserves
    // the real number rather than a hunch.
    expect(analytics).toContain('productMention');
    expect(analytics).toContain('withWinRate');
    expect(analytics).toContain('withoutWinRate');
  });

  it('uses the same minimum sample as the scorer, so the two never disagree', () => {
    // One constant, in _shared, read by both — not two numbers to keep in sync.
    expect(score).toMatch(/const MIN_SAMPLE = \d+/);
    expect(analytics).toContain('MIN_SAMPLE');
    expect(analytics).not.toMatch(/const MIN_SAMPLE = \d+/);
  });
});

describe('learning may never loosen a compliance rule', () => {
  it('leaves the curated mention policy the sole authority on product mentions', () => {
    expect(draft).toMatch(/let mentionPolicy = 'no_mention'/);
    expect(draft).toMatch(/if \(mentionPolicy === 'no_mention'\) productMentioned = false/);
  });
});
