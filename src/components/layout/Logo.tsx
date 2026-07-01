import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "light" | "dark";
  href?: string;
  className?: string;
  showWordmark?: boolean;
}

/**
 * Single source of truth for the Seerist mark + wordmark.
 * `variant="light"` is for dark backgrounds (sidebar, auth brand panel).
 * `variant="dark"`  is for light backgrounds.
 */
export function Logo({
  variant = "dark",
  href = "/dashboard",
  className,
  showWordmark = true,
}: LogoProps) {
  const wordmarkColor = variant === "light" ? "text-white" : "text-[var(--text-primary)]";

  const content = (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
        <span
          className="absolute inset-0 rounded-[10px] rotate-6 opacity-25 transition-transform duration-300 group-hover:rotate-12"
          style={{ background: "var(--brand-gradient)" }}
        />
        <span
          className="absolute inset-0 flex items-center justify-center rounded-[10px]"
          style={{ background: "var(--brand-gradient)" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5" opacity="0.4" />
            <circle cx="8" cy="8" r="3.5" stroke="white" strokeWidth="1.5" opacity="0.7" />
            <circle cx="8" cy="8" r="1.5" fill="white" />
          </svg>
        </span>
      </span>
      {showWordmark && (
        <span className={cn("font-cal text-lg font-semibold tracking-tight", wordmarkColor)}>
          Seerist
        </span>
      )}
    </span>
  );

  return (
    <Link href={href} className="group inline-flex">
      {content}
    </Link>
  );
}
