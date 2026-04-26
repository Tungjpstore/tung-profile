"use client";
import { ReactNode } from "react";

interface Props {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  className?: string;
  delay?: number;
}

export default function CardTrigger({ icon, title, subtitle, onClick, className = "", delay = 0 }: Props) {
  return (
    <button
      onClick={onClick}
      className={`card-trigger group text-left w-full rounded-2xl p-6 sm:p-8 animate-fade-up ${className}`}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        animationDelay: `${delay}ms`,
        minHeight: "140px",
      }}
    >
      <div className="flex items-start justify-between mb-auto">
        <div className="card-icon w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5" style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-border)" }}>{icon}</div>
        <svg className="card-arrow w-5 h-5" style={{ color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
        </svg>
      </div>
      <h3 className="text-base font-bold mb-1.5">{title}</h3>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>
    </button>
  );
}
