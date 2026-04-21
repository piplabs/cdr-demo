import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://usecdr.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const routes: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
    { path: "", priority: 1.0, changeFrequency: "weekly" },
    { path: "/storage", priority: 0.9, changeFrequency: "weekly" },
    { path: "/secret", priority: 0.8, changeFrequency: "weekly" },
    { path: "/marketplace", priority: 0.9, changeFrequency: "weekly" },
    { path: "/ai", priority: 0.9, changeFrequency: "weekly" },
    { path: "/agents", priority: 0.8, changeFrequency: "weekly" },
    { path: "/bounties", priority: 0.8, changeFrequency: "weekly" },
  ];

  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
