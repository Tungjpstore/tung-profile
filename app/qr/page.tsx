"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import QRGenerator from "../components/QRGenerator";
import QRScanner from "../components/QRScanner";
import QRHistory, { HistoryItem } from "../components/QRHistory";
import { POPULAR_BANKS, generateVietQRText } from "../lib/vietqr";

const QR_TYPES = ["url", "text", "wifi", "vcard", "vietqr", "phone", "sms", "email"] as const;

type QRType = (typeof QR_TYPES)[number];
type ToolMode = "generate" | "scan";

function isQRType(value: string | null): value is QRType {
  return QR_TYPES.includes(value as QRType);
}

const inputCls = "w-full px-4 py-3 rounded-xl border text-xs placeholder-zinc-500 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 transition-all outline-none";
const selectCls = "w-full px-4 py-3 rounded-xl border text-xs focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 transition-all outline-none appearance-none cursor-pointer";
const labelCls = "text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5";

export default function QRPage() {
  const [mode, setMode] = useState<ToolMode>("generate");
  const [qrType, setQrType] = useState<QRType>("url");
  const [isDesignOpen, setIsDesignOpen] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      const requestedMode = params.get("mode");
      const requestedType = params.get("type");

      if (requestedMode === "scan" || requestedMode === "generate") setMode(requestedMode);
      if (isQRType(requestedType)) setQrType(requestedType);
      
      // Auto open design panel on desktop screens
      setIsDesignOpen(window.innerWidth >= 1024);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Input Data States
  const [url, setUrl] = useState("https://tungnguyen.dev");
  const [text, setText] = useState("");
  const [wifiSSID, setWifiSSID] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [wifiEncryption, setWifiEncryption] = useState<"WPA" | "WEP" | "nopass">("WPA");

  const [vcardFirst, setVcardFirst] = useState("");
  const [vcardLast, setVcardLast] = useState("");
  const [vcardPhone, setVcardPhone] = useState("");
  const [vcardEmail, setVcardEmail] = useState("");
  const [vcardCompany, setVcardCompany] = useState("");
  const [vcardTitle, setVcardTitle] = useState("");
  const [vcardWorkPhone, setVcardWorkPhone] = useState("");
  const [vcardUrl, setVcardUrl] = useState("");
  const [vcardNote, setVcardNote] = useState("");

  const [vietqrBank, setVietqrBank] = useState(POPULAR_BANKS[0].bin);
  const [vietqrAccount, setVietqrAccount] = useState("");
  const [vietqrHolder, setVietqrHolder] = useState("");
  const [vietqrAmount, setVietqrAmount] = useState("");
  const [vietqrMemo, setVietqrMemo] = useState("");

  const [phone, setPhone] = useState("");
  const [smsPhone, setSmsPhone] = useState("");
  const [smsMessage, setSmsMessage] = useState("");
  
  const [emailAddress, setEmailAddress] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Configuration States
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [gradient, setGradient] = useState(false);
  const [gradientColor, setGradientColor] = useState("#0088cc");
  const [gradientType, setGradientType] = useState<"vertical" | "horizontal" | "diagonal">("vertical");
  const [dotStyle, setDotStyle] = useState<"square" | "rounded" | "circular">("square");
  const [eyeStyle, setEyeStyle] = useState<"square" | "rounded" | "circle">("square");
  const [logoSrc, setLogoSrc] = useState<string | undefined>(undefined);
  const [logoSize, setLogoSize] = useState(0.15);
  const [qrSize, setQrSize] = useState(512);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load history client-side
  useEffect(() => {
    const savedHistory = window.localStorage.getItem("qr_history");
    if (savedHistory) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Active Canvas Ref
  const [activeCanvas, setActiveCanvas] = useState<HTMLCanvasElement | null>(null);

  // Sync title based on active type and main fields
  const title = (() => {
    if (qrType === "url") return url ? `URL: ${url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 24)}...` : "Mã QR URL";
    if (qrType === "text") return text ? `Văn bản: ${text.slice(0, 18)}...` : "Mã QR Văn bản";
    if (qrType === "wifi") return wifiSSID ? `Wifi: ${wifiSSID}` : "Mã QR Wifi";
    if (qrType === "vcard") return vcardFirst || vcardLast ? `Danh bạ: ${vcardFirst} ${vcardLast}` : "Mã QR vCard";
    if (qrType === "vietqr") {
      const bank = POPULAR_BANKS.find(b => b.bin === vietqrBank);
      return vietqrAccount ? `${bank?.shortName || "VietQR"}: ${vietqrAccount}` : "Mã QR VietQR";
    }
    if (qrType === "phone") return phone ? `SĐT: ${phone}` : "Mã QR Điện thoại";
    if (qrType === "sms") return smsPhone ? `SMS: ${smsPhone}` : "Mã QR SMS";
    if (qrType === "email") return emailAddress ? `Email: ${emailAddress.slice(0, 15)}...` : "Mã QR Email";
    return "Mã QR";
  })();

  // Compute raw QR string based on inputs
  const computeQRValue = (): string => {
    switch (qrType) {
      case "url":
        return url || "https://tungnguyen.dev";
      case "text":
        return text || "Tung Nguyen Developer";
      case "wifi":
        return `WIFI:S:${wifiSSID || "NetworkName"};T:${wifiEncryption};P:${wifiPassword || ""};;`;
      case "vcard":
        return `BEGIN:VCARD\nVERSION:3.0\nN:${vcardLast || ""};${vcardFirst || ""};;;\nFN:${vcardFirst || ""} ${vcardLast || ""}\nORG:${vcardCompany || ""}\nTITLE:${vcardTitle || ""}\nTEL;TYPE=CELL:${vcardPhone || ""}\nTEL;TYPE=WORK:${vcardWorkPhone || ""}\nEMAIL;TYPE=PREF,INTERNET:${vcardEmail || ""}\nURL:${vcardUrl || ""}\nNOTE:${vcardNote || ""}\nEND:VCARD`;
      case "vietqr":
        return generateVietQRText({
          bankBin: vietqrBank,
          accountNumber: vietqrAccount || "0000000000",
          amount: vietqrAmount ? Number(vietqrAmount) : undefined,
          memo: vietqrMemo || undefined,
        });
      case "phone":
        return phone ? `tel:${phone}` : "tel:";
      case "sms":
        return `SMSTO:${smsPhone || ""}:${smsMessage || ""}`;
      case "email":
        const emailParams = [];
        if (emailSubject) emailParams.push(`subject=${encodeURIComponent(emailSubject)}`);
        if (emailBody) emailParams.push(`body=${encodeURIComponent(emailBody)}`);
        const query = emailParams.length ? `?${emailParams.join("&")}` : "";
        return `mailto:${emailAddress || ""}${query}`;
      default:
        return "";
    }
  };

  const qrValue = computeQRValue();

  // Save history helper
  const saveToHistory = (customTitle?: string) => {
    const rawInputData: Record<string, string | number | undefined> = {};
    if (qrType === "url") rawInputData.url = url;
    else if (qrType === "text") rawInputData.text = text;
    else if (qrType === "wifi") {
      rawInputData.wifiSSID = wifiSSID;
      rawInputData.wifiPassword = wifiPassword;
      rawInputData.wifiEncryption = wifiEncryption;
    } else if (qrType === "vcard") {
      rawInputData.vcardFirst = vcardFirst;
      rawInputData.vcardLast = vcardLast;
      rawInputData.vcardPhone = vcardPhone;
      rawInputData.vcardEmail = vcardEmail;
      rawInputData.vcardCompany = vcardCompany;
      rawInputData.vcardTitle = vcardTitle;
      rawInputData.vcardWorkPhone = vcardWorkPhone;
      rawInputData.vcardUrl = vcardUrl;
      rawInputData.vcardNote = vcardNote;
    } else if (qrType === "vietqr") {
      rawInputData.vietqrBank = vietqrBank;
      rawInputData.vietqrAccount = vietqrAccount;
      rawInputData.vietqrHolder = vietqrHolder;
      rawInputData.vietqrAmount = vietqrAmount;
      rawInputData.vietqrMemo = vietqrMemo;
    } else if (qrType === "phone") rawInputData.phone = phone;
    else if (qrType === "sms") {
      rawInputData.smsPhone = smsPhone;
      rawInputData.smsMessage = smsMessage;
    } else if (qrType === "email") {
      rawInputData.emailAddress = emailAddress;
      rawInputData.emailSubject = emailSubject;
      rawInputData.emailBody = emailBody;
    }

    const newItem: HistoryItem = {
      id: Math.random().toString(36).substring(2, 9) + Date.now(),
      title: customTitle || title || "Mã QR đã tạo",
      type: qrType,
      value: qrValue,
      inputData: rawInputData,
      config: {
        fgColor,
        bgColor,
        gradient,
        gradientColor,
        gradientType,
        dotStyle,
        eyeStyle,
        logoSrc,
        logoSize,
        errorCorrectionLevel: logoSrc ? "H" : "M",
      },
      date: new Date().toISOString(),
    };

    const updated = [newItem, ...history].slice(0, 50); // limit to 50 items
    setHistory(updated);
    localStorage.setItem("qr_history", JSON.stringify(updated));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Load configuration and data back from history
  const loadHistoryItem = (item: HistoryItem) => {
    setQrType(item.type as QRType);
    
    // Load inputs
    const d = item.inputData;
    if (item.type === "url") setUrl(d.url ? String(d.url) : "");
    else if (item.type === "text") setText(d.text ? String(d.text) : "");
    else if (item.type === "wifi") {
      setWifiSSID(d.wifiSSID ? String(d.wifiSSID) : "");
      setWifiPassword(d.wifiPassword ? String(d.wifiPassword) : "");
      setWifiEncryption((d.wifiEncryption ? String(d.wifiEncryption) : "WPA") as "WPA" | "WEP" | "nopass");
    } else if (item.type === "vcard") {
      setVcardFirst(d.vcardFirst ? String(d.vcardFirst) : "");
      setVcardLast(d.vcardLast ? String(d.vcardLast) : "");
      setVcardPhone(d.vcardPhone ? String(d.vcardPhone) : "");
      setVcardEmail(d.vcardEmail ? String(d.vcardEmail) : "");
      setVcardCompany(d.vcardCompany ? String(d.vcardCompany) : "");
      setVcardTitle(d.vcardTitle ? String(d.vcardTitle) : "");
      setVcardWorkPhone(d.vcardWorkPhone ? String(d.vcardWorkPhone) : "");
      setVcardUrl(d.vcardUrl ? String(d.vcardUrl) : "");
      setVcardNote(d.vcardNote ? String(d.vcardNote) : "");
    } else if (item.type === "vietqr") {
      setVietqrBank(d.vietqrBank ? String(d.vietqrBank) : POPULAR_BANKS[0].bin);
      setVietqrAccount(d.vietqrAccount ? String(d.vietqrAccount) : "");
      setVietqrHolder(d.vietqrHolder ? String(d.vietqrHolder) : "");
      setVietqrAmount(d.vietqrAmount ? String(d.vietqrAmount) : "");
      setVietqrMemo(d.vietqrMemo ? String(d.vietqrMemo) : "");
    } else if (item.type === "phone") setPhone(d.phone ? String(d.phone) : "");
    else if (item.type === "sms") {
      setSmsPhone(d.smsPhone ? String(d.smsPhone) : "");
      setSmsMessage(d.smsMessage ? String(d.smsMessage) : "");
    } else if (item.type === "email") {
      setEmailAddress(d.emailAddress ? String(d.emailAddress) : "");
      setEmailSubject(d.emailSubject ? String(d.emailSubject) : "");
      setEmailBody(d.emailBody ? String(d.emailBody) : "");
    }

    // Load configs
    const c = item.config;
    if (c) {
      setFgColor(c.fgColor || "#000000");
      setBgColor(c.bgColor || "#ffffff");
      setGradient(!!c.gradient);
      setGradientColor(c.gradientColor || "#000000");
      setGradientType(c.gradientType || "vertical");
      setDotStyle(c.dotStyle || "square");
      setEyeStyle(c.eyeStyle || "square");
      setLogoSrc(c.logoSrc);
      setLogoSize(c.logoSize || 0.15);
    }
  };

  const deleteHistoryItem = (id: string) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem("qr_history", JSON.stringify(updated));
  };

  const clearAllHistory = () => {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử đã tạo?")) {
      setHistory([]);
      localStorage.removeItem("qr_history");
    }
  };

  // Trigger file uploader for logo
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoSrc(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Copy Canvas Image to Clipboard
  const copyCanvasToClipboard = async () => {
    if (!activeCanvas) return;

    try {
      activeCanvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob })
        ]);
        setCopied(true);
        saveToHistory();
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (err) {
      console.error("Failed to copy image", err);
      alert("Trình duyệt không hỗ trợ sao chép ảnh trực tiếp. Vui lòng bấm Tải xuống.");
    }
  };

  // Download Canvas Image
  const downloadQR = () => {
    if (!activeCanvas) return;

    const link = document.createElement("a");
    const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    link.download = `qr-${safeTitle || "code"}.png`;
    link.href = activeCanvas.toDataURL("image/png");
    link.click();
    saveToHistory();
  };

  return (
    <main className="min-h-screen pb-16" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl border-b" style={{ background: "color-mix(in srgb, var(--bg) 80%, transparent)", borderColor: "var(--border)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-black shadow-lg shadow-[var(--accent)]/20" style={{ background: "var(--accent)" }}>QR</div>
            <span className="text-sm font-black tracking-tight bg-gradient-to-r from-white to-[var(--text-muted)] bg-clip-text text-transparent">Tung Nguyen QR</span>
          </Link>
          <div className="flex gap-2">
            <Link href="/" className="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all hover:bg-white/5" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
              ← Trang chủ
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Page Title & Main Toggles */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b pb-8 animate-fade-up" style={{ borderColor: "var(--border)" }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: "var(--accent)" }}>Ứng dụng công cụ</p>
            <h1 className="text-3xl font-black mb-2 tracking-tight bg-gradient-to-r from-white to-[var(--text-muted)] bg-clip-text text-transparent">QR Code Studio</h1>
            <p className="text-xs max-w-xl text-[var(--text-muted)] leading-relaxed">
              Tạo và tùy biến mã QR Code chất lượng cao hoặc sử dụng camera quét giải mã trực tuyến an toàn.
            </p>
          </div>

          {/* Premium Sliding Toggle */}
          <div className="flex p-1 rounded-xl border bg-black/20 md:w-80 relative overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={() => setMode("generate")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all relative z-10 ${
                mode === "generate"
                  ? "text-black bg-[var(--accent)] shadow-md"
                  : "text-[var(--text-muted)] hover:text-white"
              }`}
            >
              Tạo mã QR
            </button>
            <button
              onClick={() => setMode("scan")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all relative z-10 ${
                mode === "scan"
                  ? "text-black bg-[var(--accent)] shadow-md"
                  : "text-[var(--text-muted)] hover:text-white"
              }`}
            >
              Quét mã QR
            </button>
          </div>
        </div>

        {mode === "generate" ? (
          /* GENERATE MODE - USING PURE CSS LAYOUT SHIFT FOR MOBILE ORDERING */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            {/* Left wrapper - Behaves as individual grid children on mobile for flexible ordering */}
            <div className="contents lg:flex lg:flex-col lg:gap-6 lg:col-span-7">
              
              {/* SECTION 1: QR Type Tabs & Input Fields (First on mobile) */}
              <div className="order-1 lg:order-none glass-card p-5 md:p-6">
                <h3 className="text-[10px] font-black uppercase tracking-wider mb-4 text-[var(--text-muted)] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
                  1. Chọn nội dung QR
                </h3>
                
                {/* Horizontal scrollable track on mobile, wrapped on desktop */}
                <div className="flex flex-nowrap overflow-x-auto lg:flex-wrap gap-2 pb-3 mb-6 scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0 snap-x">
                  {[
                    ["url", "🔗", "URL"],
                    ["text", "📝", "Văn bản"],
                    ["wifi", "📶", "Wifi"],
                    ["vcard", "📇", "vCard"],
                    ["vietqr", "💵", "VietQR"],
                    ["phone", "📞", "SĐT"],
                    ["sms", "💬", "SMS"],
                    ["email", "✉️", "Email"],
                  ].map(([type, icon, label]) => (
                    <button
                      key={type}
                      onClick={() => setQrType(type as QRType)}
                      className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 snap-center border ${
                        qrType === type
                          ? "text-black shadow-[0_0_12px_rgba(var(--accent-rgb),0.15)]"
                          : "bg-white/5 border-transparent text-zinc-400 hover:text-white hover:bg-white/10"
                      }`}
                      style={qrType === type ? { backgroundColor: "var(--accent)", borderColor: "var(--accent)" } : {}}
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab fields */}
                <div className="mt-4 animate-fade-up">
                  {qrType === "url" && (
                    <div className="flex flex-col gap-1.5">
                      <label className={labelCls}>Địa chỉ trang web (URL)</label>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        className={inputCls}
                        style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                      />
                    </div>
                  )}

                  {qrType === "text" && (
                    <div className="flex flex-col gap-1.5">
                      <label className={labelCls}>Văn bản hoặc tin nhắn</label>
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Nhập nội dung cần ghi vào QR..."
                        rows={4}
                        className={`${inputCls} resize-none`}
                        style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                      />
                    </div>
                  )}

                  {qrType === "wifi" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className={labelCls}>Tên mạng (SSID)</label>
                        <input
                          type="text"
                          value={wifiSSID}
                          onChange={(e) => setWifiSSID(e.target.value)}
                          placeholder="Mạng Wifi nhà bạn"
                          className={inputCls}
                          style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Mật khẩu Wifi</label>
                        <input
                          type="password"
                          value={wifiPassword}
                          onChange={(e) => setWifiPassword(e.target.value)}
                          placeholder="Mật khẩu (nếu có)"
                          className={inputCls}
                          style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Bảo mật</label>
                        <div className="relative">
                          <select
                            value={wifiEncryption}
                            onChange={(e) => setWifiEncryption(e.target.value as "WPA" | "WEP" | "nopass")}
                            className={selectCls}
                            style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                          >
                            <option value="WPA">WPA / WPA2</option>
                            <option value="WEP">WEP</option>
                            <option value="nopass">Không bảo mật (Mở)</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[var(--text-muted)]">▼</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {qrType === "vcard" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Tên</label>
                        <input
                          type="text"
                          value={vcardFirst}
                          onChange={(e) => setVcardFirst(e.target.value)}
                          placeholder="Tên"
                          className={inputCls}
                          style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Họ</label>
                        <input
                          type="text"
                          value={vcardLast}
                          onChange={(e) => setVcardLast(e.target.value)}
                          placeholder="Họ"
                          className={inputCls}
                          style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Số điện thoại</label>
                        <input
                          type="tel"
                          value={vcardPhone}
                          onChange={(e) => setVcardPhone(e.target.value)}
                          placeholder="0912345678"
                          className={inputCls}
                          style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Email</label>
                        <input
                          type="email"
                          value={vcardEmail}
                          onChange={(e) => setVcardEmail(e.target.value)}
                          placeholder="contact@tungnguyen.dev"
                          className={inputCls}
                          style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Công ty</label>
                        <input
                          type="text"
                          value={vcardCompany}
                          onChange={(e) => setVcardCompany(e.target.value)}
                          placeholder="Tên công ty"
                          className={inputCls}
                          style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Chức danh</label>
                        <input
                          type="text"
                          value={vcardTitle}
                          onChange={(e) => setVcardTitle(e.target.value)}
                          placeholder="Chức vụ"
                          className={inputCls}
                          style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className={labelCls}>Website</label>
                        <input
                          type="url"
                          value={vcardUrl}
                          onChange={(e) => setVcardUrl(e.target.value)}
                          placeholder="https://example.com"
                          className={inputCls}
                          style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                    </div>
                  )}

                  {qrType === "vietqr" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className={labelCls}>Ngân hàng thụ hưởng</label>
                        <div className="relative">
                          <select
                            value={vietqrBank}
                            onChange={(e) => setVietqrBank(e.target.value)}
                            className={selectCls}
                            style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                          >
                            {POPULAR_BANKS.map(bank => (
                              <option key={bank.bin} value={bank.bin}>
                                {bank.shortName} - {bank.name}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[var(--text-muted)]">▼</div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Số tài khoản</label>
                        <input
                          type="text"
                          value={vietqrAccount}
                          onChange={(e) => setVietqrAccount(e.target.value)}
                          placeholder="Nhập số tài khoản ngân hàng"
                          className={inputCls}
                          style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Tên chủ tài khoản (Không dấu)</label>
                        <input
                          type="text"
                          value={vietqrHolder}
                          onChange={(e) => setVietqrHolder(e.target.value.toUpperCase())}
                          placeholder="NGUYEN VAN A"
                          className={inputCls}
                          style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Số tiền (VND - Tùy chọn)</label>
                        <input
                          type="number"
                          value={vietqrAmount}
                          onChange={(e) => setVietqrAmount(e.target.value)}
                          placeholder="Ví dụ: 50000"
                          className={inputCls}
                          style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Nội dung chuyển khoản (Tùy chọn)</label>
                        <input
                          type="text"
                          value={vietqrMemo}
                          onChange={(e) => setVietqrMemo(e.target.value)}
                          placeholder="Ví dụ: Chuyển tiền cà phê"
                          className={inputCls}
                          style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                    </div>
                  )}

                  {qrType === "phone" && (
                    <div className="flex flex-col gap-1.5">
                      <label className={labelCls}>Số điện thoại</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ví dụ: +84912345678"
                        className={inputCls}
                        style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                      />
                    </div>
                  )}

                  {qrType === "sms" && (
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Số điện thoại nhận SMS</label>
                        <input
                          type="tel"
                          value={smsPhone}
                          onChange={(e) => setSmsPhone(e.target.value)}
                          placeholder="Ví dụ: +84912345678"
                          className={inputCls}
                          style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Nội dung tin nhắn</label>
                        <textarea
                          value={smsMessage}
                          onChange={(e) => setSmsMessage(e.target.value)}
                          placeholder="Nội dung SMS được nhập sẵn..."
                          rows={3}
                          className={`${inputCls} resize-none`}
                          style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                    </div>
                  )}

                  {qrType === "email" && (
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Địa chỉ email nhận</label>
                        <input
                          type="email"
                          value={emailAddress}
                          onChange={(e) => setEmailAddress(e.target.value)}
                          placeholder="admin@example.com"
                          className={inputCls}
                          style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Tiêu đề email</label>
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          placeholder="Tiêu đề thư viết sẵn"
                          className={inputCls}
                          style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Nội dung thư</label>
                        <textarea
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          placeholder="Nội dung email viết sẵn..."
                          rows={3}
                          className={`${inputCls} resize-none`}
                          style={{ background: "rgba(0, 0, 0, 0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 3: Advanced Customization Accordion (Third on mobile) */}
              <div className="order-3 lg:order-none glass-card overflow-hidden">
                <button
                  onClick={() => setIsDesignOpen(!isDesignOpen)}
                  className="w-full p-5 flex items-center justify-between font-black text-xs uppercase tracking-wider text-left transition-colors hover:bg-white/5 border-b"
                  style={{ color: "var(--text)", borderColor: "var(--border)" }}
                >
                  <span className="flex items-center gap-2">
                    🎨 2. Tùy chỉnh thiết kế QR
                  </span>
                  <span className={`transform transition-transform duration-200 text-[10px] ${isDesignOpen ? 'rotate-180' : ''}`} style={{ color: "var(--accent)" }}>
                    ▼
                  </span>
                </button>

                {isDesignOpen && (
                  <div className="p-5 md:p-6 flex flex-col gap-6 animate-fade-up">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Color Pickers */}
                      <div className="flex flex-col gap-4">
                        <span className={labelCls}>Màu sắc mã QR</span>
                        
                        {/* Fg color picker */}
                        <div className="flex items-center gap-3">
                          <div className="relative w-9 h-9 rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                            <input
                              type="color"
                              value={fgColor}
                              onChange={(e) => setFgColor(e.target.value)}
                              className="absolute inset-0 w-full h-full scale-150 cursor-pointer border-0 p-0"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-[var(--text-muted)] font-bold">Màu QR (Foreground)</span>
                            <span className="text-xs font-semibold font-mono" style={{ color: "var(--text)" }}>{fgColor}</span>
                          </div>
                        </div>

                        {/* Gradient controls */}
                        <div className="flex flex-col gap-2.5 mt-2">
                          <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={gradient}
                              onChange={(e) => setGradient(e.target.checked)}
                              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 focus:ring-0 accent-[var(--accent)]"
                            />
                            Sử dụng màu Gradient (Chuyển sắc)
                          </label>

                          {gradient && (
                            <div className="pl-6 flex flex-col gap-3 animate-fade-up">
                              <div className="flex items-center gap-3">
                                <div className="relative w-9 h-9 rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                                  <input
                                    type="color"
                                    value={gradientColor}
                                    onChange={(e) => setGradientColor(e.target.value)}
                                    className="absolute inset-0 w-full h-full scale-150 cursor-pointer border-0 p-0"
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-[var(--text-muted)] font-bold">Màu kết thúc Gradient</span>
                                  <span className="text-xs font-semibold font-mono" style={{ color: "var(--text)" }}>{gradientColor}</span>
                                </div>
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase">Kiểu Gradient</span>
                                <div className="flex gap-2">
                                  {["vertical", "horizontal", "diagonal"].map((type) => (
                                    <button
                                      key={type}
                                      onClick={() => setGradientType(type as "vertical" | "horizontal" | "diagonal")}
                                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                                        gradientType === type
                                          ? "text-black border-transparent"
                                          : "bg-white/5 border-transparent text-zinc-400"
                                      }`}
                                      style={gradientType === type ? { backgroundColor: "var(--accent)" } : {}}
                                    >
                                      {type === "vertical" ? "Dọc" : type === "horizontal" ? "Ngang" : "Chéo"}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Bg color picker */}
                        <div className="flex items-center gap-3 mt-2">
                          <div className="relative w-9 h-9 rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                            <input
                              type="color"
                              value={bgColor}
                              onChange={(e) => setBgColor(e.target.value)}
                              className="absolute inset-0 w-full h-full scale-150 cursor-pointer border-0 p-0"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-[var(--text-muted)] font-bold">Màu Nền (Background)</span>
                            <span className="text-xs font-semibold font-mono" style={{ color: "var(--text)" }}>{bgColor}</span>
                          </div>
                        </div>
                      </div>

                      {/* Shapes Config */}
                      <div className="flex flex-col gap-4">
                        <span className={labelCls}>Hình dạng & Hoạ tiết</span>
                        
                        {/* Dot shape select */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-[var(--text-muted)] font-bold">Kiểu chấm dữ liệu (Dots)</label>
                          <div className="flex gap-2">
                            {["square", "rounded", "circular"].map((style) => (
                              <button
                                key={style}
                                onClick={() => setDotStyle(style as "square" | "rounded" | "circular")}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                                  dotStyle === style
                                    ? "text-black border-transparent"
                                    : "bg-white/5 border-transparent text-zinc-400"
                                }`}
                                style={dotStyle === style ? { backgroundColor: "var(--accent)" } : {}}
                              >
                                {style === "square" ? "Vuông" : style === "rounded" ? "Bo góc" : "Tròn"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Eye shape select */}
                        <div className="flex flex-col gap-1.5 mt-1">
                          <label className="text-[10px] text-[var(--text-muted)] font-bold">Kiểu góc định vị (Finders)</label>
                          <div className="flex gap-2">
                            {["square", "rounded", "circle"].map((style) => (
                              <button
                                key={style}
                                onClick={() => setEyeStyle(style as "square" | "rounded" | "circle")}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                                  eyeStyle === style
                                    ? "text-black border-transparent"
                                    : "bg-white/5 border-transparent text-zinc-400"
                                }`}
                                style={eyeStyle === style ? { backgroundColor: "var(--accent)" } : {}}
                              >
                                {style === "square" ? "Vuông" : style === "rounded" ? "Bo góc" : "Tròn"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Resolution slider */}
                        <div className="flex flex-col gap-1.5 mt-1">
                          <label className="text-[10px] text-[var(--text-muted)] font-bold flex justify-between">
                            <span>Độ phân giải tải xuống</span>
                            <span className="font-mono font-bold" style={{ color: "var(--accent)" }}>{qrSize}x{qrSize} px</span>
                          </label>
                          <input
                            type="range"
                            min="256"
                            max="1024"
                            step="128"
                            value={qrSize}
                            onChange={(e) => setQrSize(Number(e.target.value))}
                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Logo Uploader Option (Nested in Customize section for cleaner spacing) */}
                    <div className="border-t pt-5" style={{ borderColor: "var(--border)" }}>
                      <span className={labelCls}>3. Thêm Logo vào trung tâm (Tùy chọn)</span>
                      
                      <div className="flex flex-col sm:flex-row gap-5 items-center mt-3">
                        <div className="flex-1 flex flex-col gap-2.5 w-full">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => document.getElementById("logo-file-input")?.click()}
                              className="py-2 px-4 rounded-xl text-xs font-bold border transition-all hover:bg-white/5"
                              style={{ background: "rgba(0, 0, 0, 0.2)", borderColor: "var(--border)", color: "var(--text)" }}
                            >
                              Chọn file logo
                            </button>
                            <input
                              type="file"
                              id="logo-file-input"
                              onChange={handleLogoUpload}
                              accept="image/*"
                              className="hidden"
                            />
                            {logoSrc && (
                              <button
                                onClick={() => setLogoSrc(undefined)}
                                className="text-xs font-bold text-red-400 hover:text-red-300"
                              >
                                Xóa logo
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-[var(--text-dim)] leading-relaxed">
                            Hỗ trợ định dạng PNG, JPG. QR Code sẽ tự động bật sửa lỗi mức độ cao (H) để bảo đảm quét nhạy sau khi chèn ảnh logo.
                          </p>
                        </div>

                        {logoSrc && (
                          <div className="flex flex-col gap-2 items-center flex-shrink-0 w-32 animate-fade-up">
                            <div className="w-16 h-16 rounded-xl border bg-black/30 flex items-center justify-center p-1.5 overflow-hidden" style={{ borderColor: "var(--border)" }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={logoSrc} alt="Logo preview" className="max-w-full max-h-full object-contain rounded-lg" />
                            </div>
                            <div className="w-full flex flex-col gap-1.5">
                              <span className="text-[9px] text-[var(--text-muted)] font-bold text-center">Cỡ logo: {(logoSize * 100).toFixed(0)}%</span>
                              <input
                                type="range"
                                min="0.10"
                                max="0.20"
                                step="0.02"
                                value={logoSize}
                                onChange={(e) => setLogoSize(Number(e.target.value))}
                                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right wrapper - Behaves as individual grid children on mobile for flexible ordering */}
            <div className="contents lg:flex lg:flex-col lg:gap-6 lg:col-span-5 lg:sticky lg:top-24">
              
              {/* SECTION 2: Live Preview & Actions Panel (Second on mobile) */}
              <div className="order-2 lg:order-none glass-card p-6 flex flex-col items-center gap-6">
                <div className="w-full text-center">
                  <h3 className="text-[10px] font-black uppercase tracking-wider mb-1.5 text-[var(--text-muted)]">
                    Bản Xem Trước (Live Preview)
                  </h3>
                  <div className="p-2 bg-black/10 rounded-lg max-w-full overflow-hidden">
                    <p className="text-[9px] text-[var(--text-dim)] font-mono truncate max-w-full" title={qrValue}>
                      {qrValue}
                    </p>
                  </div>
                </div>

                {/* The Generator Canvas Wrapper */}
                <div className="relative group p-1 rounded-2xl overflow-hidden transition-all duration-300">
                  <QRGenerator
                    value={qrValue}
                    fgColor={fgColor}
                    bgColor={bgColor}
                    gradient={gradient}
                    gradientColor={gradientColor}
                    gradientType={gradientType}
                    dotStyle={dotStyle}
                    eyeStyle={eyeStyle}
                    logoSrc={logoSrc}
                    logoSize={logoSize}
                    errorCorrectionLevel="M"
                    size={qrSize}
                    includeMargin={true}
                    onCanvasReady={setActiveCanvas}
                  />
                </div>

                {/* Primary Action Buttons */}
                <div className="w-full flex flex-col gap-2.5 mt-2">
                  <button
                    onClick={downloadQR}
                    className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl text-xs font-bold text-black transition-all shadow-lg hover:opacity-90 active:scale-[0.98] select-none"
                    style={{ backgroundColor: "var(--accent)" }}
                  >
                    📥 Tải ảnh QR (.PNG)
                  </button>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={copyCanvasToClipboard}
                      className="flex-1 min-h-[42px] flex items-center justify-center gap-2 rounded-xl text-xs font-bold border transition-all hover:bg-white/5 active:scale-[0.98]"
                      style={{ background: "rgba(0,0,0,0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                    >
                      📋 {copied ? "Đã sao chép!" : "Sao chép ảnh"}
                    </button>
                    
                    <button
                      onClick={() => saveToHistory()}
                      className="flex-1 min-h-[42px] flex items-center justify-center gap-2 rounded-xl text-xs font-bold border transition-all hover:bg-white/5 active:scale-[0.98]"
                      style={{ background: "rgba(0,0,0,0.15)", borderColor: "var(--border)", color: "var(--text)" }}
                    >
                      💾 {saved ? "Đã lưu!" : "Lưu lịch sử"}
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 4: History Panel (Fourth on mobile) */}
              <div className="order-4 lg:order-none glass-card p-5 md:p-6">
                <h3 className="text-[10px] font-black uppercase tracking-wider mb-4 text-[var(--text-muted)] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
                  Lịch sử mã QR đã tạo
                </h3>
                <QRHistory
                  items={history}
                  onLoadItem={loadHistoryItem}
                  onDeleteItem={deleteHistoryItem}
                  onClearAll={clearAllHistory}
                />
              </div>

            </div>
          </div>
        ) : (
          /* SCAN MODE */
          <div className="max-w-2xl mx-auto glass-card p-6 md:p-8 animate-fade-up">
            <div className="text-center mb-8">
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                QR Scanner
              </span>
              <h2 className="text-2xl font-black mt-3 mb-2 tracking-tight">Trình Quét Giải Mã QR</h2>
              <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
                Tải ảnh chứa mã QR lên hoặc bật camera để tự động quét & giải mã trực tuyến an toàn.
              </p>
            </div>
            
            <QRScanner onScanResult={(text) => {
              console.log("Scanned QR:", text);
            }} />
          </div>
        )}
      </div>
    </main>
  );
}
