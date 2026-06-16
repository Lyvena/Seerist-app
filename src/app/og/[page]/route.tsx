import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

const PAGE_TITLES: Record<string, string> = {
  features: "Features — Every Tool You Need",
  pricing: "Pricing — Start Free",
  "how-it-works": "How It Works",
  "use-cases": "Use Cases for Indie Founders",
  about: "About Seerist",
  blog: "Blog",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ page: string }> }
) {
  const { page } = await params;
  const title = PAGE_TITLES[page] ?? "Seerist";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
          padding: 80,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "3px solid white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "white",
              }}
            />
          </div>
          <span
            style={{
              fontSize: 60,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Seerist
          </span>
        </div>
        <p
          style={{
            fontSize: 36,
            fontWeight: 700,
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.3,
          }}
        >
          {title}
        </p>
        <div
          style={{
            position: "absolute",
            bottom: 60,
            display: "flex",
            gap: 24,
            opacity: 0.6,
            fontSize: 18,
          }}
        >
          {["Upwork", "Freelancer", "Toptal", "Contra", "Fiverr"].map((p) => (
            <span key={p}>{p}</span>
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            width: 400,
            height: 400,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.15)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 280,
            height: 280,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.25)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 160,
            height: 160,
            borderRadius: "50%",
            border: "1.5px solid rgba(255,255,255,0.4)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
