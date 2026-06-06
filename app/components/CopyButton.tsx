"use client";

import { useState } from "react";

interface CopyButtonProps {
  textToCopy: string;
  className?: string;
  label?: string;
  copiedLabel?: string;
}

export default function CopyButton({
  textToCopy,
  className = "",
  label = "Sao chép",
  copiedLabel = "Đã sao chép",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Ignored
    }
  };

  return (
    <button className={className} onClick={handleCopy} type="button">
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
        <path d="M8 8h10v12H8z M6 16H4V4h10v2" />
      </svg>
      {copied ? copiedLabel : label}
    </button>
  );
}
