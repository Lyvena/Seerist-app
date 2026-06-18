"use client";
import { FadeUp } from "@/components/animations/FadeUp";
import { StaggerContainer } from "@/components/animations/StaggerContainer";
import { Container } from "@/components/ui/Container";
import { ArrowRight } from "lucide-react";

const USE_CASES = [
  {
    icon: "⚡",
    title: "Sell your SaaS through freelance platforms",
    body: "Founders selling project management tools, invoicing software, CRMs, and productivity apps find a steady stream of small businesses and agencies posting on Upwork looking for exactly what they built.",
    stat: "Avg 34 relevant matches/week",
    gradient: "from-[#635BFF] to-[#8B5CF6]",
  },
  {
    icon: "🎨",
    title: "Move templates and themes beyond Gumroad",
    body: "Webflow, Framer, and Notion template creators use Seerist to find people actively posting about needing a new site, dashboard, or workflow system.",
    stat: "Highest match rates on Contra & Fiverr",
    gradient: "from-[#8B5CF6] to-[#A78BFA]",
  },
  {
    icon: "🔌",
    title: "Browser extensions and app plugins",
    body: "If your plugin solves a real workflow problem, there are people on freelance platforms actively trying to solve that problem. Seerist connects you to them.",
    stat: "Highest conversion on Upwork",
    gradient: "from-[#00C2A8] to-[#059669]",
  },
  {
    icon: "📚",
    title: "Info products and online courses",
    body: "People posting about needing to learn a skill are often receptive to a well-positioned course recommendation. Seerist identifies these learners and generates educational, helpful proposals.",
    stat: "2.1x higher response rates",
    gradient: "from-[#F59E0B] to-[#D97706]",
  },
  {
    icon: "🛠",
    title: "Developer tools and APIs",
    body: "Developers posting about needing a specific data source, integration, or functionality are prime buyers for API products. Seerist's technical scoring understands developer-specific language.",
    stat: "28 qualified leads/month avg",
    gradient: "from-[#EC4899] to-[#DB2777]",
  },
];

function UseCaseCard({ icon, title, body, stat, gradient }: typeof USE_CASES[0]) {
  return (
    <FadeUp>
      <div
        className="group rounded-2xl border border-[#EBEEF5] bg-white p-7 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full flex flex-col"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        <div className="h-1 w-12 rounded-full mb-5" style={{ background: `linear-gradient(90deg, ${gradient.split(" ")[1]}, ${gradient.split(" ")[3]})` }} />
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
          style={{ background: "#F4F6FB" }}
        >
          {icon}
        </div>
        <h3
          className="text-lg font-bold text-[#0B1221] mb-2"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {title}
        </h3>
        <p className="text-[0.9375rem] leading-relaxed text-[#5E6B8A] flex-1">{body}</p>
        <div className="mt-4 pt-4 border-t border-[#F4F6FB] flex items-center justify-between">
          <p className="text-[0.8125rem] font-semibold text-[#635BFF]">{stat}</p>
          <ArrowRight className="w-4 h-4 text-[#C7C3FF] group-hover:text-[#635BFF] group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </FadeUp>
  );
}

export function UseCasesGrid() {
  return (
    <section className="py-20">
      <Container>
        <StaggerContainer>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((useCase) => (
              <UseCaseCard key={useCase.title} {...useCase} />
            ))}
          </div>
        </StaggerContainer>
      </Container>
    </section>
  );
}
