import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "*.insforge.site" },
      { hostname: "x69u73wi.eu-central.insforge.app" },
    ],
    formats: ["image/webp", "image/avif"],
  },
};

export default bundleAnalyzer(nextConfig);
