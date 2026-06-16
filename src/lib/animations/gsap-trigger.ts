import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

export function useScrollTrigger() {
  if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger)
  }
}
