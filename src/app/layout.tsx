import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SmoothScroll } from "@/components/animations/SmoothScroll";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://seerist.xyz"),
  title: {
    default: "Seerist — Sell Your SaaS Through Every Freelance Platform",
    template: "%s | Seerist",
  },
  description:
    "Seerist monitors 14 freelance platforms for buyers who need exactly what you built — then writes the proposal. Automatic sales for indie SaaS founders.",
  keywords: [
    "SaaS sales automation",
    "freelance platform monitoring",
    "Upwork automation",
    "indie hacker tools",
    "AI proposal generator",
  ],
  authors: [{ name: "Seerist" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://seerist.xyz",
    siteName: "Seerist",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@seeristxyz",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://seerist.xyz",
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://app.seerist.xyz" />
      </head>
      <body className="min-h-screen bg-white text-[#0A0A0A] antialiased">
        <TooltipProvider>
          <SmoothScroll>
            <AnnouncementBanner />
            <Nav />
            <main className="pt-24 md:pt-26">{children}</main>
            <Footer />
          </SmoothScroll>
        </TooltipProvider>
      </body>
    </html>
  );
}