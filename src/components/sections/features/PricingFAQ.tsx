"use client";
import { motion } from "framer-motion";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const FAQS = [
  {
    question: "How quickly does Seerist start finding opportunities?",
    answer: "Within minutes of signing up and describing your product, Seerist begins scanning your chosen platforms. Most users see their first scored matches within the first hour.",
  },
  {
    question: "Do I need to be active on freelance platforms myself?",
    answer: "No. Seerist handles discovery, scoring, and proposal generation. You only need to review and approve proposals before they're sent.",
  },
  {
    question: "What if my product doesn't fit traditional freelance categories?",
    answer: "Seerist's AI understands context beyond keywords. It matches based on the problem the poster is trying to solve — so even niche products find the right buyers.",
  },
  {
    question: "Can I control how the proposal is written?",
    answer: "Yes. Choose tone, edit generated proposals before sending, and bring your own AI key for full control over output.",
  },
  {
    question: "Is there a free plan?",
    answer: "Yes — the Free plan is available forever with no credit card required. It includes 1 product, 5 platforms, 100 opportunities/month, and 20 AI proposals/month.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Absolutely. Upgrades are instant; downgrades apply at the end of your billing period. All paid plans include a 14-day money-back guarantee.",
  },
];

export function PricingFAQ() {
  const values = FAQS.map((_, i) => `faq-${i}`);

  return (
    <div className="mx-auto max-w-[720px]">
      <Accordion type="single" collapsible className="w-full">
        {FAQS.map((faq, index) => (
          <motion.div
            key={faq.question}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
          >
            <AccordionItem value={values[index]} className="border-b border-[#EBEEF5] bg-transparent px-0 py-5">
              <AccordionTrigger className="justify-between py-0 text-left text-[1rem] font-semibold text-[#0B1221] hover:text-[#635BFF] transition-colors">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="pb-0 pt-3 text-[0.9375rem] leading-relaxed text-[#5E6B8A]">
                <p className="max-w-[640px]">{faq.answer}</p>
              </AccordionContent>
            </AccordionItem>
          </motion.div>
        ))}
      </Accordion>
    </div>
  );
}
