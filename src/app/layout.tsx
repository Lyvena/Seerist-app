import { Geist, Geist_Mono } from "next/font/google";
import { localFont } from "next/font/local";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SmoothScroll } from "@/components/animations/SmoothScroll";
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

const calSans = localFont({
  src: "../public/fonts/CalSans-SemiBold.woff2",
  variable: "--font-cal",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${calSans.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-white text-[#0A0A0A] antialiased">
        <TooltipProvider>
          <SmoothScroll>{children}</SmoothScroll>
        </TooltipProvider>
      </body>
    </html>
  );
}
