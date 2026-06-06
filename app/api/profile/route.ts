import { NextResponse } from "next/server";
import { readProfile, writeProfile } from "@/app/lib/profile-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await readProfile();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch {
    return NextResponse.json({ error: "Không thể đọc dữ liệu" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const storage = await writeProfile(body);
    return NextResponse.json(
      { success: true, data: body, storage, warning: storage.warning || "" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể lưu dữ liệu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
