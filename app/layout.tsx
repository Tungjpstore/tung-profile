import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { SITE_URL } from "./lib/site";

const cloudflareAnalyticsToken = process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN;

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
      <body>
        {children}
        {cloudflareAnalyticsToken ? (
          <Script
            id="cloudflare-web-analytics"
            src="https://static.cloudflareinsights.com/beacon.min.js"
            strategy="afterInteractive"
            data-cf-beacon={JSON.stringify({ token: cloudflareAnalyticsToken })}
          />
        ) : null}
      </body>
    </html>
  );
}
