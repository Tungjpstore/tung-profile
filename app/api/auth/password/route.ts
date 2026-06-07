import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import path from "path";
import os from "os";
import { readJsonFromStorage, writeJsonToStorage } from "../../../lib/storage-helper";

interface AuthData {
  passwordHash: string;
  jwtSecret: string;
}

const authKeys = {
  r2Key: "data/auth.json",
  blobPath: "data/auth.json",
  kvKey: "tung-profile:auth",
  filePath: path.join(process.cwd(), "data", "auth.json"),
  runtimePath: path.join(os.tmpdir(), "tung-profile-data", "auth.json"),
};

const defaultAuth: AuthData = {
  passwordHash: "$2b$10$ivR5Ty6vIRfibYiy5suavunNap1lWdUUb9WKhRSWwH6CYuJs/0FRi",
  jwtSecret: "tung-profile-secret-key-2026-change-me",
};

export async function POST(request: Request) {
  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Vui lòng nhập đầy đủ mật khẩu cũ và mới" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Mật khẩu mới phải từ 6 ký tự trở lên" }, { status: 400 });
    }

    const auth = await readJsonFromStorage<AuthData>(authKeys, defaultAuth);
    const valid = await bcrypt.compare(currentPassword, auth.passwordHash);

    if (!valid) {
      return NextResponse.json({ error: "Mật khẩu cũ không đúng" }, { status: 401 });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    // Update the auth credentials
    auth.passwordHash = newHash;

    const storageResult = await writeJsonToStorage(authKeys, auth);

    if (storageResult.mode === "runtime" || !storageResult.persistent) {
      return NextResponse.json({
        success: true,
        warning: storageResult.warning || "Mật khẩu đã đổi tạm thời trên runtime. Cấu hình R2/Blob/KV để lưu trữ lâu dài.",
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json({ error: "Đổi mật khẩu thất bại" }, { status: 500 });
  }
}
