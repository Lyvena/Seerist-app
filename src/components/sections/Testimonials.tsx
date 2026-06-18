"use client";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { FadeUp } from "@/components/animations/FadeUp";
import { StaggerContainer } from "@/components/animations/StaggerContainer";
import { MessageSquare } from "lucide-react";

type Testimonial = {
  id: number;
  quote: string;
  author: string;
  role: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    quote: "I sell a Notion finance template. Seerist found me 14 buyers in the first week on Upwork alone. I had 0 marketing budget.",
    author: "James K.",
    role: "Notion template creator",
  },
  {
    id: 2,
    quote: "The proposal quality surprised me. It's not generic — it actually references the specific problem in the job post.",
    author: "Maria S.",
    role: "SaaS founder",
  },
  {
    id: 3,
    quote: "I was spending 2 hours a day manually checking platforms. Now I spend 20 minutes reviewing proposals Seerist already wrote.",
    author: "David R.",
    role: "Indie developer",
  },
  {
    id: 4,
    quote: "Set it up on a Sunday, had 3 proposals sent by Monday morning. One converted to a $400 deal within the week.",
    author: "Tom H.",
    role: "Webflow developer",
  },
  {
    id: 5,
    quote: "As someone selling a dev tool API, I thought freelance platforms wouldn't be a fit. Seerist proved me wrong — found real business buyers.",
    author: "Ananya P.",
    role: "API founder",
  },
  {
    id: 6,
    quote: "The pipeline view is clean. I can see which proposals are getting traction and which platforms convert best for my product.",
    author: "Chris M.",
    role: "SaaS tools builder",
  },
  {
    id: 7,
    quote: "My course sales doubled in a month. Seerist matched my course to people actively searching for that exact topic.",
    author: "Priya L.",
    role: "Course creator",
  },
  {
    id: 8,
    quote: "I shipped my WordPress plugin and forgot about sales. Two days later I had 5 qualified leads from freelance platforms.",
    author: "Sam T.",
    role: "Plugin developer",
  },
  {
    id: 9,
    quote: "The auto-propose feature is magic. It's like having a sales rep that never sleeps and already knows your product cold.",
    author: "Rachel N.",
    role: "Template designer",
  },
  {
    id: 10,
    quote: "I used to think freelance buyers were all price shoppers. Seerist helped me find buyers looking for quality — and they paid for it.",
    author: "Marcus O.",
    role: "Design asset seller",
  },
  {
    id: 11,
    quote: "Converting freelance buyers into recurring revenue changed my business model for the better. Seerist made it sustainable.",
    author: "Elena W.",
    role: "SaaS founder",
  },
  {
    id: 12,
    quote: "Onboarding took 10 minutes. The first proposal it wrote felt more personal than what I was sending manually.",
    author: "Victor G.",
    role: "Indie hacker",
  },
];

function StarRating() {
  return <div className="text-amber-400 text-sm tracking-tight">★★★★★</div>;
}

function TestimonialCard({ quote, author, role }: Testimonial) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      className="rounded-2xl border border-[#EBEEF5] bg-white p-6 flex flex-col gap-4 h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <StarRating />
      <p className="text-[0.9375rem] text-[#2D3754] leading-relaxed flex-1">{quote}</p>
      <div className="flex items-center gap-3 border-t border-[#F4F6FB] pt-4 mt-auto">
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center text-white text-[0.8125rem] font-semibold flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #635BFF, #8B5CF6)" }}
        >
          {author.charAt(0)}
        </div>
        <div>
          <p className="text-[0.875rem] font-semibold text-[#0B1221]">{author}</p>
          <p className="text-[0.75rem] text-[#94A0BC]">{role}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function Testimonials() {
  return (
    <section className="relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 50% 40% at 50% 60%, rgba(99,91,255,0.03) 0%, transparent 70%)",
          }}
        />
      </div>

      <Container>
        <div className="text-center mb-14">
          <FadeUp>
            <p className="section-label mb-4">
              <MessageSquare className="w-3.5 h-3.5" />
              Testimonials
            </p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2
              className="tracking-tight text-[#0B1221]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Trusted by 300+ indie founders
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto mt-3 max-w-[480px] text-[1.0625rem] text-[#5E6B8A]">
              SaaS founders, template creators, and indie hackers use Seerist to find buyers automatically.
            </p>
          </FadeUp>
        </div>
        <StaggerContainer>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TESTIMONIALS.slice(0, 6).map((item) => (
              <TestimonialCard key={item.id} {...item} />
            ))}
          </div>
        </StaggerContainer>
      </Container>
    </section>
  );
}
