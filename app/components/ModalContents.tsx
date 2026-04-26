"use client";
import Image from "next/image";
import { useState } from "react";
import TurnstileWidget from "./TurnstileWidget";

interface ProfileData {
  name: string; tagline: string; avatar: string; bio: string[]; skills: string[];
  info: { icon: string; label: string; value: string; green?: boolean }[];
  projects: { name: string; desc: string; tech: string[]; status: string }[];
  services: { icon: string; name: string; desc: string; price: string }[];
  socials: { name: string; href: string }[];
  payment: { bankName: string; accountNumber: string; accountHolder: string; qrImage: string };
  theme?: { accent: string; mode: string }; template?: string;
  translations?: { en?: { tagline?: string; bio?: string[] } };
}

function genCaptcha() { const a = Math.floor(Math.random() * 10) + 1; const b = Math.floor(Math.random() * 10) + 1; return { q: `${a} + ${b} = ?`, a: a + b }; }

export function ProjectsContent({ data }: { data: ProfileData }) {
  return (
    <div className="grid gap-3">
      {data.projects.map((p, i) => (
        <div key={i} className="modal-content-card">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-sm font-bold">{p.name}</h3>
            <span className={`status-chip ${p.status === "Hoàn thành" ? "done" : "progress"}`}>{p.status}</span>
          </div>
          <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>{p.desc}</p>
          <div className="tag-row">{p.tech.map((t, j) => <span key={j}>{t}</span>)}</div>
        </div>
      ))}
    </div>
  );
}

export function ServicesContent({ data }: { data: ProfileData }) {
  return (
    <div className="space-y-3">
      {data.services.map((s, i) => (
        <div key={i} className="modal-content-card flex gap-4">
          <span className="text-xl" aria-hidden="true">{s.icon}</span>
          <div className="flex-1">
            <h3 className="text-sm font-bold mb-1">{s.name}</h3>
            <p className="text-sm mb-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{s.desc}</p>
            <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>{s.price}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function InfoContent({ data }: { data: ProfileData }) {
  return (
    <div className="space-y-3">
      {data.info.map((item, i) => (
        <div key={i} className="modal-content-card flex items-center gap-3">
          <span className="text-lg" aria-hidden="true">{item.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{item.label}</p>
            <p className={`text-sm font-semibold truncate ${item.green ? "text-emerald-400" : ""}`}>{item.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PaymentContent({ data, isEn = false }: { data: ProfileData; isEn?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(data.payment.accountNumber); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="text-center space-y-5">
      <div className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold" style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-border)", borderRadius: 8 }}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
        {isEn ? "Scan QR or bank transfer" : "Quét QR hoặc chuyển khoản"}
      </div>
      {data.payment.qrImage && (
        <div className="qr-container inline-block p-3 bg-white shadow-2xl">
          <Image src={data.payment.qrImage} alt="QR Payment" width={176} height={176} className="w-44" />
        </div>
      )}
      <div className="space-y-3 modal-content-card text-left">
        <div><p className="text-xs font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>{isEn ? "Bank" : "Ngân hàng"}</p><p className="text-sm font-bold">{data.payment.bankName}</p></div>
        <div className="h-px" style={{ background: "var(--border)" }} />
        <div><p className="text-xs font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>{isEn ? "Account number" : "Số tài khoản"}</p>
          <button onClick={copy} className={`text-sm font-bold flex flex-wrap items-center gap-2 hover:opacity-70 transition-all ${copied ? "copy-success" : ""}`}>
            {data.payment.accountNumber} <span className="text-xs px-2 py-0.5" style={{ background: "var(--accent-dim)", color: "var(--accent)", borderRadius: 6 }}>{copied ? (isEn ? "Copied" : "Đã sao chép") : (isEn ? "Copy" : "Sao chép")}</span>
          </button>
        </div>
        <div className="h-px" style={{ background: "var(--border)" }} />
        <div><p className="text-xs font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>{isEn ? "Account holder" : "Chủ tài khoản"}</p><p className="text-sm font-bold">{data.payment.accountHolder}</p></div>
      </div>
    </div>
  );
}

export function ContactContent({ isEn, onSent }: { isEn: boolean; onSent: () => void }) {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "", captcha: "", turnstileToken: "" });
  const [captcha] = useState(genCaptcha);
  const [status, setStatus] = useState<"idle"|"sending"|"sent"|"error">("idle");
  const inputCls = "w-full px-4 py-3 text-sm placeholder-zinc-500 focus:outline-none transition-all bg-[var(--bg-input)] border border-[var(--border)] focus:border-[var(--accent)]";

  if (status === "sent") return (
    <div className="text-center py-8 space-y-3"><div className="success-mark">✓</div><p className="text-sm font-semibold">{isEn ? "Message sent!" : "Đã gửi thành công!"}</p><p className="text-xs" style={{ color: "var(--text-secondary)" }}>{isEn ? "I'll reply soon." : "Mình sẽ phản hồi sớm nhất."}</p></div>
  );

  return (
    <form onSubmit={async (e) => { e.preventDefault(); if (!turnstileSiteKey && parseInt(form.captcha) !== captcha.a) { setStatus("error"); return; } if (turnstileSiteKey && !form.turnstileToken) { setStatus("error"); return; } setStatus("sending"); try { const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, captcha: !turnstileSiteKey }) }); if (res.ok) { setStatus("sent"); onSent(); } else setStatus("error"); } catch { setStatus("error"); } }} className="contact-form">
      <input className={inputCls} style={{ borderRadius: 8 }} placeholder={isEn ? "Your name *" : "Tên của bạn *"} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input className={inputCls} style={{ borderRadius: 8 }} placeholder="Email *" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <input className={inputCls} style={{ borderRadius: 8 }} placeholder={isEn ? "Phone" : "Số điện thoại"} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
      </div>
      <textarea className={inputCls + " resize-none"} style={{ borderRadius: 8 }} rows={4} placeholder={isEn ? "Your message *" : "Nội dung tin nhắn *"} required value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
      {turnstileSiteKey ? (
        <TurnstileWidget action="contact" siteKey={turnstileSiteKey} onToken={(token) => setForm((current) => ({ ...current, turnstileToken: token }))} />
      ) : (
        <div className="grid grid-cols-[auto_1fr] items-center gap-3">
          <span className="text-sm font-mono font-medium whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{captcha.q}</span>
          <input className={inputCls} style={{ borderRadius: 8 }} placeholder={isEn ? "Answer" : "Trả lời"} required value={form.captcha} onChange={e => setForm({ ...form, captcha: e.target.value })} />
        </div>
      )}
      {status === "error" && <p className="text-xs text-red-400">{isEn ? "Failed or wrong captcha." : "Gửi thất bại hoặc captcha sai."}</p>}
      <button type="submit" disabled={status === "sending"} className="w-full py-3.5 text-sm font-semibold transition-all disabled:opacity-50 text-white" style={{ background: "var(--accent)", borderRadius: 8 }}>
        {status === "sending" ? (isEn ? "Sending..." : "Đang gửi...") : (isEn ? "Send Message" : "Gửi tin nhắn")}
      </button>
    </form>
  );
}
