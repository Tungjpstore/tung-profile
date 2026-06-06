"use client";

import React from "react";

export interface HistoryItem {
  id: string;
  title: string;
  type: string;
  value: string;
  inputData: Record<string, string | number | undefined>;
  config: {
    fgColor: string;
    bgColor: string;
    gradient: boolean;
    gradientColor: string;
    gradientType: "vertical" | "horizontal" | "diagonal";
    dotStyle: "square" | "rounded" | "circular";
    eyeStyle: "square" | "rounded" | "circle";
    logoSrc?: string;
    logoSize: number;
    errorCorrectionLevel: "L" | "M" | "Q" | "H";
  };
  date: string;
}

interface QRHistoryProps {
  items: HistoryItem[];
  onLoadItem: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  url: "Trang web",
  text: "Văn bản",
  wifi: "Mạng Wifi",
  vcard: "Danh bạ vCard",
  vietqr: "VietQR Chuyển khoản",
  phone: "Điện thoại",
  sms: "Gửi SMS",
  email: "Gửi Email",
};

const TYPE_EMOJIS: Record<string, string> = {
  url: "🔗",
  text: "📝",
  wifi: "📶",
  vcard: "📇",
  vietqr: "💵",
  phone: "📞",
  sms: "💬",
  email: "✉️",
};

export default function QRHistory({
  items,
  onLoadItem,
  onDeleteItem,
  onClearAll,
}: QRHistoryProps) {
  if (items.length === 0) {
    return (
      <div className="w-full text-center py-12 text-[var(--text-dim)] text-xs border border-dashed rounded-2xl bg-black/5" style={{ borderColor: "var(--border)" }}>
        <span className="text-3xl mb-3.5 block filter drop-shadow-[0_0_8px_rgba(255,255,255,0.05)]">📜</span>
        Lịch sử trống. Hãy tạo mã QR để lưu lại ở đây.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: "var(--border)" }}>
        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
          Đã lưu ({items.length})
        </span>
        <button
          onClick={onClearAll}
          className="text-[10px] font-black uppercase tracking-wider text-red-400 hover:text-red-300 transition-colors"
        >
          Xóa tất cả
        </button>
      </div>

      <div className="grid gap-2.5 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex items-center justify-between p-3 rounded-xl border transition-all text-left bg-white/[0.02] hover:bg-white/[0.04]"
            style={{ borderColor: "var(--border)" }}
          >
            <button
              onClick={() => onLoadItem(item)}
              className="flex-1 flex items-start gap-3 min-w-0"
            >
              <span className="text-lg p-2 rounded-xl bg-black/40 border flex-shrink-0 flex items-center justify-center aspect-square" style={{ borderColor: "var(--border)" }}>
                {TYPE_EMOJIS[item.type] || "🎯"}
              </span>
              <div className="min-w-0 text-left">
                <h4 className="text-xs font-bold truncate text-[var(--text)] leading-tight">
                  {item.title || "Không có tiêu đề"}
                </h4>
                <p className="text-[10px] text-[var(--text-muted)] mt-1 font-semibold">
                  {TYPE_LABELS[item.type] || item.type}
                </p>
                <p className="text-[9px] text-[var(--text-dim)] mt-0.5 truncate font-mono max-w-full">
                  {item.value}
                </p>
              </div>
            </button>

            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              <span className="text-[9px] text-[var(--text-dim)] hidden sm:inline font-mono">
                {new Date(item.date).toLocaleDateString("vi-VN", {
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteItem(item.id);
                }}
                className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-red-400 hover:bg-red-950/20 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100"
                title="Xóa"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
