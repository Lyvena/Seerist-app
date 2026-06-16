import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ hostname: "*.insforge.site" }],
    formats: ["image/webp", "image/avif"],
  },
};

export default bundleAnalyzer(nextConfig);
