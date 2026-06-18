"use client";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { FadeUp } from "@/components/animations/FadeUp";
import { StaggerContainer } from "@/components/animations/StaggerContainer";
import { SectionLabel } from "@/components/ui/SectionLabel";

type Testimonial = {
  id: number;
  quote: string;
  author: string;
  role: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    quote:
      "I sell a Notion finance template. Seerist found me 14 buyers in the first week on Upwork alone. I had 0 marketing budget.",
    author: "James K.",
    role: "Notion template creator",
  },
  {
    id: 2,
    quote:
      "The proposal quality surprised me. It's not generic — it actually references the specific problem in the job post.",
    author: "Maria S.",
    role: "SaaS founder",
  },
  {
    id: 3,
    quote:
      "I was spending 2 hours a day manually checking platforms. Now I spend 20 minutes reviewing proposals Seerist already wrote.",
    author: "David R.",
    role: "Indie developer",
  },
  {
    id: 4,
    quote:
      "Set it up on a Sunday, had 3 proposals sent by Monday morning. One converted to a $400 deal within the week.",
    author: "Tom H.",
    role: "Webflow developer",
  },
  {
    id: 5,
    quote:
      "As someone selling a dev tool API, I thought freelance platforms wouldn't be a fit. Seerist proved me wrong — found real business buyers.",
    author: "Ananya P.",
    role: "API founder",
  },
  {
    id: 6,
    quote:
      "The pipeline view is clean. I can see which proposals are getting traction and which platforms convert best for my product.",
    author: "Chris M.",
    role: "SaaS tools builder",
  },
  {
    id: 7,
    quote:
      "My course sales doubled in a month. Seerist matched my course to people actively searching for that exact topic.",
    author: "Priya L.",
    role: "Course creator",
  },
  {
    id: 8,
    quote:
      "I shipped my WordPress plugin and forgot about sales. Two days later I had 5 qualified leads from freelance platforms.",
    author: "Sam T.",
    role: "Plugin developer",
  },
  {
    id: 9,
    quote:
      "The auto-propose feature is magic. It's like having a sales rep that never sleeps and already knows your product cold.",
    author: "Rachel N.",
    role: "Template designer",
  },
  {
    id: 10,
    quote:
      "I used to think freelance buyers were all price shoppers. Seerist helped me find buyers looking for quality — and they paid for it.",
    author: "Marcus O.",
    role: "Design asset seller",
  },
  {
    id: 11,
    quote:
      "Converting freelance buyers into recurring revenue changed my business model for the better. Seerist made it sustainable.",
    author: "Elena W.",
    role: "SaaS founder",
  },
  {
    id: 12,
    quote:
      "Onboarding took 10 minutes. The first proposal it wrote felt more personal than what I was sending manually.",
    author: "Victor G.",
    role: "Indie hacker",
  },
];

function StarRating() {
  return (
    <div className="text-violet-600" style={{ fontSize: "1rem" }}>
      {"★★★★★"}
    </div>
  );
}

function TestimonialCard({ quote, author, role }: Testimonial) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      className="rounded-xl border border-[#F3F4F6] bg-white p-7 flex flex-col gap-4 h-full transition-all duration-200 ease"
      style={{
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
      whileHover={{
        y: -4,
        boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
      }}
    >
      <StarRating />
      <p className="text-base text-[#374151] leading-relaxed flex-1" style={{ lineHeight: 1.7 }}>{quote}</p>
      <div className="flex items-center gap-3 border-t border-[#F9FAFB] pt-4 mt-auto">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #7C3AED, #A855F7)",
            color: "white",
            fontSize: "0.875rem",
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {author.charAt(0)}
        </div>
        <div>
          <p className="text-[0.9375rem] font-semibold text-[#111827]">{author}</p>
          <p className="text-[0.8125rem] text-[#9CA3AF] mt-0.5">{role}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function Testimonials() {
  return (
    <section className="bg-white py-24">
      <Container>
        <div className="mb-16 text-center">
          <FadeUp>
            <SectionLabel>What founders say</SectionLabel>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2
              className="mt-4 tracking-tight text-gray-900"
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.75rem, 3vw, 2.75rem)",
                fontWeight: 600,
              }}
            >
              Joined by 200+ indie founders selling through Seerist
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto mt-3 max-w-2xl text-[1.0625rem] text-[#6B7280]">
              Joined by 200+ indie founders selling through Seerist
            </p>
          </FadeUp>
        </div>
        <StaggerContainer>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3" style={{ gap: "20px" }}>
            {TESTIMONIALS.map((item) => (
              <TestimonialCard key={item.id} {...item} />
            ))}
          </div>
        </StaggerContainer>
      </Container>
    </section>
  );
}
