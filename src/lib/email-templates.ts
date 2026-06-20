const BRAND = "#7C3AED"
const BG = "#F4F6FB"
const CARD_BG = "#FFFFFF"
const TEXT_PRIMARY = "#1A1A2E"
const TEXT_SECONDARY = "#6B7280"
const TEXT_MUTED = "#9CA3AF"
const SUCCESS = "#10B981"

function wrap(html: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
    <table role="presentation" width="100%" style="max-width:560px">
      <tr><td style="padding-bottom:24px;text-align:center">
        <img src="https://seerist.xyz/logo.png" alt="Seerist" height="32" style="border:0"/>
      </td></tr>
      ${html}
      <tr><td style="padding-top:24px;text-align:center;font-size:12px;color:${TEXT_MUTED}">
        <p style="margin:0 0 4px">Seerist — AI-powered freelance opportunity matching</p>
        <p style="margin:0">
          <a href="{{manage_preferences_url}}" style="color:${BRAND};text-decoration:underline">Manage alert preferences</a>
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>`
}

function ctaButton(text: string, url: string, primary = true): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-block">
    <tr><td align="center" style="border-radius:8px;background:${primary ? BRAND : "transparent"};${primary ? "" : `border:1.5px solid ${BRAND}`}">
      <a href="${url}" target="_blank" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:${primary ? "#FFFFFF" : BRAND};text-decoration:none;border-radius:8px">${text}</a>
    </td></tr>
  </table>`
}

export function newOpportunityAlert(params: {
  score: number; platform: string; title: string; description: string
  budget: string; keywords: string[]; opportunityUrl: string; proposalUrl: string
}) {
  const scoreColor = params.score >= 80 ? SUCCESS : params.score >= 60 ? BRAND : "#F59E0B"
  const desc = params.description.length > 150 ? params.description.slice(0, 150) + "..." : params.description

  return wrap(`
    <tr><td style="background:${CARD_BG};border-radius:12px;padding:32px">
      <p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:${BRAND};margin:0 0 4px">New Opportunity Found</p>
      <h1 style="font-size:22px;font-weight:700;color:${TEXT_PRIMARY};margin:0 0 4px;line-height:1.3">${params.title}</h1>
      <p style="font-size:13px;color:${TEXT_SECONDARY};margin:0 0 16px">on ${params.platform}</p>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
        <tr>
          <td style="vertical-align:middle;padding-right:12px">
            <div style="width:48px;height:48px;border-radius:50%;background:${scoreColor}15;display:flex;align-items:center;justify-content:center;text-align:center">
              <span style="font-size:16px;font-weight:700;color:${scoreColor}">${params.score}</span>
            </div>
          </td>
          <td style="vertical-align:middle;font-size:13px;color:${TEXT_SECONDARY}">
            <strong style="color:${TEXT_PRIMARY}">Match Score</strong><br/>out of 100
          </td>
        </tr>
      </table>

      <p style="font-size:14px;color:${TEXT_SECONDARY};line-height:1.6;margin:0 0 16px">${desc}</p>

      <p style="font-size:13px;color:${TEXT_SECONDARY};margin:0 0 4px"><strong style="color:${TEXT_PRIMARY}">Budget:</strong> ${params.budget}</p>

      ${params.keywords.length > 0 ? `<p style="font-size:13px;color:${TEXT_SECONDARY};margin:0 0 20px"><strong style="color:${TEXT_PRIMARY}">Matched Keywords:</strong> ${params.keywords.join(", ")}</p>` : ""}

      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="padding-right:8px">${ctaButton("Generate Proposal →", params.proposalUrl)}</td>
        <td>${ctaButton("View Opportunity →", params.opportunityUrl, false)}</td>
      </tr></table>
    </td></tr>
  `)
}

export function dailyDigest(params: {
  name: string; discovered: number; highScore: number; platformsScanned: number
  topOpps: Array<{ title: string; platform: string; score: number; url: string }>
  totalOpps: number; worstPlatform: string | null; digestUrl: string
}) {
  const topCards = params.topOpps.slice(0, 5).map((opp) => `
    <tr><td style="padding:8px 0;border-bottom:1px solid ${BG}">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="vertical-align:middle">
            <a href="${opp.url}" style="font-size:14px;font-weight:600;color:${TEXT_PRIMARY};text-decoration:none">${opp.title}</a>
            <p style="font-size:12px;color:${TEXT_SECONDARY};margin:2px 0 0">${opp.platform}</p>
          </td>
          <td width="40" style="vertical-align:middle;text-align:right">
            <span style="font-size:14px;font-weight:700;color:${opp.score >= 80 ? SUCCESS : opp.score >= 60 ? BRAND : "#F59E0B"}">${opp.score}</span>
          </td>
        </tr>
      </table>
    </td></tr>
  `).join("")

  return wrap(`
    <tr><td style="background:${CARD_BG};border-radius:12px;padding:32px">
      <p style="font-size:14px;color:${TEXT_SECONDARY};margin:0 0 20px">Hi ${params.name}, here's what we found today:</p>

      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px">
        <tr>
          ${[
            { label: "Discovered", value: params.discovered },
            { label: "High Score (≥70)", value: params.highScore },
            { label: "Platforms Scanned", value: params.platformsScanned },
          ].map((s) => `
            <td style="text-align:center;padding:16px 8px;background:${BG};border-radius:8px;width:33%">
              <div style="font-size:24px;font-weight:700;color:${TEXT_PRIMARY}">${s.value}</div>
              <div style="font-size:11px;color:${TEXT_MUTED};margin-top:2px">${s.label}</div>
            </td>
          `).join("")}
        </tr>
      </table>

      <h2 style="font-size:16px;font-weight:600;color:${TEXT_PRIMARY};margin:0 0 8px">Top Opportunities</h2>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${topCards}</table>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px">
        <tr><td>${ctaButton(`View All ${params.totalOpps} Opportunities →`, params.digestUrl)}</td></tr>
      </table>

      ${params.worstPlatform ? `
        <p style="font-size:13px;color:${TEXT_MUTED};margin-top:16px;padding-top:16px;border-top:1px solid ${BG}">
          💡 Consider adjusting your keywords for <strong style="color:${TEXT_PRIMARY}">${params.worstPlatform}</strong> — it had the fewest matches this period.
        </p>
      ` : ""}
    </td></tr>
  `)
}

export function weeklyDigest(params: {
  name: string; discovered: number; prevDiscovered: number; highScore: number
  proposalsSent: number; winRate: number; platformsScanned: number
  topOpps: Array<{ title: string; platform: string; score: number; url: string }>
  totalOpps: number; digestUrl: string
}) {
  const pctChange = params.prevDiscovered > 0 ? Math.round(((params.discovered - params.prevDiscovered) / params.prevDiscovered) * 100) : 0

  const topCards = params.topOpps.slice(0, 5).map((opp) => `
    <tr><td style="padding:8px 0;border-bottom:1px solid ${BG}">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="vertical-align:middle">
            <a href="${opp.url}" style="font-size:14px;font-weight:600;color:${TEXT_PRIMARY};text-decoration:none">${opp.title}</a>
            <p style="font-size:12px;color:${TEXT_SECONDARY};margin:2px 0 0">${opp.platform}</p>
          </td>
          <td width="40" style="vertical-align:middle;text-align:right">
            <span style="font-size:14px;font-weight:700;color:${opp.score >= 80 ? SUCCESS : opp.score >= 60 ? BRAND : "#F59E0B"}">${opp.score}</span>
          </td>
        </tr>
      </table>
    </td></tr>
  `).join("")

  return wrap(`
    <tr><td style="background:${CARD_BG};border-radius:12px;padding:32px">
      <p style="font-size:14px;color:${TEXT_SECONDARY};margin:0 0 20px">Hi ${params.name}, here's your weekly roundup:</p>

      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px">
        <tr>
          ${[
            { label: "Opportunities", value: params.discovered, change: pctChange },
            { label: "High Score", value: params.highScore },
            { label: "Proposals Sent", value: params.proposalsSent },
          ].map((s) => `
            <td style="text-align:center;padding:16px 8px;background:${BG};border-radius:8px;width:33%">
              <div style="font-size:24px;font-weight:700;color:${TEXT_PRIMARY}">${s.value}</div>
              <div style="font-size:11px;color:${TEXT_MUTED};margin-top:2px">${s.label}</div>
              ${"change" in s ? `<div style="font-size:11px;color:${s.change! >= 0 ? SUCCESS : "#EF4444"};margin-top:2px">${s.change! >= 0 ? "+" : ""}${s.change}% vs last week</div>` : ""}
            </td>
          `).join("")}
        </tr>
      </table>

      <h2 style="font-size:16px;font-weight:600;color:${TEXT_PRIMARY};margin:0 0 8px">Top Opportunities</h2>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${topCards}</table>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px">
        <tr><td>${ctaButton(`View All ${params.totalOpps} Opportunities →`, params.digestUrl)}</td></tr>
      </table>

      <p style="font-size:13px;color:${TEXT_MUTED};margin-top:16px;padding-top:16px;border-top:1px solid ${BG}">
        💡 Pro tip: Opportunities with scores above 80 have the highest conversion rate. Focus your proposal efforts there.
      </p>
    </td></tr>
  `)
}

export function welcome(params: { name: string; onboardingUrl: string }) {
  return wrap(`
    <tr><td style="background:${CARD_BG};border-radius:12px;padding:32px">
      <h1 style="font-size:22px;font-weight:700;color:${TEXT_PRIMARY};margin:0 0 4px">Welcome to Seerist, ${params.name}! 🎉</h1>
      <p style="font-size:14px;color:${TEXT_SECONDARY};line-height:1.6;margin:8px 0 24px">
        We'll help you find freelance projects that match your SaaS product — automatically.
      </p>

      <h2 style="font-size:15px;font-weight:600;color:${TEXT_PRIMARY};margin:0 0 12px">Quick Start Guide</h2>

      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding:12px 0;border-bottom:1px solid ${BG}">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td width="28" style="vertical-align:top;font-size:14px;font-weight:700;color:${BRAND}">1.</td>
              <td style="vertical-align:top;font-size:14px;color:${TEXT_SECONDARY}"><strong style="color:${TEXT_PRIMARY}">Tell us about your product</strong> — what it does, who it's for, and what kind of projects you're looking for.</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:12px 0;border-bottom:1px solid ${BG}">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td width="28" style="vertical-align:top;font-size:14px;font-weight:700;color:${BRAND}">2.</td>
              <td style="vertical-align:top;font-size:14px;color:${TEXT_SECONDARY}"><strong style="color:${TEXT_PRIMARY}">Choose your platforms</strong> — we'll monitor Upwork, Freelancer, We Work Remotely, and more.</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:12px 0">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td width="28" style="vertical-align:top;font-size:14px;font-weight:700;color:${BRAND}">3.</td>
              <td style="vertical-align:top;font-size:14px;color:${TEXT_SECONDARY}"><strong style="color:${TEXT_PRIMARY}">Get matched</strong> — we'll score and rank every opportunity, and send the best ones your way.</td>
            </tr>
          </table>
        </td></tr>
      </table>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px">
        <tr><td>${ctaButton("Complete Setup →", params.onboardingUrl)}</td></tr>
      </table>
    </td></tr>
  `)
}

export function proposalTip(params: { name: string; proposalUrl: string }) {
  return wrap(`
    <tr><td style="background:${CARD_BG};border-radius:12px;padding:32px">
      <h1 style="font-size:20px;font-weight:700;color:${TEXT_PRIMARY};margin:0 0 4px">Tip: Let AI write your first proposal ✍️</h1>
      <p style="font-size:14px;color:${TEXT_SECONDARY};line-height:1.6;margin:12px 0 20px">
        Hi ${params.name}, you've been matched with some great opportunities but haven't sent a proposal yet. Let Seerist's AI do the heavy lifting.
      </p>

      <div style="background:${BG};border-radius:8px;padding:16px;margin-bottom:20px">
        <p style="font-size:13px;color:${TEXT_SECONDARY};margin:0 0 8px;font-style:italic">
          "Hi, I noticed you're looking for a developer to build a customer dashboard. My product, AnalyticsPro, is a ready-made analytics platform that handles data visualization, user management, and reporting out of the box. I can have it customized for your needs in under a week. Would you be available for a quick call to discuss?"
        </p>
        <p style="font-size:12px;color:${TEXT_MUTED};margin:0">— Example of a great proposal</p>
      </div>

      <p style="font-size:14px;color:${TEXT_SECONDARY};line-height:1.6;margin:0 0 20px">
        Just pick an opportunity, select a tone (professional, friendly, or technical), and let AI draft it. You review and send.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr><td>${ctaButton("Try the Proposal Generator →", params.proposalUrl)}</td></tr>
      </table>
    </td></tr>
  `)
}
