"use client";
import { Container } from "@/components/ui/Container";
import { FadeIn } from "@/components/animations/FadeIn";

const LOGOS = [
  "Notion",
  "Webflow",
  "Framer",
  "Lemon Squeezy",
  "Gumroad",
  "Stripe",
  "ConvertKit",
  "Beehiiv",
];

export function LogosSection() {
  return (
    <section
      className="overflow-hidden"
      style={{ background: "#F9FAFB", padding: "60px 0" }}
    >
      <Container>
        <p
          className="text-center mb-10"
          style={{
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#9CA3AF",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Built on tools like: {LOGOS.join(", ")}
        </p>
        <FadeIn>
          <div
            className="flex flex-wrap items-center justify-center"
            style={{ gap: "48px" }}
          >
            {LOGOS.map((name) => (
              <span
                key={name}
                className="transition-all duration-300"
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  color: "#9CA3AF",
                  maxHeight: "28px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#374151")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
              >
                {name}
              </span>
            ))}
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}
