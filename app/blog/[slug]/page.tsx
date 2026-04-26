import type { Metadata } from "next";
import fs from "fs";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { SITE_URL } from "../../lib/site";

interface Post {
  slug: string;
  title: string;
  cover: string;
  content: string;
  tags: string[];
  status: string;
  createdAt: string;
  excerpt?: string;
  category?: string;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  scheduledAt?: string;
  readingMinutes?: number;
  products?: PostProduct[];
  productAngle?: string;
}

interface PostProduct {
  id: string;
  name: string;
  price: string;
  image: string;
  href: string;
  description: string;
  cta: string;
}

type Props = {
  params: Promise<{ slug: string }>;
};

const POSTS_DIR = path.join(process.cwd(), "data", "posts");

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function postPath(slug: string) {
  const filePath = path.join(POSTS_DIR, `${slugify(slug)}.json`);
  if (!filePath.startsWith(POSTS_DIR)) throw new Error("Invalid slug");
  return filePath;
}

function stripMarkdown(content: string) {
  return content
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/[#*_`>\-[\]().]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePost(post: Record<string, unknown>): Post {
  const content = typeof post.content === "string" ? post.content : "";
  const products = Array.isArray(post.products)
    ? post.products
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item, index) => ({
          id: typeof item.id === "string" && item.id.trim() ? item.id : `product-${index + 1}`,
          name: typeof item.name === "string" ? item.name : "",
          price: typeof item.price === "string" ? item.price : "",
          image: typeof item.image === "string" ? item.image : "",
          href: typeof item.href === "string" ? item.href : "",
          description: typeof item.description === "string" ? item.description : "",
          cta: typeof item.cta === "string" && item.cta.trim() ? item.cta : "Xem sản phẩm",
        }))
        .filter((item) => item.name || item.href || item.description)
    : [];
  return {
    slug: typeof post.slug === "string" ? post.slug : "",
    title: typeof post.title === "string" ? post.title : "",
    cover: typeof post.cover === "string" ? post.cover : "",
    content,
    tags: Array.isArray(post.tags) ? post.tags.filter((tag): tag is string => typeof tag === "string") : [],
    status: typeof post.status === "string" ? post.status : "draft",
    createdAt: typeof post.createdAt === "string" ? post.createdAt : new Date().toISOString(),
    excerpt: typeof post.excerpt === "string" ? post.excerpt : stripMarkdown(content).slice(0, 156),
    category: typeof post.category === "string" ? post.category : "Chia sẻ",
    metaTitle: typeof post.metaTitle === "string" ? post.metaTitle : "",
    metaDescription: typeof post.metaDescription === "string" ? post.metaDescription : "",
    canonicalUrl: typeof post.canonicalUrl === "string" ? post.canonicalUrl : "",
    scheduledAt: typeof post.scheduledAt === "string" ? post.scheduledAt : "",
    readingMinutes: typeof post.readingMinutes === "number" ? post.readingMinutes : Math.max(1, Math.ceil(content.split(/\s+/).filter(Boolean).length / 220)),
    products,
    productAngle: typeof post.productAngle === "string" ? post.productAngle : "",
  };
}

function isPublicPost(post: Post) {
  if (post.status !== "published") return false;
  if (!post.scheduledAt) return true;
  return new Date(post.scheduledAt).getTime() <= Date.now();
}

function getPost(slug: string) {
  try {
    const filePath = postPath(slug);
    if (!fs.existsSync(filePath)) return null;
    const post = normalizePost(JSON.parse(fs.readFileSync(filePath, "utf-8")));
    return isPublicPost(post) ? post : null;
  } catch {
    return null;
  }
}

function absoluteUrl(url: string) {
  if (!url) return "";
  try {
    return new URL(url, SITE_URL).toString();
  } catch {
    return "";
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) {
    return {
      title: "Bài viết không tồn tại",
      robots: { index: false, follow: false },
    };
  }

  const canonical = post.canonicalUrl || `${SITE_URL}/blog/${post.slug}`;
  const description = post.metaDescription || post.excerpt || stripMarkdown(post.content).slice(0, 156);
  const title = post.metaTitle || `${post.title} | Tùng Nguyễn`;
  const image = absoluteUrl(post.cover);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      publishedTime: post.createdAt,
      tags: post.tags,
      images: image ? [{ url: image, width: 1200, height: 630, alt: post.title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const readTime = post.readingMinutes || Math.max(1, Math.ceil(post.content.split(/\s+/).length / 220));
  const shareUrl = `${SITE_URL}/blog/${post.slug}`;
  const shareLinks = [
    ["X", `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(shareUrl)}`],
    ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`],
    ["Telegram", `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`],
  ];

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <header className="sticky top-0 z-40 backdrop-blur-2xl" style={{ background: "color-mix(in srgb, var(--bg) 80%, transparent)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/blog" className="flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity" style={{ color: "var(--text-secondary)" }}>
            ← Blog
          </Link>
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{readTime} phút đọc</span>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 animate-fade-up">
        {post.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.cover} alt="" className="w-full h-48 sm:h-72 object-cover rounded-2xl mb-8" />
        )}

        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--accent)" }}>{post.category || "Chia sẻ"}</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-4">{post.title}</h1>
        {post.excerpt ? <p className="text-base leading-7 mb-6" style={{ color: "var(--text-secondary)" }}>{post.excerpt}</p> : null}

        <div className="flex flex-wrap items-center gap-3 mb-10 pb-6" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{new Date(post.createdAt).toLocaleDateString("vi-VN", { year: "numeric", month: "long", day: "numeric" })}</span>
          <span style={{ color: "var(--text-muted)" }}>·</span>
          {post.tags.map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>{tag}</span>
          ))}
        </div>

        <MarkdownRenderer content={post.content} />

        {(post.products || []).length > 0 ? (
          <section className="mt-10 rounded-2xl p-5 sm:p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>Sản phẩm liên quan</p>
            {post.productAngle ? <p className="mb-5 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>{post.productAngle}</p> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              {(post.products || []).map((product, index) => (
                <a key={product.id || index} href={product.href || "#"} target={product.href ? "_blank" : undefined} rel="noreferrer" className="block overflow-hidden rounded-xl transition-all hover:-translate-y-0.5" style={{ background: "color-mix(in srgb, var(--bg-card) 88%, var(--accent-dim))", border: "1px solid var(--border)" }}>
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image} alt="" className="h-40 w-full object-cover" />
                  ) : null}
                  <div className="p-4">
                    <h2 className="text-base font-bold">{product.name || "Sản phẩm"}</h2>
                    {product.description ? <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>{product.description}</p> : null}
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <strong className="text-sm" style={{ color: "var(--accent)" }}>{product.price || "Liên hệ"}</strong>
                      <span className="rounded-lg px-3 py-2 text-xs font-bold" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>{product.cta || "Xem sản phẩm"}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-2">
          {shareLinks.map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-bold transition-all hover:-translate-y-0.5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}>
              Chia sẻ {label}
            </a>
          ))}
        </div>

        <div className="mt-12 pt-6 text-center" style={{ borderTop: "1px solid var(--border)" }}>
          <Link href="/blog" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            ← Xem thêm bài viết
          </Link>
        </div>
      </article>
    </main>
  );
}
