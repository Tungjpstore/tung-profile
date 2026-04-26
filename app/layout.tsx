import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "./lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Tùng Nguyễn — Product-minded Developer",
  description: "Portfolio của Tùng Nguyễn — xây website, web app, mobile experience và giải pháp AI cho sản phẩm số.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Tùng Nguyễn — Product-minded Developer",
    description: "Profile cá nhân, blog, dự án, dịch vụ và thông tin liên hệ của Tùng Nguyễn.",
    url: SITE_URL,
    siteName: "Tùng Nguyễn Profile",
    locale: "vi_VN",
    type: "profile",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
