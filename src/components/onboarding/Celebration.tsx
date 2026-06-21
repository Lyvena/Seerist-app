"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotionPref } from "@/hooks/useReducedMotionPref"

interface CelebrationProps {
  productName: string
  onComplete?: () => void
}

export function Celebration({ productName, onComplete }: CelebrationProps) {
  const { prefersReducedMotion } = useReducedMotionPref()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (prefersReducedMotion) {
      const timer = setTimeout(() => {
        setVisible(false)
        onComplete?.()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [prefersReducedMotion, onComplete])

  if (prefersReducedMotion) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-primary)]/80">
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-8">
          <p className="text-lg font-semibold text-[var(--text-primary)]">Setup complete!</p>
          <p className="text-sm text-[var(--text-muted)] mt-2">Scanning for opportunities matching {productName}...</p>
        </div>
      </div>
    )
  }

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-primary)]/80"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="relative rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-10 overflow-hidden"
          >
            <div className="relative z-10 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--status-success-light)]"
              >
                <motion.svg
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="h-8 w-8 text-[var(--status-success)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </motion.svg>
              </motion.div>
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-semibold text-[var(--text-primary)]"
              >
                You're all set!
              </motion.h2>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-2 text-[var(--text-muted)]"
              >
                Scanning for opportunities matching {productName}...
              </motion.p>
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 12 }}
              transition={{ delay: 0.5, duration: 2 }}
              className="absolute inset-0 rounded-full bg-[var(--status-success)]/5"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}