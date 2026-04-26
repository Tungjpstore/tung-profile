"use client";
import { useEffect, useRef, useState } from "react";

function useInView(threshold = 0.2) {
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

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView(0.5);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function AboutSection() {
  const { ref, inView } = useInView();

  return (
    <section id="about" className="relative py-32 overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-blue-600/5 blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6" ref={ref}>
        {/* Section Header */}
        <div className={`text-center mb-20 transition-all duration-1000 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-4">
            About Me
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight gradient-text mb-4">
            Get to Know Me
          </h2>
          <p className="text-zinc-500 max-w-xl mx-auto">
            A passionate developer who turns coffee into code and ideas into reality
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Image */}
          <div className={`relative transition-all duration-1000 delay-200 ${inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"}`}>
            <div className="relative">
              {/* Decorative frame */}
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-xl" />
              <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-blue-500/20 to-purple-500/20" />
              <div className="relative rounded-3xl overflow-hidden bg-zinc-900 border border-white/5">
                <img
                  src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=700&fit=crop"
                  alt="Working"
                  className="w-full h-[450px] object-cover opacity-80 hover:opacity-100 transition-opacity duration-500"
                />
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent" />

                {/* Floating badge */}
                <div className="absolute bottom-6 left-6 right-6 glass rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">3+ Years Experience</p>
                    <p className="text-xs text-zinc-400">Building digital products</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Content */}
          <div className={`space-y-8 transition-all duration-1000 delay-400 ${inView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"}`}>
            <div className="space-y-6">
              <h3 className="text-2xl font-bold">
                Passionate about creating{" "}
                <span className="gradient-text-blue">world-class</span> digital experiences
              </h3>
              <p className="text-zinc-400 leading-relaxed">
                I&apos;m Tùng Nguyễn, a full-stack developer and freelancer based in Vietnam.
                I specialize in building modern web applications with clean code and beautiful interfaces.
                With expertise in React, Next.js, and AI technologies, I deliver solutions that exceed expectations.
              </p>
              <p className="text-zinc-400 leading-relaxed">
                When I&apos;m not coding, you&apos;ll find me exploring new technologies,
                contributing to open-source, or sharing knowledge with the developer community.
                I believe in continuous learning and pushing the boundaries of what&apos;s possible on the web.
              </p>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Name", value: "Tùng Nguyễn" },
                { label: "Location", value: "Vietnam 🇻🇳" },
                { label: "Experience", value: "3+ Years" },
                { label: "Availability", value: "Freelance" },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">{item.label}</p>
                  <p className="text-sm font-semibold text-zinc-200">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: 50, suffix: "+", label: "Projects Done" },
                { value: 30, suffix: "+", label: "Happy Clients" },
                { value: 99, suffix: "%", label: "Satisfaction" },
              ].map((stat, i) => (
                <div key={i} className="text-center p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-2xl font-black gradient-text-blue">
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Download CV */}
            <a
              href="#"
              className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-semibold text-zinc-300 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-300 group"
            >
              <svg className="w-5 h-5 group-hover:animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download Resume
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
