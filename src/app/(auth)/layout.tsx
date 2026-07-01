import { Logo } from "@/components/layout/Logo";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Branded panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[var(--sidebar-bg)] p-10 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 20% 10%, rgba(109,93,246,0.35) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 90% 90%, rgba(139,92,246,0.25) 0%, transparent 55%)",
          }}
        />
        <div className="relative">
          <Logo variant="light" />
        </div>
        <div className="relative space-y-6">
          <h2 className="font-cal text-3xl leading-tight text-white">
            Find freelance work that fits your product perfectly.
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-[var(--sidebar-fg-secondary)]">
            Seerist continuously monitors the platforms you care about, scores every
            opportunity with AI, and helps you ship proposals in minutes.
          </p>
          <ul className="space-y-3">
            {[
              "AI scoring across every monitored platform",
              "One-click proposal generation tuned to your product",
              "A drag-and-drop pipeline that closes more deals",
            ].map((feat) => (
              <li key={feat} className="flex items-center gap-3 text-sm text-[var(--sidebar-fg-secondary)]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--sidebar-accent)]/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--sidebar-accent)]" />
                </span>
                {feat}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-[var(--sidebar-fg-muted)]">
          © {new Date().getFullYear()} Seerist. All rights reserved.
        </p>
      </aside>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-[var(--surface-bg)] px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo variant="dark" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
