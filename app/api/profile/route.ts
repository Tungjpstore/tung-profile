import { NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "profile.json");
const RUNTIME_DATA_PATH = path.join(os.tmpdir(), "tung-profile-data", "profile.json");
const KV_KEY = process.env.PROFILE_STORE_KEY || "tung-profile:profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StorageMode = "kv" | "file" | "runtime";

interface StorageResult {
  mode: StorageMode;
  persistent: boolean;
  warning?: string;
}

function getKvConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

async function kvCommand(command: unknown[]) {
  const config = getKvConfig();
  if (!config) return null;

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const json = await response.json().catch(() => null) as { result?: unknown; error?: string } | null;
  if (!response.ok || json?.error) {
    throw new Error(json?.error || "KV request failed");
  }
  return json?.result ?? null;
}

async function readData() {
  const kvValue = await kvCommand(["GET", KV_KEY]);
  if (typeof kvValue === "string") return JSON.parse(kvValue);

  const filePath = fs.existsSync(RUNTIME_DATA_PATH) ? RUNTIME_DATA_PATH : DATA_PATH;
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

async function writeData(data: unknown): Promise<StorageResult> {
  const payload = JSON.stringify(data, null, 2);

  if (getKvConfig()) {
    await kvCommand(["SET", KV_KEY, payload]);
    return { mode: "kv", persistent: true };
  }

  try {
    fs.writeFileSync(DATA_PATH, payload, "utf-8");
    return { mode: "file", persistent: true };
  } catch {
    fs.mkdirSync(path.dirname(RUNTIME_DATA_PATH), { recursive: true });
    fs.writeFileSync(RUNTIME_DATA_PATH, payload, "utf-8");
    return {
      mode: "runtime",
      persistent: false,
      warning: "Đã lưu tạm thời trên runtime Vercel. Để lưu bền sau cold start/redeploy, hãy cấu hình Vercel KV hoặc Upstash Redis env.",
    };
  }
}

export async function GET() {
  try {
    const data = await readData();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Không thể đọc dữ liệu" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const storage = await writeData(body);
    return NextResponse.json({ success: true, data: body, storage, warning: storage.warning || "" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể lưu dữ liệu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
