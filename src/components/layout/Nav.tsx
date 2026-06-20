"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";

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
  { label: "Sign In", href: "/login", external: true },
  { label: "Get Started Free", href: "/signup", external: true, primary: true },
];

const ease = [0.16, 1, 0.3, 1] as const;

function Logo() {
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
      <span className="text-lg font-semibold tracking-tight text-[#0B1221]" style={{ fontFamily: "var(--font-heading)" }}>
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
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={mounted ? { y: 0, opacity: 1 } : { y: -100, opacity: 0 }}
        transition={{ duration: 0.6, ease, delay: 0.1 }}
        className="fixed top-0 inset-x-0 z-50"
        style={{
          height: "64px",
          backgroundColor: scrolled ? "rgba(250,251,254,0.85)" : "rgba(250,251,254,0.6)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: scrolled ? "1px solid rgba(228,232,242,0.8)" : "1px solid transparent",
          boxShadow: scrolled ? "0 1px 20px rgba(11,18,33,0.04)" : "none",
          transition: "all 300ms ease",
        }}
      >
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-[clamp(20px,4vw,48px)]">
          <Logo />

          <div className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="relative rounded-lg px-3.5 py-2 text-[0.9375rem] font-medium text-[#5E6B8A] hover:text-[#0B1221] transition-colors duration-200"
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2.5">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-[0.9375rem] font-medium text-[#5E6B8A] hover:text-[#0B1221] transition-colors duration-200"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#635BFF] to-[#8B5CF6] px-5 py-2.5 text-[0.9375rem] font-semibold text-white shadow-sm hover:shadow-md transition-all duration-200"
              style={{ boxShadow: "0 2px 12px rgba(99,91,255,0.2)" }}
            >
              Get Started
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#5E6B8A] hover:bg-[#EBEEF5] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
            className="fixed inset-0 z-[60] bg-[#FAFBFE] md:hidden"
          >
            <div className="flex h-16 items-center justify-between px-5">
              <Logo />
              <button
                onClick={closeMobile}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#5E6B8A] hover:bg-[#EBEEF5]"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <motion.div
              variants={{
                hidden: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
                visible: { transition: { staggerChildren: 0.04 } },
              }}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="flex flex-col items-start gap-1 px-6 pt-4"
            >
              {MOBILE_LINKS.map(({ label, href, external, primary }) => (
                <motion.div
                  key={href}
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
                  }}
                >
                  <Link
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    onClick={closeMobile}
                    className={`block min-h-[48px] rounded-xl px-4 py-3 text-left text-base font-medium transition-colors ${
                      primary
                        ? "bg-gradient-to-r from-[#635BFF] to-[#8B5CF6] text-white mt-4"
                        : "text-[#2D3754] hover:bg-[#EBEEF5]"
                    } focus:outline-none focus:ring-2 focus:ring-[#635BFF] focus:ring-offset-2`}
                  >
                    {label}
                    {primary && <ArrowRight className="inline w-4 h-4 ml-1.5" />}
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
