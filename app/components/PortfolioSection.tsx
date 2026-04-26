"use client";
import { useEffect, useRef, useState } from "react";

function useInView(threshold = 0.1) {
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

const categories = ["All", "Web App", "Mobile", "AI", "Design"];

const projects = [
  {
    title: "E-Commerce Platform",
    category: "Web App",
    description: "Full-stack e-commerce solution with real-time inventory, Stripe payments, and admin dashboard.",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop",
    tags: ["Next.js", "Stripe", "PostgreSQL"],
    link: "#",
  },
  {
    title: "AI Content Generator",
    category: "AI",
    description: "GPT-powered content creation tool with template system and team collaboration features.",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop",
    tags: ["OpenAI", "React", "Node.js"],
    link: "#",
  },
  {
    title: "Fitness Tracker App",
    category: "Mobile",
    description: "Cross-platform fitness app with workout tracking, nutrition logging, and progress analytics.",
    image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&h=400&fit=crop",
    tags: ["React Native", "Firebase", "Charts"],
    link: "#",
  },
  {
    title: "SaaS Dashboard",
    category: "Web App",
    description: "Analytics dashboard with real-time data visualization, user management, and reporting tools.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop",
    tags: ["React", "D3.js", "WebSocket"],
    link: "#",
  },
  {
    title: "Brand Identity System",
    category: "Design",
    description: "Complete brand identity including logo, color system, typography, and design guidelines.",
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=400&fit=crop",
    tags: ["Figma", "Branding", "UI/UX"],
    link: "#",
  },
  {
    title: "Smart Chatbot Platform",
    category: "AI",
    description: "Multi-language AI chatbot with intent recognition, sentiment analysis, and CRM integration.",
    image: "https://images.unsplash.com/photo-1531746790095-e6970aca4e2a?w=600&h=400&fit=crop",
    tags: ["Python", "NLP", "React"],
    link: "#",
  },
];

export default function PortfolioSection() {
  const { ref, inView } = useInView();
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered = activeFilter === "All"
    ? projects
    : projects.filter((p) => p.category === activeFilter);

  return (
    <section id="portfolio" className="relative py-32 overflow-hidden">
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full bg-cyan-600/5 blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6" ref={ref}>
        {/* Header */}
        <div className={`text-center mb-16 transition-all duration-1000 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <span className="inline-block px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-4">
            Portfolio
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight gradient-text mb-4">
            Featured Work
          </h2>
          <p className="text-zinc-500 max-w-xl mx-auto">
            A selection of projects that showcase my expertise and creativity
          </p>
        </div>

        {/* Filters */}
        <div className={`flex justify-center gap-2 mb-12 flex-wrap transition-all duration-1000 delay-200 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeFilter === cat
                  ? "bg-white text-black shadow-lg shadow-white/10"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/5"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((project, i) => (
            <a
              key={project.title}
              href={project.link}
              className="group relative rounded-3xl overflow-hidden bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all duration-500 cursor-pointer card-hover"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(30px)",
                transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${i * 100}ms`,
              }}
            >
              {/* Image */}
              <div className="relative h-52 overflow-hidden">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent" />

                {/* Category badge */}
                <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-xs font-medium text-zinc-300">
                  {project.category}
                </div>

                {/* View icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-lg font-bold mb-2 group-hover:text-white transition-colors">
                  {project.title}
                </h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-4">
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag, j) => (
                    <span key={j} className="px-2.5 py-1 rounded-lg bg-white/5 text-[11px] font-medium text-zinc-400 border border-white/5">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
