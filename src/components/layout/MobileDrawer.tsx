"use client"

import { useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { SidebarContent } from "./Sidebar"
import { Logo } from "./Logo"

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
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] flex-col bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] md:hidden"
          >
            <div className="flex h-16 items-center justify-between px-5 border-b border-[var(--sidebar-border)]">
              <Logo variant="light" href="/dashboard" />
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--sidebar-fg-muted)] hover:bg-[var(--sidebar-hover)] hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <SidebarContent onNavClick={handleNavClick} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
