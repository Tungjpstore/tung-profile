import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BlogImageRequest {
  instruction?: string;
  style?: string;
  size?: string;
  post?: {
    title?: string;
    excerpt?: string;
    content?: string;
    tags?: string[];
    category?: string;
    products?: Array<{
      name?: string;
      description?: string;
    }>;
  };
}

const DEFAULT_IMAGE_MODEL = "qwen-image-2.0-pro-2026-04-22";
const DEFAULT_IMAGE_FALLBACK = "qwen-image-2.0-pro";
const DEFAULT_IMAGE_BASE_URL = "https://dashscope-intl.aliyuncs.com/api/v1";
const DEFAULT_NEGATIVE_PROMPT = [
  "low resolution",
  "blurry",
  "distorted hands",
  "warped text",
  "random unreadable letters",
  "cheap stock photo",
  "oversaturated colors",
  "messy composition",
  "AI artifacts",
].join(", ");

function getApiKey(request: Request) {
  return process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || request.headers.get("x-qwen-api-key")?.trim() || "";
}

function getR2Config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) return null;
  return {
    bucket,
    publicUrl: publicUrl.replace(/\/$/, ""),
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56) || "blog-cover";
}

function stripMarkdown(input: string) {
  return input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildImagePrompt(body: BlogImageRequest) {
  const post = body.post || {};
  const productNames = (post.products || []).map((product) => product.name).filter(Boolean).join(", ");
  const content = stripMarkdown(post.content || "").slice(0, 1400);
  return [
    "Create a premium 16:9 blog cover image for a social-profile portfolio website.",
    "The image must feel editorial, modern, polished, and suitable as a Facebook/X-style post cover.",
    "Avoid generic landing-page visuals. Avoid UI mockup clutter unless the article is clearly about UI/product.",
    "Do not render long paragraphs. Only include readable text if explicitly useful; otherwise keep the image text-free.",
    post.title ? `Article title: ${post.title}` : "",
    post.excerpt ? `Summary: ${post.excerpt}` : "",
    post.category ? `Category: ${post.category}` : "",
    post.tags?.length ? `Tags: ${post.tags.join(", ")}` : "",
    productNames ? `Attached products: ${productNames}` : "",
    content ? `Article content context: ${content}` : "",
    body.instruction ? `User direction: ${body.instruction}` : "",
    body.style ? `Visual style: ${body.style}` : "Visual style: cinematic editorial, clean composition, realistic lighting, high-end digital product aesthetic.",
  ].filter(Boolean).join("\n");
}

function extractImageUrl(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const choices = (payload as { output?: { choices?: Array<{ message?: { content?: Array<{ image?: unknown }> } }> } }).output?.choices || [];
  for (const choice of choices) {
    for (const item of choice.message?.content || []) {
      if (typeof item.image === "string" && /^https?:\/\//i.test(item.image)) return item.image;
    }
  }
  return "";
}

async function uploadImageToR2(url: string, nameSeed: string) {
  const r2 = getR2Config();
  if (!r2) return null;
  const imageRes = await fetch(url, { cache: "no-store" });
  if (!imageRes.ok) throw new Error("Không tải được ảnh tạm từ Qwen.");
  const contentType = imageRes.headers.get("content-type") || "image/png";
  const ext = contentType.includes("webp") ? "webp" : contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
  const key = `ai-covers/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${slugify(nameSeed)}.${ext}`;
  await r2.client.send(new PutObjectCommand({
    Bucket: r2.bucket,
    Key: key,
    Body: Buffer.from(await imageRes.arrayBuffer()),
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));
  return `${r2.publicUrl}/${key}`;
}

async function callQwenImage(apiKey: string, model: string, body: BlogImageRequest) {
  const baseUrl = (process.env.QWEN_IMAGE_BASE_URL || DEFAULT_IMAGE_BASE_URL).replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/services/aigc/multimodal-generation/generation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: {
        messages: [
          {
            role: "user",
            content: [{ text: buildImagePrompt(body) }],
          },
        ],
      },
      parameters: {
        negative_prompt: process.env.QWEN_IMAGE_NEGATIVE_PROMPT || DEFAULT_NEGATIVE_PROMPT,
        prompt_extend: true,
        watermark: false,
        size: body.size || process.env.QWEN_IMAGE_SIZE || "2688*1536",
      },
    }),
  });
  const payload = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, payload };
}

export async function POST(request: Request) {
  try {
    const apiKey = getApiKey(request);
    if (!apiKey) {
      return NextResponse.json({ error: "Chưa có Qwen/DashScope key để tạo ảnh." }, { status: 501 });
    }
    if (request.headers.get("x-qwen-api-key") && !request.headers.get("x-qwen-api-key")?.trim().startsWith("sk-")) {
      return NextResponse.json({ error: "Qwen/DashScope key thường bắt đầu bằng sk-." }, { status: 400 });
    }

    const body = (await request.json()) as BlogImageRequest;
    const candidates = Array.from(new Set([
      process.env.QWEN_IMAGE_MODEL || DEFAULT_IMAGE_MODEL,
      DEFAULT_IMAGE_MODEL,
      DEFAULT_IMAGE_FALLBACK,
    ].filter(Boolean)));

    let lastPayload: unknown = null;
    let selectedModel = candidates[0];
    let temporaryUrl = "";
    for (const model of candidates) {
      const result = await callQwenImage(apiKey, model, body);
      lastPayload = result.payload;
      if (result.ok) {
        selectedModel = model;
        temporaryUrl = extractImageUrl(result.payload);
        break;
      }
      if (result.status !== 400 && result.status !== 404) break;
    }

    if (!temporaryUrl) {
      return NextResponse.json({ error: "Qwen chưa trả về ảnh hợp lệ.", detail: lastPayload }, { status: 502 });
    }

    const persistedUrl = await uploadImageToR2(temporaryUrl, body.post?.title || "blog-cover");
    return NextResponse.json({
      url: persistedUrl || temporaryUrl,
      temporaryUrl,
      persistent: Boolean(persistedUrl),
      storage: persistedUrl ? "cloudflare-r2" : "qwen-temporary-url",
      model: selectedModel,
      prompt: buildImagePrompt(body),
      warning: persistedUrl ? "" : "Ảnh Qwen chỉ là URL tạm và sẽ hết hạn. Hãy cấu hình R2 để lưu bền.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tạo ảnh bằng Qwen lúc này." },
      { status: 500 }
    );
  }
}
