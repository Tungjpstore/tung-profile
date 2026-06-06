import path from "path";
import os from "os";
import { readJsonFromStorage, writeJsonToStorage } from "./storage-helper";

export interface AnalyticsEvent {
  type: string;
  label: string;
  date: string;
  device: "mobile" | "desktop";
  referrer: string;
}

const keys = {
  r2Key: "data/analytics.json",
  blobPath: "data/analytics.json",
  kvKey: "tung-profile:analytics",
  filePath: path.join(process.cwd(), "data", "analytics.json"),
  runtimePath: path.join(os.tmpdir(), "tung-profile-data", "analytics.json"),
};

export async function readEvents(): Promise<AnalyticsEvent[]> {
  return readJsonFromStorage<AnalyticsEvent[]>(keys, []);
}

export async function trackEvent(type: string, label: string, ua: string, ref: string): Promise<void> {
  const events = await readEvents();
  const isMobile = /mobile|android|iphone/i.test(ua);

  const newEvent: AnalyticsEvent = {
    type: type || "pageview",
    label: label || "",
    date: new Date().toISOString(),
    device: isMobile ? "mobile" : "desktop",
    referrer: ref,
  };

  events.unshift(newEvent);
  
  // Keep max 5000 events to prevent massive storage growth
  const trimmed = events.slice(0, 5000);
  await writeJsonToStorage(keys, trimmed);
}

export async function getAnalyticsReport(days: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const events = await readEvents();
  const filtered = events.filter((e) => new Date(e.date) >= cutoff);

  // Aggregate
  const byDate: Record<string, number> = {};
  const byLabel: Record<string, number> = {};
  let mobile = 0;
  let desktop = 0;
  let totalViews = 0;
  let totalClicks = 0;

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
  const topClicks = Object.entries(byLabel)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return {
    totalViews,
    totalClicks,
    totalEvents: filtered.length,
    mobile,
    desktop,
    dates,
    topClicks,
  };
}
