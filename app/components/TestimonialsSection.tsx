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

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "CEO, TechStart",
    avatar: "https://i.pravatar.cc/100?img=1",
    content: "Tùng delivered an exceptional e-commerce platform that exceeded all our expectations. His attention to detail and technical expertise are truly world-class. Revenue increased 200% within 3 months of launch.",
    rating: 5,
  },
  {
    name: "Michael Chen",
    role: "Product Manager, DataFlow",
    avatar: "https://i.pravatar.cc/100?img=3",
    content: "Working with Tùng was a game-changer for our startup. He built our entire AI dashboard from scratch and it's been performing flawlessly. Incredible speed and quality.",
    rating: 5,
  },
  {
    name: "Emily Davis",
    role: "Founder, DesignLab",
    avatar: "https://i.pravatar.cc/100?img=5",
    content: "The mobile app Tùng developed for us is stunning. Users love the smooth animations and intuitive design. He truly understands how to create premium digital experiences.",
    rating: 5,
  },
  {
    name: "David Park",
    role: "CTO, CloudNine",
    avatar: "https://i.pravatar.cc/100?img=8",
    content: "Tùng's technical skills are outstanding. He integrated complex AI features seamlessly and the codebase is incredibly clean. Would recommend him to any team looking for top talent.",
    rating: 5,
  },
];

export default function TestimonialsSection() {
  const { ref, inView } = useInView();
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="testimonials" className="relative py-32 overflow-hidden">
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-amber-600/5 blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6" ref={ref}>
        {/* Header */}
        <div className={`text-center mb-20 transition-all duration-1000 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest mb-4">
            Testimonials
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight gradient-text mb-4">
            Client Love
          </h2>
          <p className="text-zinc-500 max-w-xl mx-auto">
            What people say about working with me
          </p>
        </div>

        {/* Testimonials */}
        <div className={`max-w-3xl mx-auto transition-all duration-1000 delay-200 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {/* Main card */}
          <div className="relative rounded-3xl bg-white/[0.03] border border-white/5 p-10 md:p-14 mb-8">
            {/* Quote mark */}
            <div className="absolute top-8 left-10 text-6xl text-white/5 font-serif leading-none">&ldquo;</div>

            <div className="relative z-10">
              {/* Stars */}
              <div className="flex gap-1 mb-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Content with transition */}
              <div className="relative min-h-[100px]">
                {testimonials.map((t, i) => (
                  <p
                    key={i}
                    className={`text-lg md:text-xl text-zinc-300 leading-relaxed italic absolute inset-0 transition-all duration-700 ${
                      i === active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
                    }`}
                  >
                    {t.content}
                  </p>
                ))}
              </div>

              {/* Author */}
              <div className="flex items-center gap-4 mt-8">
                <div className="relative">
                  {testimonials.map((t, i) => (
                    <img
                      key={i}
                      src={t.avatar}
                      alt={t.name}
                      className={`w-14 h-14 rounded-full border-2 border-white/10 object-cover transition-all duration-500 ${
                        i === active ? "opacity-100 scale-100" : "opacity-0 scale-75 absolute inset-0"
                      }`}
                    />
                  ))}
                </div>
                <div>
                  {testimonials.map((t, i) => (
                    <div
                      key={i}
                      className={`transition-all duration-500 ${
                        i === active ? "opacity-100" : "opacity-0 absolute"
                      }`}
                    >
                      <p className="font-bold text-white">{t.name}</p>
                      <p className="text-sm text-zinc-500">{t.role}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === active ? "w-8 bg-white" : "w-2 bg-white/20 hover:bg-white/40"
                }`}
                aria-label={`Testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
