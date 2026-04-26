"use client";
import { useState, useEffect, useCallback } from "react";

/* ─── Typing effect hook ─── */
function useTypingEffect(words: string[], typingSpeed = 80, deletingSpeed = 50, pauseTime = 2000) {
  const [text, setText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[wordIndex];
    let timeout: NodeJS.Timeout;

    if (!isDeleting && text === currentWord) {
      timeout = setTimeout(() => setIsDeleting(true), pauseTime);
    } else if (isDeleting && text === "") {
      setIsDeleting(false);
      setWordIndex((prev) => (prev + 1) % words.length);
    } else {
      timeout = setTimeout(
        () => {
          setText(
            isDeleting
              ? currentWord.substring(0, text.length - 1)
              : currentWord.substring(0, text.length + 1)
          );
        },
        isDeleting ? deletingSpeed : typingSpeed
      );
    }
    return () => clearTimeout(timeout);
  }, [text, wordIndex, isDeleting, words, typingSpeed, deletingSpeed, pauseTime]);

  return text;
}

/* ─── Floating particles ─── */
function FloatingParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 10,
    opacity: Math.random() * 0.3 + 0.05,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: p.opacity,
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export default function HeroSection() {
  const typedText = useTypingEffect([
    "Full-Stack Developer",
    "UI/UX Designer",
    "AI Enthusiast",
    "Freelancer",
    "Digital Innovator",
  ]);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width - 0.5) * 20,
      y: ((e.clientY - rect.top) / rect.height - 0.5) * 20,
    });
  }, []);

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Background */}
      <div className="absolute inset-0">
        <div
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full animate-pulse-glow"
          style={{
            background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
            transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)`,
            transition: "transform 0.3s ease-out",
          }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full animate-pulse-glow"
          style={{
            background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
            animationDelay: "2s",
            transform: `translate(${mousePos.x * -0.3}px, ${mousePos.y * -0.3}px)`,
            transition: "transform 0.3s ease-out",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)",
            transform: `translate(-50%, -50%) translate(${mousePos.x * 0.2}px, ${mousePos.y * 0.2}px)`,
            transition: "transform 0.3s ease-out",
          }}
        />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <FloatingParticles />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Status badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 animate-fade-in">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-sm text-zinc-400 font-medium">Available for freelance work</span>
        </div>

        {/* Avatar with orbiting elements */}
        <div className="relative w-36 h-36 mx-auto mb-10">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-600/30 blur-2xl animate-pulse-glow" />
          <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 opacity-20 animate-spin-slow" style={{ borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%", animation: "morph 8s ease-in-out infinite, spin-slow 20s linear infinite" }} />
          <img
            src="https://i.pravatar.cc/300"
            alt="Tùng Nguyễn"
            className="relative w-36 h-36 rounded-full object-cover border-2 border-white/20 shadow-2xl z-10"
          />
          {/* Orbiting dots */}
          <div className="absolute inset-0 animate-orbit">
            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
          </div>
          <div className="absolute inset-0 animate-orbit-reverse">
            <div className="w-2 h-2 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50" />
          </div>
        </div>

        {/* Name */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 animate-slide-up">
          <span className="gradient-text">Tùng Nguyễn</span>
        </h1>

        {/* Typing effect */}
        <div className="h-10 flex items-center justify-center mb-8 animate-slide-up stagger-2">
          <span className="text-xl md:text-2xl text-zinc-400 font-light">
            I&apos;m a{" "}
          </span>
          <span className="text-xl md:text-2xl font-semibold gradient-text-blue ml-2">
            {typedText}
          </span>
          <span className="w-0.5 h-7 bg-blue-500 ml-1 animate-pulse" />
        </div>

        {/* Description */}
        <p className="text-lg text-zinc-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up stagger-3">
          Crafting beautiful digital experiences with cutting-edge technologies.
          I transform ideas into{" "}
          <span className="text-zinc-300">pixel-perfect</span>,{" "}
          <span className="text-zinc-300">high-performance</span> web applications
          that make an impact.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16 animate-slide-up stagger-4">
          <a
            href="#portfolio"
            className="group relative px-8 py-4 bg-white text-black rounded-2xl font-semibold text-sm overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:-translate-y-1"
          >
            <span className="relative z-10 flex items-center gap-2">
              View My Work
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </span>
          </a>
          <a
            href="#contact"
            className="group px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-semibold text-sm text-zinc-300 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all duration-300 hover:-translate-y-1 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            Get in Touch
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-md mx-auto animate-slide-up stagger-5">
          {[
            { value: "50+", label: "Projects" },
            { value: "30+", label: "Clients" },
            { value: "3+", label: "Years Exp." },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl md:text-4xl font-black gradient-text-blue">{stat.value}</div>
              <div className="text-xs text-zinc-500 font-medium mt-1 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce-subtle">
        <span className="text-xs text-zinc-600 font-medium tracking-widest uppercase">Scroll</span>
        <div className="w-5 h-8 rounded-full border-2 border-zinc-700 flex justify-center pt-1.5">
          <div className="w-1 h-2 rounded-full bg-zinc-500 animate-bounce" />
        </div>
      </div>
    </section>
  );
}
