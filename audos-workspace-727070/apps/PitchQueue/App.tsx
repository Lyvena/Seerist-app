import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Send,
  Plus,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Clock,
  MessageSquare,
  AlertTriangle,
  ChevronRight,
  Trash2,
  Copy,
  Check,
  Loader2,
  Target,
  Shield,
  Zap,
} from 'lucide-react';
import { tw } from '../../lib/colors';

/* ============================================================================
 * Pitch Queue — Track Upwork matches & AI-drafted proposals
 *
 * WorkspaceDB table: pitch_queue (created on first write)
 * Columns: title, project_url, brief, proposal_draft, status, compliance_flags,
 *          budget, skills, notes
 * ==========================================================================*/

type PitchStatus = 'matched' | 'drafting' | 'ready' | 'applied' | 'replied';

interface Pitch {
  id: number;
  title: string;
  project_url: string;
  brief: string;
  proposal_draft: string;
  status: PitchStatus;
  compliance_flags: string;
  budget: string;
  skills: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

interface ComplianceFlag {
  id: string;
  label: string;
  severity: 'warning' | 'info';
}

declare global {
  interface Window {
    useWorkspaceDB: <T = unknown>(
      table: string,
      options?: {
        shared?: boolean;
        limit?: number;
        offset?: number;
        orderBy?: { column: string; direction: 'asc' | 'desc' };
        filters?: Array<{ column: string; operator: string; value: unknown }>;
      }
    ) => {
      data: T[];
      loading: boolean;
      error: Error | null;
      total: number;
      refresh: () => void;
    };
    __workspaceDb: {
      from: (table: string) => {
        insert: (row: Record<string, unknown>) => Promise<void>;
        update: (id: number, row: Record<string, unknown>) => Promise<void>;
        delete: (id: number) => Promise<void>;
      };
    };
  }
}

const STATUS_CONFIG: Record<
  PitchStatus,
  { label: string; icon: typeof Clock; badge: string }
> = {
  matched: { label: 'Matched', icon: Target, badge: tw.badge.neutral },
  drafting: { label: 'Drafting', icon: Loader2, badge: tw.badge.warning },
  ready: { label: 'Ready', icon: Sparkles, badge: tw.badge.primary },
  applied: { label: 'Applied', icon: Send, badge: tw.badge.success },
  replied: { label: 'Replied', icon: MessageSquare, badge: tw.badge.accent },
};

const FILTER_TABS: Array<{ key: PitchStatus | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'matched', label: 'Matched' },
  { key: 'ready', label: 'Ready' },
  { key: 'applied', label: 'Applied' },
  { key: 'replied', label: 'Replied' },
];

async function generateProposal(
  title: string,
  brief: string,
  budget: string,
  skills: string
): Promise<{ draft: string; flags: ComplianceFlag[] }> {
  const systemPrompt = `You are Seerist's AI Sales Agent — an expert Upwork proposal writer for SaaS founders and agencies.
Write policy-compliant, personalized proposals that:
- Open with a specific insight about the client's project (never generic "I read your post")
- Connect the freelancer's positioning brief to the client's needs
- Stay under 280 words
- Never mention AI, bots, or automated tools
- Never include contact info outside Upwork
- Include a clear next step (call, milestone, or question)
- Mention relevant experience briefly

After the proposal, on a new line write exactly "---COMPLIANCE---" then JSON array of compliance flags found, each with id, label, severity ("warning" or "info"). Check for: generic_opening, too_long, missing_portfolio_link, rate_not_mentioned, policy_risk, weak_cta. Empty array if none.`;

  const userPrompt = `Project: ${title}
Budget: ${budget || 'Not specified'}
Skills needed: ${skills || 'Not specified'}

Our positioning brief:
${brief || 'Experienced SaaS/agency team delivering high-quality results on time.'}

Write the proposal now.`;

  const response = await fetch('/proxy/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 900,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error('AI draft failed — try again in a moment');
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content || '';

  const parts = content.split('---COMPLIANCE---');
  const draft = parts[0]?.trim() || content.trim();
  let flags: ComplianceFlag[] = [];

  if (parts[1]) {
    try {
      const parsed = JSON.parse(parts[1].trim());
      if (Array.isArray(parsed)) flags = parsed;
    } catch {
      flags = analyzeCompliance(draft);
    }
  } else {
    flags = analyzeCompliance(draft);
  }

  return { draft, flags };
}

function analyzeCompliance(draft: string): ComplianceFlag[] {
  const flags: ComplianceFlag[] = [];
  const words = draft.split(/\s+/).length;
  const lower = draft.toLowerCase();

  if (words > 280) {
    flags.push({ id: 'too_long', label: `Proposal is ${words} words (max 280)`, severity: 'warning' });
  }
  if (/i (read|saw) your (post|job|project)/i.test(draft)) {
    flags.push({ id: 'generic_opening', label: 'Generic opening detected', severity: 'warning' });
  }
  if (!/\$|rate|budget|price|hour/i.test(draft)) {
    flags.push({ id: 'rate_not_mentioned', label: 'No rate or budget reference', severity: 'info' });
  }
  if (/portfolio|case study|previous work/i.test(draft) && !/http|\.com|link/i.test(draft)) {
    flags.push({ id: 'missing_portfolio_link', label: 'Portfolio mentioned but no link', severity: 'info' });
  }
  if (/whatsapp|telegram|email me|contact me at/i.test(lower)) {
    flags.push({ id: 'policy_risk', label: 'Off-platform contact detected', severity: 'warning' });
  }
  if (!/\?|call|chat|discuss|next step|schedule/i.test(lower)) {
    flags.push({ id: 'weak_cta', label: 'Weak call-to-action', severity: 'info' });
  }

  return flags;
}

function parseFlags(raw: string): ComplianceFlag[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function PitchQueue() {
  const { data: pitches, loading, error, refresh } = window.useWorkspaceDB<Pitch>('pitch_queue', {
    orderBy: { column: 'created_at', direction: 'desc' },
    limit: 100,
  });

  const [filter, setFilter] = useState<PitchStatus | 'all'>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formBrief, setFormBrief] = useState('');
  const [formBudget, setFormBudget] = useState('');
  const [formSkills, setFormSkills] = useState('');

  const draftRef = useRef<HTMLTextAreaElement>(null);

  const filtered = useMemo(() => {
    const list = pitches || [];
    if (filter === 'all') return list;
    return list.filter((p) => p.status === filter);
  }, [pitches, filter]);

  const selected = useMemo(
    () => (pitches || []).find((p) => p.id === selectedId) ?? null,
    [pitches, selectedId]
  );

  const stats = useMemo(() => {
    const list = pitches || [];
    return {
      total: list.length,
      matched: list.filter((p) => p.status === 'matched').length,
      ready: list.filter((p) => p.status === 'ready').length,
      applied: list.filter((p) => p.status === 'applied').length,
      replied: list.filter((p) => p.status === 'replied').length,
    };
  }, [pitches]);

  useEffect(() => {
    if (!selectedId && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const handleAdd = async () => {
    const title = formTitle.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      await window.__workspaceDb.from('pitch_queue').insert({
        title,
        project_url: formUrl.trim(),
        brief: formBrief.trim(),
        proposal_draft: '',
        status: 'matched',
        compliance_flags: '[]',
        budget: formBudget.trim(),
        skills: formSkills.trim(),
        notes: '',
      });
      setFormTitle('');
      setFormUrl('');
      setFormBrief('');
      setFormBudget('');
      setFormSkills('');
      setShowAdd(false);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async (pitch: Pitch) => {
    if (generating) return;
    setGenerating(true);
    try {
      await window.__workspaceDb.from('pitch_queue').update(pitch.id, { status: 'drafting' });
      refresh();

      const { draft, flags } = await generateProposal(
        pitch.title,
        pitch.brief,
        pitch.budget,
        pitch.skills
      );

      await window.__workspaceDb.from('pitch_queue').update(pitch.id, {
        proposal_draft: draft,
        compliance_flags: JSON.stringify(flags),
        status: 'ready',
      });
      refresh();
    } catch (err) {
      await window.__workspaceDb.from('pitch_queue').update(pitch.id, { status: 'matched' });
      refresh();
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusChange = async (id: number, status: PitchStatus) => {
    await window.__workspaceDb.from('pitch_queue').update(id, { status });
    refresh();
  };

  const handleDraftSave = async (id: number, draft: string) => {
    const flags = analyzeCompliance(draft);
    await window.__workspaceDb.from('pitch_queue').update(id, {
      proposal_draft: draft,
      compliance_flags: JSON.stringify(flags),
    });
    refresh();
  };

  const handleDelete = async (id: number) => {
    await window.__workspaceDb.from('pitch_queue').delete(id);
    if (selectedId === id) setSelectedId(null);
    refresh();
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const complianceFlags = selected ? parseFlags(selected.compliance_flags) : [];
  const hasWarnings = complianceFlags.some((f) => f.severity === 'warning');

  return (
    <div className="min-h-full flex flex-col w-full bg-transparent">
      {/* Hero strip */}
      <div className="relative overflow-hidden px-5 pt-4 pb-5 border-b border-[var(--space-border-default)]">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 10% 0%, var(--space-brand-primary-100), transparent 60%), radial-gradient(ellipse 60% 50% at 90% 100%, var(--space-brand-highlight-100), transparent 55%)',
          }}
        />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[var(--space-surface-accent-soft)] text-[var(--space-text-accent)]">
                <Zap className="w-3 h-3" /> AI Sales Agent
              </span>
            </div>
            <p className={`text-sm ${tw.typography.color.secondary}`}>
              Matched gigs → tailored proposals → application-ready
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium ${tw.button.primary}`}
            data-testid="button-add-pitch"
          >
            <Plus className="w-4 h-4" /> Add match
          </button>
        </div>

        {/* Stats */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
          {[
            { label: 'In queue', value: stats.total, icon: Target },
            { label: 'Ready to send', value: stats.ready, icon: Sparkles },
            { label: 'Applied', value: stats.applied, icon: Send },
            { label: 'Replied', value: stats.replied, icon: MessageSquare },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className={`px-3.5 py-3 rounded-xl ${tw.card.default} border-[var(--space-border-default)]`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs ${tw.typography.color.tertiary}`}>{label}</span>
                <Icon className={`w-3.5 h-3.5 ${tw.icon.muted}`} />
              </div>
              <span className={`text-2xl font-semibold tracking-tight ${tw.typography.color.primary}`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-5 py-2.5 border-b border-[var(--space-border-default)] overflow-x-auto">
        {FILTER_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              filter === key
                ? 'bg-[var(--space-brand-primary)] text-[var(--space-text-on-primary)] shadow-sm'
                : `${tw.button.ghost} text-[var(--space-text-muted)]`
            }`}
          >
            {label}
            {key !== 'all' && (
              <span className="ml-1 opacity-70">
                {key === 'matched'
                  ? stats.matched
                  : key === 'ready'
                    ? stats.ready
                    : key === 'applied'
                      ? stats.applied
                      : stats.replied}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main split */}
      <div className="flex-1 flex min-h-0">
        {/* List panel */}
        <div className="w-full md:w-[42%] lg:w-[38%] border-r border-[var(--space-border-default)] flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className={`w-7 h-7 animate-spin ${tw.icon.primary}`} />
                <p className={`text-sm ${tw.typography.color.tertiary}`}>Loading pitch queue…</p>
              </div>
            ) : error ? (
              <div className="text-center py-16 px-4">
                <AlertTriangle className={`w-8 h-8 mx-auto mb-2 ${tw.icon.danger}`} />
                <p className={`text-sm ${tw.typography.color.danger}`}>{error.message}</p>
                <button onClick={refresh} className={`mt-3 px-3 py-1.5 text-sm rounded-lg ${tw.button.secondary}`}>
                  Try again
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${tw.bg.muted}`}>
                  <Send className={`w-6 h-6 ${tw.icon.muted}`} />
                </div>
                <p className={`text-sm font-medium ${tw.typography.color.primary}`}>No pitches yet</p>
                <p className={`text-xs mt-1 mb-4 ${tw.typography.color.tertiary}`}>
                  Add an Upwork match to draft your first proposal
                </p>
                <button
                  onClick={() => setShowAdd(true)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm ${tw.button.primary}`}
                >
                  <Plus className="w-4 h-4" /> Add your first match
                </button>
              </div>
            ) : (
              filtered.map((pitch) => {
                const cfg = STATUS_CONFIG[pitch.status as PitchStatus] || STATUS_CONFIG.matched;
                const StatusIcon = cfg.icon;
                const isActive = pitch.id === selectedId;
                const flagCount = parseFlags(pitch.compliance_flags).length;

                return (
                  <button
                    key={pitch.id}
                    onClick={() => setSelectedId(pitch.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 group ${
                      isActive
                        ? 'border-[var(--space-brand-primary-500)]/50 bg-[var(--space-surface-card)] shadow-[0_4px_16px_var(--space-shell-shadow)]'
                        : `${tw.card.default} hover:border-[var(--space-brand-primary-200)] hover:-translate-y-px`
                    }`}
                    data-testid={`pitch-row-${pitch.id}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className={`text-sm font-medium line-clamp-2 ${tw.typography.color.primary}`}>
                        {pitch.title}
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'rotate-90' : 'opacity-0 group-hover:opacity-50'} ${tw.icon.muted}`}
                      />
                    </div>
                    {pitch.budget && (
                      <p className={`text-xs mb-2 ${tw.typography.color.tertiary}`}>{pitch.budget}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.badge}`}>
                        <StatusIcon className={`w-3 h-3 ${pitch.status === 'drafting' ? 'animate-spin' : ''}`} />
                        {cfg.label}
                      </span>
                      {flagCount > 0 && pitch.status === 'ready' && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${tw.badge.warning}`}>
                          <Shield className="w-3 h-3" /> {flagCount} flag{flagCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Detail panel — hidden on mobile when nothing selected */}
        <div
          className={`hidden md:flex flex-1 flex-col min-h-0 ${selected ? '' : 'items-center justify-center'}`}
        >
          {!selected ? (
            <div className="text-center px-8">
              <Target className={`w-10 h-10 mx-auto mb-3 ${tw.icon.muted}`} />
              <p className={`text-sm ${tw.typography.color.tertiary}`}>Select a pitch to review its draft</p>
            </div>
          ) : (
            <PitchDetail
              pitch={selected}
              generating={generating}
              copied={copied}
              complianceFlags={complianceFlags}
              hasWarnings={hasWarnings}
              draftRef={draftRef}
              onGenerate={() => handleGenerate(selected)}
              onStatusChange={(s) => handleStatusChange(selected.id, s)}
              onDraftSave={(d) => handleDraftSave(selected.id, d)}
              onDelete={() => handleDelete(selected.id)}
              onCopy={() => handleCopy(selected.proposal_draft)}
            />
          )}
        </div>
      </div>

      {/* Mobile detail drawer */}
      {selected && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-[var(--space-surface-card)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--space-border-default)]">
            <button
              onClick={() => setSelectedId(null)}
              className={`text-sm font-medium ${tw.typography.color.secondary}`}
            >
              ← Back
            </button>
            <button
              onClick={() => handleDelete(selected.id)}
              className={`p-2 rounded-lg ${tw.button.ghost} ${tw.icon.danger}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <PitchDetail
            pitch={selected}
            generating={generating}
            copied={copied}
            complianceFlags={complianceFlags}
            hasWarnings={hasWarnings}
            draftRef={draftRef}
            onGenerate={() => handleGenerate(selected)}
            onStatusChange={(s) => handleStatusChange(selected.id, s)}
            onDraftSave={(d) => handleDraftSave(selected.id, d)}
            onDelete={() => handleDelete(selected.id)}
            onCopy={() => handleCopy(selected.proposal_draft)}
          />
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'color-mix(in srgb, var(--space-text-primary) 35%, transparent)' }}
          onClick={() => setShowAdd(false)}
        >
          <div
            className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl ${tw.bg.card} border border-[var(--space-border-default)]`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-lg font-semibold mb-1 ${tw.typography.color.primary}`}>Add Upwork match</h3>
            <p className={`text-sm mb-5 ${tw.typography.color.tertiary}`}>
              Paste a project URL and your positioning brief — AI will draft a compliant proposal.
            </p>

            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-medium mb-1 ${tw.typography.color.secondary}`}>
                  Project title *
                </label>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. SaaS dashboard redesign"
                  className={`${tw.input.base} ${tw.input.default} text-sm py-2.5`}
                  data-testid="input-pitch-title"
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${tw.typography.color.secondary}`}>
                  Upwork URL
                </label>
                <input
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://www.upwork.com/jobs/..."
                  className={`${tw.input.base} ${tw.input.default} text-sm py-2.5`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${tw.typography.color.secondary}`}>
                    Budget
                  </label>
                  <input
                    value={formBudget}
                    onChange={(e) => setFormBudget(e.target.value)}
                    placeholder="$5k fixed"
                    className={`${tw.input.base} ${tw.input.default} text-sm py-2.5`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${tw.typography.color.secondary}`}>
                    Skills
                  </label>
                  <input
                    value={formSkills}
                    onChange={(e) => setFormSkills(e.target.value)}
                    placeholder="React, Node"
                    className={`${tw.input.base} ${tw.input.default} text-sm py-2.5`}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${tw.typography.color.secondary}`}>
                  Positioning brief
                </label>
                <textarea
                  value={formBrief}
                  onChange={(e) => setFormBrief(e.target.value)}
                  rows={3}
                  placeholder="We're a SaaS agency specializing in…"
                  className={`${tw.input.base} ${tw.input.default} text-sm py-2.5 resize-none`}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowAdd(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${tw.button.secondary}`}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={busy || !formTitle.trim()}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 ${tw.button.primary} disabled:opacity-40`}
                data-testid="button-save-pitch"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add to queue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Detail sub-view (inline to keep single-file) ---- */

interface PitchDetailProps {
  pitch: Pitch;
  generating: boolean;
  copied: boolean;
  complianceFlags: ComplianceFlag[];
  hasWarnings: boolean;
  draftRef: React.RefObject<HTMLTextAreaElement>;
  onGenerate: () => void;
  onStatusChange: (status: PitchStatus) => void;
  onDraftSave: (draft: string) => void;
  onDelete: () => void;
  onCopy: () => void;
}

function PitchDetail({
  pitch,
  generating,
  copied,
  complianceFlags,
  hasWarnings,
  draftRef,
  onGenerate,
  onStatusChange,
  onDraftSave,
  onDelete,
  onCopy,
}: PitchDetailProps) {
  const [localDraft, setLocalDraft] = useState(pitch.proposal_draft);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalDraft(pitch.proposal_draft);
  }, [pitch.proposal_draft, pitch.id]);

  const handleDraftChange = (value: string) => {
    setLocalDraft(value);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onDraftSave(value), 800);
  };

  const cfg = STATUS_CONFIG[pitch.status as PitchStatus] || STATUS_CONFIG.matched;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Detail header */}
      <div className="px-5 py-4 border-b border-[var(--space-border-default)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={`text-base font-semibold leading-snug ${tw.typography.color.primary}`}>
              {pitch.title}
            </h3>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {pitch.budget && (
                <span className={`text-xs ${tw.typography.color.tertiary}`}>{pitch.budget}</span>
              )}
              {pitch.skills && (
                <span className={`text-xs ${tw.typography.color.tertiary}`}>{pitch.skills}</span>
              )}
              {pitch.project_url && (
                <a
                  href={pitch.project_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 text-xs font-medium hover:underline ${tw.typography.color.brand}`}
                >
                  View on Upwork <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
          <button
            onClick={onDelete}
            className={`hidden md:flex p-2 rounded-lg opacity-0 hover:opacity-100 focus:opacity-100 ${tw.button.ghost} hover:text-[var(--space-semantic-danger)]`}
            aria-label="Delete pitch"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Status actions */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.badge}`}>
            {cfg.label}
          </span>

          {pitch.status === 'matched' && (
            <button
              onClick={onGenerate}
              disabled={generating}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${tw.button.primary}`}
              data-testid="button-generate-draft"
            >
              {generating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {generating ? 'Drafting…' : 'Generate AI draft'}
            </button>
          )}

          {pitch.status === 'ready' && (
            <>
              <button
                onClick={() => onStatusChange('applied')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${tw.button.primary}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark applied
              </button>
              <button
                onClick={onGenerate}
                disabled={generating}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${tw.button.secondary}`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Regenerate
              </button>
            </>
          )}

          {pitch.status === 'applied' && (
            <button
              onClick={() => onStatusChange('replied')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${tw.button.accent}`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Client replied
            </button>
          )}
        </div>
      </div>

      {/* Brief */}
      {pitch.brief && (
        <div className={`mx-5 mt-4 px-4 py-3 rounded-xl ${tw.bg.muted} border border-[var(--space-border-default)]`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${tw.typography.color.tertiary}`}>
            Positioning brief
          </p>
          <p className={`text-sm leading-relaxed ${tw.typography.color.secondary}`}>{pitch.brief}</p>
        </div>
      )}

      {/* Compliance flags */}
      {complianceFlags.length > 0 && pitch.proposal_draft && (
        <div className="mx-5 mt-3 px-4 py-3 rounded-xl border border-[var(--space-border-default)] bg-[var(--space-surface-card)]">
          <div className="flex items-center gap-2 mb-2">
            <Shield className={`w-4 h-4 ${hasWarnings ? tw.icon.danger : tw.icon.primary}`} />
            <span className={`text-xs font-semibold uppercase tracking-wider ${tw.typography.color.secondary}`}>
              Compliance check
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {complianceFlags.map((flag) => (
              <span
                key={flag.id}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  flag.severity === 'warning' ? tw.badge.warning : tw.badge.neutral
                }`}
              >
                {flag.severity === 'warning' && <AlertTriangle className="w-3 h-3" />}
                {flag.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Proposal draft */}
      <div className="flex-1 flex flex-col min-h-0 px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <p className={`text-xs font-semibold uppercase tracking-wider ${tw.typography.color.tertiary}`}>
            Proposal draft
          </p>
          {pitch.proposal_draft && (
            <button
              onClick={onCopy}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${tw.button.ghost}`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[var(--space-semantic-success)]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
        </div>

        {pitch.status === 'drafting' || generating ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--space-border-default)]">
            <div className="relative">
              <Loader2 className={`w-8 h-8 animate-spin ${tw.icon.primary}`} />
              <Sparkles className={`w-4 h-4 absolute -top-1 -right-1 ${tw.icon.accent}`} />
            </div>
            <p className={`text-sm ${tw.typography.color.secondary}`}>AI Sales Agent is drafting…</p>
            <p className={`text-xs ${tw.typography.color.tertiary}`}>Tailoring to your brief & Upwork policy</p>
          </div>
        ) : pitch.proposal_draft || pitch.status === 'ready' ? (
          <textarea
            ref={draftRef}
            value={localDraft}
            onChange={(e) => handleDraftChange(e.target.value)}
            className={`flex-1 min-h-[200px] w-full p-4 rounded-xl border border-[var(--space-border-default)] bg-[var(--space-surface-card)] text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[var(--space-brand-primary)] ${tw.typography.color.primary}`}
            placeholder="Your proposal will appear here…"
            data-testid="textarea-proposal-draft"
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--space-border-default)] px-6 text-center">
            <Sparkles className={`w-8 h-8 ${tw.icon.muted}`} />
            <p className={`text-sm font-medium ${tw.typography.color.primary}`}>No draft yet</p>
            <p className={`text-xs ${tw.typography.color.tertiary}`}>
              Hit "Generate AI draft" to create a policy-compliant proposal
            </p>
            <button
              onClick={onGenerate}
              disabled={generating}
              className={`mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium ${tw.button.primary}`}
            >
              <Sparkles className="w-4 h-4" /> Generate draft
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
