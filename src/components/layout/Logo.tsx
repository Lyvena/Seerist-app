import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#635BFF] to-[#8B5CF6] rotate-6 opacity-20 group-hover:rotate-12 transition-transform duration-300" />
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#635BFF] to-[#8B5CF6] flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5" opacity="0.4" />
            <circle cx="8" cy="8" r="3.5" stroke="white" strokeWidth="1.5" opacity="0.7" />
            <circle cx="8" cy="8" r="1.5" fill="white" />
          </svg>
        </div>
      </div>
      <span
        className="text-lg font-semibold tracking-tight text-[#0B1221]"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        Seerist
      </span>
    </Link>
  );
}
