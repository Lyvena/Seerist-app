"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Cpu, Lock, Eye, EyeOff, CheckCircle2, XCircle,
  TestTube, Save, Trash2, ShieldAlert, Sparkles,
  Sliders, Gauge, AlertTriangle, Info,
} from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { Button } from "@/components/ui/button"
import { updateAIPreferences, saveAIKey, removeAIKey, testAIKey } from "@/app/actions/ai-settings"
import { toast } from "sonner"

const MODELS = [
  {
    group: "OpenAI",
    models: [
      { id: "openai/gpt-4o", label: "GPT-4o", desc: "Best quality for proposals", context: "128K", cost: "$2.50/1M input" },
      { id: "openai/gpt-4o-mini", label: "GPT-4o Mini", desc: "Fast, cost-effective", context: "128K", cost: "$0.15/1M input" },
      { id: "openai/gpt-4-turbo", label: "GPT-4 Turbo", desc: "Legacy, high quality", context: "128K", cost: "$10.00/1M input" },
    ],
  },
  {
    group: "Anthropic",
    models: [
      { id: "anthropic/claude-sonnet-4-6", label: "Claude Sonnet 4", desc: "Great for nuanced proposals", context: "200K", cost: "$3.00/1M input" },
      { id: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5", desc: "Fast, lightweight", context: "200K", cost: "$0.80/1M input" },
    ],
  },
  {
    group: "Google",
    models: [
      { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", desc: "Long context window", context: "1M", cost: "$1.25/1M input" },
      { id: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash", desc: "Fast reasoning", context: "1M", cost: "$0.10/1M input" },
    ],
  },
  {
    group: "Meta",
    models: [
      { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", desc: "Open source, capable", context: "128K", cost: "$0.25/1M input" },
    ],
  },
]

const TONES = [
  { value: "professional", label: "Professional", desc: "Formal, business-appropriate tone" },
  { value: "casual", label: "Casual", desc: "Friendly, conversational style" },
  { value: "enthusiastic", label: "Enthusiastic", desc: "Energetic, persuasive language" },
  { value: "concise", label: "Concise", desc: "Short, direct, to-the-point" },
]

const KEYWORD_PENALTIES = [
  { value: "none", label: "None", desc: "Don't penalize for missing keywords" },
  { value: "light", label: "Light", desc: "Small penalty for missing keywords" },
  { value: "strict", label: "Strict", desc: "Heavy penalty for missing keywords" },
]

interface Props {
  plan: string
  hasKey: boolean
  initialPrefs: {
    model: string
    tone: string
    maxWords: number
    includePricing: boolean
    includeProductUrl: boolean
    prioritizeRelevance: boolean
    keywordPenalty: string
    boostRepeatPosters: boolean
  }
}

export default function AISettingsClient({ plan, hasKey, initialPrefs }: Props) {
  const router = useRouter()
  const isPro = plan === "pro" || plan === "agency"

  const [model, setModel] = useState(initialPrefs.model)
  const [tone, setTone] = useState(initialPrefs.tone)
  const [maxWords, setMaxWords] = useState(initialPrefs.maxWords)
  const [includePricing, setIncludePricing] = useState(initialPrefs.includePricing)
  const [includeProductUrl, setIncludeProductUrl] = useState(initialPrefs.includeProductUrl)
  const [prioritizeRelevance, setPrioritizeRelevance] = useState(initialPrefs.prioritizeRelevance)
  const [keywordPenalty, setKeywordPenalty] = useState(initialPrefs.keywordPenalty)
  const [boostRepeatPosters, setBoostRepeatPosters] = useState(initialPrefs.boostRepeatPosters)

  const [keyInput, setKeyInput] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ valid: boolean; model?: string; error?: string } | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleTestKey() {
    if (!keyInput.trim()) {
      toast.error("Enter an API key first")
      return
    }
    setTesting(true)
    setTestResult(null)
    const result = await testAIKey(keyInput)
    setTestResult(result)
    setTesting(false)
  }

  async function handleSaveKey() {
    if (!keyInput.trim()) return
    setSaving(true)
    const result = await saveAIKey(keyInput)
    if (result.success) {
      toast.success("API key saved and verified")
      router.refresh()
    } else {
      toast.error(result.error ?? "Failed to save key")
    }
    setSaving(false)
  }

  async function handleRemoveKey() {
    if (!confirm("Remove your API key? The default Seerist key will be used instead.")) return
    const result = await removeAIKey()
    if (result.success) {
      toast.success("API key removed")
      router.refresh()
    } else {
      toast.error(result.error ?? "Failed to remove key")
    }
  }

  async function handleSavePrefs() {
    setSaving(true)
    const result = await updateAIPreferences({
      ai_model: model,
      ai_tone: tone,
      ai_max_proposal_words: maxWords,
      ai_include_pricing: includePricing,
      ai_include_product_url: includeProductUrl,
      ai_prioritize_relevance: prioritizeRelevance,
      ai_keyword_penalty: keywordPenalty,
      ai_boost_repeat_posters: boostRepeatPosters,
    })
    if (result.success) {
      toast.success("Preferences saved")
    } else {
      toast.error(result.error ?? "Failed to save")
    }
    setSaving(false)
  }

  return (
    <div className="space-y-8">
      <PageHeader title="AI Settings" subtitle="Configure the AI models used for opportunity scoring and proposal generation. Pro and Agency plans can use their own API keys." />

      {!isPro && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--status-info)]/20 bg-[var(--status-info)]/5 p-4">
          <ShieldAlert className="h-5 w-5 shrink-0 text-[var(--status-info)]" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">Free plan limitations</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Free plan is locked to GPT-4o Mini. Upgrade to Pro for custom models and BYOK.</p>
          </div>
          <Button variant="default" size="sm" onClick={() => router.push("/settings/billing?upgrade=pro")}>Upgrade</Button>
        </div>
      )}

      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Cpu className="h-4 w-4" />
          Default Model
        </h3>
        <p className="mb-5 text-xs text-[var(--text-muted)]">Choose the AI model used for scoring opportunities and generating proposals.</p>

        <div className="space-y-6">
          {MODELS.map((group) => (
            <div key={group.group}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{group.group}</p>
              <div className="space-y-2">
                {group.models.map((m) => {
                  const isLocked = !isPro && m.id !== "openai/gpt-4o-mini"
                  const isSelected = model === m.id
                  return (
                    <button
                      key={m.id}
                      disabled={isLocked}
                      onClick={() => !isLocked && setModel(m.id)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        isSelected
                          ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5"
                          : isLocked
                            ? "border-[var(--border-primary)] bg-[var(--surface-secondary)]/50 cursor-not-allowed opacity-50"
                            : "border-[var(--border-primary)] hover:border-[var(--brand-primary-border)] hover:bg-[var(--surface-secondary)]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {isLocked && <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />}
                          <span className={`text-sm font-medium ${isSelected ? "text-[var(--brand-primary)]" : "text-[var(--text-primary)]"}`}>
                            {m.label}
                          </span>
                          {isSelected && <span className="rounded-full bg-[var(--brand-primary)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--brand-primary)]">Active</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                          <span>{m.context}</span>
                          <span>{m.cost}</span>
                        </div>
                      </div>
                      <p className={`mt-0.5 text-xs ${isSelected ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]"}`}>{m.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Sparkles className="h-4 w-4" />
          Bring Your Own Key (BYOK)
          {!isPro && <span className="rounded-full bg-[var(--status-warning)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--status-warning)]">Pro+</span>}
        </h3>

        {!isPro ? (
          <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-4">
            <p className="text-sm text-[var(--text-muted)]">BYOK is a Pro feature. <button onClick={() => router.push("/settings/billing?upgrade=pro")} className="text-[var(--brand-primary)] hover:underline">Upgrade to Pro</button> to use your own API key and leverage your own AI credits.</p>
          </div>
        ) : hasKey ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-[var(--status-success)]/20 bg-[var(--status-success)]/5 p-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--status-success)]" />
              <div>
                <p className="text-sm font-medium text-[var(--status-success)]">Using your key</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Your API key is active. All AI operations will use your credits.</p>
              </div>
              <Button variant="ghost" size="sm" className="ml-auto shrink-0 text-[var(--status-error)]" onClick={handleRemoveKey}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
              </Button>
            </div>
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-4">
              <p className="text-xs text-[var(--text-muted)]">
                <Info className="inline h-3 w-3 mr-1" />
                Cost estimate: ~$0.01–0.05 per proposal at current model ({model.split("/").pop()})
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-muted)]">
              Add your own OpenRouter or OpenAI API key to use your own credits. Your key is encrypted at rest and never logged.
            </p>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                OpenRouter API Key
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="ml-1 text-[var(--brand-primary)] hover:underline">(get one)</a>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? "text" : "password"}
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-2 pr-10 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:outline-none"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button variant="outline" size="sm" onClick={handleTestKey} disabled={testing || !keyInput.trim()}>
                  {testing ? <span className="animate-spin">⟳</span> : <TestTube className="h-3.5 w-3.5 mr-1" />}
                  Test
                </Button>
                <Button variant="default" size="sm" onClick={handleSaveKey} disabled={saving || !keyInput.trim()}>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  Save
                </Button>
              </div>

              {testResult && (
                <div className={`mt-2 flex items-center gap-2 text-xs ${
                  testResult.valid ? "text-[var(--status-success)]" : "text-[var(--status-error)]"
                }`}>
                  {testResult.valid ? (
                    <><CheckCircle2 className="h-3.5 w-3.5" /> Connected{testResult.model ? ` (${testResult.model})` : ""}</>
                  ) : (
                    <><XCircle className="h-3.5 w-3.5" /> {testResult.error ?? "Invalid key"}</>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Sliders className="h-4 w-4" />
          Proposal Generation Defaults
        </h3>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--text-secondary)]">Default Tone</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    tone === t.value
                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5"
                      : "border-[var(--border-primary)] hover:border-[var(--brand-primary-border)]"
                  }`}
                >
                  <p className={`text-sm font-medium capitalize ${tone === t.value ? "text-[var(--brand-primary)]" : "text-[var(--text-primary)]"}`}>{t.label}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--text-secondary)]">
              Max Proposal Length: <span className="font-semibold text-[var(--text-primary)]">{maxWords}</span> words
            </label>
            <input
              type="range"
              min={100}
              max={400}
              step={25}
              value={maxWords}
              onChange={(e) => setMaxWords(Number(e.target.value))}
              className="w-full accent-[var(--brand-primary)]"
            />
            <div className="mt-1 flex justify-between text-[10px] text-[var(--text-muted)]">
              <span>100 words</span>
              <span>400 words</span>
            </div>
          </div>

          <div className="space-y-3">
            <ToggleOption label="Include pricing in proposals" desc="Add your product's pricing to proposal text" value={includePricing} onChange={setIncludePricing} />
            <ToggleOption label="Include product URL in proposals" desc="Link to your product website in each proposal" value={includeProductUrl} onChange={setIncludeProductUrl} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Gauge className="h-4 w-4" />
          Scoring Sensitivity
        </h3>
        <p className="mb-5 text-xs text-[var(--text-muted)]">Fine-tune how the AI scores opportunities against your product.</p>

        <div className="space-y-4">
          <ToggleOption
            label="Prioritize relevance over budget"
            desc="When scoring, weight relevance to your product higher than budget fit"
            value={prioritizeRelevance}
            onChange={setPrioritizeRelevance}
          />

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Penalty for missing keywords</label>
            <div className="flex gap-2">
              {KEYWORD_PENALTIES.map((kp) => (
                <button
                  key={kp.value}
                  onClick={() => setKeywordPenalty(kp.value)}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    keywordPenalty === kp.value
                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 text-[var(--brand-primary)]"
                      : "border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--brand-primary-border)]"
                  }`}
                >
                  {kp.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-[var(--text-muted)]">{KEYWORD_PENALTIES.find((kp) => kp.value === keywordPenalty)?.desc}</p>
          </div>

          <ToggleOption
            label="Boost score for repeat posters"
            desc="Increase score for clients who have hired from freelance platforms before"
            value={boostRepeatPosters}
            onChange={setBoostRepeatPosters}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="default" onClick={handleSavePrefs} disabled={saving}>
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  )
}

function ToggleOption({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-3">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          value ? "bg-[var(--brand-primary)]" : "bg-[var(--surface-tertiary)]"
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          value ? "translate-x-5" : "translate-x-0"
        }`} />
      </button>
    </div>
  )
}
