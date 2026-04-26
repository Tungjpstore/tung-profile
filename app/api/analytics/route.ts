import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "analytics.json");

function read(): unknown[] {
  if (!fs.existsSync(DATA_PATH)) return [];
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
}

function write(data: unknown[]) {
  // Keep max 5000 events
  const trimmed = data.slice(0, 5000);
  fs.writeFileSync(DATA_PATH, JSON.stringify(trimmed, null, 2), "utf-8");
}

// POST — track event (public)
export async function POST(request: Request) {
  try {
    const { type, label } = await request.json();
    const ua = request.headers.get("user-agent") || "";
    const ref = request.headers.get("referer") || "";
    const isMobile = /mobile|android|iphone/i.test(ua);

    const events = read();
    events.unshift({
      type: type || "pageview",
      label: label || "",
      date: new Date().toISOString(),
      device: isMobile ? "mobile" : "desktop",
      referrer: ref,
    });
    write(events);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// GET — read analytics (protected by middleware for admin)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "30");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const events = read();
  interface Evt { type: string; label: string; date: string; device: string; referrer: string }
  const filtered = (events as Evt[]).filter(e => new Date(e.date) >= cutoff);

  // Aggregate
  const byDate: Record<string, number> = {};
  const byLabel: Record<string, number> = {};
  let mobile = 0, desktop = 0, totalViews = 0, totalClicks = 0;

  for (const e of filtered) {
    const d = e.date.slice(0, 10);
    byDate[d] = (byDate[d] || 0) + 1;

    if (e.type === "pageview") totalViews++;
    if (e.type === "click") {
      totalClicks++;
      byLabel[e.label] = (byLabel[e.label] || 0) + 1;
    }
    if (e.device === "mobile") mobile++;
    else desktop++;
  }

  // Sort dates
  const dates = Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0]));
  const topClicks = Object.entries(byLabel).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return NextResponse.json({
    totalViews,
    totalClicks,
    totalEvents: filtered.length,
    mobile,
    desktop,
    dates,
    topClicks,
  });
}
