import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { head, put } from "@vercel/blob";
import fs from "fs";
import os from "os";
import path from "path";
import { slugify } from "./posts-store";

const DATA_FILE = path.join(process.cwd(), "data", "post-interactions.json");
const RUNTIME_FILE = path.join(os.tmpdir(), "tung-profile-data", "post-interactions.json");
const KV_KEY = process.env.POST_INTERACTIONS_STORE_KEY || "tung-profile:post-interactions";
const BLOB_PATH = process.env.POST_INTERACTIONS_BLOB_PATH || "data/post-interactions/index.json";
const R2_KEY = process.env.R2_POST_INTERACTIONS_KEY || "data/post-interactions/index.json";

export const REACTION_TYPES = ["like", "love", "insightful", "support"] as const;
export type ReactionType = typeof REACTION_TYPES[number];

export interface PostComment {
  id: string;
  author: string;
  message: string;
  createdAt: string;
}

export interface PostInteraction {
  slug: string;
  reactions: Record<ReactionType, number>;
  comments: PostComment[];
}

type InteractionsMap = Record<string, PostInteraction>;

function emptyReactions(): Record<ReactionType, number> {
  return { like: 0, love: 0, insightful: 0, support: 0 };
}

function normalizeInteraction(slug: string, value: unknown): PostInteraction {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const rawReactions = input.reactions && typeof input.reactions === "object" ? input.reactions as Record<string, unknown> : {};
  const reactions = emptyReactions();
  for (const type of REACTION_TYPES) {
    reactions[type] = Math.max(0, Number(rawReactions[type]) || 0);
  }
  const comments = Array.isArray(input.comments)
    ? input.comments
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        author: typeof item.author === "string" && item.author.trim() ? item.author.trim().slice(0, 80) : "Bạn đọc",
        message: typeof item.message === "string" ? item.message.trim().slice(0, 1200) : "",
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
      }))
      .filter((item) => item.message)
      .slice(-100)
    : [];
  return { slug, reactions, comments };
}

function getKvConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

function getR2Config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

function getR2Client() {
  const config = getR2Config();
  if (!config) return null;
  return {
    bucket: config.bucket,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    }),
  };
}

async function streamToString(stream: unknown) {
  if (!stream || typeof (stream as { transformToString?: unknown }).transformToString !== "function") return "";
  return (stream as { transformToString: () => Promise<string> }).transformToString();
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
  if (!response.ok || json?.error) throw new Error(json?.error || "KV request failed");
  return json?.result ?? null;
}

async function readJsonFromR2<T>(key: string): Promise<T | null> {
  const r2 = getR2Client();
  if (!r2) return null;
  try {
    const object = await r2.client.send(new GetObjectCommand({ Bucket: r2.bucket, Key: key }));
    const raw = await streamToString(object.Body);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

async function writeJsonToR2(key: string, data: unknown) {
  const r2 = getR2Client();
  if (!r2) return false;
  await r2.client.send(new PutObjectCommand({
    Bucket: r2.bucket,
    Key: key,
    Body: JSON.stringify(data, null, 2),
    ContentType: "application/json; charset=utf-8",
    CacheControl: "no-cache",
  }));
  return true;
}

async function readJsonFromBlob<T>(blobPath: string): Promise<T | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const blob = await head(blobPath);
    const response = await fetch(blob.url, { cache: "no-store" });
    return response.ok ? await response.json() as T : null;
  } catch {
    return null;
  }
}

async function writeJsonToBlob(blobPath: string, data: unknown) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  await put(blobPath, JSON.stringify(data, null, 2), {
    access: "public",
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8",
    cacheControlMaxAge: 60,
  });
  return true;
}

async function readMap(): Promise<InteractionsMap> {
  const r2Map = await readJsonFromR2<InteractionsMap>(R2_KEY);
  if (r2Map && typeof r2Map === "object") return normalizeMap(r2Map);

  const blobMap = await readJsonFromBlob<InteractionsMap>(BLOB_PATH);
  if (blobMap && typeof blobMap === "object") return normalizeMap(blobMap);

  const kvValue = await kvCommand(["GET", KV_KEY]);
  if (typeof kvValue === "string") {
    const parsed = JSON.parse(kvValue) as unknown;
    if (parsed && typeof parsed === "object") return normalizeMap(parsed as InteractionsMap);
  }

  const file = fs.existsSync(DATA_FILE) ? DATA_FILE : RUNTIME_FILE;
  try {
    if (!fs.existsSync(file)) return {};
    return normalizeMap(JSON.parse(fs.readFileSync(file, "utf-8")) as InteractionsMap);
  } catch {
    return {};
  }
}

function normalizeMap(map: InteractionsMap) {
  return Object.fromEntries(Object.entries(map).map(([key, value]) => {
    const slug = slugify(key);
    return [slug, normalizeInteraction(slug, value)];
  }));
}

async function writeMap(map: InteractionsMap) {
  if (await writeJsonToR2(R2_KEY, map)) return;
  if (await writeJsonToBlob(BLOB_PATH, map)) return;
  if (getKvConfig()) {
    await kvCommand(["SET", KV_KEY, JSON.stringify(map)]);
    return;
  }

  const target = process.env.VERCEL === "1" ? RUNTIME_FILE : DATA_FILE;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(map, null, 2), "utf-8");
}

export async function getPostInteraction(slugInput: string) {
  const slug = slugify(slugInput);
  const map = await readMap();
  return map[slug] || normalizeInteraction(slug, null);
}

export async function setReaction(slugInput: string, next?: string, previous?: string) {
  const slug = slugify(slugInput);
  const map = await readMap();
  const current = map[slug] || normalizeInteraction(slug, null);
  if (previous && REACTION_TYPES.includes(previous as ReactionType)) {
    current.reactions[previous as ReactionType] = Math.max(0, current.reactions[previous as ReactionType] - 1);
  }
  if (next && REACTION_TYPES.includes(next as ReactionType)) {
    current.reactions[next as ReactionType] += 1;
  }
  map[slug] = current;
  await writeMap(map);
  return current;
}

export async function addComment(slugInput: string, authorInput: string, messageInput: string) {
  const slug = slugify(slugInput);
  const author = authorInput.trim().slice(0, 80) || "Bạn đọc";
  const message = messageInput.trim().slice(0, 1200);
  if (message.length < 2) throw new Error("Bình luận quá ngắn.");

  const map = await readMap();
  const current = map[slug] || normalizeInteraction(slug, null);
  current.comments = [
    ...current.comments,
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      author,
      message,
      createdAt: new Date().toISOString(),
    },
  ].slice(-100);
  map[slug] = current;
  await writeMap(map);
  return current;
}
