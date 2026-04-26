import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tùng Nguyễn — Developer & Freelancer",
    short_name: "Tùng Nguyễn",
    description: "Trang cá nhân của Tùng Nguyễn — Lập trình viên & Freelancer",
    start_url: "/",
    display: "standalone",
    background_color: "#07070a",
    theme_color: "#07070a",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
  };
}
