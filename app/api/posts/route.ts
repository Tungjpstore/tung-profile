import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DIR = path.join(process.cwd(), "data", "posts");
const VERSION_DIR = path.join(process.cwd(), "data", "post-versions");

function ensureDir() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  if (!fs.existsSync(VERSION_DIR)) fs.mkdirSync(VERSION_DIR, { recursive: true });
}

function getAllPosts() {
  ensureDir();
  const files = fs.readdirSync(DIR).filter(f => f.endsWith(".json"));
  return files.map(f => normalizePost(JSON.parse(fs.readFileSync(path.join(DIR, f), "utf-8"))))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || Date.now().toString(36);
}

function postPath(slug: string) {
  const filePath = path.join(DIR, `${slugify(slug)}.json`);
  if (!filePath.startsWith(DIR)) throw new Error("Invalid slug");
  return filePath;
}

function versionPath(slug: string) {
  const filePath = path.join(VERSION_DIR, `${slugify(slug)}.json`);
  if (!filePath.startsWith(VERSION_DIR)) throw new Error("Invalid slug");
  return filePath;
}

function saveVersion(slug: string, post: ReturnType<typeof normalizePost>) {
  const filePath = versionPath(slug);
  const existing = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf-8")) : [];
  const versions = Array.isArray(existing) ? existing : [];
  versions.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
    post,
  });
  fs.writeFileSync(filePath, JSON.stringify(versions.slice(0, 20), null, 2));
}

function readingMinutes(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function normalizeProducts(products: unknown) {
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

function normalizePost(post: Record<string, unknown>) {
  const content = typeof post.content === "string" ? post.content : "";
  return {
    slug: typeof post.slug === "string" ? post.slug : "",
    title: typeof post.title === "string" ? post.title : "",
    cover: typeof post.cover === "string" ? post.cover : "",
    content,
    excerpt: typeof post.excerpt === "string" ? post.excerpt : content.replace(/[#*_`>\-[\]().]/g, "").replace(/\s+/g, " ").trim().slice(0, 156),
    tags: Array.isArray(post.tags) ? post.tags.filter((tag): tag is string => typeof tag === "string") : [],
    category: typeof post.category === "string" ? post.category : "Chia sẻ",
    status: typeof post.status === "string" ? post.status : "draft",
    metaTitle: typeof post.metaTitle === "string" ? post.metaTitle : "",
    metaDescription: typeof post.metaDescription === "string" ? post.metaDescription : "",
    canonicalUrl: typeof post.canonicalUrl === "string" ? post.canonicalUrl : "",
    scheduledAt: typeof post.scheduledAt === "string" ? post.scheduledAt : "",
    createdAt: typeof post.createdAt === "string" ? post.createdAt : new Date().toISOString(),
    updatedAt: typeof post.updatedAt === "string" ? post.updatedAt : new Date().toISOString(),
    readingMinutes: readingMinutes(content),
    products: normalizeProducts(post.products),
    productAngle: typeof post.productAngle === "string" ? post.productAngle : "",
  };
}

function isPublicPost(post: ReturnType<typeof normalizePost>) {
  if (post.status !== "published") return false;
  if (!post.scheduledAt) return true;
  return new Date(post.scheduledAt).getTime() <= Date.now();
}

// GET — list posts (public: only published, admin: all)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const all = url.searchParams.get("all") === "true";
  const posts = getAllPosts();
  return NextResponse.json(all ? posts : posts.filter(isPublicPost));
}

// POST — create post (protected)
export async function POST(request: Request) {
  try {
    ensureDir();
    const body = await request.json();
    const slug = slugify(body.slug || body.title || Date.now().toString(36));
    const post = normalizePost({
      slug,
      title: body.title || "",
      cover: body.cover || "",
      content: body.content || "",
      excerpt: body.excerpt || "",
      tags: body.tags || [],
      category: body.category || "Chia sẻ",
      status: body.status || "draft",
      metaTitle: body.metaTitle || "",
      metaDescription: body.metaDescription || "",
      canonicalUrl: body.canonicalUrl || "",
      scheduledAt: body.scheduledAt || "",
      products: body.products || [],
      productAngle: body.productAngle || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    fs.writeFileSync(postPath(slug), JSON.stringify(post, null, 2));
    return NextResponse.json({ success: true, slug });
  } catch {
    return NextResponse.json({ error: "Lỗi tạo bài viết" }, { status: 500 });
  }
}

// PUT — update post
export async function PUT(request: Request) {
  try {
    ensureDir();
    const body = await request.json();
    const nextSlug = slugify(body.slug || body.title || Date.now().toString(36));
    const originalSlug = slugify(body.originalSlug || body.slug || nextSlug);
    const filePath = postPath(originalSlug);
    if (!fs.existsSync(filePath)) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    const existing = normalizePost(JSON.parse(fs.readFileSync(filePath, "utf-8")));
    saveVersion(originalSlug, existing);
    const updated = normalizePost({ ...existing, ...body, slug: nextSlug, updatedAt: new Date().toISOString() });
    fs.writeFileSync(postPath(nextSlug), JSON.stringify(updated, null, 2));
    if (nextSlug !== originalSlug && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Lỗi cập nhật" }, { status: 500 });
  }
}

// DELETE — delete post
export async function DELETE(request: Request) {
  try {
    const { slug } = await request.json();
    const filePath = postPath(slug);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Lỗi xoá" }, { status: 500 });
  }
}
