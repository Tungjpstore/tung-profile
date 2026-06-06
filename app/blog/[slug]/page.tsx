import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import PostEngagement from "../../components/PostEngagement";
import { SITE_URL } from "../../lib/site";
import { getPublicPost, stripMarkdown } from "../../lib/posts-store";

interface Product {
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

export const dynamic = "force-dynamic";

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
  const post = await getPublicPost(slug);
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
  const post = await getPublicPost(slug);
  if (!post) notFound();

  const readTime = post.readingMinutes || Math.max(1, Math.ceil(post.content.split(/\s+/).length / 220));
  const shareUrl = `${SITE_URL}/blog/${post.slug}`;
  const products = (post.products || []) as Product[];

  return (
    <main className="blog-shell min-h-screen">
      <header className="network-topbar">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/blog" className="flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity text-[var(--text-muted)]">
            ← Blog
          </Link>
          <span className="text-xs font-medium text-[var(--text-dim)]">{readTime} phút đọc</span>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 animate-fade-in">
        {post.cover && (
          <div className="relative h-64 sm:h-96 w-full overflow-hidden rounded-2xl border border-[var(--border)] mb-8">
            <Image
              src={post.cover}
              alt={post.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}

        <p className="text-xs font-bold uppercase tracking-wider mb-3 text-[var(--accent)]">{post.category || "Chia sẻ"}</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-4">{post.title}</h1>
        {post.excerpt ? <p className="text-base leading-7 mb-6 text-[var(--text-muted)]">{post.excerpt}</p> : null}

        <div className="flex flex-wrap items-center gap-3 mb-10 pb-6 border-b border-[var(--border)]">
          <span className="text-xs font-medium text-[var(--text-dim)]">
            {new Date(post.createdAt).toLocaleDateString("vi-VN", { year: "numeric", month: "long", day: "numeric" })}
          </span>
          <span className="text-[var(--text-dim)]">·</span>
          {post.tags.map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--accent-dim)] text-[var(--accent)]">{tag}</span>
          ))}
        </div>

        <MarkdownRenderer content={post.content} />

        {products.length > 0 ? (
          <section className="mt-10 rounded-2xl p-5 sm:p-6 glass-card">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Sản phẩm liên quan</p>
            {post.productAngle ? <p className="mb-5 text-sm leading-7 text-[var(--text-muted)]">{post.productAngle}</p> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              {products.map((product, index) => (
                <a
                  key={product.id || index}
                  href={product.href || "#"}
                  target={product.href ? "_blank" : undefined}
                  rel="noreferrer"
                  className="block overflow-hidden rounded-xl transition-all hover:-translate-y-0.5 glass-card"
                >
                  {product.image ? (
                    <div className="relative h-48 w-full overflow-hidden border-b border-[var(--border)]">
                      <Image
                        src={product.image}
                        alt={product.name || ""}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : null}
                  <div className="p-4">
                    <h2 className="text-base font-bold">{product.name || "Sản phẩm"}</h2>
                    {product.description ? <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{product.description}</p> : null}
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <strong className="text-sm text-[var(--accent)]">{product.price || "Liên hệ"}</strong>
                      <span className="rounded-lg px-3 py-2 text-xs font-bold bg-[var(--accent-dim)] text-[var(--accent)]">{product.cta || "Xem sản phẩm"}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-12">
          <PostEngagement slug={post.slug} title={post.title} url={shareUrl} commentsOpen />
        </div>

        <div className="mt-12 pt-6 text-center border-t border-[var(--border)]">
          <Link href="/blog" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 glass-card text-[var(--text-muted)]">
            ← Xem thêm bài viết
          </Link>
        </div>
      </article>
    </main>
  );
}
