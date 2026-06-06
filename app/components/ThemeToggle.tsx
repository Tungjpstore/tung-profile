"use client";

import { useEffect, useState } from "react";

interface ThemeToggleProps {
  initialMode?: string;
  initialAccent?: string;
}

export default function ThemeToggle({ initialMode = "dark", initialAccent = "cyan" }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(initialMode === "dark");

  useEffect(() => {
    const savedMode = localStorage.getItem("theme-mode") || initialMode;
    const accent = initialAccent || "cyan";

    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setIsDark(savedMode === "dark");
    document.documentElement.classList.toggle("light", savedMode !== "dark");
    document.documentElement.setAttribute("data-accent", accent);
  }, [initialMode, initialAccent]);

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    setIsDark(!isDark);
    document.documentElement.classList.toggle("light", next === "light");
    localStorage.setItem("theme-mode", next);
  };

  return (
    <button
      className="icon-button"
      onClick={toggleTheme}
      aria-label={isDark ? "Bật giao diện sáng" : "Bật giao diện tối"}
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {isDark ? (
          // Sun Icon path
          <path d="M12 4V2 M12 22v-2 M4.93 4.93 3.52 3.52 M20.48 20.48l-1.41-1.41 M4 12H2 M22 12h-2 M4.93 19.07l-1.41 1.41 M20.48 3.52l-1.41 1.41 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
        ) : (
          // Moon Icon path
          <path d="M21 13a8 8 0 1 1-10-10 7 7 0 0 0 10 10z" />
        )}
      </svg>
    </button>
  );
}
