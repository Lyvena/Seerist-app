"use client";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { HeroMockup } from "@/components/mockups/HeroMockup";
import { ArrowRight, Sparkles } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-20">
      {/* Background mesh gradient */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,91,255,0.07) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 85% 80%, rgba(0,194,168,0.05) 0%, transparent 50%), radial-gradient(ellipse 50% 30% at 10% 60%, rgba(139,92,246,0.04) 0%, transparent 50%)",
          }}
        />
        {/* Animated blobs */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            top: "5%",
            right: "5%",
            width: "500px",
            height: "500px",
            background: "radial-gradient(circle, rgba(99,91,255,0.1) 0%, transparent 70%)",
            borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
            filter: "blur(40px)",
          }}
          animate={{
            borderRadius: [
              "60% 40% 30% 70% / 60% 30% 70% 40%",
              "30% 60% 70% 40% / 50% 60% 30% 60%",
              "50% 60% 30% 60% / 30% 60% 70% 40%",
              "60% 40% 60% 30% / 60% 40% 30% 70%",
              "60% 40% 30% 70% / 60% 30% 70% 40%",
            ],
            scale: [1, 1.08, 0.95, 1.03, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute pointer-events-none"
          style={{
            bottom: "10%",
            left: "5%",
            width: "400px",
            height: "400px",
            background: "radial-gradient(circle, rgba(0,194,168,0.08) 0%, transparent 70%)",
            borderRadius: "40% 60% 70% 30% / 40% 70% 30% 60%",
            filter: "blur(40px)",
          }}
          animate={{
            borderRadius: [
              "40% 60% 70% 30% / 40% 70% 30% 60%",
              "70% 30% 40% 60% / 60% 40% 70% 30%",
              "30% 70% 60% 40% / 70% 30% 40% 60%",
              "60% 40% 30% 70% / 30% 60% 70% 40%",
              "40% 60% 70% 30% / 40% 70% 30% 60%",
            ],
            scale: [1, 1.1, 0.92, 1.05, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(11,18,33,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(11,18,33,0.3) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
</div>

      <Container>
        <motion.div className="relative z-10 flex flex-col items-center justify-center text-center">
          {/* Badge */}
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6, ease, delay: 0.1 }}
             className="mb-8"
           >
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#635BFF] shadow-sm border border-[#E4E8F2]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-[#00C2A8] opacity-75 animate-ping" />
                <span className="relative h-2 w-2 rounded-full bg-[#00C2A8]" />
              </span>
              AI Business Development for SaaS
            </span>
          </motion.div>

          {/* Headline */}
          <h1
            className="max-w-[820px] font-bold tracking-tight text-[#0B1221] mx-auto"
            style={{
              fontFamily: "var(--font-heading)",
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              fontSize: "clamp(2.75rem, 6.5vw, 5rem)",
            }}
          >
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease, delay: 0.2 }}
            >
              Your SaaS deserves
            </motion.span>
            <motion.span
              className="block mt-1"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease, delay: 0.35 }}
            >
              more than cold emails
            </motion.span>
            <motion.span
              className="block mt-1"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease, delay: 0.5 }}
            >
              <span className="gradient-text-full">Find buyers, not leads.</span>
            </motion.span>
          </h1>

          {/* Subheadline */}
          <motion.p
            className="mx-auto mt-8 max-w-[580px] text-center"
            style={{
              fontSize: "clamp(1.0625rem, 1.8vw, 1.25rem)",
              color: "#5E6B8A",
              lineHeight: 1.7,
            }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.65 }}
          >
            Seerist analyzes your product, finds freelance projects that need exactly what you've built, and writes the proposal — automatically.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.8 }}
          >
            <motion.a
              href="/signup"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#635BFF] to-[#8B5CF6] px-8 text-[1.0625rem] font-semibold text-white transition-all"
              style={{ boxShadow: "0 4px 20px rgba(99,91,255,0.3)" }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 8px 32px rgba(99,91,255,0.4)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(99,91,255,0.3)"; }}
            >
              <Sparkles className="w-4 h-4" />
              Start Free — No Card Needed
            </motion.a>
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const el = document.getElementById("how-it-works");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full border-[1.5px] border-[#E4E8F2] bg-white px-7 text-[1.0625rem] font-medium text-[#2D3754] transition-all hover:border-[#C7C3FF] hover:bg-[#EEEDFF] hover:text-[#635BFF]"
            >
              See How It Works
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            className="mt-14 flex flex-wrap items-center justify-center gap-6 text-[#5E6B8A]"
            style={{ fontSize: "0.9375rem" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.95 }}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex -space-x-2.5">
                {[
                  "from-[#635BFF] to-[#8B5CF6]",
                  "from-[#00C2A8] to-[#059669]",
                  "from-[#F59E0B] to-[#D97706]",
                  "from-[#EC4899] to-[#DB2777]",
                ].map((gradient, i) => (
                  <div
                    key={i}
                    className={`h-8 w-8 rounded-full border-2 border-white bg-gradient-to-br ${gradient}`}
                  />
                ))}
              </div>
              <span className="font-medium text-[#2D3754]">300+ founders</span>
            </div>
            <div className="h-4 w-px bg-[#E4E8F2] hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <span className="text-amber-500 text-sm">★★★★★</span>
              <span className="font-medium text-[#2D3754]">4.9/5</span>
            </div>
            <div className="h-4 w-px bg-[#E4E8F2] hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#00C2A8]" />
              <span className="font-medium text-[#2D3754]">14 platforms</span>
            </div>
          </motion.div>

          {/* Interactive Mockup */}
          <motion.div
            className="mt-16 w-full max-w-[920px] mb-24"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease, delay: 1.1 }}
          >
            <HeroMockup />
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
