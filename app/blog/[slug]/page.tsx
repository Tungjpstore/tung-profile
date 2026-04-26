"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { SITE_URL } from "../../lib/site";

interface Post {
  slug: string; title: string; cover: string; content: string; tags: string[]; status: string; createdAt: string;
  excerpt?: string; category?: string; metaTitle?: string; metaDescription?: string; readingMinutes?: number;
}

export default function PostPage() {
  const params = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch("/api/posts").then(r => r.json()).then((posts: Post[]) => {
      const found = posts.find(p => p.slug === params.slug);
      if (found) setPost(found);
      else setNotFound(true);
    });
  }, [params.slug]);

  if (notFound) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="text-center animate-fade-up">
        <p className="text-5xl mb-4">😕</p>
        <p className="text-base font-semibold mb-1">Bài viết không tồn tại</p>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Bài viết này có thể đã bị xoá hoặc chưa được xuất bản.</p>
        <Link href="/blog" className="inline-block px-6 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--accent)" }}>← Về Blog</Link>
      </div>
    </main>
  );

  if (!post) return <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}><div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" /></main>;

  const readTime = post.readingMinutes || Math.max(1, Math.ceil(post.content.split(/\s+/).length / 220));
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/blog/${post.slug}` : `${SITE_URL}/blog/${post.slug}`;
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
          {post.tags.map((t, i) => (
            <span key={i} className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>{t}</span>
          ))}
        </div>

        <MarkdownRenderer content={post.content} />

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
