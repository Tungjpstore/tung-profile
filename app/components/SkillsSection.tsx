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

const skills = [
  { name: "React / Next.js", level: 95, color: "from-cyan-400 to-blue-500", icon: "⚛️" },
  { name: "TypeScript", level: 90, color: "from-blue-400 to-indigo-500", icon: "📘" },
  { name: "Node.js", level: 88, color: "from-green-400 to-emerald-500", icon: "🟢" },
  { name: "Python / AI", level: 85, color: "from-yellow-400 to-orange-500", icon: "🐍" },
  { name: "UI/UX Design", level: 82, color: "from-pink-400 to-rose-500", icon: "🎨" },
  { name: "Database / SQL", level: 80, color: "from-purple-400 to-violet-500", icon: "🗄️" },
];

const techStack = [
  { name: "React", category: "Frontend" },
  { name: "Next.js", category: "Frontend" },
  { name: "TypeScript", category: "Language" },
  { name: "Tailwind CSS", category: "Styling" },
  { name: "Node.js", category: "Backend" },
  { name: "Python", category: "Backend" },
  { name: "PostgreSQL", category: "Database" },
  { name: "MongoDB", category: "Database" },
  { name: "Docker", category: "DevOps" },
  { name: "AWS", category: "Cloud" },
  { name: "Figma", category: "Design" },
  { name: "Git", category: "Tools" },
  { name: "GraphQL", category: "API" },
  { name: "Redis", category: "Cache" },
  { name: "OpenAI", category: "AI" },
  { name: "Vercel", category: "Deploy" },
];

export default function SkillsSection() {
  const { ref, inView } = useInView();

  return (
    <section id="skills" className="relative py-32 overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-purple-600/5 blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6" ref={ref}>
        {/* Section Header */}
        <div className={`text-center mb-20 transition-all duration-1000 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <span className="inline-block px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest mb-4">
            Skills & Expertise
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight gradient-text mb-4">
            My Tech Arsenal
          </h2>
          <p className="text-zinc-500 max-w-xl mx-auto">
            Technologies and tools I use to bring ideas to life
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16">
          {/* Left - Skill Bars */}
          <div className={`space-y-6 transition-all duration-1000 delay-200 ${inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"}`}>
            <h3 className="text-xl font-bold mb-8">Core Proficiencies</h3>
            {skills.map((skill, i) => (
              <div key={i} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{skill.icon}</span>
                    <span className="text-sm font-semibold text-zinc-300 group-hover:text-white transition-colors">
                      {skill.name}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-zinc-400">{skill.level}%</span>
                </div>
                <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${skill.color} progress-bar transition-all duration-1000 ease-out`}
                    style={{
                      width: inView ? `${skill.level}%` : "0%",
                      transitionDelay: `${i * 150 + 300}ms`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Right - Tech Grid */}
          <div className={`transition-all duration-1000 delay-400 ${inView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"}`}>
            <h3 className="text-xl font-bold mb-8">Tech Stack</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {techStack.map((tech, i) => (
                <div
                  key={i}
                  className="group relative p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] hover:border-white/15 transition-all duration-300 cursor-pointer text-center"
                  style={{
                    opacity: inView ? 1 : 0,
                    transform: inView ? "translateY(0)" : "translateY(16px)",
                    transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 50 + 500}ms`,
                  }}
                >
                  <p className="text-sm font-semibold text-zinc-300 group-hover:text-white transition-colors">
                    {tech.name}
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-1 uppercase tracking-wider font-medium">
                    {tech.category}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
