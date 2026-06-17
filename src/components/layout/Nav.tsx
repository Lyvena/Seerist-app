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
        <circle cx="16" cy="16" r="14" stroke="#7C3AED" strokeWidth="2" opacity="0.2" />
        <circle cx="16" cy="16" r="9" stroke="#7C3AED" strokeWidth="2" opacity="0.5" />
        <circle cx="16" cy="16" r="4" stroke="#7C3AED" strokeWidth="2.5" />
        <circle cx="16" cy="16" r="2.5" fill="#7C3AED" />
      </svg>
      <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
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
        transition={{ duration: 0.6, ease: ease, delay: 0.1 }}
        className="fixed top-0 inset-x-0 z-50 h-16"
        style={{
          backgroundColor: "rgba(250,250,250,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(229,231,235,0.8)",
          boxShadow: scrolled ? "0 4px 20px rgba(0,0,0,0.06)" : "0 1px 3px rgba(0,0,0,0.04)",
          transition: "box-shadow 0.3s ease",
        }}
      >
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-[clamp(20px,5vw,80px)]">
          <Logo />
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(({ label, href }) => (
              <Link key={href} href={href} className="text-sm font-medium text-text-2 transition-colors duration-200 hover:text-text-1 focus:outline-none focus:ring-2 focus-ring-violet-500 focus:ring-offset-2">
                {label}
              </Link>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="https://app.seerist.xyz/login"
              className="rounded-full border border-input px-5 py-2 text-sm font-medium text-text-2 transition-colors hover:border-border/70 hover:bg-white focus:outline-none focus:ring-2 focus-ring-violet-500 focus:ring-offset-2"
            >
              Sign In
            </Link>
            <Link
              href="https://app.seerist.xyz/signup"
              className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:scale-[1.02]"
              style={{ boxShadow: "0 4px 16px rgba(124,58,237,0.25)" }}
            >
              Get Started Free
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
            <div className="flex justify-end p-5">
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
                hidden: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
                visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
              }}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="flex flex-wrap items-center gap-4 px-8 justify-center"
            >
              {MOBILE_LINKS.map(({ label, href, external, primary }) => (
                <motion.div
                  key={href}
                  variants={{
                    hidden: { opacity: 0, y: 24 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
                  }}
                >
                  <Link
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    onClick={closeMobile}
                    className={`block min-h-[44px] rounded-full px-6 py-3 text-center text-base font-medium transition-colors ${
                      primary
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "text-text-2 hover:bg-border/50"
                    } focus:outline-none focus:ring-2 focus-ring-violet-500 focus:ring-offset-2`}
                  >
                    {primary ? label : <span className="inline-flex items-center gap-1">{label} <ChevronRight className="h-4 w-4" /></span>}
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
