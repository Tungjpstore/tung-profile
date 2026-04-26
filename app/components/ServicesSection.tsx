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

const services = [
  {
    title: "Website Design & Development",
    description: "Custom responsive websites built with modern frameworks. From landing pages to complex web applications, I deliver pixel-perfect results that perform flawlessly.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
      </svg>
    ),
    gradient: "from-blue-500 to-cyan-400",
    features: ["React / Next.js", "Responsive Design", "SEO Optimized", "Fast Loading"],
  },
  {
    title: "Mobile App Development",
    description: "Cross-platform mobile applications using React Native and modern frameworks. Beautiful, fast, and user-friendly apps for iOS and Android.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
    gradient: "from-purple-500 to-pink-400",
    features: ["React Native", "Cross-Platform", "Native Feel", "Offline Ready"],
  },
  {
    title: "AI & Automation Solutions",
    description: "Intelligent automation powered by AI. From chatbots to data analysis pipelines, I build smart solutions that save time and boost efficiency.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    gradient: "from-amber-500 to-orange-400",
    features: ["ChatGPT / OpenAI", "Data Analytics", "Workflow Automation", "Custom AI"],
  },
  {
    title: "Digital Services & Consulting",
    description: "Comprehensive digital solutions including e-commerce setup, payment integration, hosting, domain management, and technical consulting.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    gradient: "from-emerald-500 to-teal-400",
    features: ["E-commerce", "Payments", "Cloud Hosting", "Tech Consulting"],
  },
];

export default function ServicesSection() {
  const { ref, inView } = useInView();

  return (
    <section id="services" className="relative py-32 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-blue-600/3 blur-[200px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6" ref={ref}>
        {/* Section Header */}
        <div className={`text-center mb-20 transition-all duration-1000 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">
            Services
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight gradient-text mb-4">
            What I Offer
          </h2>
          <p className="text-zinc-500 max-w-xl mx-auto">
            End-to-end digital solutions tailored to your needs
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {services.map((service, i) => (
            <div
              key={i}
              className="group relative rounded-3xl bg-white/[0.02] border border-white/5 p-8 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500 cursor-pointer overflow-hidden"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(30px)",
                transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${i * 150}ms`,
              }}
            >
              {/* Hover gradient */}
              <div className={`absolute -inset-px rounded-3xl bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

              <div className="relative z-10">
                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {service.icon}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold mb-3 text-white group-hover:gradient-text-blue transition-colors">
                  {service.title}
                </h3>

                {/* Description */}
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                  {service.description}
                </p>

                {/* Features */}
                <div className="flex flex-wrap gap-2">
                  {service.features.map((f, j) => (
                    <span key={j} className="px-3 py-1 rounded-full bg-white/5 text-xs font-medium text-zinc-400 border border-white/5">
                      {f}
                    </span>
                  ))}
                </div>

                {/* Arrow */}
                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-zinc-500 group-hover:text-white transition-colors">
                  Learn More
                  <svg className="w-4 h-4 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
