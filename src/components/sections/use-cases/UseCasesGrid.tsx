"use client";
import { motion } from "framer-motion";
import { FadeUp, StaggerContainer } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";

const USE_CASES = [
  {
    icon: "⚡",
    title: "Sell your SaaS through freelance platforms",
    body: "Founders selling project management tools, invoicing software, CRMs, and productivity apps find a steady stream of small businesses and agencies posting on Upwork looking for exactly what they built.",
    stat: "Avg 34 relevant matches/week for SaaS tools",
  },
  {
    icon: "🎨",
    title: "Move templates and themes beyond Gumroad",
    body: "Webflow, Framer, and Notion template creators use Seerist to find people actively posting about needing a new site, dashboard, or workflow system.",
    stat: "Templates see highest match rates on Contra and Fiverr",
  },
  {
    icon: "🔌",
    title: "Browser extensions and app plugins",
    body: "If your plugin solves a real workflow problem, there are people on freelance platforms actively trying to solve that problem. Seerist connects you to them.",
    stat: "Plugin devs report highest conversion rates on Upwork",
  },
  {
    icon: "📚",
    title: "Info products and online courses",
    body: "People posting about needing to learn a skill are often receptive to a well-positioned course recommendation. Seerist identifies these learners and generates educational, helpful proposals.",
    stat: "Course creators see 2.1x higher response rates",
  },
  {
    icon: "🛠",
    title: "Developer tools and APIs",
    body: "Developers posting about needing a specific data source, integration, or functionality are prime buyers for API products. Seerist's technical scoring understands developer-specific language.",
    stat: "API products average 28 qualified leads/month",
  },
];

function UseCaseCard({
  icon,
  title,
  body,
  stat,
}: {
  icon: string;
  title: string;
  body: string;
  stat: string;
}) {
  return (
    <FadeUp>
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 transition-all duration-300 hover:shadow-[var(--shadow-md)]">
        <div
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
          style={{ background: "var(--color-accent-light)" }}
        >
          {icon}
        </div>
        <h3
          className="text-xl font-semibold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-text-1)" }}
        >
          {title}
        </h3>
        <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--color-text-2)" }}>
          {body}
        </p>
        <p className="mt-4 text-sm font-medium text-violet-700">{stat}</p>
      </div>
    </FadeUp>
  );
}

export function UseCasesGrid() {
  return (
    <section className="py-20">
      <Container>
        <StaggerContainer>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((useCase) => (
              <UseCaseCard key={useCase.title} {...useCase} />
            ))}
          </div>
        </StaggerContainer>
      </Container>
    </section>
  );
}
