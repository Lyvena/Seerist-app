"use client"

import { Input } from "./Input"
import { Textarea } from "./Textarea"
import { Select } from "./Select"
import { TagInput } from "./TagInput"

const CATEGORIES = [
  { value: "saas_tool", label: "SaaS Tool" },
  { value: "template_theme", label: "Template/Theme" },
  { value: "plugin_extension", label: "Plugin/Extension" },
  { value: "api_sdk", label: "API/SDK" },
  { value: "course_info", label: "Course/Info Product" },
  { value: "other", label: "Other" },
]

const PRICING_MODELS = [
  { value: "free", label: "Free" },
  { value: "freemium", label: "Freemium" },
  { value: "subscription", label: "Subscription" },
  { value: "one_time", label: "One-time" },
  { value: "usage_based", label: "Usage-based" },
]

interface Step1ProductProps {
  formData: {
    name: string
    category: string
    url: string
    shortDescription: string
    detailedDescription: string
    targetCustomer: string
    keyBenefits: string[]
    pricePoint: string
    pricingModel: string
    keywords: string[]
    antiKeywords: string[]
    digestFrequency: string
    minScoreForAlert: number
    alertEmail: string
  }
  errors: Partial<Record<string, string>>
  onChange: (field: string, value: unknown) => void
}

export function Step1Product({ formData, errors, onChange }: Step1ProductProps) {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Product name *"
          value={formData.name}
          onChange={(e) => onChange("name", e.target.value)}
          error={errors.name}
          placeholder="e.g., InvoiceFlow"
          required
        />
        <Select
          label="Product category *"
          options={CATEGORIES}
          value={formData.category}
          onChange={(e) => onChange("category", e.target.value)}
          error={errors.category}
          placeholder="Select a category"
          required
        />
      </div>

      <Input
        label="Product URL"
        type="url"
        value={formData.url}
        onChange={(e) => onChange("url", e.target.value)}
        placeholder="https://yourproduct.com"
        helperText="Optional — helps with analysis"
      />

      <Textarea
        label="Short description *"
        value={formData.shortDescription}
        onChange={(e) => onChange("shortDescription", e.target.value)}
        error={errors.shortDescription}
        maxLength={200}
        rows={3}
        placeholder="One sentence shown in proposals (max 200 chars)"
        required
      />

      <Textarea
        label="Detailed description *"
        value={formData.detailedDescription}
        onChange={(e) => onChange("detailedDescription", e.target.value)}
        error={errors.detailedDescription}
        maxLength={1000}
        rows={6}
        placeholder="Describe your product in detail — features, value prop, tech stack. Used for AI matching (max 1000 chars)."
        required
      />

      <div>
        <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Tone preference examples</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-3">
            <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">Professional</p>
            <p className="text-[10px] text-[var(--text-secondary)]">I noticed your project requires custom React development. Our Invoicer Pro solution specifically handles payment integration for SaaS applications.</p>
          </div>
          <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-3">
            <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">Casual</p>
            <p className="text-[10px] text-[var(--text-secondary)]">Hey! Your job caught my eye. I built something similar last month — happy to chat about how it could work for you.</p>
          </div>
          <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-3">
            <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">Enthusiastic</p>
            <p className="text-[10px] text-[var(--text-secondary)]">This is EXACTLY what I built InvoiceFlow for! Let me show you how it can save you 20+ hours weekly on client billing!</p>
          </div>
          <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-3">
            <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">Concise</p>
            <p className="text-[10px] text-[var(--text-secondary)]">Full-stack developer. Built invoicing tool for freelancers. 50+ clients. Clean code, fast delivery. Examples: invoice.ly/demo</p>
          </div>
        </div>
      </div>

      <Textarea
        label="Target customer (ICP) *"
        value={formData.targetCustomer}
        onChange={(e) => onChange("targetCustomer", e.target.value)}
        error={errors.targetCustomer}
        rows={3}
        placeholder="e.g., Freelance designers who need automated invoicing and payment tracking"
        required
      />

      <TagInput
        label="Key benefits"
        value={formData.keyBenefits}
        onChange={(v) => onChange("keyBenefits", v)}
        maxTags={5}
        placeholder="Press Enter to add"
        helperText="Up to 5 benefits — these appear in generated proposals"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Price point"
          value={formData.pricePoint}
          onChange={(e) => onChange("pricePoint", e.target.value)}
          placeholder="e.g., $29/month"
          helperText="e.g., $29/month, $199 one-time"
        />
        <Select
          label="Pricing model"
          options={PRICING_MODELS}
          value={formData.pricingModel}
          onChange={(e) => onChange("pricingModel", e.target.value)}
          placeholder="Select pricing model"
        />
      </div>

      <TagInput
        label="Keywords to match"
        value={formData.keywords}
        onChange={(v) => onChange("keywords", v)}
        maxTags={10}
        placeholder="Press Enter to add"
        helperText="Terms that SHOULD appear in job posts (up to 10)"
      />

      <TagInput
        label="Anti-keywords"
        value={formData.antiKeywords}
        onChange={(v) => onChange("antiKeywords", v)}
        maxTags={5}
        placeholder="Press Enter to add"
        helperText="Terms that mean it's NOT a fit (up to 5)"
      />
    </div>
  )
}
