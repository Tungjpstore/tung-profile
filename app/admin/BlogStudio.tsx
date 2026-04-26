"use client";

import { useEffect, useMemo, useState } from "react";
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

type EditorView = "write" | "preview" | "seo" | "ai" | "history";
type AiIntent = "make_outline" | "draft_from_brief" | "continue" | "rewrite_selection" | "improve_article" | "seo_pack" | "social_pack" | "translate_selection" | "critique";
type PatchOperation = "replaceSelection" | "replaceContent" | "appendContent" | "updateFields" | "showOnly";

interface AiSelection {
  text: string;
  start: number;
  end: number;
  before: string;
  after: string;
}

interface AiPatch {
  operation: PatchOperation;
  content?: string;
  fields?: Partial<Pick<BlogPost, "title" | "slug" | "excerpt" | "metaTitle" | "metaDescription" | "category" | "tags">>;
}

interface AiRouterResponse {
  result?: string;
  assistantNote?: string;
  patch?: AiPatch;
  warnings?: string[];
  intent?: AiIntent;
  error?: string;
}

interface PostVersion {
  id: string;
  savedAt: string;
  post: BlogPost;
}

interface DraftSnapshot {
  key: string;
  savedAt: string;
  post: BlogPost;
}

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
const AI_KEY_STORAGE = "blog-studio:xai-key";
const AI_MEMORY_STORAGE = "blog-studio:ai-memory";
const AI_ACTIONS: Array<{ intent: AiIntent; label: string; hint: string; requiresSelection?: boolean }> = [
  { intent: "continue", label: "Viết tiếp", hint: "Nối mạch từ đoạn cuối" },
  { intent: "rewrite_selection", label: "Biên tập đoạn chọn", hint: "Chỉ sửa phần đang bôi đen", requiresSelection: true },
  { intent: "improve_article", label: "Sửa toàn bài", hint: "Giữ ý, làm rõ cấu trúc" },
  { intent: "draft_from_brief", label: "Viết nháp", hint: "Dựa trên brief hiện tại" },
  { intent: "make_outline", label: "Dàn ý", hint: "Append outline vào bài" },
  { intent: "seo_pack", label: "SEO từ bài", hint: "Title, slug, excerpt, meta" },
  { intent: "social_pack", label: "Caption chia sẻ", hint: "X, Facebook, Telegram" },
  { intent: "critique", label: "Chấm điểm", hint: "Nhận xét như editor" },
];

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

function draftKey(slug: string) {
  return `blog-studio-draft:${slug || "new"}`;
}

function readDraft(slug: string): DraftSnapshot | null {
  if (typeof window === "undefined") return null;
  const key = draftKey(slug);
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Omit<DraftSnapshot, "key">;
    return parsed?.post ? { ...parsed, key } : null;
  } catch {
    return null;
  }
}

export default function BlogStudio({ posts, setPosts, editPost, setEditPost, showToast }: BlogStudioProps) {
  const [originalSlug, setOriginalSlug] = useState("");
  const [view, setView] = useState<EditorView>("write");
  const [saving, setSaving] = useState(false);
  const [aiIntent, setAiIntent] = useState<AiIntent>("continue");
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiMemory, setAiMemory] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(AI_MEMORY_STORAGE) || "";
  });
  const [aiResult, setAiResult] = useState("");
  const [aiAssistantNote, setAiAssistantNote] = useState("");
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [aiPatch, setAiPatch] = useState<AiPatch | null>(null);
  const [lastSelection, setLastSelection] = useState<AiSelection | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [storedApiKey, setStoredApiKey] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(AI_KEY_STORAGE) || "";
  });
  const [apiKeyDraft, setApiKeyDraft] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(AI_KEY_STORAGE) || "";
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [versions, setVersions] = useState<PostVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState("");
  const [draftCandidate, setDraftCandidate] = useState<DraftSnapshot | null>(null);

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

  const clearAiResponse = () => {
    setAiResult("");
    setAiAssistantNote("");
    setAiWarnings([]);
    setAiPatch(null);
    setLastSelection(null);
  };

  const openPost = (post: BlogPost) => {
    setOriginalSlug(post.slug);
    setEditPost(post);
    setView("write");
    clearAiResponse();
    setDraftCandidate(readDraft(post.slug));
    loadVersions(post.slug);
  };

  const newPost = () => {
    setOriginalSlug("");
    setEditPost(emptyPost());
    setView("write");
    clearAiResponse();
    setDraftCandidate(readDraft(""));
    setVersions([]);
  };

  const updatePost = (patch: Partial<BlogPost>) => {
    if (!editPost) return;
    setEditPost({ ...editPost, ...patch });
  };

  const updateAiMemory = (value: string) => {
    setAiMemory(value);
    if (typeof window !== "undefined") window.localStorage.setItem(AI_MEMORY_STORAGE, value);
  };

  const saveStoredApiKey = () => {
    const key = apiKeyDraft.trim();
    if (!key.startsWith("xai-")) {
      showToast("xAI key phải bắt đầu bằng xai-", "error");
      return;
    }
    window.localStorage.setItem(AI_KEY_STORAGE, key);
    setStoredApiKey(key);
    setApiKeyDraft(key);
    showToast("Đã lưu xAI key trong admin trình duyệt này");
  };

  const deleteStoredApiKey = () => {
    window.localStorage.removeItem(AI_KEY_STORAGE);
    setStoredApiKey("");
    setApiKeyDraft("");
    showToast("Đã xoá xAI key khỏi admin trình duyệt này");
  };

  useEffect(() => {
    if (!editPost) return;
    const key = draftKey(originalSlug || editPost.slug);
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      window.localStorage.setItem(key, JSON.stringify({ savedAt, post: editPost }));
      setDraftSavedAt(savedAt);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [editPost, originalSlug]);

  const loadVersions = async (slug: string) => {
    if (!slug) {
      setVersions([]);
      return;
    }
    setVersionsLoading(true);
    const res = await fetch(`/api/posts/versions?slug=${encodeURIComponent(slug)}`);
    const json = await res.json().catch(() => []);
    setVersions(Array.isArray(json) ? json : []);
    setVersionsLoading(false);
  };

  const clearDraft = (slug: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(draftKey(slug));
    setDraftCandidate(null);
    setDraftSavedAt("");
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
    clearDraft(originalSlug || slug);
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

  const getEditorSelection = (): AiSelection => {
    const content = editPost?.content || "";
    const el = document.getElementById("blog-content") as HTMLTextAreaElement | null;
    const rawStart = el?.selectionStart ?? content.length;
    const rawEnd = el?.selectionEnd ?? rawStart;
    const start = Math.max(0, Math.min(rawStart, rawEnd, content.length));
    const end = Math.max(start, Math.min(Math.max(rawStart, rawEnd), content.length));
    return {
      text: content.slice(start, end),
      start,
      end,
      before: content.slice(Math.max(0, start - 1400), start),
      after: content.slice(end, end + 1400),
    };
  };

  const runAi = async (intent: AiIntent = aiIntent) => {
    if (!editPost) return;
    const selection = getEditorSelection();
    const action = AI_ACTIONS.find((item) => item.intent === intent);
    if ((action?.requiresSelection || intent === "translate_selection") && !selection.text.trim()) {
      showToast("Hãy bôi đen đoạn cần AI xử lý trong ô Markdown trước đã.", "error");
      return;
    }

    setAiIntent(intent);
    setAiLoading(true);
    setAiResult("");
    setAiAssistantNote("");
    setAiWarnings([]);
    setAiPatch(null);
    setLastSelection(selection);

    try {
      const res = await fetch("/api/ai/blog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(storedApiKey ? { "x-xai-api-key": storedApiKey } : {}),
        },
        body: JSON.stringify({
          intent,
          instruction: aiInstruction,
          memory: aiMemory,
          selection,
          post: editPost,
        }),
      });
      const json = (await res.json().catch(() => ({ error: "AI trả về phản hồi không đọc được." }))) as AiRouterResponse;
      if (!res.ok) {
        showToast(json.error || "AI chưa sẵn sàng", "error");
        return;
      }

      const patch = json.patch || null;
      const fieldsText = patch?.operation === "updateFields" && patch.fields ? JSON.stringify(patch.fields, null, 2) : "";
      setAiPatch(patch);
      setAiAssistantNote(json.assistantNote || "");
      setAiWarnings(Array.isArray(json.warnings) ? json.warnings.filter((warning) => typeof warning === "string") : []);
      setAiResult(fieldsText || patch?.content || json.result || json.assistantNote || "");
      if (json.intent) setAiIntent(json.intent);
    } catch {
      showToast("Không gọi được AI lúc này", "error");
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiResult = () => {
    if (!editPost || !aiPatch) {
      showToast("Chưa có patch AI để áp dụng", "error");
      return;
    }

    const content = aiResult || aiPatch.content || "";
    if ((aiPatch.operation === "replaceSelection" || aiPatch.operation === "replaceContent" || aiPatch.operation === "appendContent") && !content.trim()) {
      showToast("Patch AI đang trống", "error");
      return;
    }

    if (aiPatch.operation === "replaceSelection") {
      if (!lastSelection || lastSelection.start === lastSelection.end) {
        showToast("Không tìm thấy đoạn đã chọn để thay thế", "error");
        return;
      }
      const currentSlice = editPost.content.slice(lastSelection.start, lastSelection.end);
      if (lastSelection.text && currentSlice !== lastSelection.text) {
        showToast("Nội dung đã đổi sau khi AI chạy. Hãy chọn đoạn và chạy lại AI.", "error");
        return;
      }
      updatePost({
        content: editPost.content.slice(0, lastSelection.start) + content + editPost.content.slice(lastSelection.end),
      });
      showToast("Đã thay đoạn được chọn bằng bản AI");
      return;
    }

    if (aiPatch.operation === "replaceContent") {
      updatePost({ content });
      showToast("Đã cập nhật toàn bộ nội dung bài viết");
      return;
    }

    if (aiPatch.operation === "appendContent") {
      updatePost({ content: [editPost.content.trimEnd(), content.trim()].filter(Boolean).join("\n\n") });
      showToast("Đã chèn nội dung AI vào cuối bài");
      return;
    }

    if (aiPatch.operation === "updateFields") {
      let fields = aiPatch.fields;
      if (aiResult.trim().startsWith("{")) {
        try {
          fields = JSON.parse(aiResult) as AiPatch["fields"];
        } catch {
          showToast("SEO patch không phải JSON hợp lệ", "error");
          return;
        }
      }
      const patch: Partial<BlogPost> = {};
      if (typeof fields?.title === "string") patch.title = fields.title.trim();
      if (typeof fields?.slug === "string") patch.slug = slugify(fields.slug);
      if (typeof fields?.excerpt === "string") patch.excerpt = fields.excerpt.trim();
      if (typeof fields?.metaTitle === "string") patch.metaTitle = fields.metaTitle.trim();
      if (typeof fields?.metaDescription === "string") patch.metaDescription = fields.metaDescription.trim();
      if (typeof fields?.category === "string") patch.category = fields.category.trim();
      if (Array.isArray(fields?.tags)) patch.tags = fields.tags.map((tag) => String(tag).trim()).filter(Boolean);
      updatePost(patch);
      showToast("Đã áp dụng field SEO từ AI");
      return;
    }

    showToast("Kết quả này chỉ để tham khảo, không sửa trực tiếp bài viết.");
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

        <div className="grid grid-cols-2 border-b border-white/[0.06] md:grid-cols-5">
          {[
            ["write", "Soạn thảo"],
            ["preview", "Preview"],
            ["seo", "SEO"],
            ["ai", "AI setup"],
            ["history", "Lịch sử"],
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
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">AI setup</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">Các nút AI đã chuyển vào tab Soạn thảo, ngay phía trên ô Markdown, để AI bám theo bài và đoạn đang chọn.</p>
                  </div>
                  <button type="button" onClick={() => setView("write")} className={btnSecondary + " text-xs"}>Về trình soạn</button>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className={labelCls}>xAI API key lưu cố định</label>
                    <p className="text-[11px] text-zinc-500">{storedApiKey ? "Đã có key đang dùng trong admin trình duyệt này." : "Chưa lưu key. Nhập key rồi bấm Lưu/Đổi key."}</p>
                  </div>
                  <span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${storedApiKey ? "bg-emerald-500/10 text-emerald-300" : "bg-zinc-500/10 text-zinc-500"}`}>
                    {storedApiKey ? "Đã lưu" : "Chưa lưu"}
                  </span>
                </div>
                <input className={inputCls} type={showApiKey ? "text" : "password"} value={apiKeyDraft} onChange={(event) => setApiKeyDraft(event.target.value.trim())} placeholder="xai-..." autoComplete="off" />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button onClick={saveStoredApiKey} className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-[11px] font-bold text-amber-100">Lưu/Đổi key</button>
                  <button onClick={() => setShowApiKey((value) => !value)} className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-zinc-300">{showApiKey ? "Ẩn key" : "Hiện key"}</button>
                  {storedApiKey ? <button onClick={deleteStoredApiKey} className="rounded-lg bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-300">Xoá key</button> : null}
                  <span className="text-[11px] text-zinc-500">Không lưu vào repo/database. Muốn dùng trên máy khác thì nhập lại key ở trình duyệt đó.</span>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                <label className={labelCls}>Ghi nhớ phong cách dùng chung</label>
                <textarea className={textareaCls} rows={5} value={aiMemory} onChange={(event) => updateAiMemory(event.target.value)} placeholder="VD: luôn giữ giọng người thật, không đổi chủ đề, ưu tiên câu ngắn, không lạm dụng buzzword..." />
                <p className="mt-2 text-[11px] leading-5 text-zinc-500">Phần này được gửi kèm mọi lần chạy AI và lưu trong trình duyệt admin.</p>
              </div>

              {aiResult ? (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <label className={labelCls + " mb-1"}>Patch gần nhất</label>
                      {aiAssistantNote ? <p className="text-xs text-zinc-400">{aiAssistantNote}</p> : null}
                    </div>
                    <button type="button" onClick={applyAiResult} disabled={!aiPatch || aiPatch.operation === "showOnly"} className={`${btnSecondary} px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50`}>Áp dụng patch</button>
                  </div>
                  <textarea className={textareaCls + " min-h-[260px] font-mono text-[13px] leading-6"} value={aiResult} onChange={(event) => setAiResult(event.target.value)} />
                </div>
              ) : null}
            </div>
          )}

          {view === "history" && (
            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                <p className="text-sm font-bold text-white">Lịch sử phiên bản</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">Mỗi lần lưu một bài đã tồn tại, hệ thống giữ lại bản trước đó. Khôi phục sẽ đưa nội dung vào editor, bạn vẫn cần bấm lưu để áp dụng.</p>
              </div>

              {versionsLoading ? (
                <p className="text-sm text-zinc-500">Đang tải lịch sử...</p>
              ) : versions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/[0.1] p-8 text-center">
                  <p className="text-sm font-semibold text-white">Chưa có phiên bản cũ</p>
                  <p className="mt-1 text-xs text-zinc-500">Sau lần lưu tiếp theo, bản hiện tại sẽ được đưa vào lịch sử.</p>
                </div>
              ) : versions.map((version) => (
                <div key={version.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">{version.post.title || "(Chưa có tiêu đề)"}</p>
                      <p className="mt-1 text-xs text-zinc-500">{new Date(version.savedAt).toLocaleString("vi-VN")} · {words(version.post.content)} từ</p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-600">{version.post.excerpt || stripMarkdown(version.post.content).slice(0, 180)}</p>
                    </div>
                    <button onClick={() => {
                      setEditPost(version.post);
                      setView("write");
                      showToast("Đã khôi phục phiên bản vào editor");
                    }} className={btnSecondary + " text-xs"}>Khôi phục</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-5">
          {view === "write" ? (
            <div className={panelCls}>
              <div className="border-b border-white/[0.06] px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">AI Copilot</h3>
                    <p className="mt-1 text-[11px] leading-4 text-zinc-500">Bám vào bài hiện tại và đoạn đang chọn.</p>
                  </div>
                  <button type="button" onClick={() => setView("ai")} className="rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-bold text-zinc-300 hover:bg-white/[0.1]">Setup</button>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className={labelCls}>Lệnh nhanh</label>
                  <textarea className={textareaCls} rows={3} value={aiInstruction} onChange={(event) => setAiInstruction(event.target.value)} placeholder="VD: giữ giọng cá nhân, thêm ví dụ thực tế, không đổi chủ đề..." />
                </div>

                <details className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                  <summary className="cursor-pointer text-xs font-bold text-zinc-300">Ghi nhớ phong cách</summary>
                  <textarea className={textareaCls + " mt-3"} rows={4} value={aiMemory} onChange={(event) => updateAiMemory(event.target.value)} placeholder="VD: tiếng Việt tự nhiên, câu ngắn, ít sáo rỗng..." />
                </details>

                <div className="grid grid-cols-2 gap-2">
                  {AI_ACTIONS.map((action) => (
                    <button
                      key={action.intent}
                      type="button"
                      onClick={() => runAi(action.intent)}
                      disabled={aiLoading}
                      className={`rounded-xl border px-3 py-2 text-left transition-all ${aiIntent === action.intent ? "border-indigo-300/50 bg-indigo-500/20" : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07]"} ${aiLoading ? "opacity-60" : ""}`}
                    >
                      <span className="block text-[11px] font-bold text-white">{aiLoading && aiIntent === action.intent ? "Đang chạy..." : action.label}</span>
                      <span className="mt-0.5 block text-[10px] leading-4 text-zinc-500">{action.hint}</span>
                    </button>
                  ))}
                </div>

                {aiAssistantNote || aiWarnings.length > 0 || aiResult ? (
                  <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                    {aiAssistantNote ? <p className="text-xs font-semibold leading-5 text-indigo-100">{aiAssistantNote}</p> : null}
                    {aiWarnings.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {aiWarnings.map((warning) => (
                          <p key={warning} className="text-[11px] leading-4 text-amber-200">• {warning}</p>
                        ))}
                      </div>
                    ) : null}
                    {aiResult ? (
                      <div className="mt-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <label className={labelCls + " mb-0"}>Patch {aiPatch ? `· ${aiPatch.operation}` : ""}</label>
                          <button type="button" onClick={applyAiResult} disabled={!aiPatch || aiPatch.operation === "showOnly"} className="rounded-lg bg-indigo-500/20 px-2.5 py-1.5 text-[11px] font-bold text-indigo-100 disabled:cursor-not-allowed disabled:opacity-50">
                            {aiPatch?.operation === "updateFields" ? "Áp dụng" : aiPatch?.operation === "replaceSelection" ? "Thay đoạn" : aiPatch?.operation === "replaceContent" ? "Thay bài" : aiPatch?.operation === "appendContent" ? "Chèn" : "Xem"}
                          </button>
                        </div>
                        <textarea className={textareaCls + " min-h-[180px] font-mono text-[12px] leading-5"} value={aiResult} onChange={(event) => setAiResult(event.target.value)} />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className={panelCls}>
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h3 className="text-sm font-bold text-white">Autosave</h3>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs leading-5 text-zinc-500">
                {draftSavedAt ? `Đã tự lưu lúc ${new Date(draftSavedAt).toLocaleTimeString("vi-VN")}` : "Đang chờ thay đổi để tự lưu."}
              </p>
              {draftCandidate ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-xs font-bold text-amber-200">Có bản nháp chưa lưu</p>
                  <p className="mt-1 text-[11px] text-zinc-500">{new Date(draftCandidate.savedAt).toLocaleString("vi-VN")}</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => {
                      setEditPost(draftCandidate.post);
                      setDraftCandidate(null);
                      showToast("Đã phục hồi bản nháp");
                    }} className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-[11px] font-bold text-amber-100">Phục hồi</button>
                    <button onClick={() => clearDraft(originalSlug || editPost.slug)} className="rounded-lg bg-white/[0.05] px-3 py-1.5 text-[11px] font-bold text-zinc-400">Bỏ qua</button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

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
