// ============================================================================
// Seerist Capture — content script.
//
// Multi-platform by adapter (spec §4: Upwork, Fiverr, Freelancer.com, Toptal
// all get an extension adapter with platform-specific page selectors).
//
// 1) On job pages: injects "Capture to Seerist" and reads the ALREADY-RENDERED
//    DOM (title, description, budget, client stats). Nothing is fetched from
//    any platform by Seerist servers — ever.
// 2) On proposal editors: injects "Autofill from Seerist" which fills the
//    proposal field with an APPROVED draft. The human clicks the platform's
//    own Submit button. No scripted or automated click exists — hard
//    architectural constraint (spec §1, §6, §12).
// ============================================================================

const BTN_ID = 'seerist-capture-btn';
const BULK_ID = 'seerist-capture-all-btn';
const FILL_ID = 'seerist-autofill-btn';
const PANEL_ID = 'seerist-panel';

const styles = `
#${BTN_ID}, #${FILL_ID}, #${BULK_ID} {
  position: fixed; z-index: 999999; right: 18px; display: flex; align-items: center; gap: 8px;
  background: #0ea5e9; color: #04121e; font: 600 13px/1 system-ui, sans-serif;
  border: none; border-radius: 10px; padding: 11px 16px; cursor: pointer;
  box-shadow: 0 6px 24px rgba(2,6,16,0.35);
}
#${BTN_ID} { bottom: 24px; }
#${BULK_ID} { bottom: 24px; background: #6366f1; color: #fff; }
#${FILL_ID} { bottom: 72px; background: #34d399; }
#${BTN_ID}:hover, #${FILL_ID}:hover, #${BULK_ID}:hover { filter: brightness(1.08); }
#${BULK_ID}:disabled { opacity: 0.6; cursor: progress; }
#${PANEL_ID} {
  position: fixed; z-index: 1000000; right: 18px; bottom: 120px; width: 340px;
  background: #0b1220; color: #e6edf7; border: 1px solid #2b3d5f; border-radius: 12px;
  font: 13px/1.5 system-ui, sans-serif; padding: 14px; box-shadow: 0 12px 40px rgba(2,6,16,0.6);
}
#${PANEL_ID} h4 { margin: 0 0 8px; font-size: 13px; }
#${PANEL_ID} .item { padding: 8px 10px; border: 1px solid #1c2941; border-radius: 8px; margin-bottom: 6px; cursor: pointer; }
#${PANEL_ID} .item:hover { border-color: #38bdf8; }
#${PANEL_ID} .note { color: #93a4bf; font-size: 11.5px; margin-top: 8px; }
`;

function injectStyles() {
  if (document.getElementById('seerist-styles')) return;
  const el = document.createElement('style');
  el.id = 'seerist-styles';
  el.textContent = styles;
  document.head.appendChild(el);
}

// --- Shared DOM helpers -----------------------------------------------------

function text(sel) {
  const el = document.querySelector(sel);
  return el ? el.textContent.trim() : '';
}

/** First non-empty text match from a list of selectors. */
function firstText(selectors) {
  for (const sel of selectors) {
    const t = text(sel);
    if (t) return t;
  }
  return '';
}

function firstEl(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim()) return el;
  }
  return null;
}

/** Fallback: the densest block of text on the page, which is the job body. */
function densestTextBlock() {
  let best = null;
  let bestLen = 0;
  for (const el of document.querySelectorAll('article, section, main div, [class*="description" i], [class*="details" i]')) {
    if (el.querySelector('article, section')) continue;
    const len = el.textContent.trim().length;
    if (len > bestLen && len < 40000) { best = el; bestLen = len; }
  }
  return bestLen > 200 ? best.textContent.trim() : '';
}

/** Any visible "$1,234" / "$20 - $40" style amount on the page. */
function anyCurrencyText() {
  const el = Array.from(document.querySelectorAll('strong, span, div, b, p'))
    .find((n) => n.children.length === 0 && /^[$€£₹]\s?[\d,.]+(\s*-\s*[$€£₹]?\s?[\d,.]+)?/.test(n.textContent.trim()));
  return el ? el.textContent.trim().slice(0, 100) : '';
}

function textareaBySelectors(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

/**
 * Every job on a search-results page, so one click captures the whole search
 * instead of one posting at a time.
 *
 * Deliberately generic: all four platforms render results as a list of anchors
 * pointing at their own job URLs, so matching that URL shape finds the cards
 * without four sets of CSS selectors that break on every redesign.
 *
 * Same compliance posture as single capture — the user's own browser, their own
 * logged-in session, and an explicit click. Nothing is submitted.
 */
function collectListCards(linkPattern, limit = 40) {
  const seen = new Set();
  const out = [];
  for (const a of document.querySelectorAll('a[href]')) {
    let parsed;
    try {
      parsed = new URL(a.getAttribute('href'), location.origin);
    } catch {
      continue;
    }
    if (!linkPattern.test(parsed.pathname)) continue;
    const url = `${parsed.origin}${parsed.pathname}`;
    if (seen.has(url)) continue;
    const title = (a.textContent || '').replace(/\s+/g, ' ').trim();
    if (title.length < 8) continue; // thumbnails and icon links carry no title
    seen.add(url);

    const card = cardFor(a);
    const text = card ? card.textContent.replace(/\s+/g, ' ').trim() : title;
    const money = text.match(/[$€£₹]\s?[\d,.]+(\s*-\s*[$€£₹]?\s?[\d,.]+)?(\s*\/\s*hr)?/);
    const clientStats = {};
    if (/payment (method )?verified/i.test(text)) clientStats.payment_verified = true;
    const hire = text.match(/(\d+)%\s*hire rate/i);
    if (hire) clientStats.hire_rate = `${hire[1]}%`;

    out.push({
      title: title.slice(0, 400),
      description: text.slice(0, 4000),
      budget: money ? money[0].slice(0, 100) : '',
      client_stats: clientStats,
      url,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** The smallest ancestor big enough to be the result card, not just the link. */
function cardFor(anchor) {
  let el = anchor;
  for (let i = 0; i < 6 && el.parentElement; i += 1) {
    el = el.parentElement;
    if ((el.textContent || '').length > 120) return el;
  }
  return anchor.parentElement;
}

// --- Platform adapters ------------------------------------------------------
// Each adapter owns its platform's page selectors. Every adapter falls back to
// the shared generic helpers above, so a layout change degrades to a usable
// capture rather than a broken button.

const ADAPTERS = [
  {
    platform: 'upwork',
    hostPattern: /(^|\.)upwork\.com$/i,
    isJobPage: () => /\/jobs\/|\/nx\/jobs\//.test(location.pathname),
    isListPage: () => /\/(nx\/(search|find-work)|freelance-jobs|ab\/jobs\/search)/i.test(location.pathname),
    listLink: /\/jobs\/~|\/nx\/job-details\//i,
    scrape() {
      const title = firstText(['h1', '[data-test="job-title"]', '.job-details-card h4'])
        || document.title.replace(/ - Upwork.*$/i, '');
      const descEl = firstEl([
        '[data-test="Description"]',
        '[data-test="job-description-text"]',
        'section .break',
        '.job-description',
      ]);
      const description = descEl ? descEl.textContent.trim() : densestTextBlock();

      let budget = '';
      const budgetEl = firstEl(['[data-test="BudgetAmount"]', '[data-cy="budget"]']);
      budget = budgetEl ? budgetEl.textContent.trim().slice(0, 100) : anyCurrencyText();

      const clientStats = {};
      const aboutClient = document.querySelector('[data-test="AboutClientVisitor"], [data-qa="client-activity"], .client-info');
      if (aboutClient) {
        const t = aboutClient.textContent.replace(/\s+/g, ' ');
        if (/payment method verified/i.test(t)) clientStats.payment_verified = true;
        const spend = t.match(/\$[\d,.]+[KkMm]?\s+total spent/);
        if (spend) clientStats.total_spent = spend[0];
        const hire = t.match(/(\d+)%\s*hire rate/i);
        if (hire) clientStats.hire_rate = `${hire[1]}%`;
        const rating = t.match(/([\d.]+)\s*(of|\/)\s*5/);
        if (rating) clientStats.rating = rating[1];
      }
      return { title, description, budget, client_stats: clientStats };
    },
    proposalField: () => textareaBySelectors([
      'textarea[aria-labelledby*="cover" i]',
      'textarea[name*="cover" i]',
      'textarea#cover_letter',
      '.cover-letter textarea',
      'textarea[placeholder*="cover" i]',
    ]),
  },

  {
    platform: 'fiverr',
    hostPattern: /(^|\.)fiverr\.com$/i,
    isJobPage: () => /\/(briefs?|requests?|buyer-requests|manage_requests|opportunities)\b/i.test(location.pathname),
    isListPage: () => /\/(briefs|requests|buyer-requests|manage_requests|opportunities|search)\b/i.test(location.pathname)
      && !/\/(briefs|requests|opportunities)\/[A-Za-z0-9_-]{6,}/i.test(location.pathname),
    listLink: /\/(briefs|requests|opportunities)\/[A-Za-z0-9_-]{4,}/i,
    scrape() {
      const title = firstText(['h1', '[class*="brief-title" i]', '[class*="request-title" i]'])
        || document.title.replace(/ \| Fiverr.*$/i, '');
      const descEl = firstEl([
        '[class*="brief-description" i]',
        '[class*="request-description" i]',
        '[class*="description" i]',
        'main article',
      ]);
      const description = descEl ? descEl.textContent.trim() : densestTextBlock();

      const budgetEl = firstEl(['[class*="budget" i]', '[class*="price" i]']);
      const budget = budgetEl ? budgetEl.textContent.trim().slice(0, 100) : anyCurrencyText();

      const clientStats = {};
      const body = document.body.textContent.replace(/\s+/g, ' ');
      const country = body.match(/(?:From|Located in)\s+([A-Z][A-Za-z .]{2,30})/);
      if (country) clientStats.country = country[1].trim();
      const delivery = body.match(/(\d+)\s*day(?:s)?\s*delivery/i);
      if (delivery) clientStats.delivery_days = Number(delivery[1]);
      return { title, description, budget, client_stats: clientStats };
    },
    proposalField: () => textareaBySelectors([
      'textarea[name*="offer" i]',
      'textarea[placeholder*="offer" i]',
      'textarea[placeholder*="describe" i]',
      'textarea[class*="offer" i]',
      'form textarea',
    ]),
  },

  {
    platform: 'freelancer',
    hostPattern: /(^|\.)freelancer\.(com|[a-z]{2}|com\.[a-z]{2})$/i,
    isJobPage: () => /\/projects\//i.test(location.pathname),
    isListPage: () => /\/(jobs|search\/projects|freelance-jobs)\b/i.test(location.pathname)
      && !/\/projects\//i.test(location.pathname),
    listLink: /\/projects\/[A-Za-z0-9-]{4,}/i,
    scrape() {
      const title = firstText([
        'h1',
        '[class*="PageProjectViewLogout-header-title" i]',
        '[class*="project-title" i]',
      ]) || document.title.replace(/ \| Freelancer.*$/i, '');
      const descEl = firstEl([
        '[class*="PageProjectViewLogout-detail-description" i]',
        '[class*="project-description" i]',
        '[class*="description" i]',
        'main article',
      ]);
      const description = descEl ? descEl.textContent.trim() : densestTextBlock();

      const budgetEl = firstEl([
        '[class*="PageProjectViewLogout-header-byLine" i]',
        '[class*="budget" i]',
      ]);
      const budget = budgetEl ? budgetEl.textContent.trim().slice(0, 100) : anyCurrencyText();

      const clientStats = {};
      const body = document.body.textContent.replace(/\s+/g, ' ');
      if (/payment (method )?verified/i.test(body)) clientStats.payment_verified = true;
      const rating = body.match(/([\d.]+)\s*\/\s*5/);
      if (rating) clientStats.rating = rating[1];
      const bids = body.match(/(\d+)\s*bids?\b/i);
      if (bids) clientStats.bids = Number(bids[1]);
      return { title, description, budget, client_stats: clientStats };
    },
    proposalField: () => textareaBySelectors([
      'textarea[name*="description" i]',
      'textarea[formcontrolname*="description" i]',
      'textarea[placeholder*="proposal" i]',
      'textarea[placeholder*="describe" i]',
      'form textarea',
    ]),
  },

  {
    platform: 'toptal',
    hostPattern: /(^|\.)toptal\.com$/i,
    isJobPage: () => /\/(jobs?|roles?|engagements?|talent\/opportunities)\b/i.test(location.pathname),
    isListPage: () => /\/(jobs|roles|engagements|talent\/opportunities)\/?$/i.test(location.pathname),
    listLink: /\/(jobs|roles|engagements|opportunities)\/[A-Za-z0-9-]{2,}/i,
    scrape() {
      const title = firstText(['h1', '[class*="job-title" i]', '[class*="role-title" i]'])
        || document.title.replace(/ \| Toptal.*$/i, '');
      const descEl = firstEl([
        '[class*="job-description" i]',
        '[class*="role-description" i]',
        '[class*="description" i]',
        'main article',
      ]);
      const description = descEl ? descEl.textContent.trim() : densestTextBlock();

      const budgetEl = firstEl(['[class*="rate" i]', '[class*="budget" i]', '[class*="compensation" i]']);
      const budget = budgetEl ? budgetEl.textContent.trim().slice(0, 100) : anyCurrencyText();

      const clientStats = {};
      const body = document.body.textContent.replace(/\s+/g, ' ');
      const commitment = body.match(/(full[- ]time|part[- ]time|\d+\s*hours?\/week)/i);
      if (commitment) clientStats.commitment = commitment[1];
      const duration = body.match(/(\d+\+?\s*(?:months?|weeks?))\b/i);
      if (duration) clientStats.duration = duration[1];
      return { title, description, budget, client_stats: clientStats };
    },
    proposalField: () => textareaBySelectors([
      'textarea[name*="cover" i]',
      'textarea[name*="note" i]',
      'textarea[placeholder*="why" i]',
      'form textarea',
    ]),
  },
];

function currentAdapter() {
  return ADAPTERS.find((a) => a.hostPattern.test(location.hostname)) || null;
}

function scrapeJob(adapter) {
  const raw = adapter.scrape();
  return {
    title: (raw.title || '').slice(0, 400),
    description: (raw.description || '').slice(0, 18000),
    budget: (raw.budget || '').slice(0, 100),
    client_stats: raw.client_stats || {},
    url: location.href.split('?')[0],
    platform: adapter.platform,
  };
}

// --- UI ---------------------------------------------------------------------

function toast(msg, ok = true) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `position:fixed;z-index:1000001;right:18px;bottom:120px;max-width:320px;background:${ok ? '#0b3b2a' : '#3b0b0b'};color:${ok ? '#34d399' : '#f87171'};border:1px solid ${ok ? '#34d399' : '#f87171'};border-radius:10px;padding:12px 14px;font:13px system-ui;box-shadow:0 8px 30px rgba(0,0,0,.5)`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

function mountCaptureButton(adapter) {
  if (document.getElementById(BTN_ID)) return;
  const btn = document.createElement('button');
  btn.id = BTN_ID;
  btn.textContent = '◎ Capture to Seerist';
  btn.addEventListener('click', () => {
    const job = scrapeJob(adapter);
    if (!job.title) { toast('Could not read a job title on this page', false); return; }
    btn.disabled = true;
    chrome.runtime.sendMessage({ type: 'CAPTURE', job }, (res) => {
      btn.disabled = false;
      if (!res?.ok) { toast(res?.error || 'Capture failed', false); return; }
      if (res.captured) toast('Captured! It\'s in your Pitch Queue as "New".');
      else toast(res.note || `Stored locally (${res.queued} queued) — will sync when online.`);
    });
  });
  document.body.appendChild(btn);
}

function mountBulkButton(adapter) {
  const existing = document.getElementById(BULK_ID);
  const cards = collectListCards(adapter.listLink);
  if (!cards.length) { existing?.remove(); return; }
  const label = `◎ Capture all ${cards.length} to Seerist`;
  if (existing) { if (existing.textContent !== label && !existing.disabled) existing.textContent = label; return; }

  const btn = document.createElement('button');
  btn.id = BULK_ID;
  btn.textContent = label;
  btn.addEventListener('click', () => {
    const jobs = collectListCards(adapter.listLink).map((c) => ({ ...c, platform: adapter.platform }));
    if (!jobs.length) { toast('No job cards found on this page', false); return; }
    btn.disabled = true;
    btn.textContent = `Capturing ${jobs.length}…`;
    chrome.runtime.sendMessage({ type: 'CAPTURE_MANY', jobs }, (res) => {
      btn.disabled = false;
      btn.textContent = label;
      if (!res?.ok) { toast(res?.error || 'Capture failed', false); return; }
      const parts = [`${res.captured} captured`];
      if (res.duplicates) parts.push(`${res.duplicates} already in your queue`);
      if (res.queued) parts.push(`${res.queued} queued offline`);
      toast(`${parts.join(', ')}. Scores appear in your Pitch Queue shortly.`);
    });
  });
  document.body.appendChild(btn);
}

function mountAutofillButton(adapter) {
  if (document.getElementById(FILL_ID)) return;
  const btn = document.createElement('button');
  btn.id = FILL_ID;
  btn.textContent = '✎ Autofill from Seerist';
  btn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'APPROVED_PROPOSALS' }, (res) => {
      if (!res?.ok) { toast(res?.error || 'Could not load approved proposals', false); return; }
      showPicker(res.proposals || [], adapter);
    });
  });
  document.body.appendChild(btn);
}

function showPicker(proposals, adapter) {
  document.getElementById(PANEL_ID)?.remove();
  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  const items = proposals.length
    ? proposals.map((p, i) => `<div class="item" data-i="${i}">${p.title.slice(0, 80)}</div>`).join('')
    : '<div class="note">No approved proposals yet. Approve one in the Pitch Queue first.</div>';
  panel.innerHTML = `<h4>Insert an approved draft</h4>${items}
    <div class="note">Seerist fills the field — <strong>you</strong> review and click ${adapter.platform}'s Submit. Nothing is ever submitted automatically.</div>`;
  panel.addEventListener('click', (e) => {
    const item = e.target.closest('.item');
    if (!item) return;
    const p = proposals[Number(item.dataset.i)];
    const field = adapter.proposalField();
    if (!field) { toast('Could not find the proposal field on this page', false); return; }
    const proto = field instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(field, p.draft);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    panel.remove();
    toast('Draft inserted. Review it, then click Submit yourself.');
  });
  document.body.appendChild(panel);
  setTimeout(() => {
    const close = (ev) => { if (!panel.contains(ev.target)) { panel.remove(); document.removeEventListener('click', close); } };
    document.addEventListener('click', close);
  }, 100);
}

function tick() {
  const adapter = currentAdapter();
  if (!adapter) return;
  injectStyles();

  const onProposalEditor = !!adapter.proposalField();
  // A results page is checked first: on some platforms its URL also matches the
  // job-page pattern, and scraping a list as though it were one posting would
  // capture nonsense.
  const onList = !onProposalEditor && typeof adapter.isListPage === 'function' && adapter.isListPage();

  if (onList) mountBulkButton(adapter);
  else document.getElementById(BULK_ID)?.remove();

  if (adapter.isJobPage() && !onProposalEditor && !onList) mountCaptureButton(adapter);
  else document.getElementById(BTN_ID)?.remove();

  if (onProposalEditor) mountAutofillButton(adapter);
  else { document.getElementById(FILL_ID)?.remove(); document.getElementById(PANEL_ID)?.remove(); }
}

// Only auto-start inside a real extension context. Tests load this file to
// exercise the adapters directly, and must not start the observer.
if (typeof chrome !== 'undefined' && chrome.runtime) {
  tick();
  // Every supported platform is a SPA — re-evaluate on navigation.
  new MutationObserver(() => tick()).observe(document.body, { childList: true, subtree: true });
}

/* c8 ignore next 3 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ADAPTERS, currentAdapter, scrapeJob, collectListCards };
}
