import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SmoothScroll } from "@/components/animations/SmoothScroll";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://seerist.xyz"),
  title: {
    default: "Seerist — Sell Automatically on Freelance Platforms",
    template: "%s | Seerist",
  },
  description:
    "Seerist helps indie developers and SaaS founders sell their products automatically through Upwork, Freelancer, Contra, and more.",
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
