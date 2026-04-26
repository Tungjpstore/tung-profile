import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { head, put } from "@vercel/blob";
import fs from "fs";
import os from "os";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "posts");
const VERSION_DIR = path.join(process.cwd(), "data", "post-versions");
const RUNTIME_DIR = path.join(os.tmpdir(), "tung-profile-data", "posts");
const RUNTIME_VERSION_DIR = path.join(os.tmpdir(), "tung-profile-data", "post-versions");

const POSTS_KEY = process.env.POSTS_STORE_KEY || "tung-profile:posts";
const POST_VERSIONS_KEY = process.env.POST_VERSIONS_STORE_KEY || "tung-profile:post-versions";
const BLOB_POSTS_PATH = process.env.POSTS_BLOB_PATH || "data/posts/index.json";
const BLOB_VERSIONS_PATH = process.env.POST_VERSIONS_BLOB_PATH || "data/post-versions/index.json";
const R2_POSTS_KEY = process.env.R2_POSTS_KEY || "data/posts/index.json";
const R2_VERSIONS_KEY = process.env.R2_POST_VERSIONS_KEY || "data/post-versions/index.json";

export type StorageMode = "r2" | "blob" | "kv" | "file" | "runtime";

export interface StorageResult {
  mode: StorageMode;
  persistent: boolean;
  warning?: string;
}

export interface PostProduct {
  id: string;
  name: string;
  price: string;
  image: string;
  href: string;
  description: string;
  cta: string;
}

export interface StoredPost {
  slug: string;
  title: string;
  cover: string;
  content: string;
  excerpt: string;
  tags: string[];
  category: string;
  status: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
  readingMinutes: number;
  products: PostProduct[];
  productAngle: string;
}

export interface PostVersion {
  id: string;
  savedAt: string;
  post: StoredPost;
}

type VersionsMap = Record<string, PostVersion[]>;

function getKvConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

function getR2Config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

function getR2Client() {
  const config = getR2Config();
  if (!config) return null;
  return {
    bucket: config.bucket,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    }),
  };
}

async function streamToString(stream: unknown) {
  if (!stream || typeof (stream as { transformToString?: unknown }).transformToString !== "function") return "";
  return (stream as { transformToString: () => Promise<string> }).transformToString();
}

async function kvCommand(command: unknown[]) {
  const config = getKvConfig();
  if (!config) return null;

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const json = await response.json().catch(() => null) as { result?: unknown; error?: string } | null;
  if (!response.ok || json?.error) throw new Error(json?.error || "KV request failed");
  return json?.result ?? null;
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || Date.now().toString(36);
}

export function stripMarkdown(content: string) {
  return content
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/[#*_`>\-[\]().]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readingMinutes(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function normalizeProducts(products: unknown): PostProduct[] {
  if (!Array.isArray(products)) return [];
  return products
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `product-${index + 1}`,
      name: typeof item.name === "string" ? item.name : "",
      price: typeof item.price === "string" ? item.price : "",
      image: typeof item.image === "string" ? item.image : "",
      href: typeof item.href === "string" ? item.href : "",
      description: typeof item.description === "string" ? item.description : "",
      cta: typeof item.cta === "string" && item.cta.trim() ? item.cta : "Xem sản phẩm",
    }))
    .filter((item) => item.name || item.href || item.description);
}

export function normalizePost(post: Record<string, unknown>): StoredPost {
  const content = typeof post.content === "string" ? post.content : "";
  const createdAt = typeof post.createdAt === "string" ? post.createdAt : new Date().toISOString();
  const updatedAt = typeof post.updatedAt === "string" ? post.updatedAt : createdAt;
  return {
    slug: slugify(typeof post.slug === "string" ? post.slug : typeof post.title === "string" ? post.title : ""),
    title: typeof post.title === "string" ? post.title : "",
    cover: typeof post.cover === "string" ? post.cover : "",
    content,
    excerpt: typeof post.excerpt === "string" && post.excerpt.trim() ? post.excerpt : stripMarkdown(content).slice(0, 156),
    tags: Array.isArray(post.tags) ? post.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean) : [],
    category: typeof post.category === "string" && post.category.trim() ? post.category : "Chia sẻ",
    status: post.status === "published" ? "published" : "draft",
    metaTitle: typeof post.metaTitle === "string" ? post.metaTitle : "",
    metaDescription: typeof post.metaDescription === "string" ? post.metaDescription : "",
    canonicalUrl: typeof post.canonicalUrl === "string" ? post.canonicalUrl : "",
    scheduledAt: typeof post.scheduledAt === "string" ? post.scheduledAt : "",
    createdAt,
    updatedAt,
    readingMinutes: readingMinutes(content),
    products: normalizeProducts(post.products),
    productAngle: typeof post.productAngle === "string" ? post.productAngle : "",
  };
}

export function isPublicPost(post: StoredPost) {
  if (post.status !== "published") return false;
  if (!post.scheduledAt) return true;
  return new Date(post.scheduledAt).getTime() <= Date.now();
}

function sortPosts(posts: StoredPost[]) {
  return [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function readSeedPosts() {
  try {
    if (!fs.existsSync(DATA_DIR)) return [];
    return fs.readdirSync(DATA_DIR)
      .filter((file) => file.endsWith(".json"))
      .map((file) => normalizePost(JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf-8"))));
  } catch {
    return [];
  }
}

function readRuntimePosts() {
  try {
    if (!fs.existsSync(RUNTIME_DIR)) return null;
    return fs.readdirSync(RUNTIME_DIR)
      .filter((file) => file.endsWith(".json"))
      .map((file) => normalizePost(JSON.parse(fs.readFileSync(path.join(RUNTIME_DIR, file), "utf-8"))));
  } catch {
    return null;
  }
}

async function readJsonFromR2<T>(key: string): Promise<T | null> {
  const r2 = getR2Client();
  if (!r2) return null;
  try {
    const object = await r2.client.send(new GetObjectCommand({ Bucket: r2.bucket, Key: key }));
    const raw = await streamToString(object.Body);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

async function writeJsonToR2(key: string, data: unknown) {
  const r2 = getR2Client();
  if (!r2) return null;
  await r2.client.send(new PutObjectCommand({
    Bucket: r2.bucket,
    Key: key,
    Body: JSON.stringify(data, null, 2),
    ContentType: "application/json; charset=utf-8",
    CacheControl: "no-cache",
  }));
  return { mode: "r2", persistent: true } satisfies StorageResult;
}

async function readJsonFromBlob<T>(blobPath: string): Promise<T | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const blob = await head(blobPath);
    const response = await fetch(blob.url, { cache: "no-store" });
    return response.ok ? await response.json() as T : null;
  } catch {
    return null;
  }
}

async function writeJsonToBlob(blobPath: string, data: unknown) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  await put(blobPath, JSON.stringify(data, null, 2), {
    access: "public",
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8",
    cacheControlMaxAge: 60,
  });
  return { mode: "blob", persistent: true } satisfies StorageResult;
}

async function readPostsFromStorage() {
  const r2Posts = await readJsonFromR2<unknown[]>(R2_POSTS_KEY);
  if (Array.isArray(r2Posts)) return r2Posts.map((post) => normalizePost(post as Record<string, unknown>));

  const blobPosts = await readJsonFromBlob<unknown[]>(BLOB_POSTS_PATH);
  if (Array.isArray(blobPosts)) return blobPosts.map((post) => normalizePost(post as Record<string, unknown>));

  const kvValue = await kvCommand(["GET", POSTS_KEY]);
  if (typeof kvValue === "string") {
    const parsed = JSON.parse(kvValue) as unknown;
    if (Array.isArray(parsed)) return parsed.map((post) => normalizePost(post as Record<string, unknown>));
  }

  return readRuntimePosts() || readSeedPosts();
}

async function writePostsToStorage(posts: StoredPost[]): Promise<StorageResult> {
  const sorted = sortPosts(posts);

  const r2Result = await writeJsonToR2(R2_POSTS_KEY, sorted);
  if (r2Result) return r2Result;

  const blobResult = await writeJsonToBlob(BLOB_POSTS_PATH, sorted);
  if (blobResult) return blobResult;

  if (getKvConfig()) {
    await kvCommand(["SET", POSTS_KEY, JSON.stringify(sorted)]);
    return { mode: "kv", persistent: true };
  }

  if (process.env.VERCEL === "1") {
    throw new Error("Production chưa có storage bền cho bài viết. Hãy cấu hình Cloudflare R2 env để đăng/sửa/xóa bài trên Vercel.");
  }

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    for (const file of fs.readdirSync(DATA_DIR).filter((item) => item.endsWith(".json"))) {
      fs.unlinkSync(path.join(DATA_DIR, file));
    }
    for (const post of sorted) {
      fs.writeFileSync(path.join(DATA_DIR, `${post.slug}.json`), JSON.stringify(post, null, 2), "utf-8");
    }
    return { mode: "file", persistent: true };
  } catch {
    fs.mkdirSync(RUNTIME_DIR, { recursive: true });
    for (const file of fs.readdirSync(RUNTIME_DIR).filter((item) => item.endsWith(".json"))) {
      fs.unlinkSync(path.join(RUNTIME_DIR, file));
    }
    for (const post of sorted) {
      fs.writeFileSync(path.join(RUNTIME_DIR, `${post.slug}.json`), JSON.stringify(post, null, 2), "utf-8");
    }
    return { mode: "runtime", persistent: false, warning: "Đã lưu tạm thời trên runtime. Cần Cloudflare R2 để lưu bền." };
  }
}

async function readVersionsMap(): Promise<VersionsMap> {
  const r2Versions = await readJsonFromR2<VersionsMap>(R2_VERSIONS_KEY);
  if (r2Versions && typeof r2Versions === "object") return r2Versions;

  const blobVersions = await readJsonFromBlob<VersionsMap>(BLOB_VERSIONS_PATH);
  if (blobVersions && typeof blobVersions === "object") return blobVersions;

  const kvValue = await kvCommand(["GET", POST_VERSIONS_KEY]);
  if (typeof kvValue === "string") {
    const parsed = JSON.parse(kvValue) as unknown;
    if (parsed && typeof parsed === "object") return parsed as VersionsMap;
  }

  const map: VersionsMap = {};
  const folder = fs.existsSync(RUNTIME_VERSION_DIR) ? RUNTIME_VERSION_DIR : VERSION_DIR;
  try {
    if (!fs.existsSync(folder)) return {};
    for (const file of fs.readdirSync(folder).filter((item) => item.endsWith(".json"))) {
      const slug = slugify(file.replace(/\.json$/, ""));
      const versions = JSON.parse(fs.readFileSync(path.join(folder, file), "utf-8")) as unknown;
      map[slug] = Array.isArray(versions) ? versions as PostVersion[] : [];
    }
  } catch {
    return {};
  }
  return map;
}

async function writeVersionsMap(map: VersionsMap): Promise<StorageResult> {
  const r2Result = await writeJsonToR2(R2_VERSIONS_KEY, map);
  if (r2Result) return r2Result;

  const blobResult = await writeJsonToBlob(BLOB_VERSIONS_PATH, map);
  if (blobResult) return blobResult;

  if (getKvConfig()) {
    await kvCommand(["SET", POST_VERSIONS_KEY, JSON.stringify(map)]);
    return { mode: "kv", persistent: true };
  }

  if (process.env.VERCEL === "1") {
    throw new Error("Production chưa có storage bền cho lịch sử bài viết.");
  }

  try {
    fs.mkdirSync(VERSION_DIR, { recursive: true });
    for (const [slug, versions] of Object.entries(map)) {
      fs.writeFileSync(path.join(VERSION_DIR, `${slugify(slug)}.json`), JSON.stringify(versions.slice(0, 20), null, 2), "utf-8");
    }
    return { mode: "file", persistent: true };
  } catch {
    fs.mkdirSync(RUNTIME_VERSION_DIR, { recursive: true });
    for (const [slug, versions] of Object.entries(map)) {
      fs.writeFileSync(path.join(RUNTIME_VERSION_DIR, `${slugify(slug)}.json`), JSON.stringify(versions.slice(0, 20), null, 2), "utf-8");
    }
    return { mode: "runtime", persistent: false, warning: "Đã lưu lịch sử tạm thời trên runtime." };
  }
}

export async function listPosts(all = false) {
  const posts = sortPosts(await readPostsFromStorage());
  return all ? posts : posts.filter(isPublicPost);
}

export async function getPost(slug: string) {
  const normalizedSlug = slugify(slug);
  const posts = await listPosts(true);
  return posts.find((post) => post.slug === normalizedSlug) || null;
}

export async function getPublicPost(slug: string) {
  const post = await getPost(slug);
  return post && isPublicPost(post) ? post : null;
}

export async function savePost(input: Record<string, unknown>, originalSlug?: string) {
  const posts = await listPosts(true);
  const now = new Date().toISOString();
  const nextSlug = slugify(typeof input.slug === "string" && input.slug ? input.slug : typeof input.title === "string" ? input.title : now);
  const normalizedOriginal = originalSlug ? slugify(originalSlug) : "";
  const existingIndex = normalizedOriginal
    ? posts.findIndex((post) => post.slug === normalizedOriginal)
    : posts.findIndex((post) => post.slug === nextSlug);

  if (normalizedOriginal && existingIndex === -1) {
    return { ok: false as const, status: 404, error: "Không tìm thấy bài viết cần sửa." };
  }

  const slugOwner = posts.find((post) => post.slug === nextSlug);
  if (slugOwner && (!normalizedOriginal || slugOwner.slug !== normalizedOriginal)) {
    return { ok: false as const, status: 409, error: "Slug này đã tồn tại. Hãy đổi đường dẫn bài viết." };
  }

  const existing = existingIndex >= 0 ? posts[existingIndex] : null;
  const post = normalizePost({
    ...(existing || {}),
    ...input,
    slug: nextSlug,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  });

  const nextPosts = existingIndex >= 0
    ? posts.map((item, index) => index === existingIndex ? post : item)
    : [post, ...posts];

  if (existing) {
    const versions = await readVersionsMap();
    const key = normalizedOriginal || existing.slug;
    versions[key] = [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, savedAt: now, post: existing },
      ...(versions[key] || []),
    ].slice(0, 20);
    if (key !== post.slug) {
      versions[post.slug] = versions[key];
      delete versions[key];
    }
    await writeVersionsMap(versions);
  }

  const storage = await writePostsToStorage(nextPosts);
  return { ok: true as const, slug: post.slug, post, storage };
}

export async function deletePost(slug: string) {
  const normalizedSlug = slugify(slug);
  const posts = await listPosts(true);
  const existed = posts.some((post) => post.slug === normalizedSlug);
  const storage = await writePostsToStorage(posts.filter((post) => post.slug !== normalizedSlug));
  const versions = await readVersionsMap();
  if (versions[normalizedSlug]) {
    delete versions[normalizedSlug];
    await writeVersionsMap(versions);
  }
  return { existed, storage };
}

export async function listPostVersions(slug: string) {
  const versions = await readVersionsMap();
  return versions[slugify(slug)] || [];
}
