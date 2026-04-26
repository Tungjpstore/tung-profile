import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DIR = path.join(process.cwd(), "data", "posts");

function ensureDir() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
}

function getAllPosts() {
  ensureDir();
  const files = fs.readdirSync(DIR).filter(f => f.endsWith(".json"));
  return files.map(f => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf-8")))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// GET — list posts (public: only published, admin: all)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const all = url.searchParams.get("all") === "true";
  const posts = getAllPosts();
  return NextResponse.json(all ? posts : posts.filter(p => p.status === "published"));
}

// POST — create post (protected)
export async function POST(request: Request) {
  try {
    ensureDir();
    const body = await request.json();
    const slug = body.slug || Date.now().toString(36);
    const post = {
      slug,
      title: body.title || "",
      cover: body.cover || "",
      content: body.content || "",
      tags: body.tags || [],
      status: body.status || "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(DIR, `${slug}.json`), JSON.stringify(post, null, 2));
    return NextResponse.json({ success: true, slug });
  } catch {
    return NextResponse.json({ error: "Lỗi tạo bài viết" }, { status: 500 });
  }
}

// PUT — update post
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const filePath = path.join(DIR, `${body.slug}.json`);
    if (!fs.existsSync(filePath)) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    const existing = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const updated = { ...existing, ...body, updatedAt: new Date().toISOString() };
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Lỗi cập nhật" }, { status: 500 });
  }
}

// DELETE — delete post
export async function DELETE(request: Request) {
  try {
    const { slug } = await request.json();
    const filePath = path.join(DIR, `${slug}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Lỗi xoá" }, { status: 500 });
  }
}
