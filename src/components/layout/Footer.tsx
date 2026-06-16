"use client";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import type { ReactElement } from "react";

const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Changelog", href: "#changelog" },
];

const USE_CASES: { label: string; href: string }[] = [
  { label: "SaaS Tools", href: "#saas-tools" },
  { label: "Templates & Themes", href: "#templates" },
  { label: "Plugins & Extensions", href: "#plugins" },
  { label: "Courses & Info Products", href: "#courses" },
  { label: "APIs & SDKs", href: "#apis" },
];

const COMPANY: { label: string; href: string }[] = [
  { label: "About", href: "#about" },
  { label: "Blog", href: "#blog" },
  { label: "Privacy Policy", href: "#privacy" },
  { label: "Terms of Service", href: "#terms" },
  { label: "Contact", href: "#contact" },
];

type SocialEntry = { label: string; href: string; renderIcon: () => ReactElement };

const SOCIALS: SocialEntry[] = [
  {
    label: "Twitter",
    href: "https://twitter.com/seerist",
    renderIcon: () => (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/company/seerist",
    renderIcon: () => (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: "GitHub",
    href: "https://github.com/seerist",
    renderIcon: () => (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
  },
];

export function Footer() {
  return (
    <>
      <div aria-hidden="true" className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, #7C3AED 50%, transparent)" }} />
      <footer className="border-t border-gray-200 bg-white" style={{ padding: "80px 0 40px" }}>
        <div className="container">
          <div className="grid grid-cols-2 gap-12 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4">
                <Logo />
              </div>
              <p className="mb-6 max-w-xs text-sm text-gray-600">
                Sell through every freelance platform. Automatically.
              </p>
              <div className="flex items-center gap-3">
                {SOCIALS.map(({ label, href, renderIcon }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    rel="noopener noreferrer"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-all hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600"
                  >
                    {renderIcon()}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-900">Product</h3>
              <ul className="space-y-3">
                {NAV_ITEMS.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-gray-600 transition-colors duration-200 hover:text-gray-900"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="https://status.seerist.xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 transition-colors duration-200 hover:text-gray-900"
                  >
                    Status
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-900">Use Cases</h3>
              <ul className="space-y-3">
                {USE_CASES.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-gray-600 transition-colors duration-200 hover:text-gray-900"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-900">Company</h3>
              <ul className="space-y-3">
                {COMPANY.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-gray-600 transition-colors duration-200 hover:text-gray-900"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div
            className="mt-16 flex flex-col items-center justify-between gap-4 border-t pt-6 md:flex-row"
            style={{ borderColor: "var(--color-border, #E5E7EB)" }}
          >
            <p className="text-xs text-gray-500">© 2025 Seerist. All rights reserved.</p>
            <p className="text-xs text-gray-500">Made with ❤️ for indie founders</p>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
            >
              🌐 English
            </button>
          </div>
        </div>
      </footer>
    </>
  );
}
