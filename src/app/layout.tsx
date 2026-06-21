import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://seerist.xyz"),
  title: {
    default: "Seerist",
    template: "Seerist | %s",
  },
  description:
    "Seerist analyzes your SaaS product and finds perfect freelance projects that need exactly what you've built. AI-powered matching, proposals, and pipeline for indie founders.",
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
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <NuqsAdapter>{children}</NuqsAdapter>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}