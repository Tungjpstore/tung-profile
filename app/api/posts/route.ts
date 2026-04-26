import { NextResponse } from "next/server";
import { deletePost, listPosts, savePost } from "../../lib/posts-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — public sees published posts, admin sees all posts with ?all=true.
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const all = url.searchParams.get("all") === "true";
    const posts = await listPosts(all);
    return NextResponse.json(posts, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Không đọc được danh sách bài viết" }, { status: 500 });
  }
}

// POST — create post.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await savePost(body);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(
      { success: true, slug: result.slug, post: result.post, storage: result.storage },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi tạo bài viết";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT — update post.
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const result = await savePost(body, typeof body.originalSlug === "string" ? body.originalSlug : undefined);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(
      { success: true, slug: result.slug, post: result.post, storage: result.storage },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi cập nhật bài viết";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — delete post.
export async function DELETE(request: Request) {
  try {
    const { slug } = await request.json();
    if (typeof slug !== "string" || !slug.trim()) {
      return NextResponse.json({ error: "Thiếu slug bài viết" }, { status: 400 });
    }
    const result = await deletePost(slug);
    return NextResponse.json({ success: true, existed: result.existed, storage: result.storage }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi xoá bài viết";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
