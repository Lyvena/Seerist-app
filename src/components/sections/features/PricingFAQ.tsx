"use client";
import { motion } from "framer-motion";
import { FadeUp } from "@/components/animations/FadeUp";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { Accordion } from "@/components/ui/accordion";

const FAQS = [
  {
    question: "How quickly does Seerist start finding opportunities?",
    answer:
      "Within minutes of signing up and describing your product, Seerist begins scanning your chosen platforms. Most users see their first scored matches within the first hour.",
  },
  {
    question: "Do I need to be active on freelance platforms myself?",
    answer:
      "No. Seerist handles discovery, scoring, and proposal generation. You only need to review and approve proposals before they’re sent.",
  },
  {
    question: "What if my product doesn't fit traditional freelance categories?",
    answer:
      "Seerist’s AI understands context beyond keywords. It matches based on the problem the poster is trying to solve — so even niche products find the right buyers.",
  },
  {
    question: "Can I control how the proposal is written?",
    answer:
      "Yes. Choose tone, edit generated proposals before sending, and bring your own AI key for full control over output.",
  },
  {
    question: "Is there a free plan?",
    answer:
      "Yes — the Free plan is available forever with no credit card required. It includes 1 product, 5 platforms, 100 opportunities/month, and 20 AI proposals/month.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Absolutely. Upgrades are instant; downgrades apply at the end of your billing period. All paid plans include a 14-day money-back guarantee.",
  },
];

export function PricingFAQ() {
  const values = FAQS.map(() => `faq-${Math.random().toString(36).slice(2, 8)}`);

  return (
    <div className="mx-auto max-w-3xl">
      <Accordion type="single" collapsible className="space-y-3">
        {FAQS.map((faq, index) => (
          <motion.div
            key={faq.question}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
          >
            <AccordionItem value={values[index]} question={faq.question} answer={faq.answer} />
          </motion.div>
        ))}
      </Accordion>
    </div>
  );
}

function AccordionItem({ value, question, answer }: { value: string; question: string; answer: string }) {
  return (
    <Accordion.Item
      value={value}
      className="rounded-2xl border border-[var(--color-border)] bg-white px-6 transition-all"
    >
      <AccordionTrigger className="py-5 text-left text-base font-semibold text-gray-900">{question}</AccordionTrigger>
      <AccordionContent className="pb-5 text-base leading-relaxed text-[var(--color-text-2)]">{answer}</AccordionContent>
    </Accordion.Item>
  );
}
