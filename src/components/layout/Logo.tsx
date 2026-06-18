import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" style={{ gap: "8px" }}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="16" cy="16" r="14" stroke="#7C3AED" strokeWidth="2" opacity="0.2" />
        <circle cx="16" cy="16" r="9" stroke="#7C3AED" strokeWidth="2" opacity="0.5" />
        <circle cx="16" cy="16" r="4" stroke="#7C3AED" strokeWidth="2.5" />
        <circle cx="16" cy="16" r="2.5" fill="#7C3AED" />
      </svg>
      <span
        className="font-semibold tracking-tight"
        style={{
          fontFamily: "var(--font-heading, 'Cal Sans', 'Geist Sans', system-ui)",
          fontSize: "1.25rem",
          letterSpacing: "-0.01em",
          color: "#0A0A0A",
        }}
      >
        Seerist
      </span>
    </Link>
  );
}
