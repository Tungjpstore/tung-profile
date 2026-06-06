"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { trackEventClient } from "./AnalyticsTracker";

interface TrackableLinkProps {
  href: string;
  label: string;
  children: ReactNode;
  className?: string;
  target?: string;
  rel?: string;
  isExternal?: boolean;
}

export default function TrackableLink({
  href,
  label,
  children,
  className = "",
  target,
  rel,
  isExternal = false,
}: TrackableLinkProps) {
  const handleClick = () => {
    trackEventClient("click", label);
  };

  if (isExternal) {
    return (
      <a
        href={href}
        className={className}
        target={target || "_blank"}
        rel={rel || "noreferrer"}
        onClick={handleClick}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={handleClick} target={target} rel={rel}>
      {children}
    </Link>
  );
}
