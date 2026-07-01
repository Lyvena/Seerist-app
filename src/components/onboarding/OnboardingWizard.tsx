"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProgressBar } from "./ProgressBar"
import { Step1Product } from "./Step1Product"
import { Step2Platforms } from "./Step2Platforms"
import { Step3StartScanning } from "./Step3StartScanning"
import { Celebration } from "./Celebration"
import { completeOnboarding } from "@/app/actions/onboarding"

const STEPS = [
  { label: "Product", component: "Step1Product" },
  { label: "Platforms", component: "Step2Platforms" },
  { label: "Start Scanning", component: "Step3StartScanning" },
]

const INITIAL_PRODUCT = {
  name: "",
  category: "",
  url: "",
  shortDescription: "",
  detailedDescription: "",
  targetCustomer: "",
  keyBenefits: [] as string[],
  pricePoint: "",
  pricingModel: "",
  keywords: [] as string[],
  antiKeywords: [] as string[],
  digestFrequency: "daily",
  minScoreForAlert: 70,
  alertEmail: "",
}

interface PlatformItem {
  id: string
  slug: string
  name: string
  logo_url: string | null
  category: string
}

interface OnboardingWizardProps {
  userId: string
  platforms: PlatformItem[]
  userEmail: string
}

export function OnboardingWizard({ userId, platforms, userEmail }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [showCelebration, setShowCelebration] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [productForm, setProductForm] = useState(() => ({
    ...INITIAL_PRODUCT,
    alertEmail: userEmail,
  }))
  const [selectedPlatforms, setSelectedPlatforms] = useState<Record<string, { enabled: boolean; minScore: number }>>(() => {
    const preSelectedSlugs = ["upwork", "freelancer", "weworkremotely", "contra", "peopleperhour"]
    const initial: Record<string, { enabled: boolean; minScore: number }> = {}
    for (const p of platforms) {
      initial[p.id] = {
        enabled: preSelectedSlugs.includes(p.slug),
        minScore: 70,
      }
    }
    return initial
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateProduct = useCallback((field: string, value: unknown) => {
    setProductForm((prev) => ({ ...prev, [field]: value as never }))
  }, [])

  const handlePlatformToggle = useCallback((platformId: string, enabled: boolean) => {
    setSelectedPlatforms((prev) => ({
      ...prev,
      [platformId]: { ...prev[platformId], enabled },
    }))
  }, [])

  const handleMinScoreChange = useCallback((platformId: string, score: number) => {
    setSelectedPlatforms((prev) => ({
      ...prev,
      [platformId]: { ...prev[platformId], minScore: score },
    }))
  }, [])

  function validateStep(current: number): boolean {
    const newErrors: Record<string, string> = {}

    if (current === 1) {
      if (!productForm.name.trim()) newErrors.name = "Product name is required"
      if (!productForm.category) newErrors.category = "Category is required"
      if (!productForm.shortDescription.trim()) newErrors.shortDescription = "Short description is required"
      else if (productForm.shortDescription.length > 200) newErrors.shortDescription = "Must be under 200 characters"
      if (!productForm.detailedDescription.trim()) newErrors.detailedDescription = "Detailed description is required"
      else if (productForm.detailedDescription.length > 1000) newErrors.detailedDescription = "Must be under 1000 characters"
      if (!productForm.targetCustomer.trim()) newErrors.targetCustomer = "Target customer is required"
    }

    if (current === 3) {
      if (!productForm.alertEmail.trim()) newErrors.alertEmail = "Email is required"
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(productForm.alertEmail)) newErrors.alertEmail = "Invalid email format"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleNext() {
    if (!validateStep(step)) return
    if (step < 3) {
      setStep((s) => s + 1)
    } else {
      setSaveError(null)

      const platformEntries = Object.entries(selectedPlatforms).map(([platformId, config]) => ({
        platformId,
        enabled: config.enabled,
        minScore: config.minScore,
      }))

      const result = await completeOnboarding({
        product: productForm,
        platforms: platformEntries,
        alerts: {
          digestFrequency: productForm.digestFrequency,
          minScoreForAlert: productForm.minScoreForAlert,
          alertEmail: productForm.alertEmail,
        },
      })

      if (result.success) {
        setShowCelebration(true)
      } else {
        setSaveError(result.error ?? "Something went wrong")
      }
    }
  }

  function handleSkip() {
    router.push("/dashboard")
  }

  const canGoBack = step > 1 && !showCelebration
  const canSkip = step >= 2

  if (showCelebration) {
    return <Celebration productName={productForm.name} onComplete={() => router.push("/dashboard")} />
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      <ProgressBar currentStep={step} totalSteps={3} labels={STEPS.map((s) => s.label)} />

      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-8">
        {step === 1 && (
          <Step1Product formData={productForm} errors={errors} onChange={updateProduct} />
        )}
        {step === 2 && (
          <Step2Platforms
            platforms={platforms}
            selectedPlatforms={selectedPlatforms}
            onPlatformToggle={handlePlatformToggle}
            onMinScoreChange={handleMinScoreChange}
          />
        )}
        {step === 3 && (
          <Step3StartScanning
            formData={{
              digestFrequency: productForm.digestFrequency,
              minScoreForAlert: productForm.minScoreForAlert,
              alertEmail: productForm.alertEmail,
            }}
            errors={errors}
            onChange={updateProduct}
            summary={{
              productName: productForm.name,
              platformCount: Object.values(selectedPlatforms).filter((p) => p.enabled).length,
            }}
          />
        )}

        {saveError && (
          <div className="mt-6 rounded-lg border border-[var(--status-danger-light)] bg-[var(--status-danger-light)] p-4 text-sm text-[var(--status-danger)]">
            {saveError}
          </div>
        )}

        {!showCelebration && (
          <div className="mt-8 flex items-center justify-between border-t border-[var(--border-primary)] pt-6">
            <div className="flex items-center gap-3">
              {canGoBack && (
                <Button variant="ghost" onClick={() => setStep((s) => s - 1)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {canSkip && (
                <Button variant="ghost" onClick={handleSkip} className="text-[var(--text-muted)]">
                  Skip for now
                </Button>
              )}
              <Button
                variant="default"
                onClick={handleNext}
                className="gap-1.5"
              >
                {step < 3 ? (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  "Start Scanning Opportunities →"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
