import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { head, put } from "@vercel/blob";
import fs from "fs";
import path from "path";

export type StorageMode = "r2" | "blob" | "kv" | "file" | "runtime";

export interface StorageResult {
  mode: StorageMode;
  persistent: boolean;
  warning?: string;
}

export function getKvConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

export function getR2Config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

let r2ClientInstance: { bucket: string; client: S3Client } | null = null;

export function getR2Client() {
  if (r2ClientInstance) return r2ClientInstance;

  const config = getR2Config();
  if (!config) return null;

  r2ClientInstance = {
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
  return r2ClientInstance;
}

export async function streamToString(stream: unknown): Promise<string> {
  if (!stream || typeof (stream as { transformToString?: unknown }).transformToString !== "function") return "";
  return (stream as { transformToString: () => Promise<string> }).transformToString();
}

export async function kvCommand(command: unknown[]) {
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
  const json = (await response.json().catch(() => null)) as { result?: unknown; error?: string } | null;
  if (!response.ok || json?.error) {
    throw new Error(json?.error || "KV request failed");
  }
  return json?.result ?? null;
}

export interface StorageKeys {
  r2Key: string;
  blobPath: string;
  kvKey: string;
  filePath: string;
  runtimePath: string;
}

export async function readJsonFromStorage<T>(keys: StorageKeys, defaultValue: T): Promise<T> {
  // 1. Cloudflare R2
  const r2 = getR2Client();
  if (r2) {
    try {
      const object = await r2.client.send(new GetObjectCommand({ Bucket: r2.bucket, Key: keys.r2Key }));
      const raw = await streamToString(object.Body);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      // Fall through
    }
  }

  // 2. Vercel Blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await head(keys.blobPath);
      const response = await fetch(blob.url, { cache: "no-store" });
      if (response.ok) return (await response.json()) as T;
    } catch {
      // Fall through
    }
  }

  // 3. Vercel KV / Upstash Redis
  try {
    const kvValue = await kvCommand(["GET", keys.kvKey]);
    if (typeof kvValue === "string") return JSON.parse(kvValue) as T;
  } catch {
    // Fall through
  }

  // 4. Local File / Runtime Temp File
  try {
    const targetPath = fs.existsSync(keys.runtimePath)
      ? keys.runtimePath
      : fs.existsSync(keys.filePath)
      ? keys.filePath
      : null;

    if (targetPath) {
      const raw = fs.readFileSync(targetPath, "utf-8");
      return JSON.parse(raw) as T;
    }
  } catch {
    // Fall through
  }

  return defaultValue;
}

export async function writeJsonToStorage<T>(keys: StorageKeys, data: T): Promise<StorageResult> {
  const payload = JSON.stringify(data, null, 2);

  // 1. Cloudflare R2
  const r2 = getR2Client();
  if (r2) {
    await r2.client.send(
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: keys.r2Key,
        Body: payload,
        ContentType: "application/json; charset=utf-8",
        CacheControl: "no-cache",
      })
    );
    return { mode: "r2", persistent: true };
  }

  // 2. Vercel Blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(keys.blobPath, payload, {
      access: "public",
      allowOverwrite: true,
      contentType: "application/json; charset=utf-8",
      cacheControlMaxAge: 60,
    });
    return { mode: "blob", persistent: true };
  }

  // 3. Vercel KV / Upstash Redis
  if (getKvConfig()) {
    await kvCommand(["SET", keys.kvKey, payload]);
    return { mode: "kv", persistent: true };
  }

  // 4. Local File / Runtime Temp File
  if (process.env.VERCEL === "1") {
    // Fallback on Vercel runtime
    try {
      fs.mkdirSync(path.dirname(keys.runtimePath), { recursive: true });
      fs.writeFileSync(keys.runtimePath, payload, "utf-8");
      return {
        mode: "runtime",
        persistent: false,
        warning: "Đã lưu tạm thời trên Vercel runtime. Cấu hình R2/Blob/KV để có lưu trữ bền vững.",
      };
    } catch {
      // Ignored
    }
  }

  try {
    fs.mkdirSync(path.dirname(keys.filePath), { recursive: true });
    fs.writeFileSync(keys.filePath, payload, "utf-8");
    return { mode: "file", persistent: true };
  } catch {
    fs.mkdirSync(path.dirname(keys.runtimePath), { recursive: true });
    fs.writeFileSync(keys.runtimePath, payload, "utf-8");
    return {
      mode: "runtime",
      persistent: false,
      warning: "Không thể lưu tệp cục bộ, đã lưu tạm thời trên runtime.",
    };
  }
}
