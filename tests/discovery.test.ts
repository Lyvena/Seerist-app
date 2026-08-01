import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadFunctionScope, readRepoFile, repoRoot } from './helpers/load';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Discovery is the half of the product that finds work before the user has.
 * Two paths, one rule that governs both: they may read what the user already
 * receives or already has open, and they may never submit anything.
 */

const intake = readRepoFile('insforge/functions/ingest-job-email.ts');
const { firstRecipient, intakeToken, detectPlatform, cleanUrl, stripTags } =
  loadFunctionScope('insforge/functions/ingest-job-email.ts', [
    'firstRecipient', 'intakeToken', 'detectPlatform', 'cleanUrl', 'stripTags',
  ]);

describe('routing an inbound email to a workspace', () => {
  it('reads the token out of the plus-address', () => {
    expect(intakeToken('jobs+ab12cd34ef56@inbound.seerist.xyz')).toBe('ab12cd34ef56');
    expect(intakeToken('"Seerist" <jobs+ab12cd34ef56@inbound.seerist.xyz>')).toBe('ab12cd34ef56');
  });

  it('routes nowhere without a token rather than guessing', () => {
    for (const addr of ['jobs@inbound.seerist.xyz', 'someone@example.com', '', 'jobs+short@x.io']) {
      expect(intakeToken(addr)).toBeNull();
    }
  });

  it('never routes on the sender — a From address is trivially forged', () => {
    // The workspace lookup must key off the token only.
    expect(intake).toContain('intake_token=eq.');
    expect(intake).not.toMatch(/dbSelect\(\s*'workspaces',\s*`?from=eq/i);
  });

  it('handles the recipient shapes different mail webhooks send', () => {
    expect(firstRecipient({ to: 'a@b.co' })).toBe('a@b.co');
    expect(firstRecipient({ to: ['x@y.co'] })).toBe('x@y.co');
    expect(firstRecipient({ to: [{ address: 'z@w.co' }] })).toBe('z@w.co');
    expect(firstRecipient({ envelope: { to: 'e@f.co' } })).toBe('e@f.co');
    expect(firstRecipient({})).toBe('');
  });
});

describe('reading the email', () => {
  it('identifies the platform from the whole message, not just the sender', () => {
    expect(detectPlatform('noreply@e.fiverr.com New buyer request')).toBe('fiverr');
    expect(detectPlatform('Freelancer.com — 8 new projects')).toBe('freelancer');
    expect(detectPlatform('Toptal opportunity')).toBe('toptal');
    expect(detectPlatform('Upwork jobs you may like')).toBe('upwork');
  });

  it('defaults to upwork rather than failing when nothing matches', () => {
    expect(detectPlatform('a plain email')).toBe('upwork');
  });

  it('strips tracking parameters so the same job dedupes', () => {
    expect(cleanUrl('https://www.upwork.com/jobs/~012?utm_source=alert&sig=abc'))
      .toBe('https://www.upwork.com/jobs/~012');
    expect(cleanUrl('https://x.co/a#frag')).toBe('https://x.co/a');
  });

  it('rejects anything that is not a real link', () => {
    for (const bad of ['', 'not a url', 'javascript:alert(1)', 'mailto:a@b.co', null, undefined]) {
      expect(cleanUrl(bad)).toBeNull();
    }
  });

  it('reads an HTML-only email by stripping the markup', () => {
    const html = '<div><style>a{}</style><script>x()</script><h1>Build a dashboard</h1><p>Budget&nbsp;$8,000</p></div>';
    const text = stripTags(html);
    expect(text).toContain('Build a dashboard');
    expect(text).toContain('$8,000');
    expect(text).not.toContain('<');
    expect(text).not.toContain('x()');
  });
});

describe('what email intake is allowed to do', () => {
  it('goes through the same pipeline and guards as extension capture', () => {
    expect(intake).toContain("dbInsert('job_postings'");
    expect(intake).toContain("dbInsert('proposals'");
    expect(intake).toContain('bidding_enabled');
    expect(intake).toContain('kill_switch');
  });

  it('tags the source so an email-sourced job is always distinguishable', () => {
    expect(intake).toContain("source: 'email_alert'");
    const schema = readRepoFile('insforge/schema.sql');
    expect(schema).toMatch(/check \(source in \('extension_capture','api_poll','manual','email_alert'\)\)/);
  });

  it('skips jobs already in the queue instead of duplicating them', () => {
    expect(intake).toContain('&url=in.(');
    const schema = readRepoFile('insforge/schema.sql');
    expect(schema).toMatch(/unique index if not exists job_postings_workspace_url_key/);
  });

  it('submits nothing — discovery never touches the §12 boundary', () => {
    // Ignore prose: what matters is that no submission code path is reachable.
    const code = intake.replace(/\/\/.*$/gm, '');
    expect(code).not.toContain('submit-proposal');
    expect(code).not.toContain('partnership_authorized');
    expect(code).not.toMatch(/\.submit\(/);
    // A new job arrives in 'new', the first column, never further along.
    expect(code).toContain("status: 'new'");
  });

  it('leaves scoring to the scheduled scan so a big alert cannot time out', () => {
    expect(intake).toMatch(/automation-tick|scheduled scan/i);
    expect(intake).not.toContain("invokeFunction('score-job'");
  });
});

describe('capturing a whole search-results page', () => {
  function withPage(html: string, url: string) {
    const dom = new JSDOM(html, { url });
    const source = readFileSync(resolve(repoRoot, 'extension/content.js'), 'utf8');
    const shim: { exports: Record<string, any> } = { exports: {} };
    const run = new Function('window', 'document', 'location', 'module', 'MutationObserver', `
      with (window) { ${source} }
    `);
    run(dom.window, dom.window.document, dom.window.location, shim, dom.window.MutationObserver);
    return shim.exports;
  }

  const resultsHtml = `
    <div>
      <div class="card">
        <a href="/jobs/~01aaa">Build a real-time analytics dashboard for our SaaS</a>
        <p>We need charts, filters and CSV export. Payment method verified. 85% hire rate.</p>
        <span>$8,000</span>
      </div>
      <div class="card">
        <a href="/jobs/~01bbb">Migrate a Webflow site to Next.js</a>
        <p>Marketing site rebuild with the same design system and better Core Web Vitals.</p>
        <span>$3,500</span>
      </div>
      <div class="card"><a href="/jobs/~01aaa">Build a real-time analytics dashboard for our SaaS</a></div>
      <a href="/nx/settings/profile">Profile</a>
      <a href="/jobs/~01ccc">go</a>
    </div>`;

  it('finds every distinct job on the page', () => {
    const { collectListCards } = withPage(resultsHtml, 'https://www.upwork.com/nx/search/jobs/?q=react');
    const cards = collectListCards(/\/jobs\/~/i);
    expect(cards).toHaveLength(2);
    expect(cards[0].title).toContain('real-time analytics dashboard');
  });

  it('pulls budget and client signals out of each card', () => {
    const { collectListCards } = withPage(resultsHtml, 'https://www.upwork.com/nx/search/jobs/');
    const [first] = collectListCards(/\/jobs\/~/i);
    expect(first.budget).toContain('8,000');
    expect(first.client_stats).toMatchObject({ payment_verified: true, hire_rate: '85%' });
    expect(first.url).toBe('https://www.upwork.com/jobs/~01aaa');
  });

  it('ignores navigation links and untitled links', () => {
    const { collectListCards } = withPage(resultsHtml, 'https://www.upwork.com/nx/search/jobs/');
    const urls = collectListCards(/\/jobs\/~/i).map((c: any) => c.url);
    expect(urls.some((u: string) => u.includes('settings'))).toBe(false);
    expect(urls.some((u: string) => u.endsWith('~01ccc'))).toBe(false);
  });

  it('recognises a results page on every platform', () => {
    const cases: Array<[string, string]> = [
      ['https://www.upwork.com/nx/search/jobs/?q=react', 'upwork'],
      ['https://www.fiverr.com/briefs', 'fiverr'],
      ['https://www.freelancer.com/jobs/', 'freelancer'],
      ['https://www.toptal.com/jobs', 'toptal'],
    ];
    for (const [url, platform] of cases) {
      const { currentAdapter } = withPage('<div></div>', url);
      const adapter = currentAdapter();
      expect(adapter?.platform, url).toBe(platform);
      expect(adapter.isListPage(), url).toBe(true);
    }
  });

  it('does not treat a single job page as a results page', () => {
    const { currentAdapter } = withPage('<div></div>', 'https://www.upwork.com/jobs/~01aaa');
    expect(currentAdapter().isListPage()).toBe(false);
  });

  it('captures in bulk without ever submitting', () => {
    const worker = readRepoFile('extension/service-worker.js');
    expect(worker).toContain('CAPTURE_MANY');
    expect(worker).toContain('capture-job');
    expect(worker).not.toMatch(/submit-proposal|\.submit\(\)/);
  });
});
