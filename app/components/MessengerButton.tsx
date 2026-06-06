"use client";

import { ReactNode } from "react";
import { trackEventClient } from "./AnalyticsTracker";

const MESSENGER_URL = "https://m.me/vnecs";

interface MessengerButtonProps {
  children: ReactNode;
  className?: string;
  label?: string;
}

export default function MessengerButton({
  children,
  className = "",
  label = "Messenger /vnecs",
}: MessengerButtonProps) {
  const handleClick = () => {
    trackEventClient("click", label);
    window.open(MESSENGER_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <button className={className} onClick={handleClick} type="button">
      {children}
    </button>
  );
}
