import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import path from "path";
import os from "os";
import { readJsonFromStorage } from "../../../lib/storage-helper";

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
    const { password } = await request.json();
    if (!password) {
      return NextResponse.json({ error: "Vui lòng nhập mật khẩu" }, { status: 400 });
    }

    const auth = await readJsonFromStorage<AuthData>(authKeys, defaultAuth);
    const valid = await bcrypt.compare(password, auth.passwordHash);

    if (!valid) {
      return NextResponse.json({ error: "Mật khẩu không đúng" }, { status: 401 });
    }

    // Create JWT
    const secret = new TextEncoder().encode(auth.jwtSecret);
    const token = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);

    const res = NextResponse.json({ success: true });
    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24h
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Lỗi đăng nhập" }, { status: 500 });
  }
}
