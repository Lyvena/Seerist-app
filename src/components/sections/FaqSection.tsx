"use client";
import { motion } from "framer-motion";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const FAQS = [
  {
    question: "How quickly does Seerist start finding opportunities?",
    answer:
      "Within minutes of signing up and describing your product, Seerist begins scanning your chosen platforms. Most users see their first scored matches within the first hour.",
  },
  {
    question: "Do I need to be active on freelance platforms myself?",
    answer:
      "No. Seerist handles discovery, scoring, and proposal generation. You only need to review and approve proposals before they're sent.",
  },
  {
    question: "What if my product doesn't fit traditional freelance categories?",
    answer:
      "Seerist's AI understands context beyond keywords. It matches based on the problem the poster is trying to solve — so even niche products find the right buyers.",
  },
  {
    question: "Can I control how the proposal is written?",
    answer:
      "Yes. You can choose tone (Professional, Casual, Concise, Enthusiastic), edit generated proposals before sending, and bring your own AI key for full control.",
  },
  {
    question: "Is there a free plan?",
    answer:
      "Yes. The Free plan is available forever with no credit card required. It includes 1 product, 5 platforms, 100 opportunities/month, and 20 AI proposals/month.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Absolutely. Upgrade or downgrade anytime. Cancellations take effect at the end of your billing period, and all paid plans include a 14-day money-back guarantee.",
  },
];

export function FaqSection() {
  const values = FAQS.map(() => `item-${Math.random().toString(36).slice(2, 9)}`);

  return (
    <section className="bg-white py-24">
      <Container>
        <div className="mb-16 text-center">
          <FadeUp>
            <SectionLabel>FAQ</SectionLabel>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2
              className="mt-4 tracking-tight"
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.75rem, 3vw, 2.75rem)",
                color: "#111827",
              }}
            >
              Common questions
            </h2>
          </FadeUp>
        </div>
        <div className="mx-auto max-w-[720px]" style={{ marginTop: "48px" }}>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq, index) => (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
              >
                <AccordionItem
                  value={values[index]}
                  className="border-b border-[#F3F4F6] bg-transparent px-0 py-[20px]"
                >
                  <AccordionTrigger className="justify-between py-0 text-left text-[1.0625rem] font-semibold text-[#111827]">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-0 pt-3 text-[1rem] leading-relaxed text-[#6B7280]">
                    <p className="max-w-[640px]">{faq.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </Container>
    </section>
  );
}