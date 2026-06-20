"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  User, Camera, Globe, Clock, Mail, Lock, Save,
  Loader2, Upload, CheckCircle2, ExternalLink,
} from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { Button } from "@/components/ui/button"
import { updateProfile, uploadAvatar } from "@/app/actions/settings"
import { toast } from "sonner"

const TIMEZONES = Intl.supportedValuesOf?.("timeZone") ?? [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow",
  "Asia/Tokyo", "Asia/Shanghai", "Asia/Kolkata", "Asia/Dubai",
  "Australia/Sydney", "Pacific/Auckland",
]

interface Props {
  userId: string
  email: string
  initialFullName: string
  initialAvatarUrl: string
  initialCompanyName: string
  initialWebsite: string
  initialTimezone: string
}

export default function ProfileClient({
  userId, email, initialFullName, initialAvatarUrl,
  initialCompanyName, initialWebsite, initialTimezone,
}: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState(initialFullName)
  const [companyName, setCompanyName] = useState(initialCompanyName)
  const [website, setWebsite] = useState(initialWebsite)
  const [timezone, setTimezone] = useState(initialTimezone || "UTC")
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialAvatarUrl ? `https://x69u73wi.eu-central.insforge.app/storage/v1/object/public/avatars/${initialAvatarUrl}` : null
  )
  const [tzSearch, setTzSearch] = useState("")
  const [tzOpen, setTzOpen] = useState(false)

  const filteredTimezones = TIMEZONES.filter((tz) =>
    tz.toLowerCase().includes(tzSearch.toLowerCase())
  )

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Invalid file type. Accepted: jpg, png, webp")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large. Max 2MB")
      return
    }

    const localUrl = URL.createObjectURL(file)
    setAvatarPreview(localUrl)

    const fd = new FormData()
    fd.append("avatar", file)
    const result = await uploadAvatar(userId, fd)

    if (result.success) {
      toast.success("Avatar updated")
      router.refresh()
    } else {
      toast.error(result.error ?? "Failed to upload")
      setAvatarPreview(null)
    }
  }

  async function handleSave() {
    setSaving(true)
    const result = await updateProfile(userId, { full_name: fullName, company_name: companyName, website, timezone })
    if (result.success) {
      toast.success("Profile saved")
      router.refresh()
    } else {
      toast.error(result.error ?? "Failed to save")
    }
    setSaving(false)
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Profile" subtitle="Manage your personal information and preferences." />

      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-6">
        <div className="flex items-start gap-6">
          <div className="relative shrink-0">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-tertiary)]">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-[var(--text-muted)]" />
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--surface-primary)] bg-[var(--brand-primary)] text-white shadow-sm hover:bg-[var(--brand-primary)]/90"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{fullName || "Your Name"}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">JPG, PNG, or WebP. Max 2MB.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-6">
        <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Personal Information</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Full Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Company Name</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your company"
              className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Website URL</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>
          <div className="relative">
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Timezone</label>
            <button
              onClick={() => setTzOpen(!tzOpen)}
              className="flex w-full items-center justify-between rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)]"
            >
              <span>{timezone}</span>
              <Clock className="h-4 w-4 text-[var(--text-muted)]" />
            </button>
            {tzOpen && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] shadow-lg">
                <input
                  value={tzSearch}
                  onChange={(e) => setTzSearch(e.target.value)}
                  placeholder="Search timezone..."
                  className="w-full border-b border-[var(--border-primary)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                  autoFocus
                />
                <div className="max-h-48 overflow-y-auto scrollbar-thin">
                  {filteredTimezones.map((tz) => (
                    <button
                      key={tz}
                      onClick={() => { setTimezone(tz); setTzOpen(false); setTzSearch("") }}
                      className={`w-full px-3 py-1.5 text-left text-sm hover:bg-[var(--surface-secondary)] ${
                        tz === timezone ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {tz}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="default" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-1 h-4 w-4" /> Save Changes</>}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-6">
        <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Account</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-[var(--text-muted)]" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{email}</p>
                <p className="text-xs text-[var(--text-muted)]">Email address</p>
              </div>
            </div>
            <button className="text-xs text-[var(--brand-primary)] hover:underline">Change Email</button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-3">
            <div className="flex items-center gap-3">
              <Lock className="h-4 w-4 text-[var(--text-muted)]" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">••••••••</p>
                <p className="text-xs text-[var(--text-muted)]">Password</p>
              </div>
            </div>
            <button className="text-xs text-[var(--brand-primary)] hover:underline">Change Password</button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-6">
        <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Connected Accounts</h3>
        <div className="space-y-3">
          {[
            { name: "Google", icon: "G", connected: false },
          ].map((provider) => (
            <div key={provider.name} className="flex items-center justify-between rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-tertiary)] text-xs font-bold text-[var(--text-muted)]">
                  {provider.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{provider.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {provider.connected ? "Connected" : "Not connected"}
                  </p>
                </div>
              </div>
              <Button variant={provider.connected ? "outline" : "default"} size="sm">
                {provider.connected ? "Disconnect" : "Connect"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
