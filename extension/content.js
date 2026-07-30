// ============================================================================
// Seerist Capture — content script for upwork.com.
// 1) On job pages: injects "Capture to Seerist" and reads the ALREADY-RENDERED
//    DOM (title, description, budget, client stats). Nothing is fetched from
//    Upwork by Seerist servers — ever.
// 2) On proposal editors: injects "Autofill from Seerist" which fills the
//    cover-letter textarea with an APPROVED draft. The human clicks Upwork's
//    own Submit button. No scripted or automated click exists — hard
//    architectural constraint.
// ============================================================================

const BTN_ID = 'seerist-capture-btn';
const FILL_ID = 'seerist-autofill-btn';
const PANEL_ID = 'seerist-panel';

const styles = `
#${BTN_ID}, #${FILL_ID} {
  position: fixed; z-index: 999999; right: 18px; display: flex; align-items: center; gap: 8px;
  background: #0ea5e9; color: #04121e; font: 600 13px/1 system-ui, sans-serif;
  border: none; border-radius: 10px; padding: 11px 16px; cursor: pointer;
  box-shadow: 0 6px 24px rgba(2,6,16,0.35);
}
#${BTN_ID} { bottom: 24px; }
#${FILL_ID} { bottom: 72px; background: #34d399; }
#${BTN_ID}:hover, #${FILL_ID}:hover { filter: brightness(1.08); }
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

function text(sel) {
  const el = document.querySelector(sel);
  return el ? el.textContent.trim() : '';
}

function isJobPage() {
  return /\/jobs\/|\/nx\/jobs\//.test(location.pathname) && !isProposalPage();
}
function isProposalPage() {
  return /proposals\/job|\/apply\/|proposals\/new/.test(location.pathname) || !!coverLetterField();
}
function coverLetterField() {
  return (
    document.querySelector('textarea[aria-labelledby*="cover" i]') ||
    document.querySelector('textarea[name*="cover" i]') ||
    document.querySelector('textarea#cover_letter') ||
    document.querySelector('.cover-letter textarea') ||
    document.querySelector('textarea[placeholder*="cover" i]')
  );
}

function scrapeJob() {
  const title =
    text('h1') ||
    text('[data-test="job-title"]') ||
    text('.job-details-card h4') ||
    document.title.replace(/ - Upwork.*$/i, '');

  const descEl =
    document.querySelector('[data-test="Description"]') ||
    document.querySelector('[data-test="job-description-text"]') ||
    document.querySelector('section .break') ||
    document.querySelector('.job-description');
  const description = descEl ? descEl.textContent.trim() : '';

  let budget = '';
  const budgetEl =
    document.querySelector('[data-test="BudgetAmount"]') ||
    document.querySelector('[data-cy="budget"]') ||
    Array.from(document.querySelectorAll('strong, span')).find((el) => /^\$[\d,.]+(\s*-\s*\$[\d,.]+)?/.test(el.textContent.trim()));
  if (budgetEl) budget = budgetEl.textContent.trim().slice(0, 100);

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

  return { title: title.slice(0, 400), description: description.slice(0, 18000), budget, client_stats: clientStats, url: location.href.split('?')[0], platform: 'upwork' };
}

function toast(msg, ok = true) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `position:fixed;z-index:1000001;right:18px;bottom:120px;max-width:320px;background:${ok ? '#0b3b2a' : '#3b0b0b'};color:${ok ? '#34d399' : '#f87171'};border:1px solid ${ok ? '#34d399' : '#f87171'};border-radius:10px;padding:12px 14px;font:13px system-ui;box-shadow:0 8px 30px rgba(0,0,0,.5)`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

function mountCaptureButton() {
  if (document.getElementById(BTN_ID)) return;
  const btn = document.createElement('button');
  btn.id = BTN_ID;
  btn.textContent = '◎ Capture to Seerist';
  btn.addEventListener('click', () => {
    const job = scrapeJob();
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

function mountAutofillButton() {
  if (document.getElementById(FILL_ID)) return;
  const btn = document.createElement('button');
  btn.id = FILL_ID;
  btn.textContent = '✎ Autofill from Seerist';
  btn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'APPROVED_PROPOSALS' }, (res) => {
      if (!res?.ok) { toast(res?.error || 'Could not load approved proposals', false); return; }
      showPicker(res.proposals || []);
    });
  });
  document.body.appendChild(btn);
}

function showPicker(proposals) {
  document.getElementById(PANEL_ID)?.remove();
  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  const items = proposals.length
    ? proposals.map((p, i) => `<div class="item" data-i="${i}">${p.title.slice(0, 80)}</div>`).join('')
    : '<div class="note">No approved proposals yet. Approve one in the Pitch Queue first.</div>';
  panel.innerHTML = `<h4>Insert an approved draft</h4>${items}
    <div class="note">Seerist fills the field — <strong>you</strong> review and click Upwork's Submit. Nothing is ever submitted automatically.</div>`;
  panel.addEventListener('click', (e) => {
    const item = e.target.closest('.item');
    if (!item) return;
    const p = proposals[Number(item.dataset.i)];
    const field = coverLetterField();
    if (!field) { toast('Could not find the cover letter field on this page', false); return; }
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
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
  injectStyles();
  if (isJobPage()) mountCaptureButton();
  else document.getElementById(BTN_ID)?.remove();
  if (coverLetterField()) mountAutofillButton();
  else { document.getElementById(FILL_ID)?.remove(); document.getElementById(PANEL_ID)?.remove(); }
}

tick();
// Upwork is a SPA — re-evaluate on navigation.
new MutationObserver(() => tick()).observe(document.body, { childList: true, subtree: true });
