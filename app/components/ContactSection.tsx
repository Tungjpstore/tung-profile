"use client";
import { useEffect, useRef, useState } from "react";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

export default function ContactSection() {
  const { ref, inView } = useInView();
  const [formState, setFormState] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      setFormState({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setSent(false), 4000);
    }, 1500);
  };

  const contactInfo = [
    {
      label: "Email",
      value: "your@email.com",
      href: "mailto:your@email.com",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      ),
    },
    {
      label: "Location",
      value: "Vietnam 🇻🇳",
      href: "#",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      ),
    },
    {
      label: "Social",
      value: "Facebook / Zalo",
      href: "https://facebook.com",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      ),
    },
  ];

  const inputClass =
    "w-full px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/5 text-white placeholder-zinc-600 text-sm font-medium focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all duration-300";

  return (
    <section id="contact" className="relative py-32 overflow-hidden">
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] rounded-full bg-rose-600/5 blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6" ref={ref}>
        {/* Header */}
        <div className={`text-center mb-20 transition-all duration-1000 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <span className="inline-block px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-widest mb-4">
            Contact
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight gradient-text mb-4">
            Let&apos;s Work Together
          </h2>
          <p className="text-zinc-500 max-w-xl mx-auto">
            Have a project in mind? I&apos;d love to hear about it. Let&apos;s create something amazing.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-12">
          {/* Left - Info */}
          <div className={`lg:col-span-2 space-y-8 transition-all duration-1000 delay-200 ${inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"}`}>
            <div className="space-y-6">
              {contactInfo.map((info, i) => (
                <a
                  key={i}
                  href={info.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:bg-white/10 transition-all duration-300">
                    {info.icon}
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{info.label}</p>
                    <p className="text-sm font-semibold text-zinc-300 group-hover:text-white transition-colors">{info.value}</p>
                  </div>
                </a>
              ))}
            </div>

            {/* Quick Payment */}
            <div className="rounded-3xl bg-white/[0.02] border border-white/5 p-6 text-center">
              <p className="text-sm font-semibold text-zinc-400 mb-4 flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
                Quick Payment
              </p>
              <div className="inline-block p-2 bg-white rounded-2xl shadow-2xl">
                <img
                  src="https://img.vietqr.io/image/970422-123456789-compact.png"
                  alt="VietQR Payment"
                  className="w-40 rounded-xl"
                />
              </div>
              <p className="text-xs text-zinc-600 mt-3">Scan to pay via VietQR</p>
            </div>
          </div>

          {/* Right - Form */}
          <div className={`lg:col-span-3 transition-all duration-1000 delay-400 ${inView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"}`}>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  className={inputClass}
                  required
                />
                <input
                  type="email"
                  placeholder="Your Email"
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>
              <input
                type="text"
                placeholder="Subject"
                value={formState.subject}
                onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                className={inputClass}
                required
              />
              <textarea
                placeholder="Tell me about your project..."
                value={formState.message}
                onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                rows={6}
                className={`${inputClass} resize-none`}
                required
              />
              <button
                type="submit"
                disabled={sending}
                className="w-full py-4 rounded-2xl bg-white text-black font-bold text-sm hover:bg-zinc-200 transition-all duration-300 shadow-lg shadow-white/10 hover:shadow-white/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Sending...
                  </>
                ) : sent ? (
                  <>
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Message Sent!
                  </>
                ) : (
                  <>
                    Send Message
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
