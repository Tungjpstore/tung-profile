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

const experiences = [
  {
    period: "2024 — Present",
    title: "Senior Freelance Developer",
    company: "Self-Employed",
    description: "Leading end-to-end development of web and mobile applications for international clients. Specializing in AI-powered solutions and modern web architectures.",
    tags: ["React", "Next.js", "AI", "Leadership"],
  },
  {
    period: "2023 — 2024",
    title: "Full-Stack Developer",
    company: "Tech Startup",
    description: "Built and shipped 3 major SaaS products from ground up. Led frontend architecture decisions and mentored junior developers.",
    tags: ["TypeScript", "Node.js", "PostgreSQL"],
  },
  {
    period: "2022 — 2023",
    title: "Frontend Developer",
    company: "Digital Agency",
    description: "Developed responsive web applications for 20+ clients. Implemented design systems and improved performance by 40%.",
    tags: ["React", "Tailwind", "Figma"],
  },
  {
    period: "2021 — 2022",
    title: "Junior Developer",
    company: "Freelance",
    description: "Started my development journey building websites and learning modern web technologies. Completed 15+ projects in the first year.",
    tags: ["HTML/CSS", "JavaScript", "WordPress"],
  },
];

export default function ExperienceSection() {
  const { ref, inView } = useInView();

  return (
    <section className="relative py-32 overflow-hidden">
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6" ref={ref}>
        {/* Header */}
        <div className={`text-center mb-20 transition-all duration-1000 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">
            Experience
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight gradient-text mb-4">
            My Journey
          </h2>
          <p className="text-zinc-500 max-w-xl mx-auto">
            A timeline of my professional growth and achievements
          </p>
        </div>

        {/* Timeline */}
        <div className="max-w-3xl mx-auto">
          <div className="timeline-line space-y-12 pl-12">
            {experiences.map((exp, i) => (
              <div
                key={i}
                className="relative group"
                style={{
                  opacity: inView ? 1 : 0,
                  transform: inView ? "translateX(0)" : "translateX(-30px)",
                  transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${i * 200}ms`,
                }}
              >
                {/* Dot */}
                <div className="absolute -left-12 top-1 w-10 h-10 rounded-full bg-[#030303] border-2 border-white/10 flex items-center justify-center group-hover:border-white/30 transition-colors duration-300">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 group-hover:scale-125 transition-transform duration-300" />
                </div>

                {/* Card */}
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{exp.period}</span>
                  <h3 className="text-lg font-bold mt-2 text-white">{exp.title}</h3>
                  <p className="text-sm text-blue-400 font-medium mb-3">{exp.company}</p>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">{exp.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {exp.tags.map((tag, j) => (
                      <span key={j} className="px-3 py-1 rounded-full bg-white/5 text-xs font-medium text-zinc-400 border border-white/5">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
