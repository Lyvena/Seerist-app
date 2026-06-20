import Link from "next/link"
import { Home, FileSearch } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface-secondary)] px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-tertiary)]">
        <FileSearch className="h-8 w-8 text-[var(--text-muted)]" />
      </div>
      <h1 className="mt-6 text-3xl font-bold text-[var(--text-primary)]">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-[var(--text-muted)]">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Button variant="default" className="mt-8 gap-2" asChild>
        <Link href="/">
          <Home className="h-4 w-4" />
          Go to Dashboard
        </Link>
      </Button>
    </div>
  )
}
