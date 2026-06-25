import { MetadataRoute } from "next";

// The marketing site (features, pricing, blog) lives at https://seerist.xyz.
// This app is a private, auth-gated web application — the sitemap reflects that.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://seerist.xyz",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
  ];
}
