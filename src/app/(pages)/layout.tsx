"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import { SmoothScroll } from "@/components/animations/SmoothScroll";
import { PageLoader } from "@/components/animations/PageLoader";
import { TooltipProvider } from "@/components/ui/tooltip";

const ease = [0.16, 1, 0.3, 1] as const;

export default function PagesLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleRouteChangeStart = () => setLoading(true);
    window.addEventListener("routeChangeStart", handleRouteChangeStart);
    return () => window.removeEventListener("routeChangeStart", handleRouteChangeStart);
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-[#0A0A0A] antialiased">
        <PageLoader onDone={() => setLoading(false)} />
        <AnimatePresence mode="wait">
          {!loading && (
            <motion.div
              key="page"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease }}
            >
              <TooltipProvider>
                <SmoothScroll>
                  <AnnouncementBanner />
                  <Nav />
                  {children}
                  <Footer />
                </SmoothScroll>
              </TooltipProvider>
            </motion.div>
          )}
        </AnimatePresence>
      </body>
    </html>
  );
}
