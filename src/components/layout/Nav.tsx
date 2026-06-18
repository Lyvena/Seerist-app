"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronRight } from "lucide-react";

type NavItem = { label: string; href: string; external?: boolean; primary?: boolean };

const NAV_LINKS: NavItem[] = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Use Cases", href: "#use-cases" },
];

const MOBILE_LINKS: NavItem[] = [
  ...NAV_LINKS,
  { label: "Sign In", href: "https://app.seerist.xyz/login", external: true },
  { label: "Get Started Free", href: "https://app.seerist.xyz/signup", external: true, primary: true },
];

const ease = [0.16, 1, 0.3, 1] as const;

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" opacity="0.2" className="text-violet-600" />
        <circle cx="16" cy="16" r="9" stroke="currentColor" strokeWidth="2" opacity="0.5" className="text-violet-600" />
        <circle cx="16" cy="16" r="4" stroke="currentColor" strokeWidth="2.5" className="text-violet-600" />
        <circle cx="16" cy="16" r="2.5" fill="currentColor" className="text-violet-600" />
      </svg>
      <span className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100" style={{ fontFamily: "var(--font-heading)" }}>
        Seerist
      </span>
    </Link>
  );
}

export function Nav() {
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={mounted ? { y: 0, opacity: 1 } : { y: -100, opacity: 0 }}
        transition={{ duration: 0.6, ease: ease, delay: 0.1 }}
        className="fixed top-0 inset-x-0 z-50"
        style={{
          height: "64px",
          backgroundColor: "rgba(250,250,250,0.85)",
          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
          borderBottom: "1px solid rgba(229,231,235,0.6)",
          boxShadow: scrolled ? "0 1px 24px rgba(0,0,0,0.08)" : "none",
          transition: "box-shadow 300ms ease",
        }}
      >
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-[clamp(20px,5vw,48px)]">
          <Logo />
          <div className="hidden md:flex items-center gap-1" style={{ gap: "4px" }}>
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="rounded-[8px] px-[14px] py-[8px] text-[0.9375rem] font-normal transition"
                style={{
                  color: "#374151",
                  fontWeight: 450,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F3F4F6")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="https://app.seerist.xyz/login"
              className="rounded-[8px] border px-[18px] py-[8px] text-[0.9375rem] font-medium transition"
              style={{
                borderColor: "#E5E7EB",
                color: "#374151",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
            >
              Sign In
            </Link>
            <Link
              href="https://app.seerist.xyz/signup"
              className="rounded-[8px] px-[20px] py-[8px] text-[0.9375rem] font-semibold transition"
              style={{
                background: "#7C3AED",
                color: "white",
                boxShadow: "0 1px 8px rgba(124,58,237,0.25)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#6D28D9")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#7C3AED")}
            >
              Get Started
            </Link>
          </div>
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] bg-white md:hidden"
          >
            <div className="flex h-16 items-end justify-end px-4 pb-4">
              <button
                onClick={closeMobile}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <motion.div
              variants={{
                hidden: { transition: { staggerChildren: 0.05 } },
                visible: { transition: { staggerChildren: 0.05 } },
              }}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="flex flex-col items-center gap-3 px-6"
            >
              {MOBILE_LINKS.map(({ label, href, external, primary }) => (
                <motion.div
                  key={href}
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
                  }}
                >
                  <Link
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    onClick={closeMobile}
                    className={`block min-h-[44px] rounded-full px-6 py-3 text-center text-base font-medium transition-colors ${
                      primary
                        ? "bg-violet-600 text-white hover:bg-violet-700"
                        : "text-gray-700 hover:bg-gray-100"
                    } focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2`}
                  >
                    {label}
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
