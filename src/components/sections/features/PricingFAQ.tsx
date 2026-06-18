"use client";
import { motion } from "framer-motion";
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

function FAQAccordion({
  value,
  question,
  answer,
}: {
  value: string;
  question: string;
  answer: string;
}) {
  return (
    <AccordionItem
      value={value}
      className="border-b border-[#F3F4F6] bg-transparent px-0 py-[20px]"
    >
      <AccordionTrigger className="justify-between py-0 text-left text-[1.0625rem] font-semibold text-[#111827]">
        {question}
      </AccordionTrigger>
      <AccordionContent className="pb-0 pt-3 text-[1rem] leading-relaxed text-[#6B7280]">
        <p className="max-w-[640px]">{answer}</p>
      </AccordionContent>
    </AccordionItem>
  );
}

export function PricingFAQ() {
  const values = FAQS.map(() => `faq-${Math.random().toString(36).slice(2, 8)}`);

  return (
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
            <FAQAccordion value={values[index]} question={faq.question} answer={faq.answer} />
          </motion.div>
        ))}
      </Accordion>
    </div>
  );
}