"use client";
import { useEffect, ReactNode } from "react";

export default function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4" onClick={onClose} role="presentation">
      <div className="modal-overlay absolute inset-0" />
      <div
        onClick={e => e.stopPropagation()}
        className="modal-panel relative w-full sm:max-w-xl max-h-[88vh] overflow-y-auto p-5 sm:p-7"
        style={{ background: "var(--modal-bg)", border: "1px solid var(--border)", borderRadius: 8 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 id="modal-title" className="text-base font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Đóng" className="icon-button shrink-0">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
