"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef, ReactNode } from "react";
import BlogStudio from "./BlogStudio";

/* ── TYPES ── */
interface InfoItem { icon: string; label: string; value: string; green?: boolean }
interface Project { name: string; desc: string; tech: string[]; status: string; image?: string; href?: string }
interface Service { icon: string; name: string; desc: string; price: string; image?: string; href?: string }
interface Social { name: string; href: string }
interface Payment { bankName: string; accountNumber: string; accountHolder: string; qrImage: string }
interface ProfileSaveResponse {
  success?: boolean;
  data?: ProfileData;
  error?: string;
  warning?: string;
  storage?: { mode?: string; persistent?: boolean; warning?: string };
}
interface ProfileData {
  name: string; tagline: string; avatar: string; cover?: string; birthYear?: number; relationship?: string; hometown?: string; hobbies?: string[];
  bio: string[]; skills: string[];
  info: InfoItem[]; projects: Project[];
  services: Service[]; socials: Social[];
  payment: Payment;
  theme?: { accent: string; mode: string };
  template?: string;
  translations?: { en?: { tagline?: string; bio?: string[] } };
}

/* ── UI HELPERS ── */
const inputCls = "w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all";
const textareaCls = `${inputCls} resize-none`;
const btnPrimary = "px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all";
const btnSecondary = "px-5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-zinc-300 hover:bg-white/[0.1] text-sm font-medium transition-all";
const btnDanger = "px-3 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-all";
const labelCls = "block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <h2 className="text-sm font-bold text-white">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl modal-panel ${type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
      {type === "success" ? "✅" : "❌"} {message}
    </div>
  );
}

/* ── IMAGE UPLOAD COMPONENT ── */
function ImageUpload({ currentUrl, onUploaded }: { currentUrl: string; onUploaded: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const shownPreview = preview || currentUrl;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url) { onUploaded(json.url); setPreview(json.url); }
    } catch { /* ignore */ }
    setUploading(false);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white/[0.05] border border-white/[0.08] flex-shrink-0">
        {shownPreview && <Image src={shownPreview} alt="" fill sizes="80px" className="object-cover" />}
        {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>}
      </div>
      <div>
        <button onClick={() => fileRef.current?.click()} className={btnSecondary} disabled={uploading}>
          {uploading ? "Đang tải..." : "📷 Chọn ảnh"}
        </button>
        <p className="text-[11px] text-zinc-600 mt-1.5">JPG, PNG, WebP — Tối đa 5MB</p>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  );
}

/* ── ADMIN PAGE ── */
interface Msg { id: string; name: string; email: string; phone: string; message: string; read: boolean; createdAt: string }
interface BlogPost {
  slug: string; title: string; cover: string; content: string; tags: string[]; status: string; createdAt: string; updatedAt?: string;
  excerpt?: string; category?: string; metaTitle?: string; metaDescription?: string; canonicalUrl?: string; scheduledAt?: string; readingMinutes?: number;
}

export default function AdminPage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [tab, setTab] = useState<"general" | "info" | "about" | "projects" | "services" | "socials" | "payment" | "messages" | "theme" | "stats" | "blog">("general");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [stats, setStats] = useState<{ totalViews: number; totalClicks: number; totalEvents: number; mobile: number; desktop: number; dates: [string,number][]; topClicks: [string,number][] } | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [editPost, setEditPost] = useState<BlogPost | null>(null);

  // Load data
  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(d => { setData(d); setLoading(false); });
    fetch("/api/contact").then(r => r.json()).then(setMessages).catch(() => {});
    fetch("/api/analytics?days=30").then(r => r.json()).then(setStats).catch(() => {});
    fetch("/api/posts?all=true").then(r => r.json()).then(setPosts).catch(() => {});
  }, []);

  // Show toast
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Save
  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = (await res.json().catch(() => ({}))) as ProfileSaveResponse;
      if (res.ok) {
        if (json.data) setData(json.data);
        showToast(json.warning || json.storage?.warning || "Đã lưu thành công!");
      } else {
        showToast(json.error || "Lưu thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối!", "error");
    }
    setSaving(false);
  };

  // Update helpers
  const set = (key: keyof ProfileData, val: unknown) => setData(d => d ? { ...d, [key]: val } : d);

  if (loading || !data) return (
    <main className="min-h-screen flex items-center justify-center bg-[#07070a]">
      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </main>
  );

  const unreadCount = messages.filter(m => !m.read).length;

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  const markRead = async (id: string) => {
    await fetch("/api/contact", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, read: true }) });
    setMessages(msgs => msgs.map(m => m.id === id ? { ...m, read: true } : m));
  };

  const deleteMsg = async (id: string) => {
    await fetch("/api/contact", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setMessages(msgs => msgs.filter(m => m.id !== id));
  };

  const tabs = [
    { id: "general" as const, label: "Tổng quan", icon: "⚙️" },
    { id: "info" as const, label: "Thông tin", icon: "👤" },
    { id: "about" as const, label: "Giới thiệu", icon: "💬" },
    { id: "projects" as const, label: "Dự án", icon: "📁" },
    { id: "services" as const, label: "Dịch vụ", icon: "✨" },
    { id: "socials" as const, label: "Mạng xã hội", icon: "🔗" },
    { id: "payment" as const, label: "Thanh toán", icon: "💳" },
    { id: "theme" as const, label: "Giao diện", icon: "🎨" },
    { id: "blog" as const, label: "Bài viết", icon: "📝" },
    { id: "stats" as const, label: "Thống kê", icon: "📊" },
    { id: "messages" as const, label: `Tin nhắn${unreadCount ? ` (${unreadCount})` : ""}`, icon: "📩" },
  ];

  return (
    <main className="min-h-screen bg-[#07070a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#07070a]/80 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold">TN</Link>
            <div><p className="text-sm font-bold">Quản trị</p><p className="text-[11px] text-zinc-500">Chỉnh sửa trang cá nhân</p></div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" target="_blank" className={btnSecondary + " text-xs"}>👁 Xem trang</a>
            <button onClick={save} disabled={saving} className={btnPrimary + " flex items-center gap-2"}>
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "💾"}
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
            <button onClick={logout} className="px-3 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-all">🚪</button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar */}
        <nav className="w-52 flex-shrink-0 hidden md:block">
          <div className="sticky top-24 space-y-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2.5 ${tab === t.id ? "bg-white/[0.08] text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"}`}>
                <span className="text-base">{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Mobile tabs */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#07070a]/90 backdrop-blur-2xl border-t border-white/[0.06] px-2 py-2 flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all ${tab === t.id ? "bg-white/[0.1] text-white" : "text-zinc-500"}`}>
              {t.icon}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-6 pb-20 md:pb-0">

          {/* TAB: General */}
          {tab === "general" && (
            <>
              <Card title="Ảnh đại diện">
                <ImageUpload currentUrl={data.avatar} onUploaded={(url) => set("avatar", url)} />
              </Card>
              <Card title="Ảnh bìa hồ sơ">
                <ImageUpload currentUrl={data.cover || ""} onUploaded={(url) => set("cover", url)} />
              </Card>
              <Card title="Thông tin chung">
                <div className="space-y-4">
                  <div><label className={labelCls}>Tên hiển thị</label><input className={inputCls} value={data.name} onChange={e => set("name", e.target.value)} /></div>
                  <div><label className={labelCls}>Tagline</label><input className={inputCls} value={data.tagline} onChange={e => set("tagline", e.target.value)} /></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div><label className={labelCls}>Năm sinh</label><input className={inputCls} value={data.birthYear || ""} onChange={e => set("birthYear", Number(e.target.value) || undefined)} placeholder="1999" /></div>
                    <div><label className={labelCls}>Quê quán</label><input className={inputCls} value={data.hometown || ""} onChange={e => set("hometown", e.target.value)} placeholder="Việt Nam" /></div>
                    <div><label className={labelCls}>Mối quan hệ</label><input className={inputCls} value={data.relationship || ""} onChange={e => set("relationship", e.target.value)} placeholder="Đang cập nhật" /></div>
                  </div>
                  <div><label className={labelCls}>Sở thích (phẩy cách)</label><input className={inputCls} value={(data.hobbies || []).join(", ")} onChange={e => set("hobbies", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} placeholder="Công nghệ, AI, Thiết kế" /></div>
                </div>
              </Card>
            </>
          )}

          {/* TAB: Info */}
          {tab === "info" && (
            <Card title="Thông tin cá nhân">
              <div className="space-y-4">
                {data.info.map((item, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-3">
                    <div className="flex gap-3">
                      <div className="w-20"><label className={labelCls}>Icon</label><input className={inputCls} value={item.icon} onChange={e => { const n = [...data.info]; n[i] = { ...n[i], icon: e.target.value }; set("info", n); }} /></div>
                      <div className="flex-1"><label className={labelCls}>Nhãn</label><input className={inputCls} value={item.label} onChange={e => { const n = [...data.info]; n[i] = { ...n[i], label: e.target.value }; set("info", n); }} /></div>
                      <div className="flex-1"><label className={labelCls}>Giá trị</label><input className={inputCls} value={item.value} onChange={e => { const n = [...data.info]; n[i] = { ...n[i], value: e.target.value }; set("info", n); }} /></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                        <input type="checkbox" checked={item.green || false} onChange={e => { const n = [...data.info]; n[i] = { ...n[i], green: e.target.checked }; set("info", n); }} className="accent-emerald-500" />
                        Đánh dấu xanh
                      </label>
                      <button onClick={() => { const n = data.info.filter((_, j) => j !== i); set("info", n); }} className={btnDanger + " text-xs"}>🗑 Xoá</button>
                    </div>
                  </div>
                ))}
                <button onClick={() => set("info", [...data.info, { icon: "📌", label: "Mới", value: "", green: false }])} className={btnSecondary + " w-full"}>+ Thêm mục</button>
              </div>
            </Card>
          )}

          {/* TAB: About */}
          {tab === "about" && (
            <>
              <Card title="Giới thiệu bản thân">
                <div className="space-y-3">
                  {data.bio.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <textarea className={textareaCls} rows={3} value={p} onChange={e => { const n = [...data.bio]; n[i] = e.target.value; set("bio", n); }} />
                      <button onClick={() => set("bio", data.bio.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 px-2 flex-shrink-0">🗑</button>
                    </div>
                  ))}
                  <button onClick={() => set("bio", [...data.bio, ""])} className={btnSecondary + " w-full"}>+ Thêm đoạn</button>
                </div>
              </Card>
              <Card title="Kỹ năng">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {data.skills.map((s, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/[0.08] border border-indigo-500/[0.12] text-xs font-medium text-indigo-300">
                        {s}
                        <button onClick={() => set("skills", data.skills.filter((_, j) => j !== i))} className="text-indigo-400 hover:text-white">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input id="newSkill" className={inputCls} placeholder="Thêm kỹ năng..." onKeyDown={e => {
                      if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value.trim(); if (v) { set("skills", [...data.skills, v]); (e.target as HTMLInputElement).value = ""; } }
                    }} />
                  </div>
                  <p className="text-[11px] text-zinc-600">Nhấn Enter để thêm</p>
                </div>
              </Card>
            </>
          )}

          {/* TAB: Projects */}
          {tab === "projects" && (
            <Card title="Dự án">
              <div className="space-y-4">
                {data.projects.map((p, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelCls}>Tên dự án</label><input className={inputCls} value={p.name} onChange={e => { const n = [...data.projects]; n[i] = { ...n[i], name: e.target.value }; set("projects", n); }} /></div>
                      <div><label className={labelCls}>Trạng thái</label>
                        <select className={inputCls} value={p.status} onChange={e => { const n = [...data.projects]; n[i] = { ...n[i], status: e.target.value }; set("projects", n); }}>
                          <option value="Hoàn thành">Hoàn thành</option><option value="Đang phát triển">Đang phát triển</option>
                        </select>
                      </div>
                    </div>
                    <div><label className={labelCls}>Mô tả</label><textarea className={textareaCls} rows={2} value={p.desc} onChange={e => { const n = [...data.projects]; n[i] = { ...n[i], desc: e.target.value }; set("projects", n); }} /></div>
                    <div><label className={labelCls}>Công nghệ (phẩy cách)</label><input className={inputCls} value={p.tech.join(", ")} onChange={e => { const n = [...data.projects]; n[i] = { ...n[i], tech: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }; set("projects", n); }} /></div>
                    <div><label className={labelCls}>Liên kết dự án</label><input className={inputCls} value={p.href || ""} onChange={e => { const n = [...data.projects]; n[i] = { ...n[i], href: e.target.value }; set("projects", n); }} placeholder="https://..." /></div>
                    <div>
                      <label className={labelCls}>Ảnh dự án</label>
                      <ImageUpload currentUrl={p.image || ""} onUploaded={(url) => { const n = [...data.projects]; n[i] = { ...n[i], image: url }; set("projects", n); }} />
                    </div>
                    <div className="text-right"><button onClick={() => set("projects", data.projects.filter((_, j) => j !== i))} className={btnDanger + " text-xs"}>🗑 Xoá dự án</button></div>
                  </div>
                ))}
                <button onClick={() => set("projects", [...data.projects, { name: "", desc: "", tech: [], status: "Đang phát triển", image: "", href: "" }])} className={btnSecondary + " w-full"}>+ Thêm dự án</button>
              </div>
            </Card>
          )}

          {/* TAB: Services */}
          {tab === "services" && (
            <Card title="Dịch vụ">
              <div className="space-y-4">
                {data.services.map((s, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-1"><label className={labelCls}>Icon</label><input className={inputCls} value={s.icon} onChange={e => { const n = [...data.services]; n[i] = { ...n[i], icon: e.target.value }; set("services", n); }} /></div>
                      <div className="col-span-2"><label className={labelCls}>Tên</label><input className={inputCls} value={s.name} onChange={e => { const n = [...data.services]; n[i] = { ...n[i], name: e.target.value }; set("services", n); }} /></div>
                    </div>
                    <div><label className={labelCls}>Mô tả</label><textarea className={textareaCls} rows={2} value={s.desc} onChange={e => { const n = [...data.services]; n[i] = { ...n[i], desc: e.target.value }; set("services", n); }} /></div>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1"><label className={labelCls}>Giá</label><input className={inputCls} value={s.price} onChange={e => { const n = [...data.services]; n[i] = { ...n[i], price: e.target.value }; set("services", n); }} /></div>
                      <button onClick={() => set("services", data.services.filter((_, j) => j !== i))} className={btnDanger}>🗑</button>
                    </div>
                    <div><label className={labelCls}>Liên kết dịch vụ</label><input className={inputCls} value={s.href || ""} onChange={e => { const n = [...data.services]; n[i] = { ...n[i], href: e.target.value }; set("services", n); }} placeholder="https://..." /></div>
                    <div>
                      <label className={labelCls}>Ảnh dịch vụ</label>
                      <ImageUpload currentUrl={s.image || ""} onUploaded={(url) => { const n = [...data.services]; n[i] = { ...n[i], image: url }; set("services", n); }} />
                    </div>
                  </div>
                ))}
                <button onClick={() => set("services", [...data.services, { icon: "📦", name: "", desc: "", price: "", image: "", href: "" }])} className={btnSecondary + " w-full"}>+ Thêm dịch vụ</button>
              </div>
            </Card>
          )}

          {/* TAB: Socials */}
          {tab === "socials" && (
            <Card title="Mạng xã hội">
              <div className="space-y-3">
                {data.socials.map((s, i) => (
                  <div key={i} className="flex gap-3 items-end">
                    <div className="w-32"><label className={labelCls}>Tên</label>
                      <select className={inputCls} value={s.name} onChange={e => { const n = [...data.socials]; n[i] = { ...n[i], name: e.target.value }; set("socials", n); }}>
                        {["Facebook", "Zalo", "GitHub", "Email", "Instagram", "TikTok", "YouTube", "LinkedIn"].map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="flex-1"><label className={labelCls}>Liên kết</label><input className={inputCls} value={s.href} onChange={e => { const n = [...data.socials]; n[i] = { ...n[i], href: e.target.value }; set("socials", n); }} /></div>
                    <button onClick={() => set("socials", data.socials.filter((_, j) => j !== i))} className={btnDanger}>🗑</button>
                  </div>
                ))}
                <button onClick={() => set("socials", [...data.socials, { name: "Facebook", href: "" }])} className={btnSecondary + " w-full"}>+ Thêm mạng xã hội</button>
              </div>
            </Card>
          )}

          {/* TAB: Payment */}
          {tab === "payment" && (
            <>
              <Card title="Thông tin thanh toán">
                <div className="space-y-4">
                  <div><label className={labelCls}>Tên ngân hàng</label><input className={inputCls} value={data.payment.bankName} onChange={e => set("payment", { ...data.payment, bankName: e.target.value })} /></div>
                  <div><label className={labelCls}>Số tài khoản</label><input className={inputCls} value={data.payment.accountNumber} onChange={e => set("payment", { ...data.payment, accountNumber: e.target.value })} /></div>
                  <div><label className={labelCls}>Chủ tài khoản</label><input className={inputCls} value={data.payment.accountHolder} onChange={e => set("payment", { ...data.payment, accountHolder: e.target.value })} /></div>
                </div>
              </Card>
              <Card title="Ảnh QR Code">
                <div className="space-y-4">
                  <ImageUpload currentUrl={data.payment.qrImage} onUploaded={(url) => set("payment", { ...data.payment, qrImage: url })} />
                  <div><label className={labelCls}>Hoặc nhập URL</label><input className={inputCls} value={data.payment.qrImage} onChange={e => set("payment", { ...data.payment, qrImage: e.target.value })} placeholder="https://..." /></div>
                </div>
              </Card>
            </>
          )}

          {/* TAB: Theme */}
          {tab === "theme" && (
            <>
              <Card title="Màu chủ đạo">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { id: "indigo", label: "Indigo", color: "#818cf8" },
                    { id: "blue", label: "Blue", color: "#60a5fa" },
                    { id: "purple", label: "Purple", color: "#a78bfa" },
                    { id: "rose", label: "Rose", color: "#fb7185" },
                    { id: "emerald", label: "Emerald", color: "#34d399" },
                    { id: "amber", label: "Amber", color: "#fbbf24" },
                    { id: "cyan", label: "Cyan", color: "#22d3ee" },
                  ].map(c => (
                    <button key={c.id} onClick={() => set("theme", { ...data.theme, accent: c.id })}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                        data.theme?.accent === c.id ? "border-white/20 bg-white/[0.06]" : "border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}>
                      <div className="w-8 h-8 rounded-full" style={{ background: c.color }} />
                      <span className="text-[11px] font-medium text-zinc-400">{c.label}</span>
                    </button>
                  ))}
                </div>
              </Card>
              <Card title="Chế độ hiển thị">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "dark", label: "Tối", icon: "🌙" },
                    { id: "light", label: "Sáng", icon: "☀️" },
                  ].map(m => (
                    <button key={m.id} onClick={() => set("theme", { ...data.theme, mode: m.id })}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                        data.theme?.mode === m.id ? "border-white/20 bg-white/[0.06]" : "border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}>
                      <span className="text-xl">{m.icon}</span>
                      <span className="text-sm font-medium text-zinc-300">{m.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-zinc-600 mt-3">Người dùng vẫn có thể chuyển đổi bằng nút trên trang chính.</p>
              </Card>
              <Card title="Template / Bố cục">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "card", label: "Card", desc: "Profile card + popup", icon: "🃏" },
                    { id: "scroll", label: "Scroll", desc: "Một trang cuộn dọc", icon: "📜" },
                  ].map(t => (
                    <button key={t.id} onClick={() => set("template", t.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        data.template === t.id || (!data.template && t.id === "card") ? "border-white/20 bg-white/[0.06]" : "border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}>
                      <span className="text-xl">{t.icon}</span>
                      <p className="text-sm font-semibold text-white mt-2">{t.label}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </Card>
              <Card title="🌍 Bản dịch tiếng Anh">
                <div className="space-y-4">
                  <div><label className={labelCls}>Tagline (EN)</label><input className={inputCls} value={data.translations?.en?.tagline || ""} onChange={e => set("translations", { ...data.translations, en: { ...data.translations?.en, tagline: e.target.value } })} placeholder="Developer • Freelancer" /></div>
                  <div><label className={labelCls}>Bio (EN) — mỗi đoạn 1 dòng</label>
                    {(data.translations?.en?.bio || [""]).map((p: string, i: number) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <textarea className={textareaCls} rows={2} value={p} onChange={e => {
                          const b = [...(data.translations?.en?.bio || [""])];
                          b[i] = e.target.value;
                          set("translations", { ...data.translations, en: { ...data.translations?.en, bio: b } });
                        }} />
                        <button onClick={() => { const b = (data.translations?.en?.bio || []).filter((_: string, j: number) => j !== i); set("translations", { ...data.translations, en: { ...data.translations?.en, bio: b } }); }} className="text-red-400 px-2">🗑</button>
                      </div>
                    ))}
                    <button onClick={() => { const b = [...(data.translations?.en?.bio || []), ""]; set("translations", { ...data.translations, en: { ...data.translations?.en, bio: b } }); }} className={btnSecondary + " w-full text-xs"}>+ Thêm đoạn</button>
                  </div>
                </div>
              </Card>
            </>
          )}
          {/* TAB: Stats */}
          {tab === "stats" && (
            <>
              {!stats ? (
                <div className="text-center py-12"><div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" /></div>
              ) : (
                <>
                  {/* Stat cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Lượt xem", value: stats.totalViews, icon: "👁" },
                      { label: "Lượt click", value: stats.totalClicks, icon: "👆" },
                      { label: "Mobile", value: stats.mobile, icon: "📱" },
                      { label: "Desktop", value: stats.desktop, icon: "💻" },
                    ].map((s, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
                        <span className="text-xl">{s.icon}</span>
                        <p className="text-2xl font-bold text-white mt-1">{s.value}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Chart */}
                  <Card title="Lượt truy cập 30 ngày qua">
                    {stats.dates.length === 0 ? (
                      <p className="text-sm text-zinc-500 text-center py-4">Chưa có dữ liệu</p>
                    ) : (
                      <div className="flex items-end gap-1 h-32">
                        {(() => {
                          const max = Math.max(...stats.dates.map(d => d[1]), 1);
                          return stats.dates.slice(-14).map(([date, count], i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-[9px] text-zinc-500">{count}</span>
                              <div className="w-full rounded-t-md transition-all" style={{ height: `${(count / max) * 100}%`, minHeight: 4, background: "var(--accent)" }} />
                              <span className="text-[8px] text-zinc-600">{date.slice(5)}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </Card>

                  {/* Top clicks */}
                  <Card title="Top clicks">
                    {stats.topClicks.length === 0 ? (
                      <p className="text-sm text-zinc-500 text-center py-4">Chưa có dữ liệu</p>
                    ) : (
                      <div className="space-y-2">
                        {stats.topClicks.map(([label, count], i) => {
                          const max = stats.topClicks[0][1];
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-xs text-zinc-500 w-4 text-right">{i + 1}</span>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-zinc-300">{label}</span>
                                  <span className="text-xs text-zinc-500">{count}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-white/[0.04]">
                                  <div className="h-full rounded-full transition-all" style={{ width: `${(count / max) * 100}%`, background: "var(--accent)" }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                </>
              )}
            </>
          )}

          {/* TAB: Blog */}
          {tab === "blog" && (
            <BlogStudio posts={posts} setPosts={setPosts} editPost={editPost} setEditPost={setEditPost} showToast={showToast} />
          )}

          {/* TAB: Messages */}
          {tab === "messages" && (
            <Card title={`Tin nhắn (${messages.length})`}>
              {messages.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-8">Chưa có tin nhắn nào</p>
              ) : (
                <div className="space-y-3">
                  {messages.map(m => (
                    <div key={m.id} className={`p-4 rounded-xl border transition-colors ${m.read ? "bg-white/[0.01] border-white/[0.03]" : "bg-indigo-500/[0.03] border-indigo-500/[0.08]"}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{m.name} {!m.read && <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-400">Mới</span>}</p>
                          <p className="text-xs text-zinc-500">{m.email}{m.phone ? ` • ${m.phone}` : ""}</p>
                        </div>
                        <span className="text-[10px] text-zinc-600 flex-shrink-0">{new Date(m.createdAt).toLocaleDateString("vi-VN")}</span>
                      </div>
                      <p className="text-sm text-zinc-400 leading-relaxed mb-3">{m.message}</p>
                      <div className="flex gap-2">
                        {!m.read && <button onClick={() => markRead(m.id)} className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.05] text-zinc-300 hover:bg-white/[0.1] transition-colors">✓ Đã đọc</button>}
                        <button onClick={() => deleteMsg(m.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">🗑 Xoá</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.msg} type={toast.type} />}
    </main>
  );
}
