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
    <div className="flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, index) => (
        <svg
          key={index}
          className="h-4 w-4 fill-current"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
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
      className="rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-300 ease-out-expo hover:-translate-y-1 hover:shadow-md"
    >
      <StarRating />
      <p className="mt-4 text-base leading-relaxed text-gray-700">{quote}</p>
      <div className="mt-5 flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-full"
          style={{
            background: "linear-gradient(135deg, #A78BFA, #7C3AED)",
          }}
        />
        <div>
          <p className="text-sm font-semibold text-gray-900">{author}</p>
          <p className="text-xs text-gray-500">{role}</p>
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
              className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl text-gray-900"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Joined by 200+ indie founders selling through Seerist
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto mt-3 max-w-2xl text-base text-gray-600">
              Real results from real product builders.
            </p>
          </FadeUp>
        </div>
        <StaggerContainer>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((item) => (
              <TestimonialCard key={item.id} {...item} />
            ))}
          </div>
        </StaggerContainer>
      </Container>
    </section>
  );
}
