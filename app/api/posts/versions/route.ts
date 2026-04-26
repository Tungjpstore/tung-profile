import { NextResponse } from "next/server";
import { listPostVersions } from "../../../lib/posts-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") || "";
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });

  try {
    const versions = await listPostVersions(slug);
    return NextResponse.json(versions, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Không đọc được lịch sử phiên bản" }, { status: 500 });
  }
}
