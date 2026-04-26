import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const R2_FREE_BYTES = 10 * 1024 * 1024 * 1024;

function getR2Client() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL || "";

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;

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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let i = 1; i < units.length && value >= 1024; i++) {
    value /= 1024;
    unit = units[i];
  }
  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} ${unit}`;
}

export async function GET() {
  try {
    const r2 = getR2Client();
    if (!r2) {
      return NextResponse.json({
        mode: "unconfigured",
        persistent: false,
        usedBytes: 0,
        usedLabel: "0 B",
        quotaBytes: R2_FREE_BYTES,
        quotaLabel: "10 GB",
        percent: 0,
        objectCount: 0,
        publicUrl: "",
        bucket: "",
        updatedAt: new Date().toISOString(),
      });
    }

    let usedBytes = 0;
    let objectCount = 0;
    let continuationToken: string | undefined;
    const largest: { key: string; size: number; lastModified?: string }[] = [];

    do {
      const page = await r2.client.send(new ListObjectsV2Command({
        Bucket: r2.bucket,
        ContinuationToken: continuationToken,
      }));

      for (const object of page.Contents || []) {
        const size = object.Size || 0;
        usedBytes += size;
        objectCount += 1;
        largest.push({
          key: object.Key || "",
          size,
          lastModified: object.LastModified?.toISOString(),
        });
      }

      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (continuationToken);

    largest.sort((a, b) => b.size - a.size);

    return NextResponse.json({
      mode: "r2",
      persistent: true,
      bucket: r2.bucket,
      publicUrl: r2.publicUrl,
      usedBytes,
      usedLabel: formatBytes(usedBytes),
      quotaBytes: R2_FREE_BYTES,
      quotaLabel: "10 GB",
      percent: Math.min(100, Number(((usedBytes / R2_FREE_BYTES) * 100).toFixed(3))),
      objectCount,
      largest: largest.slice(0, 8).map((item) => ({ ...item, sizeLabel: formatBytes(item.size) })),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không đọc được dung lượng lưu trữ" },
      { status: 500 },
    );
  }
}
