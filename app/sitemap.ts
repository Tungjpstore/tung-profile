import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/site";
import { listPosts } from "./lib/posts-store";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const posts = await listPosts(false).catch(() => []);
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    ...posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt || post.createdAt ? new Date(post.updatedAt || post.createdAt || "") : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
