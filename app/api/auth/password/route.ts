import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const AUTH_PATH = path.join(process.cwd(), "data", "auth.json");

function getAuth() {
  return JSON.parse(fs.readFileSync(AUTH_PATH, "utf-8"));
}

function writeAuth(data: unknown) {
  fs.writeFileSync(AUTH_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function POST(request: Request) {
  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Vui lòng nhập đầy đủ mật khẩu cũ và mới" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Mật khẩu mới phải từ 6 ký tự trở lên" }, { status: 400 });
    }

    const auth = getAuth();
    const valid = await bcrypt.compare(currentPassword, auth.passwordHash);

    if (!valid) {
      return NextResponse.json({ error: "Mật khẩu cũ không đúng" }, { status: 401 });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    // Update the auth credentials
    auth.passwordHash = newHash;

    try {
      writeAuth(auth);
    } catch {
      return NextResponse.json(
        {
          error: "Không thể lưu mật khẩu vào hệ thống tệp tin.",
          warning: "Vui lòng cập nhật mật khẩu thủ công trong data/auth.json trên môi trường Vercel production.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Đổi mật khẩu thất bại" }, { status: 500 });
  }
}
