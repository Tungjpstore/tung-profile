import { NextResponse } from "next/server";
import { addComment, getPostInteraction, setReaction } from "../../../lib/post-interactions-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get("slug") || "";
    if (!slug.trim()) return NextResponse.json({ error: "Thiếu slug bài viết" }, { status: 400 });
    const interaction = await getPostInteraction(slug);
    return NextResponse.json(interaction, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Không đọc được tương tác bài viết" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      slug?: string;
      action?: string;
      reaction?: string;
      previousReaction?: string;
      author?: string;
      message?: string;
    };
    if (!body.slug?.trim()) return NextResponse.json({ error: "Thiếu slug bài viết" }, { status: 400 });

    const interaction = body.action === "comment"
      ? await addComment(body.slug, body.author || "", body.message || "")
      : await setReaction(body.slug, body.reaction || "", body.previousReaction || "");

    return NextResponse.json(interaction, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không lưu được tương tác bài viết";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
