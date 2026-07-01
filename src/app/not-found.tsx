import Link from "next/link"
import { Home, FileSearch } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface-bg)] px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand-primary-light)]">
        <FileSearch className="h-8 w-8 text-[var(--brand-primary)]" />
      </div>
      <h1 className="mt-6 font-cal text-3xl font-bold text-[var(--text-primary)]">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-[var(--text-muted)]">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Button className="mt-8 gap-2" asChild>
        <Link href="/dashboard">
          <Home className="h-4 w-4" />
          Go to Dashboard
        </Link>
      </Button>
    </div>
  )
}
