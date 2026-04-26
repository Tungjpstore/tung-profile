"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Post { slug: string; title: string; cover: string; content: string; tags: string[]; status: string; createdAt: string }

function renderContent(md: string) {
  return md.split("\n\n").map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("### ")) return <h3 key={i} className="text-lg font-bold mt-8 mb-3">{trimmed.slice(4)}</h3>;
    if (trimmed.startsWith("## ")) return <h2 key={i} className="text-xl font-bold mt-10 mb-3">{trimmed.slice(3)}</h2>;
    if (trimmed.startsWith("# ")) return <h1 key={i} className="text-2xl font-bold mt-10 mb-4">{trimmed.slice(2)}</h1>;
    if (trimmed.startsWith("```")) {
      const code = trimmed.replace(/^```\w*\n?/, "").replace(/```$/, "");
      return <pre key={i} className="p-5 rounded-xl text-sm overflow-x-auto my-5 font-mono" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}><code>{code}</code></pre>;
    }
    if (trimmed.startsWith("![")) {
      const match = trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (match) return <figure key={i} className="my-6"><img src={match[2]} alt={match[1]} className="w-full rounded-xl" />{match[1] && <figcaption className="text-xs mt-2 text-center" style={{ color: "var(--text-muted)" }}>{match[1]}</figcaption>}</figure>;
    }
    if (trimmed.startsWith("- ")) {
      const items = trimmed.split("\n").filter(l => l.startsWith("- "));
      return <ul key={i} className="space-y-1.5 my-4 ml-4" style={{ color: "var(--text-secondary)" }}>{items.map((item, j) => <li key={j} className="text-sm leading-relaxed flex gap-2"><span style={{ color: "var(--accent)" }}>•</span>{item.slice(2)}</li>)}</ul>;
    }
    if (trimmed.startsWith("> ")) {
      return <blockquote key={i} className="my-5 pl-4 py-2 text-sm italic rounded-r-lg" style={{ borderLeft: "3px solid var(--accent)", color: "var(--text-secondary)", background: "var(--accent-dim)" }}>{trimmed.slice(2)}</blockquote>;
    }
    const html = trimmed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>").replace(/`([^`]+)`/g, '<code style="background:var(--bg-input);padding:1px 6px;border-radius:4px;font-size:0.85em">$1</code>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:var(--accent);text-decoration:underline" target="_blank">$1</a>');
    return <p key={i} className="text-sm leading-[1.8] my-3" style={{ color: "var(--text-secondary)" }} dangerouslySetInnerHTML={{ __html: html }} />;
  });
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

  const readTime = Math.max(1, Math.ceil(post.content.split(/\s+/).length / 200));

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
        {post.cover && <img src={post.cover} alt="" className="w-full h-48 sm:h-72 object-cover rounded-2xl mb-8" />}

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-4">{post.title}</h1>

        <div className="flex items-center gap-3 mb-10 pb-6" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{new Date(post.createdAt).toLocaleDateString("vi-VN", { year: "numeric", month: "long", day: "numeric" })}</span>
          <span style={{ color: "var(--text-muted)" }}>·</span>
          {post.tags.map((t, i) => (
            <span key={i} className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>{t}</span>
          ))}
        </div>

        <div className="prose-custom">{renderContent(post.content)}</div>

        <div className="mt-12 pt-6 text-center" style={{ borderTop: "1px solid var(--border)" }}>
          <Link href="/blog" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            ← Xem thêm bài viết
          </Link>
        </div>
      </article>
    </main>
  );
}
