import { describe, expect, it } from 'vitest';
import { loadExtensionAdapters } from './helpers/load';

/**
 * Spec §4 requires capture and autofill on Upwork, Fiverr, Freelancer.com and
 * Toptal. The playbook calls these out as the first thing to test, because a
 * platform's markup changing silently is how capture dies without anyone
 * noticing.
 */

const JOB_PAGE = (body: string) => `<!doctype html><html><head><title>Test job</title></head><body>${body}</body></html>`;

describe('extension platform adapters', () => {
  it('registers an adapter for all four supported platforms', () => {
    const { ADAPTERS } = loadExtensionAdapters(JOB_PAGE(''), 'https://www.upwork.com/');
    expect(ADAPTERS.map((a) => a.platform).sort()).toEqual(['fiverr', 'freelancer', 'toptal', 'upwork']);
  });

  it.each([
    ['upwork', 'https://www.upwork.com/jobs/~012345'],
    ['fiverr', 'https://www.fiverr.com/briefs/abc'],
    ['freelancer', 'https://www.freelancer.com/projects/php/build-a-thing'],
    ['toptal', 'https://www.toptal.com/jobs/senior-engineer'],
  ])('matches the %s host and recognises its job page', (platform, url) => {
    const { currentAdapter } = loadExtensionAdapters(JOB_PAGE(''), url);
    const adapter = currentAdapter();
    expect(adapter).toBeTruthy();
    expect(adapter.platform).toBe(platform);
    expect(adapter.isJobPage()).toBe(true);
  });

  it('does not activate on an unsupported host', () => {
    const { currentAdapter } = loadExtensionAdapters(JOB_PAGE(''), 'https://example.com/jobs/1');
    expect(currentAdapter()).toBeNull();
  });

  it('captures title, description and budget from an Upwork job page', () => {
    const { currentAdapter, scrapeJob } = loadExtensionAdapters(
      JOB_PAGE(`
        <h1>Senior React Engineer</h1>
        <div data-test="Description">We need a dashboard built with React and TypeScript.</div>
        <div data-test="BudgetAmount">$3,000</div>
        <div data-test="AboutClientVisitor">Payment method verified $50K total spent 92% hire rate 4.9 of 5</div>
      `),
      'https://www.upwork.com/jobs/~012345',
    );
    const job = scrapeJob(currentAdapter());
    expect(job.platform).toBe('upwork');
    expect(job.title).toBe('Senior React Engineer');
    expect(job.description).toContain('dashboard');
    expect(job.budget).toBe('$3,000');
    expect(job.client_stats.payment_verified).toBe(true);
    expect(job.client_stats.hire_rate).toBe('92%');
    expect(job.url).toBe('https://www.upwork.com/jobs/~012345');
  });

  it('falls back to generic extraction when a platform changes its markup', () => {
    // No known selectors at all — capture must still produce something usable
    // rather than a dead button.
    const { currentAdapter, scrapeJob } = loadExtensionAdapters(
      JOB_PAGE(`
        <h1>Migrate our billing to a new provider</h1>
        <section><div class="details">${'We need help migrating billing. '.repeat(20)}</div></section>
        <span>$1,500</span>
      `),
      'https://www.freelancer.com/projects/php/migrate-billing',
    );
    const job = scrapeJob(currentAdapter());
    expect(job.title).toBe('Migrate our billing to a new provider');
    expect(job.description.length).toBeGreaterThan(200);
    expect(job.budget).toContain('1,500');
  });

  it('truncates oversized fields so a huge page cannot break the API call', () => {
    const { currentAdapter, scrapeJob } = loadExtensionAdapters(
      JOB_PAGE(`<h1>${'x'.repeat(900)}</h1><div data-test="Description">${'y'.repeat(30000)}</div>`),
      'https://www.upwork.com/jobs/~1',
    );
    const job = scrapeJob(currentAdapter());
    expect(job.title.length).toBeLessThanOrEqual(400);
    expect(job.description.length).toBeLessThanOrEqual(18000);
  });

  it.each([
    ['upwork', 'https://www.upwork.com/nx/proposals/job/~1/apply/', '<textarea name="coverLetter"></textarea>'],
    ['fiverr', 'https://www.fiverr.com/briefs/abc/offer', '<form><textarea name="offer_description"></textarea></form>'],
    ['freelancer', 'https://www.freelancer.com/projects/php/x', '<form><textarea name="description"></textarea></form>'],
    ['toptal', 'https://www.toptal.com/jobs/x/apply', '<form><textarea name="cover_note"></textarea></form>'],
  ])('finds the %s proposal field for autofill', (_platform, url, markup) => {
    const { currentAdapter } = loadExtensionAdapters(JOB_PAGE(markup), url);
    expect(currentAdapter().proposalField()).toBeTruthy();
  });

  it('never contains a programmatic submit path', () => {
    // Spec §1/§6/§12: submission is always the human's own click. A regression
    // here is the single most damaging thing that could ship in this file.
    const { dom } = loadExtensionAdapters(JOB_PAGE(''), 'https://www.upwork.com/');
    const source = dom.window.document.documentElement.outerHTML; // keep dom referenced
    expect(source).toBeTruthy();
    const content = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '..', 'extension', 'content.js'), 'utf8',
    );
    expect(content).not.toMatch(/\.submit\(\)/);
    expect(content).not.toMatch(/type=["']submit["'][^>]*\)\s*\.click\(\)/);
    expect(content).not.toMatch(/querySelector\([^)]*submit[^)]*\)\s*\.click\(\)/i);
  });
});
