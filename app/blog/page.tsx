"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Post { slug: string; title: string; cover: string; content: string; tags: string[]; status: string; createdAt: string }

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/posts").then(r => r.json()).then(d => { setPosts(d); setLoading(false); });
  }, []);

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl" style={{ background: "color-mix(in srgb, var(--bg) 80%, transparent)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-70 transition-opacity">
            <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "var(--accent)" }}>TN</div>
            <span className="text-sm font-semibold hidden sm:block">Blog</span>
          </Link>
          <Link href="/" className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-70" style={{ color: "var(--text-secondary)" }}>
            ← Trang chủ
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center mb-12 animate-fade-up">
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-3">Blog</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Chia sẻ kiến thức & kinh nghiệm về công nghệ</p>
        </div>

        {loading ? (
          <div className="text-center py-20"><div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 animate-fade-up">
            <p className="text-5xl mb-4">📝</p>
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Chưa có bài viết nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {posts.map((post, i) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}
                className="animate-fade-up block rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", animationDelay: `${i * 100}ms` }}>
                {post.cover ? (
                  <img src={post.cover} alt="" className="w-full h-44 object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                ) : (
                  <div className="w-full h-28 flex items-center justify-center text-3xl" style={{ background: "var(--accent-dim)" }}>📝</div>
                )}
                <div className="p-5">
                  <h2 className="text-base font-bold mb-2 group-hover:opacity-80 transition-opacity">{post.title}</h2>
                  <p className="text-sm line-clamp-2 mb-3" style={{ color: "var(--text-secondary)" }}>
                    {post.content.replace(/[#*_`>-]/g, "").slice(0, 120)}...
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {post.tags.slice(0, 3).map((t, j) => (
                        <span key={j} className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>{t}</span>
                      ))}
                    </div>
                    <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                      {new Date(post.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
