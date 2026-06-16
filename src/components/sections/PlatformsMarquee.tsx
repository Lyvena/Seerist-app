"use client";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { FadeUp } from "@/components/animations/FadeUp";
import { SectionLabel } from "@/components/ui/SectionLabel";

const PLATFORMS = [
  "Upwork",
  "Freelancer.com",
  "Contra",
  "Toptal",
  "PeoplePerHour",
  "Fiverr",
  "Guru",
  "We Work Remotely",
  "Remote.co",
  "LinkedIn Jobs",
  "99designs",
  "Dribbble Jobs",
  "Remote OK",
  "Working Not Working",
];

const BRAND_COLORS: Record<string, string> = {
  Upwork: "#14A800",
  "Freelancer.com": "#1BBAE5",
  Contra: "#1A1A1A",
  Toptal: "#2A3850",
  PeoplePerHour: "#FFB900",
  Fiverr: "#1DBF73",
  Guru: "#193A6F",
  "We Work Remotely": "#4A3AE0",
  "Remote.co": "#0EA5E9",
  "LinkedIn Jobs": "#0A66C2",
  "99designs": "#F24A8A",
  "Dribbble Jobs": "#EA4C89",
  "Remote OK": "#2A3850",
  "Working Not Working": "#FF5A5F",
};

function PlatformCard({ name }: { name: string }) {
  const color = BRAND_COLORS[name] || "#7C3AED";
  return (
    <div
      className="flex h-[52px] min-w-[140px] items-center justify-center rounded-xl border bg-white px-4 transition-all duration-300 hover:scale-[1.04]"
      style={{
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <span className="text-sm font-semibold" style={{ color }}>
        {name}
      </span>
    </div>
  );
}

export function PlatformsMarquee() {
  const duplicated = [...PLATFORMS, ...PLATFORMS];

  return (
    <section className="overflow-hidden py-20">
      <Container>
        <div className="mb-10 text-center">
          <FadeUp>
            <SectionLabel>Coverage</SectionLabel>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2
              className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl"
              style={{ fontFamily: "var(--font-heading)", color: "var(--color-text-1)" }}
            >
              Monitoring 14 platforms — so you don&apos;t have to
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p
              className="mx-auto mt-3 max-w-2xl text-base"
              style={{ color: "var(--color-text-3)" }}
            >
              Every posting, every day, across every major freelance and remote jobs marketplace.
            </p>
          </FadeUp>
        </div>

        <div className="space-y-4">
          <div
            className="[mask-image:linear-gradient(to_right,transparent_0%,black_10%,black_90%,transparent_100%)]"
            style={{ WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)" }}
          >
            <div className="flex w-max gap-3" style={{ animation: "marquee-left 30s linear infinite" }}>
              {duplicated.map((name, index) => (
                <PlatformCard key={`row1-${index}`} name={name} />
              ))}
            </div>
          </div>
          <div
            className="[mask-image:linear-gradient(to_right,transparent_0%,black_10%,black_90%,transparent_100%)]"
            style={{ WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)" }}
          >
            <div className="flex w-max gap-3" style={{ animation: "marquee-right 35s linear infinite" }}>
              {duplicated.map((name, index) => (
                <PlatformCard key={`row2-${index}`} name={name} />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
