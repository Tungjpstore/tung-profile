import { NextResponse } from "next/server";
import { trackEvent, getAnalyticsReport } from "@/app/lib/analytics-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST — track event (public)
export async function POST(request: Request) {
  try {
    const { type, label } = await request.json();
    const ua = request.headers.get("user-agent") || "";
    const ref = request.headers.get("referer") || "";

    await trackEvent(type, label, ua, ref);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// GET — read analytics (protected by middleware for admin)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get("days") || "30");

    const report = await getAnalyticsReport(days);
    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: "Lỗi đọc dữ liệu thống kê" }, { status: 500 });
  }
}
