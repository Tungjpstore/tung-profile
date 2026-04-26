import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const AUTH_PATH = path.join(process.cwd(), "data", "auth.json");

function getAuth() {
  return JSON.parse(fs.readFileSync(AUTH_PATH, "utf-8"));
}

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    if (!password) {
      return NextResponse.json({ error: "Vui lòng nhập mật khẩu" }, { status: 400 });
    }

    const auth = getAuth();
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
  } catch {
    return NextResponse.json({ error: "Lỗi đăng nhập" }, { status: 500 });
  }
}
