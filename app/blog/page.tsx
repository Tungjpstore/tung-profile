import Link from "next/link";
import Image from "next/image";
import { listPosts } from "../lib/posts-store";

interface PostProduct {
  name: string;
}

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
  readingMinutes?: number;
  products?: PostProduct[];
}

function cleanExcerpt(post: Post) {
  return (
    post.excerpt ||
    post.content
      .replace(/!\[[^\]]*]\([^)]+\)/g, "")
      .replace(/[#*_`>\-[\]().]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 150)
  );
}

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = (await listPosts(false)) as Post[];

  return (
    <main className="blog-shell min-h-screen">
      {/* Header */}
      <header className="network-topbar">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-70 transition-opacity">
            <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white bg-[var(--accent)]">
              TN
            </div>
            <span className="text-sm font-semibold hidden sm:block">Blog</span>
          </Link>
          <Link href="/" className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-70 text-[var(--text-muted)]">
            ← Trang chủ
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="mb-10 animate-fade-in">
          <p className="text-xs font-bold uppercase tracking-wider mb-3 text-[var(--accent)]">
            Bảng tin cá nhân
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mb-3">Blog</h1>
          <p className="text-sm max-w-2xl leading-7 text-[var(--text-muted)]">
            Các bài viết chia sẻ kinh nghiệm, dự án, công nghệ và cách mình xây dựng sản phẩm số.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <p className="text-5xl mb-4">📝</p>
            <p className="text-sm font-medium text-[var(--text-muted)]">Chưa có bài viết nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="glass-card animate-fade-in block rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group"
              >
                {post.cover ? (
                  <div className="relative h-44 w-full overflow-hidden border-b border-[var(--border)]">
                    <Image
                      src={post.cover}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-full h-44 flex items-center justify-center text-3xl bg-[var(--accent-dim)] text-[var(--accent)] border-b border-[var(--border)]">
                    📝
                  </div>
                )}
                <div className="p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide bg-[var(--accent-dim)] text-[var(--accent)]">
                      {post.category || "Chia sẻ"}
                    </span>
                    <span className="text-[11px] font-bold text-[var(--text-dim)]">
                      {post.products && post.products.length > 0 ? `${post.products.length} sản phẩm · ` : ""}
                      {post.readingMinutes || Math.max(1, Math.ceil(post.content.split(/\s+/).length / 220))} phút đọc
                    </span>
                  </div>
                  <h2 className="text-base font-bold mb-2 group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                    {post.title}
                  </h2>
                  <p className="text-sm line-clamp-2 mb-4 text-[var(--text-muted)]">
                    {cleanExcerpt(post)}...
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                    <div className="flex gap-2">
                      {post.tags.slice(0, 2).map((t, j) => (
                        <span
                          key={j}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--accent-dim)] text-[var(--accent)]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <span className="text-[11px] font-medium text-[var(--text-dim)]">
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
