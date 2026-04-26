import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) return null;
  return { cloudName, uploadPreset, folder: process.env.CLOUDINARY_FOLDER || "tung-profile" };
}

async function uploadToCloudinary(file: File) {
  const config = cloudinaryConfig();
  if (!config) return null;

  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", config.uploadPreset);
  fd.append("folder", config.folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
    method: "POST",
    body: fd,
    cache: "no-store",
  });
  const json = await res.json().catch(() => null) as { secure_url?: string; error?: { message?: string } } | null;
  if (!res.ok || !json?.secure_url) {
    throw new Error(json?.error?.message || "Cloudinary upload failed");
  }
  return json.secure_url;
}

async function uploadToVercelBlob(file: File) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const safeBase = file.name
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "image";
  const blob = await put(`uploads/${safeBase}.${ext}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
    cacheControlMaxAge: 31536000,
  });
  return blob.url;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Không có file" }, { status: 400 });
    }

    // Validate file type
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Chỉ hỗ trợ JPG, PNG, WebP, GIF" }, { status: 400 });
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File quá lớn (tối đa 5MB)" }, { status: 400 });
    }

    const blobUrl = await uploadToVercelBlob(file);
    if (blobUrl) {
      return NextResponse.json({ url: blobUrl, storage: "vercel-blob" });
    }

    const cloudinaryUrl = await uploadToCloudinary(file);
    if (cloudinaryUrl) {
      return NextResponse.json({ url: cloudinaryUrl, storage: "cloudinary" });
    }

    if (process.env.VERCEL === "1") {
      return NextResponse.json(
        { error: "Production chưa cấu hình lưu ảnh. Hãy tạo Vercel Blob store để có BLOB_READ_WRITE_TOKEN, hoặc thêm CLOUDINARY_CLOUD_NAME và CLOUDINARY_UPLOAD_PRESET." },
        { status: 501 }
      );
    }

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "png";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filepath, buffer);

    const url = `/uploads/${filename}`;
    return NextResponse.json({ url, storage: "local" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload thất bại";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
