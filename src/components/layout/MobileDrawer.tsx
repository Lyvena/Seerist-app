"use client"

import { useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { SidebarContent } from "./Sidebar"

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  const handleNavClick = useCallback(() => {
    onClose()
  }, [onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] flex-col bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] md:hidden"
          >
            <div className="flex h-14 items-center justify-between gap-2.5 px-4 border-b border-[var(--sidebar-border)]">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--sidebar-accent)]">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5" opacity="0.4" />
                    <circle cx="8" cy="8" r="3.5" stroke="white" strokeWidth="1.5" opacity="0.7" />
                    <circle cx="8" cy="8" r="1.5" fill="white" />
                  </svg>
                </div>
                <span className="text-sm font-semibold tracking-tight text-white">Seerist</span>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--sidebar-fg-muted)] hover:bg-[var(--sidebar-hover)]"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <SidebarContent onNavClick={handleNavClick} />

            <div className="flex items-center gap-3 border-t border-[var(--sidebar-border)] px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--sidebar-fg-muted)] text-xs font-semibold text-white">
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">Andrey</p>
                <p className="text-[11px] text-[var(--sidebar-fg-muted)]">Free Plan</p>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
