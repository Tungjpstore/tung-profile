"use client";

import { useEffect } from "react";

interface AnalyticsTrackerProps {
  type?: string;
  label?: string;
}

export function trackEventClient(type: string, label: string) {
  if (typeof window === "undefined") return;
  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, label }),
  }).catch(() => {});
}

export default function AnalyticsTracker({ type = "pageview", label = "" }: AnalyticsTrackerProps) {
  useEffect(() => {
    trackEventClient(type, label);
  }, [type, label]);

  return null;
}
