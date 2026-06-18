"use client";
import { Container } from "@/components/ui/Container";
import { FadeUp } from "@/components/animations/FadeUp";
import { Globe } from "lucide-react";

const PLATFORMS = [
  { key: "upwork", name: "Upwork", short: "U", color: "#14A800" },
  { key: "freelancer", name: "Freelancer", short: "F", color: "#0E73BB" },
  { key: "contra", name: "Contra", short: "C", color: "#111827" },
  { key: "toptal", name: "Toptal", short: "T", color: "#204ECF" },
  { key: "peopleperhour", name: "PeoplePerHour", short: "P", color: "#FF7A00" },
  { key: "fiverr", name: "Fiverr", short: "Fi", color: "#1DBF73" },
  { key: "guru", name: "Guru", short: "G", color: "#33CC99" },
  { key: "wework", name: "We Work Remotely", short: "W", color: "#A742B1" },
  { key: "remoteco", name: "Remote.co", short: "R", color: "#FF4444" },
  { key: "linkedin", name: "LinkedIn", short: "Li", color: "#0A66C2" },
  { key: "99designs", name: "99designs", short: "99", color: "#F7476C" },
  { key: "dribbble", name: "Dribbble", short: "Dr", color: "#EA4C89" },
  { key: "remoteok", name: "Remote OK", short: "RO", color: "#000000" },
  { key: "wnw", name: "Working Not Working", short: "WW", color: "#2563EB" },
];

function PlatformCard({ platform }: { platform: (typeof PLATFORMS)[0] }) {
  return (
    <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white border border-[#EBEEF5] rounded-xl shadow-sm mr-3 whitespace-nowrap flex-shrink-0 hover:border-[#C7C3FF] hover:shadow-md transition-all duration-200">
      <div
        className="flex items-center justify-center rounded-lg"
        style={{
          width: "24px",
          height: "24px",
          background: platform.color,
          color: "white",
          fontSize: "0.625rem",
          fontWeight: 700,
        }}
      >
        {platform.short}
      </div>
      <span className="text-[0.875rem] font-medium text-[#2D3754]">
        {platform.name}
      </span>
    </div>
  );
}

export function PlatformsMarquee() {
  const duplicated = [...PLATFORMS, ...PLATFORMS];

  return (
    <section className="overflow-hidden py-16">
      <Container>
        <div className="mb-10 text-center">
          <FadeUp>
            <p className="section-label mb-4">
              <Globe className="w-3.5 h-3.5" />
              Coverage
            </p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2
              className="mt-3 tracking-tight text-[#0B1221]"
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)",
                fontWeight: 600,
              }}
            >
              Monitoring 14 platforms — so you don't have to
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto mt-3 max-w-[520px] text-[1.0625rem] text-[#5E6B8A]">
              Every posting, every day, across every major freelance and remote jobs marketplace.
            </p>
          </FadeUp>
        </div>

        <div className="flex flex-col gap-3 lg:hidden">
          <div
            style={{
              overflow: "hidden",
              maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
            }}
          >
            <div className="flex w-max gap-3" style={{ animation: "marquee-left 22s linear infinite" }}>
              {duplicated.map((platform, index) => (
                <PlatformCard key={`row-mobile-${index}`} platform={platform} />
              ))}
            </div>
          </div>
        </div>

        <div className="hidden lg:flex lg:flex-col lg:gap-3">
          <div
            style={{
              overflow: "hidden",
              maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
            }}
          >
            <div className="flex w-max gap-3" style={{ animation: "marquee-left 32s linear infinite" }}>
              {duplicated.map((platform, index) => (
                <PlatformCard key={`row1-${index}`} platform={platform} />
              ))}
            </div>
          </div>
          <div
            style={{
              overflow: "hidden",
              maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
            }}
          >
            <div className="flex w-max gap-3" style={{ animation: "marquee-right 28s linear infinite" }}>
              {duplicated.map((platform, index) => (
                <PlatformCard key={`row2-${index}`} platform={platform} />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
