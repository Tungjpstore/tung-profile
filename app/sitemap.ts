import type { MetadataRoute } from "next";
import fs from "fs";
import path from "path";
import { SITE_URL } from "./lib/site";

const POSTS_DIR = path.join(process.cwd(), "data", "posts");

function getPublicPosts() {
  try {
    if (!fs.existsSync(POSTS_DIR)) return [];
    return fs.readdirSync(POSTS_DIR)
      .filter((file) => file.endsWith(".json"))
      .map((file) => JSON.parse(fs.readFileSync(path.join(POSTS_DIR, file), "utf-8")) as { slug?: string; status?: string; updatedAt?: string; createdAt?: string; scheduledAt?: string })
      .filter((post) => post.slug && post.status === "published" && (!post.scheduledAt || new Date(post.scheduledAt).getTime() <= Date.now()));
  } catch {
    return [];
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_URL;
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    ...getPublicPosts().map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt || post.createdAt ? new Date(post.updatedAt || post.createdAt || "") : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
