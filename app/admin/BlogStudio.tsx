"use client";

import { useMemo, useState } from "react";
import MarkdownRenderer from "../components/MarkdownRenderer";
import { SITE_URL } from "../lib/site";

export interface BlogPost {
  slug: string;
  title: string;
  cover: string;
  content: string;
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt?: string;
  excerpt?: string;
  category?: string;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  scheduledAt?: string;
  readingMinutes?: number;
}

type EditorView = "write" | "preview" | "seo" | "ai";
type AiMode = "outline" | "draft" | "rewrite" | "seo" | "social" | "translate" | "score";

interface BlogStudioProps {
  posts: BlogPost[];
  setPosts: (posts: BlogPost[]) => void;
  editPost: BlogPost | null;
  setEditPost: (post: BlogPost | null) => void;
  showToast: (message: string, type?: "success" | "error") => void;
}

const inputCls = "w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all";
const textareaCls = `${inputCls} resize-none`;
const btnPrimary = "px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all";
const btnSecondary = "px-5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-zinc-300 hover:bg-white/[0.1] text-sm font-medium transition-all";
const btnDanger = "px-3 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-all";
const labelCls = "block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2";
const panelCls = "rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden";

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

function emptyPost(): BlogPost {
  return {
    slug: "",
    title: "",
    cover: "",
    content: "",
    tags: [],
    status: "draft",
    category: "Chia sẻ",
    excerpt: "",
    metaTitle: "",
    metaDescription: "",
    canonicalUrl: "",
    scheduledAt: "",
    createdAt: new Date().toISOString(),
  };
}

function words(content: string) {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

function stripMarkdown(content: string) {
  return content.replace(/!\[[^\]]*]\([^)]+\)/g, "").replace(/[#*_`>\-[\]().]/g, "").replace(/\s+/g, " ").trim();
}

function parseJsonBlock(text: string) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as Partial<BlogPost>;
  } catch {
    return null;
  }
}

export default function BlogStudio({ posts, setPosts, editPost, setEditPost, showToast }: BlogStudioProps) {
  const [originalSlug, setOriginalSlug] = useState("");
  const [view, setView] = useState<EditorView>("write");
  const [saving, setSaving] = useState(false);
  const [aiMode, setAiMode] = useState<AiMode>("outline");
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const analysis = useMemo(() => {
    const post = editPost || emptyPost();
    const wordCount = words(post.content || "");
    const headingCount = (post.content.match(/^#{2,3}\s/gm) || []).length;
    const hasCover = Boolean(post.cover);
    const excerpt = post.excerpt || stripMarkdown(post.content).slice(0, 156);
    const metaDescription = post.metaDescription || "";
    const checks = [
      { label: "Tiêu đề 35-70 ký tự", ok: post.title.length >= 35 && post.title.length <= 70 },
      { label: "Có mô tả ngắn / excerpt", ok: excerpt.length >= 80 },
      { label: "Meta description 120-160 ký tự", ok: metaDescription.length >= 120 && metaDescription.length <= 160 },
      { label: "Có ảnh bìa", ok: hasCover },
      { label: "Có ít nhất 2 heading H2/H3", ok: headingCount >= 2 },
      { label: "Có từ 2 tag trở lên", ok: post.tags.length >= 2 },
      { label: "Nội dung trên 500 từ", ok: wordCount >= 500 },
    ];
    const score = Math.round((checks.filter((item) => item.ok).length / checks.length) * 100);
    return {
      wordCount,
      readTime: Math.max(1, Math.ceil(wordCount / 220)),
      headingCount,
      excerpt,
      score,
      checks,
    };
  }, [editPost]);

  const openPost = (post: BlogPost) => {
    setOriginalSlug(post.slug);
    setEditPost(post);
    setView("write");
    setAiResult("");
  };

  const newPost = () => {
    setOriginalSlug("");
    setEditPost(emptyPost());
    setView("write");
    setAiResult("");
  };

  const updatePost = (patch: Partial<BlogPost>) => {
    if (!editPost) return;
    setEditPost({ ...editPost, ...patch });
  };

  const insertMarkdown = (before: string, after = "", fallback = "") => {
    if (!editPost) return;
    const el = document.getElementById("blog-content") as HTMLTextAreaElement | null;
    const start = el?.selectionStart ?? editPost.content.length;
    const end = el?.selectionEnd ?? editPost.content.length;
    const selected = editPost.content.slice(start, end) || fallback;
    const insert = `${before}${selected}${after}`;
    updatePost({ content: editPost.content.slice(0, start) + insert + editPost.content.slice(end) });
    window.setTimeout(() => {
      el?.focus();
      if (el) {
        el.selectionStart = start + before.length;
        el.selectionEnd = start + before.length + selected.length;
      }
    }, 0);
  };

  const uploadImage = async (file: File, mode: "cover" | "content") => {
    if (!editPost) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!json.url) {
      showToast("Upload ảnh thất bại", "error");
      return;
    }
    if (mode === "cover") updatePost({ cover: json.url });
    else insertMarkdown("\n![", `](${json.url})\n`, file.name.replace(/\.[^.]+$/, ""));
  };

  const savePost = async () => {
    if (!editPost) return;
    setSaving(true);
    const slug = editPost.slug || slugify(editPost.title) || Date.now().toString(36);
    const payload = {
      ...editPost,
      slug,
      excerpt: editPost.excerpt || analysis.excerpt,
      originalSlug: originalSlug || undefined,
    };
    const method = originalSlug ? "PUT" : "POST";
    const res = await fetch("/api/posts", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      showToast("Không lưu được bài viết", "error");
      setSaving(false);
      return;
    }

    const updated = await fetch("/api/posts?all=true").then((r) => r.json());
    setPosts(updated);
    setEditPost(null);
    setSaving(false);
    showToast("Đã lưu bài viết");
  };

  const deletePost = async (slug: string) => {
    await fetch("/api/posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    setPosts(posts.filter((post) => post.slug !== slug));
    showToast("Đã xoá bài viết");
  };

  const runAi = async () => {
    if (!editPost) return;
    setAiLoading(true);
    setAiResult("");
    const res = await fetch("/api/ai/blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: aiMode, instruction: aiInstruction, post: editPost }),
    });
    const json = await res.json();
    setAiLoading(false);
    if (!res.ok) {
      showToast(json.error || "AI chưa sẵn sàng", "error");
      return;
    }
    setAiResult(json.result || "");
  };

  const applyAiResult = () => {
    if (!editPost || !aiResult) return;
    if (aiMode === "seo") {
      const seo = parseJsonBlock(aiResult);
      if (!seo) {
        showToast("AI chưa trả về JSON hợp lệ", "error");
        return;
      }
      updatePost({
        title: seo.title || editPost.title,
        slug: seo.slug ? slugify(seo.slug) : editPost.slug,
        excerpt: seo.excerpt || editPost.excerpt,
        metaTitle: seo.metaTitle || editPost.metaTitle,
        metaDescription: seo.metaDescription || editPost.metaDescription,
        category: seo.category || editPost.category,
        tags: Array.isArray(seo.tags) ? seo.tags : editPost.tags,
      });
      showToast("Đã áp dụng SEO từ AI");
      return;
    }
    if (aiMode === "outline" || aiMode === "social" || aiMode === "score") {
      updatePost({ content: `${editPost.content}${editPost.content ? "\n\n" : ""}${aiResult}` });
      showToast("Đã chèn nội dung AI");
      return;
    }
    updatePost({ content: aiResult });
    showToast("Đã áp dụng nội dung AI");
  };

  if (!editPost) {
    return (
      <div className={panelCls}>
        <div className="px-6 py-4 border-b border-white/[0.06] flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Blog Studio</h2>
            <p className="text-xs text-zinc-500 mt-1">Quản lý bài viết, SEO, preview và trợ lý xAI.</p>
          </div>
          <button onClick={newPost} className={btnPrimary}>Tạo bài viết mới</button>
        </div>
        <div className="p-6 space-y-3">
          {posts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/[0.1] p-8 text-center">
              <p className="text-sm font-semibold text-white">Chưa có bài viết</p>
              <p className="text-xs text-zinc-500 mt-1">Tạo bài đầu tiên và dùng AI để lên dàn ý nhanh.</p>
            </div>
          ) : posts.map((post) => (
            <div key={post.slug} className="grid gap-4 rounded-xl bg-white/[0.02] border border-white/[0.05] p-4 md:grid-cols-[96px_1fr_auto] md:items-center">
              <div className="h-20 rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06]">
                {post.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full grid place-items-center text-xs text-zinc-600">Cover</div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm font-bold text-white">{post.title || "(Chưa có tiêu đề)"}</h3>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${post.status === "published" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-400"}`}>
                    {post.status === "published" ? "Công khai" : "Nháp"}
                  </span>
                  {post.category ? <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-300">{post.category}</span> : null}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{post.excerpt || stripMarkdown(post.content).slice(0, 150)}</p>
                <p className="mt-2 text-[11px] text-zinc-600">{new Date(post.createdAt).toLocaleDateString("vi-VN")} · {post.readingMinutes || Math.max(1, Math.ceil(words(post.content) / 220))} phút đọc</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openPost(post)} className={btnSecondary + " text-xs"}>Sửa</button>
                <button onClick={() => deletePost(post.slug)} className={btnDanger + " text-xs"}>Xoá</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className={panelCls}>
        <div className="px-6 py-4 border-b border-white/[0.06] flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button onClick={() => setEditPost(null)} className="mb-2 text-xs font-semibold text-zinc-500 hover:text-white">← Quay lại danh sách</button>
            <h2 className="text-sm font-bold text-white">{originalSlug ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"}</h2>
            <p className="text-xs text-zinc-500 mt-1">{analysis.wordCount} từ · {analysis.readTime} phút đọc · SEO {analysis.score}/100</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => updatePost({ status: "draft" })} className={`${btnSecondary} ${editPost.status === "draft" ? "border-zinc-400/40 text-white" : ""}`}>Nháp</button>
            <button onClick={() => updatePost({ status: "published" })} className={`${btnSecondary} ${editPost.status === "published" ? "border-emerald-400/40 text-emerald-300" : ""}`}>Công khai</button>
            <button onClick={savePost} disabled={saving} className={btnPrimary}>{saving ? "Đang lưu..." : "Lưu bài viết"}</button>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-white/[0.06] md:grid-cols-4">
          {[
            ["write", "Soạn thảo"],
            ["preview", "Preview"],
            ["seo", "SEO"],
            ["ai", "xAI"],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setView(id as EditorView)} className={`min-h-12 border-r border-white/[0.06] text-xs font-bold transition-colors last:border-r-0 ${view === id ? "bg-white/[0.06] text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className={panelCls}>
          {view === "write" && (
            <div className="p-6 space-y-5">
              <div>
                <label className={labelCls}>Tiêu đề</label>
                <input className={inputCls + " text-lg font-bold"} value={editPost.title} onChange={(event) => {
                  const title = event.target.value;
                  const shouldAutoSlug = !originalSlug && (!editPost.slug || editPost.slug === slugify(editPost.title));
                  updatePost({ title, slug: shouldAutoSlug ? slugify(title) : editPost.slug });
                }} placeholder="VD: Cách xây dựng profile cá nhân chuyên nghiệp" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelCls}>Slug</label>
                  <input className={inputCls} value={editPost.slug} onChange={(event) => updatePost({ slug: slugify(event.target.value) })} placeholder="duong-dan-bai-viet" />
                </div>
                <div>
                  <label className={labelCls}>Danh mục</label>
                  <input className={inputCls} value={editPost.category || ""} onChange={(event) => updatePost({ category: event.target.value })} placeholder="Chia sẻ, Kỹ thuật, Case study..." />
                </div>
              </div>

              <div>
                <label className={labelCls}>Ảnh bìa</label>
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <input className={inputCls} value={editPost.cover} onChange={(event) => updatePost({ cover: event.target.value })} placeholder="/uploads/cover.png hoặc https://..." />
                  <label className={btnSecondary + " cursor-pointer text-center"}>
                    Upload cover
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) uploadImage(file, "cover");
                    }} />
                  </label>
                </div>
                {editPost.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={editPost.cover} alt="" className="mt-3 h-48 w-full rounded-xl object-cover border border-white/[0.06]" />
                ) : null}
              </div>

              <div>
                <label className={labelCls}>Excerpt</label>
                <textarea className={textareaCls} rows={3} value={editPost.excerpt || ""} onChange={(event) => updatePost({ excerpt: event.target.value })} placeholder="Một đoạn mô tả ngắn dùng cho feed, SEO và social share." />
              </div>

              <div>
                <label className={labelCls}>Tags</label>
                <input className={inputCls} value={editPost.tags.join(", ")} onChange={(event) => updatePost({ tags: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="Next.js, UI, AI" />
              </div>

              <div>
                <label className={labelCls}>Nội dung Markdown</label>
                <div className="mb-2 flex flex-wrap gap-1">
                  {[
                    ["B", "**", "**", "đậm"],
                    ["I", "*", "*", "nghiêng"],
                    ["H2", "\n## ", "", "Tiêu đề lớn"],
                    ["H3", "\n### ", "", "Tiêu đề nhỏ"],
                    ["Quote", "\n> ", "", "Trích dẫn"],
                    ["Code", "\n```\n", "\n```\n", "code"],
                    ["List", "\n- ", "", "mục"],
                    ["Link", "[", "](https://)", "liên kết"],
                    ["Table", "\n| Cột 1 | Cột 2 |\n| --- | --- |\n| Nội dung | Nội dung |\n", "", ""],
                    ["Callout", "\n> [!NOTE]\n> ", "", "Ghi chú quan trọng"],
                  ].map(([label, before, after, fallback]) => (
                    <button key={label} type="button" onClick={() => insertMarkdown(before, after, fallback)} className="rounded-md border border-white/[0.06] bg-white/[0.04] px-2.5 py-1.5 text-xs font-bold text-zinc-400 transition-all hover:bg-white/[0.08] hover:text-white">
                      {label}
                    </button>
                  ))}
                  <label className="cursor-pointer rounded-md border border-white/[0.06] bg-white/[0.04] px-2.5 py-1.5 text-xs font-bold text-zinc-400 transition-all hover:bg-white/[0.08] hover:text-white">
                    Image
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) uploadImage(file, "content");
                    }} />
                  </label>
                </div>
                <textarea id="blog-content" className={textareaCls + " min-h-[520px] font-mono text-[13px] leading-6"} value={editPost.content} onChange={(event) => updatePost({ content: event.target.value })} placeholder={"## Mở đầu\n\nViết nội dung bài tại đây..."} />
              </div>
            </div>
          )}

          {view === "preview" && (
            <article className="p-6">
              {editPost.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={editPost.cover} alt="" className="mb-6 h-64 w-full rounded-xl object-cover border border-white/[0.06]" />
              ) : null}
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-indigo-300">{editPost.category || "Chia sẻ"} · {analysis.readTime} phút đọc</p>
              <h1 className="text-3xl font-black leading-tight text-white">{editPost.title || "Tiêu đề bài viết"}</h1>
              <p className="mt-4 text-sm leading-7 text-zinc-400">{editPost.excerpt || analysis.excerpt || "Excerpt sẽ hiển thị tại đây."}</p>
              <div className="my-6 flex flex-wrap gap-2 border-b border-white/[0.06] pb-6">
                {editPost.tags.map((tag) => <span key={tag} className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-300">{tag}</span>)}
              </div>
              <MarkdownRenderer content={editPost.content || "Nội dung preview sẽ hiển thị tại đây."} />
            </article>
          )}

          {view === "seo" && (
            <div className="p-6 space-y-5">
              <div>
                <label className={labelCls}>Meta title</label>
                <input className={inputCls} value={editPost.metaTitle || ""} onChange={(event) => updatePost({ metaTitle: event.target.value })} placeholder="Tiêu đề SEO, nên 45-60 ký tự" />
                <p className="mt-1 text-[11px] text-zinc-600">{(editPost.metaTitle || "").length} ký tự</p>
              </div>
              <div>
                <label className={labelCls}>Meta description</label>
                <textarea className={textareaCls} rows={3} value={editPost.metaDescription || ""} onChange={(event) => updatePost({ metaDescription: event.target.value })} placeholder="Mô tả SEO 120-160 ký tự" />
                <p className="mt-1 text-[11px] text-zinc-600">{(editPost.metaDescription || "").length} ký tự</p>
              </div>
              <div>
                <label className={labelCls}>Canonical URL</label>
                <input className={inputCls} value={editPost.canonicalUrl || ""} onChange={(event) => updatePost({ canonicalUrl: event.target.value })} placeholder={`${SITE_URL}/blog/${editPost.slug || "slug"}`} />
              </div>
              <div>
                <label className={labelCls}>Lịch đăng</label>
                <input className={inputCls} type="datetime-local" value={editPost.scheduledAt || ""} onChange={(event) => updatePost({ scheduledAt: event.target.value })} />
                <p className="mt-1 text-[11px] text-zinc-600">Để trống nếu muốn hiển thị ngay khi trạng thái là Công khai.</p>
              </div>
            </div>
          )}

          {view === "ai" && (
            <div className="p-6 space-y-5">
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                <p className="text-sm font-bold text-white">xAI Writing Assistant</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">AI chạy qua server route, dùng biến môi trường XAI_API_KEY. Không đưa key xuống trình duyệt.</p>
              </div>

              <div className="grid gap-2 md:grid-cols-4">
                {[
                  ["outline", "Dàn ý"],
                  ["draft", "Viết nháp"],
                  ["rewrite", "Biên tập"],
                  ["seo", "SEO"],
                  ["social", "Social"],
                  ["translate", "Dịch EN"],
                  ["score", "Chấm điểm"],
                ].map(([id, label]) => (
                  <button key={id} onClick={() => setAiMode(id as AiMode)} className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${aiMode === id ? "border-indigo-400/40 bg-indigo-500/10 text-indigo-200" : "border-white/[0.06] bg-white/[0.03] text-zinc-500 hover:text-white"}`}>
                    {label}
                  </button>
                ))}
              </div>

              <div>
                <label className={labelCls}>Yêu cầu thêm cho AI</label>
                <textarea className={textareaCls} rows={4} value={aiInstruction} onChange={(event) => setAiInstruction(event.target.value)} placeholder="VD: viết theo giọng thân thiện, có ví dụ cho freelancer, tránh văn phong quảng cáo..." />
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={runAi} disabled={aiLoading} className={btnPrimary}>{aiLoading ? "AI đang viết..." : "Chạy xAI"}</button>
                <button onClick={applyAiResult} disabled={!aiResult} className={btnSecondary}>Áp dụng kết quả</button>
              </div>

              {aiResult ? (
                <div>
                  <label className={labelCls}>Kết quả AI</label>
                  <textarea className={textareaCls + " min-h-[320px] font-mono text-[13px] leading-6"} value={aiResult} onChange={(event) => setAiResult(event.target.value)} />
                </div>
              ) : null}
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <div className={panelCls}>
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h3 className="text-sm font-bold text-white">Content Score</h3>
            </div>
            <div className="p-5">
              <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${analysis.score}%` }} />
              </div>
              <p className="text-3xl font-black text-white">{analysis.score}<span className="text-sm text-zinc-500">/100</span></p>
              <div className="mt-4 space-y-2">
                {analysis.checks.map((check) => (
                  <div key={check.label} className="flex items-start gap-2 text-xs">
                    <span className={check.ok ? "text-emerald-400" : "text-zinc-600"}>{check.ok ? "✓" : "○"}</span>
                    <span className={check.ok ? "text-zinc-300" : "text-zinc-500"}>{check.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={panelCls}>
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h3 className="text-sm font-bold text-white">Thông số</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 p-5">
              {[
                ["Từ", analysis.wordCount],
                ["Phút đọc", analysis.readTime],
                ["Heading", analysis.headingCount],
                ["Tags", editPost.tags.length],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white/[0.03] p-3 text-center">
                  <p className="text-lg font-black text-white">{value}</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase text-zinc-600">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
