import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode("tung-profile-secret-key-2026-change-me");

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/api/auth/") ||
    (pathname === "/api/contact" && request.method === "POST") ||
    (pathname === "/api/analytics" && request.method === "POST")
  ) {
    return NextResponse.next();
  }

  if ((pathname === "/api/profile" || pathname === "/api/posts") && request.method === "GET") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/profile") || pathname.startsWith("/api/upload") || pathname.startsWith("/api/posts") || pathname.startsWith("/api/ai") || pathname.startsWith("/api/contact") || pathname.startsWith("/api/analytics") || pathname.startsWith("/api/storage")) {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    try {
      await jwtVerify(token, JWT_SECRET);
    } catch {
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/profile", "/api/upload/:path*", "/api/posts/:path*", "/api/ai/:path*", "/api/contact", "/api/analytics", "/api/storage"],
};
