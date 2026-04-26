import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const VERSION_DIR = path.join(process.cwd(), "data", "post-versions");

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function versionPath(slug: string) {
  const filePath = path.join(VERSION_DIR, `${slugify(slug)}.json`);
  if (!filePath.startsWith(VERSION_DIR)) throw new Error("Invalid slug");
  return filePath;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") || "";
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });

  try {
    if (!fs.existsSync(VERSION_DIR)) fs.mkdirSync(VERSION_DIR, { recursive: true });
    const filePath = versionPath(slug);
    if (!fs.existsSync(filePath)) return NextResponse.json([]);
    const versions = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return NextResponse.json(Array.isArray(versions) ? versions : []);
  } catch {
    return NextResponse.json({ error: "Không đọc được lịch sử phiên bản" }, { status: 500 });
  }
}
