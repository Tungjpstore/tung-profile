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
  products?: PostProduct[];
  productAngle?: string;
}

export interface PostProduct {
  id: string;
  name: string;
  price: string;
  image: string;
  href: string;
  description: string;
  cta: string;
}

type EditorView = "write" | "preview" | "seo" | "history";
type AiIntent = "research_plan" | "longform_from_plan" | "plan_article" | "draft_from_plan" | "make_outline" | "draft_from_brief" | "continue" | "rewrite_selection" | "improve_article" | "seo_pack" | "product_pitch" | "critique";
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

interface AiScenario {
  id: string;
  title: string;
  angle: string;
  readerPromise: string;
  outline: string[];
  tone: string;
  productFit: string;
  suggestedTags: string[];
}

interface AiRouterResponse {
  result?: string;
  assistantNote?: string;
  patch?: AiPatch;
  warnings?: string[];
  scenarios?: AiScenario[];
  citations?: string[];
  researchBrief?: string;
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
const AI_ACTIONS: Array<{ intent: AiIntent; label: string; hint: string; requiresSelection?: boolean; primary?: boolean }> = [
  { intent: "continue", label: "Viết tiếp", hint: "Nối tiếp đúng mạch bài" },
  { intent: "rewrite_selection", label: "Sửa đoạn chọn", hint: "Chỉ thay phần bôi đen", requiresSelection: true },
  { intent: "improve_article", label: "Làm gọn bài", hint: "Giữ ý, sửa cấu trúc" },
  { intent: "seo_pack", label: "Tối ưu SEO", hint: "Tự điền title/meta/tag" },
  { intent: "product_pitch", label: "Gắn sản phẩm", hint: "Chèn CTA tự nhiên" },
];
const AI_TONES = ["Thực chiến cá nhân", "Chuyên gia rõ ràng", "Thân mật gần gũi", "Review bán hàng mềm", "Kỹ thuật chi tiết"];
const AI_DICTIONS = ["Đơn giản dễ hiểu", "Sắc gọn ít chữ", "Tự nhiên như chia sẻ", "Chuyên nghiệp cao cấp", "Giàu cảm xúc"];
const AI_TARGET_WORDS = [1200, 1800, 2200, 2800, 3200];

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
    products: [],
    productAngle: "",
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

function newProduct(): PostProduct {
  const id = `product-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    name: "",
    price: "",
    image: "",
    href: "",
    description: "",
    cta: "Xem sản phẩm",
  };
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
  const [aiCitations, setAiCitations] = useState<string[]>([]);
  const [aiResearchBrief, setAiResearchBrief] = useState("");
  const [aiPatch, setAiPatch] = useState<AiPatch | null>(null);
  const [lastSelection, setLastSelection] = useState<AiSelection | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTone, setAiTone] = useState(AI_TONES[0]);
  const [aiDiction, setAiDiction] = useState(AI_DICTIONS[0]);
  const [aiResearchEnabled, setAiResearchEnabled] = useState(true);
  const [aiTargetWords, setAiTargetWords] = useState(2200);
  const [aiAudience, setAiAudience] = useState("");
  const [aiScenarios, setAiScenarios] = useState<AiScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
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

  const selectedScenario = useMemo(
    () => aiScenarios.find((scenario) => scenario.id === selectedScenarioId) || aiScenarios[0] || null,
    [aiScenarios, selectedScenarioId]
  );
  const aiFlowStep = aiScenarios.length > 0 ? (analysis.wordCount >= 700 ? 3 : 2) : 1;

  const clearAiResponse = () => {
    setAiResult("");
    setAiAssistantNote("");
    setAiWarnings([]);
    setAiCitations([]);
    setAiResearchBrief("");
    setAiPatch(null);
    setLastSelection(null);
    setAiScenarios([]);
    setSelectedScenarioId("");
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

  const updateProduct = (index: number, patch: Partial<PostProduct>) => {
    if (!editPost) return;
    const products = [...(editPost.products || [])];
    products[index] = { ...products[index], ...patch };
    updatePost({ products });
  };

  const addProduct = () => {
    if (!editPost) return;
    updatePost({ products: [...(editPost.products || []), newProduct()] });
  };

  const removeProduct = (index: number) => {
    if (!editPost) return;
    updatePost({ products: (editPost.products || []).filter((_, itemIndex) => itemIndex !== index) });
  };

  const insertProductMention = (product: PostProduct) => {
    const title = product.name || "Sản phẩm";
    const price = product.price ? ` - ${product.price}` : "";
    const href = product.href || "#";
    insertMarkdown(`\n> **${title}${price}**\n> ${product.description || "Mô tả ngắn về sản phẩm."}\n> [${product.cta || "Xem sản phẩm"}](${href})\n`, "", "");
  };

  const savePost = async (forcedStatus?: "draft" | "published") => {
    if (!editPost) return;
    const title = editPost.title.trim();
    const content = editPost.content.trim();
    const nextStatus = forcedStatus || editPost.status || "draft";
    if (!title) {
      showToast("Nhập tiêu đề trước khi lưu bài viết", "error");
      return;
    }
    if (nextStatus === "published" && !content) {
      showToast("Bài công khai cần có nội dung", "error");
      return;
    }
    setSaving(true);
    const slug = editPost.slug || slugify(title) || Date.now().toString(36);
    const payload = {
      ...editPost,
      title,
      slug,
      status: nextStatus,
      excerpt: editPost.excerpt || analysis.excerpt,
      originalSlug: originalSlug || undefined,
    };
    const method = originalSlug ? "PUT" : "POST";
    try {
      const res = await fetch("/api/posts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({})) as { error?: string; slug?: string; post?: BlogPost };
      if (!res.ok) {
        showToast(json.error || "Không lưu được bài viết", "error");
        return;
      }

      const updated = await fetch("/api/posts?all=true", { cache: "no-store" }).then((r) => r.json());
      if (Array.isArray(updated)) setPosts(updated);
      const savedSlug = json.slug || slug;
      clearDraft(originalSlug || savedSlug);
      setOriginalSlug(savedSlug);
      setEditPost(json.post || { ...payload, slug: savedSlug });
      showToast(nextStatus === "published" ? "Đã đăng bài viết" : "Đã lưu bản nháp");
    } catch {
      showToast("Không kết nối được API bài viết", "error");
    } finally {
      setSaving(false);
    }
  };

  const deletePost = async (slug: string) => {
    const target = posts.find((post) => post.slug === slug);
    const ok = window.confirm(`Xoá bài "${target?.title || slug}"?`);
    if (!ok) return;
    try {
      const res = await fetch("/api/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const json = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) {
        showToast(json.error || "Không xoá được bài viết", "error");
        return;
      }
      setPosts(posts.filter((post) => post.slug !== slug));
      if (editPost?.slug === slug) setEditPost(null);
      showToast("Đã xoá bài viết");
    } catch {
      showToast("Không kết nối được API xoá bài", "error");
    }
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
    if ((intent === "plan_article" || intent === "research_plan" || intent === "longform_from_plan") && !editPost.title.trim() && !aiInstruction.trim()) {
      showToast("Nhập tiêu đề hoặc brief trước để AI lên 3 hướng bài.", "error");
      return;
    }
    if (intent === "draft_from_plan" && !selectedScenario) {
      showToast("Hãy tạo và chọn một hướng bài trước khi viết nháp.", "error");
      return;
    }
    if (action?.requiresSelection && !selection.text.trim()) {
      showToast("Hãy bôi đen đoạn cần AI xử lý trong ô Markdown trước đã.", "error");
      return;
    }
    if (intent === "product_pitch" && !(editPost.products || []).some((product) => product.name.trim())) {
      showToast("Hãy thêm ít nhất một sản phẩm trước khi nhờ AI gắn vào bài.", "error");
      return;
    }

    setAiIntent(intent);
    setAiLoading(true);
    setAiResult("");
    setAiAssistantNote("");
    setAiWarnings([]);
    setAiCitations([]);
    setAiResearchBrief("");
    setAiPatch(null);
    setLastSelection(selection);
    if (intent === "plan_article" || intent === "research_plan") {
      setAiScenarios([]);
      setSelectedScenarioId("");
    }

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
          tone: aiTone,
          diction: aiDiction,
          researchEnabled: aiResearchEnabled,
          targetWords: aiTargetWords,
          audience: aiAudience,
          scenario: intent === "draft_from_plan" || intent === "longform_from_plan" ? selectedScenario : undefined,
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
      setAiCitations(Array.isArray(json.citations) ? json.citations.filter((citation) => typeof citation === "string") : []);
      setAiResearchBrief(json.researchBrief || "");
      setAiResult(fieldsText || patch?.content || json.result || json.assistantNote || "");
      if (Array.isArray(json.scenarios) && json.scenarios.length > 0) {
        setAiScenarios(json.scenarios);
        setSelectedScenarioId(json.scenarios[0].id);
        setAiResult(json.researchBrief || "Đã tạo 3 hướng bài. Chọn một hướng bên trên rồi bấm Viết bản nháp.");
      }
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
      const patch: Partial<BlogPost> = { content };
      const fields = aiPatch.fields;
      if (typeof fields?.title === "string") patch.title = fields.title.trim();
      if (typeof fields?.slug === "string") patch.slug = slugify(fields.slug);
      if (typeof fields?.excerpt === "string") patch.excerpt = fields.excerpt.trim();
      if (typeof fields?.metaTitle === "string") patch.metaTitle = fields.metaTitle.trim();
      if (typeof fields?.metaDescription === "string") patch.metaDescription = fields.metaDescription.trim();
      if (typeof fields?.category === "string") patch.category = fields.category.trim();
      if (Array.isArray(fields?.tags)) patch.tags = fields.tags.map((tag) => String(tag).trim()).filter(Boolean);
      updatePost(patch);
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
            <button onClick={() => savePost("draft")} disabled={saving} className={btnSecondary}>{saving ? "Đang lưu..." : "Lưu nháp"}</button>
            <button onClick={() => savePost("published")} disabled={saving} className={btnPrimary}>{saving ? "Đang đăng..." : "Đăng bài"}</button>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-white/[0.06] md:grid-cols-5">
          {[
            ["write", "Soạn thảo"],
            ["preview", "Preview"],
            ["seo", "SEO"],
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
            <div className="p-4 sm:p-6 space-y-4">
              <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f0f14]">
                <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-600 text-xs font-black text-white">TN</div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">Tùng Nguyễn</p>
                    <p className="text-[11px] text-zinc-500">{editPost.status === "published" ? "Đang ở chế độ công khai" : "Đang ở chế độ nháp"} · {analysis.wordCount} từ</p>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <input
                    className="w-full border-0 bg-transparent text-xl font-black leading-tight text-white placeholder-zinc-600 outline-none"
                    value={editPost.title}
                    onChange={(event) => {
                      const title = event.target.value;
                      const shouldAutoSlug = !originalSlug && (!editPost.slug || editPost.slug === slugify(editPost.title));
                      updatePost({ title, slug: shouldAutoSlug ? slugify(title) : editPost.slug });
                    }}
                    placeholder="Tiêu đề bài viết..."
                  />
                  <textarea
                    id="blog-content"
                    className="min-h-[460px] w-full resize-none border-0 bg-transparent text-[15px] leading-7 text-zinc-100 placeholder-zinc-600 outline-none"
                    value={editPost.content}
                    onChange={(event) => updatePost({ content: event.target.value })}
                    placeholder={"Bạn muốn chia sẻ điều gì?\n\nCó thể viết Markdown: ## tiêu đề, **đậm**, - danh sách, link..."}
                  />
                </div>

                <div className="border-t border-white/[0.06] px-4 py-3">
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {[
                      ["B", "**", "**", "đậm"],
                      ["I", "*", "*", "nghiêng"],
                      ["H2", "\n## ", "", "Tiêu đề lớn"],
                      ["H3", "\n### ", "", "Tiêu đề nhỏ"],
                      ["Quote", "\n> ", "", "Trích dẫn"],
                      ["List", "\n- ", "", "mục"],
                      ["Link", "[", "](https://)", "liên kết"],
                      ["Code", "\n```\n", "\n```\n", "code"],
                    ].map(([label, before, after, fallback]) => (
                      <button key={label} type="button" onClick={() => insertMarkdown(before, after, fallback)} className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-2.5 py-1.5 text-xs font-bold text-zinc-400 transition-all hover:bg-white/[0.08] hover:text-white">
                        {label}
                      </button>
                    ))}
                    <label className="cursor-pointer rounded-lg border border-white/[0.06] bg-white/[0.04] px-2.5 py-1.5 text-xs font-bold text-zinc-400 transition-all hover:bg-white/[0.08] hover:text-white">
                      Ảnh
                      <input type="file" accept="image/*" className="hidden" onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) uploadImage(file, "content");
                      }} />
                    </label>
                  </div>

                  <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] md:items-center">
                    <input className={inputCls + " py-2.5"} value={editPost.category || ""} onChange={(event) => updatePost({ category: event.target.value })} placeholder="Danh mục" />
                    <input className={inputCls + " py-2.5"} value={editPost.tags.join(", ")} onChange={(event) => updatePost({ tags: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="Tags: AI, Review, Setup..." />
                    <label className={btnSecondary + " cursor-pointer text-center"}>
                      Cover
                      <input type="file" accept="image/*" className="hidden" onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) uploadImage(file, "cover");
                      }} />
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
                    <button type="button" onClick={() => runAi("research_plan")} disabled={aiLoading} className="rounded-full bg-indigo-500/15 px-3 py-1.5 text-xs font-bold text-indigo-100 transition-all hover:bg-indigo-500/25 disabled:opacity-50">AI lên hướng</button>
                    <button type="button" onClick={() => runAi("longform_from_plan")} disabled={aiLoading} className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-100 transition-all hover:bg-emerald-500/25 disabled:opacity-50">AI viết bài</button>
                    <button type="button" onClick={() => runAi("seo_pack")} disabled={aiLoading} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-zinc-300 transition-all hover:bg-white/[0.1] disabled:opacity-50">Tối ưu SEO</button>
                  </div>
                </div>
              </section>

              {editPost.cover ? (
                <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={editPost.cover} alt="" className="h-44 w-full object-cover" />
                </div>
              ) : null}

              <details className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <summary className="cursor-pointer text-sm font-bold text-white">Thông tin nâng cao</summary>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>Slug</label>
                    <input className={inputCls} value={editPost.slug} onChange={(event) => updatePost({ slug: slugify(event.target.value) })} placeholder="duong-dan-bai-viet" />
                  </div>
                  <div>
                    <label className={labelCls}>Ảnh bìa URL</label>
                    <input className={inputCls} value={editPost.cover} onChange={(event) => updatePost({ cover: event.target.value })} placeholder="/uploads/cover.png hoặc https://..." />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>Excerpt</label>
                    <textarea className={textareaCls} rows={3} value={editPost.excerpt || ""} onChange={(event) => updatePost({ excerpt: event.target.value })} placeholder="Một đoạn mô tả ngắn dùng cho feed, SEO và social share." />
                  </div>
                </div>
              </details>

              <details className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <summary className="cursor-pointer text-sm font-bold text-white">Sản phẩm đính kèm {(editPost.products || []).length ? `(${(editPost.products || []).length})` : ""}</summary>
                <div className="mt-4 space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <p className="text-xs leading-5 text-zinc-500">Dùng cho bài review/quảng cáo mềm. AI chỉ được nhắc tới sản phẩm bạn đã nhập ở đây.</p>
                    <button type="button" onClick={addProduct} className={btnSecondary + " text-xs"}>+ Thêm sản phẩm</button>
                  </div>

                  <div>
                    <label className={labelCls}>Góc bán hàng của bài</label>
                    <textarea
                      className={textareaCls}
                      rows={2}
                      value={editPost.productAngle || ""}
                      onChange={(event) => updatePost({ productAngle: event.target.value })}
                      placeholder="VD: bài chia sẻ kinh nghiệm setup, sản phẩm chỉ xuất hiện như gợi ý tự nhiên ở cuối bài."
                    />
                  </div>

                  {(editPost.products || []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/[0.08] p-4 text-center text-xs text-zinc-500">
                      Chưa gắn sản phẩm nào.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(editPost.products || []).map((product, index) => (
                        <div key={product.id || index} className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-zinc-300">Sản phẩm {index + 1}</p>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => insertProductMention(product)} className="rounded-lg bg-indigo-500/15 px-2.5 py-1.5 text-[11px] font-bold text-indigo-100">Chèn</button>
                              <button type="button" onClick={() => removeProduct(index)} className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-[11px] font-bold text-red-300">Xoá</button>
                            </div>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <input className={inputCls} value={product.name} onChange={(event) => updateProduct(index, { name: event.target.value })} placeholder="Tên sản phẩm" />
                            <input className={inputCls} value={product.price} onChange={(event) => updateProduct(index, { price: event.target.value })} placeholder="Giá / ưu đãi" />
                            <input className={inputCls} value={product.href} onChange={(event) => updateProduct(index, { href: event.target.value })} placeholder="Link mua / link chi tiết" />
                            <input className={inputCls} value={product.image} onChange={(event) => updateProduct(index, { image: event.target.value })} placeholder="Ảnh sản phẩm" />
                          </div>
                          <textarea className={textareaCls + " mt-3"} rows={2} value={product.description} onChange={(event) => updateProduct(index, { description: event.target.value })} placeholder="Mô tả ngắn, lợi ích chính, đối tượng phù hợp..." />
                          <input className={inputCls + " mt-3"} value={product.cta} onChange={(event) => updateProduct(index, { cta: event.target.value })} placeholder="CTA: Xem sản phẩm, Mua ngay..." />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </details>
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
              {(editPost.products || []).length > 0 ? (
                <section className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                  <p className="mb-3 text-xs font-black uppercase tracking-wider text-indigo-300">Sản phẩm trong bài</p>
                  {editPost.productAngle ? <p className="mb-4 text-xs leading-5 text-zinc-500">{editPost.productAngle}</p> : null}
                  <div className="grid gap-3 md:grid-cols-2">
                    {(editPost.products || []).map((product, index) => (
                      <a key={product.id || index} href={product.href || "#"} target={product.href ? "_blank" : undefined} rel="noreferrer" className="grid gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-3 text-left transition-all hover:bg-white/[0.05]">
                        {product.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.image} alt="" className="h-28 w-full rounded-lg object-cover" />
                        ) : null}
                        <div>
                          <p className="text-sm font-bold text-white">{product.name || "Sản phẩm"}</p>
                          {product.description ? <p className="mt-1 text-xs leading-5 text-zinc-500">{product.description}</p> : null}
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <strong className="text-xs text-emerald-300">{product.price || "Liên hệ"}</strong>
                            <span className="text-xs font-bold text-indigo-200">{product.cta || "Xem sản phẩm"}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
              ) : null}
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
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">AI viết cùng bài</h3>
                    <p className="mt-1 text-[11px] leading-4 text-zinc-500">Chọn đoạn trong Markdown nếu muốn sửa đúng một đoạn.</p>
                  </div>
                  <span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${storedApiKey ? "bg-emerald-500/10 text-emerald-300" : "bg-zinc-500/10 text-zinc-500"}`}>
                    {storedApiKey ? "xAI ready" : "Chưa có key"}
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-3">
                  <div className="mb-3 grid grid-cols-3 gap-2">
                    {[
                      ["1", "Ý tưởng"],
                      ["2", "Chọn hướng"],
                      ["3", "Viết bài"],
                    ].map(([step, label]) => {
                      const active = aiFlowStep >= Number(step);
                      return (
                        <div key={step} className={`rounded-lg border px-2 py-2 text-center ${active ? "border-indigo-300/40 bg-indigo-400/15 text-white" : "border-white/[0.06] bg-black/20 text-zinc-500"}`}>
                          <span className="block text-[10px] font-black">{step}</span>
                          <span className="block truncate text-[10px] font-bold">{label}</span>
                        </div>
                      );
                    })}
                  </div>

                  <label className={labelCls}>Ý tưởng bài viết</label>
                  <textarea className={textareaCls} rows={4} value={aiInstruction} onChange={(event) => setAiInstruction(event.target.value)} placeholder="Nhập tiêu đề, chủ đề, mục tiêu bài viết, sản phẩm muốn nhắc tới..." />

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <select className={inputCls} value={aiTone} onChange={(event) => setAiTone(event.target.value)} aria-label="Giọng văn">
                      {AI_TONES.map((tone) => <option key={tone} value={tone}>{tone}</option>)}
                    </select>
                    <select className={inputCls} value={aiDiction} onChange={(event) => setAiDiction(event.target.value)} aria-label="Ngôn từ">
                      {AI_DICTIONS.map((diction) => <option key={diction} value={diction}>{diction}</option>)}
                    </select>
                    <select className={inputCls} value={aiTargetWords} onChange={(event) => setAiTargetWords(Number(event.target.value))} aria-label="Độ dài">
                      {AI_TARGET_WORDS.map((count) => <option key={count} value={count}>{count.toLocaleString("vi-VN")} từ</option>)}
                    </select>
                    <label className="flex min-h-12 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-bold text-zinc-300">
                      <input type="checkbox" checked={aiResearchEnabled} onChange={(event) => setAiResearchEnabled(event.target.checked)} />
                      Tra nguồn web
                    </label>
                  </div>
                  <input className={inputCls + " mt-3"} value={aiAudience} onChange={(event) => setAiAudience(event.target.value)} placeholder="Độc giả mục tiêu" />

                  <button
                    type="button"
                    onClick={() => runAi("research_plan")}
                    disabled={aiLoading}
                    className="mt-3 w-full rounded-xl bg-indigo-500 px-3 py-3 text-left text-sm font-bold text-white transition-all hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {aiLoading && aiIntent === "research_plan" ? "Đang nghiên cứu và dựng hướng..." : "Tạo 3 hướng bài để duyệt"}
                  </button>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-white">Hướng bài</p>
                    {selectedScenario ? <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-200">Đã chọn</span> : null}
                  </div>
                  {aiScenarios.length > 0 ? (
                    <div className="space-y-2">
                      {aiScenarios.map((scenario, index) => (
                        <button
                          key={scenario.id}
                          type="button"
                          onClick={() => setSelectedScenarioId(scenario.id)}
                          className={`w-full rounded-xl border p-3 text-left transition-all ${selectedScenario?.id === scenario.id ? "border-indigo-300/60 bg-indigo-400/15" : "border-white/[0.06] bg-black/20 hover:bg-white/[0.05]"}`}
                        >
                          <span className="text-[10px] font-black uppercase text-indigo-200">Hướng {index + 1}</span>
                          <strong className="mt-1 block text-xs text-white">{scenario.title}</strong>
                          {scenario.angle ? <span className="mt-1 block text-[11px] leading-4 text-zinc-400">{scenario.angle}</span> : null}
                          {scenario.readerPromise ? <span className="mt-2 block text-[11px] leading-4 text-emerald-200">{scenario.readerPromise}</span> : null}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/[0.08] p-4 text-center text-xs text-zinc-500">Chưa có hướng bài.</div>
                  )}
                </div>

                <div className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-3">
                  <p className="text-xs font-bold text-emerald-100">Bản nháp</p>
                  <div className="mt-3 grid gap-2">
                    <button
                      type="button"
                      onClick={() => runAi("longform_from_plan")}
                      disabled={aiLoading}
                      className="rounded-xl bg-emerald-500 px-3 py-3 text-left text-sm font-bold text-white transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {aiLoading && aiIntent === "longform_from_plan" ? `Đang viết ${aiTargetWords.toLocaleString("vi-VN")} từ...` : `Viết bài hoàn chỉnh ${aiTargetWords.toLocaleString("vi-VN")} từ`}
                    </button>
                    <button
                      type="button"
                      onClick={() => runAi("draft_from_plan")}
                      disabled={aiLoading || !selectedScenario}
                      className="rounded-xl border border-white/[0.08] bg-white/[0.06] px-3 py-2 text-left text-xs font-bold text-zinc-100 transition-all hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {aiLoading && aiIntent === "draft_from_plan" ? "Đang viết nháp ngắn..." : "Viết nháp ngắn"}
                    </button>
                  </div>
                </div>

                <details className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                  <summary className="cursor-pointer text-xs font-bold text-zinc-300">Cài đặt AI</summary>
                  <div className="mt-3 space-y-3">
                    <input className={inputCls} type={showApiKey ? "text" : "password"} value={apiKeyDraft} onChange={(event) => setApiKeyDraft(event.target.value.trim())} placeholder="xai-..." autoComplete="off" />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={saveStoredApiKey} className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-[11px] font-bold text-amber-100">Lưu/Đổi key</button>
                      <button type="button" onClick={() => setShowApiKey((value) => !value)} className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-zinc-300">{showApiKey ? "Ẩn" : "Hiện"}</button>
                      {storedApiKey ? <button type="button" onClick={deleteStoredApiKey} className="rounded-lg bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-300">Xoá</button> : null}
                    </div>
                    <textarea className={textareaCls} rows={4} value={aiMemory} onChange={(event) => updateAiMemory(event.target.value)} placeholder="Phong cách mặc định của bạn..." />
                  </div>
                </details>

                <details className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                  <summary className="cursor-pointer text-xs font-bold text-zinc-300">Công cụ sửa nhanh</summary>
                  <div className="mt-3 grid gap-2">
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
                </details>

                {aiAssistantNote || aiWarnings.length > 0 || aiResearchBrief || aiCitations.length > 0 || aiResult ? (
                  <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                    {aiAssistantNote ? <p className="text-xs font-semibold leading-5 text-indigo-100">{aiAssistantNote}</p> : null}
                    {aiResearchBrief ? (
                      <div className="mt-2 rounded-lg border border-emerald-400/10 bg-emerald-500/5 p-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200">Research brief</p>
                        <p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-zinc-300">{aiResearchBrief}</p>
                      </div>
                    ) : null}
                    {aiWarnings.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {aiWarnings.map((warning) => (
                          <p key={warning} className="text-[11px] leading-4 text-amber-200">• {warning}</p>
                        ))}
                      </div>
                    ) : null}
                    {aiCitations.length > 0 ? (
                      <details className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.03] p-2">
                        <summary className="cursor-pointer text-[11px] font-bold text-zinc-300">Nguồn Grok đã tra ({aiCitations.length})</summary>
                        <div className="mt-2 space-y-1">
                          {aiCitations.map((citation) => (
                            <a key={citation} href={citation} target="_blank" rel="noreferrer" className="block truncate text-[11px] text-indigo-200 hover:text-indigo-100">
                              {citation}
                            </a>
                          ))}
                        </div>
                      </details>
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
