"use client";
import { useReducedMotion } from "framer-motion";

export function useReducedMotionPref() {
  const prefersReducedMotion = useReducedMotion();
  const reducedMotionDuration = prefersReducedMotion ? 0 : 0.6;
  return { prefersReducedMotion, reducedMotionDuration };
}
