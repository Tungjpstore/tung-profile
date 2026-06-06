"use client";

import React, { useState } from "react";
import Link from "next/link";
import QRGenerator from "../components/QRGenerator";
import QRScanner from "../components/QRScanner";
import QRHistory, { HistoryItem } from "../components/QRHistory";
import { POPULAR_BANKS, generateVietQRText } from "../lib/vietqr";

type QRType = "url" | "text" | "wifi" | "vcard" | "vietqr" | "phone" | "sms" | "email";
type ToolMode = "generate" | "scan";

export default function QRPage() {
  const [mode, setMode] = useState<ToolMode>("generate");
  const [qrType, setQrType] = useState<QRType>("url");

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
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    if (typeof window !== "undefined") {
      const savedHistory = window.localStorage.getItem("qr_history");
      if (savedHistory) {
        try {
          return JSON.parse(savedHistory);
        } catch (e) {
          console.error("Failed to parse history", e);
        }
      }
    }
    return [];
  });
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

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
      // Fallback
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
    <main className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl" style={{ background: "color-mix(in srgb, var(--bg) 80%, transparent)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-70 transition-opacity">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: "var(--accent)" }}>TN</div>
            <span className="text-sm font-semibold hidden sm:block">Công cụ QR Code</span>
          </Link>
          <div className="flex gap-4">
            <Link href="/blog" className="px-3 py-2 rounded-lg text-xs font-semibold hover:bg-white/5" style={{ color: "var(--text-secondary)" }}>
              Blog
            </Link>
            <Link href="/" className="px-3 py-2 rounded-lg text-xs font-semibold hover:bg-white/5" style={{ color: "var(--text-secondary)" }}>
              ← Trang chủ
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* Page Title & Main Toggles */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-white/5 pb-8 animate-fade-up">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--accent)" }}>Ứng dụng công cụ</p>
            <h1 className="text-3xl font-black mb-2 tracking-tight">QR Code Utility</h1>
            <p className="text-xs max-w-xl" style={{ color: "var(--text-secondary)" }}>
              Tạo và tùy biến mã QR Code chất lượng cao hoặc sử dụng camera quét giải mã trực tuyến an toàn.
            </p>
          </div>

          <div className="flex p-1 rounded-xl border border-white/5 bg-white/5 md:w-80">
            <button
              onClick={() => setMode("generate")}
              className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all ${
                mode === "generate"
                  ? "bg-white/10 text-white border border-white/5"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Tạo mã QR
            </button>
            <button
              onClick={() => setMode("scan")}
              className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all ${
                mode === "scan"
                  ? "bg-white/10 text-white border border-white/5"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Quét mã QR
            </button>
          </div>
        </div>

        {mode === "generate" ? (
          /* GENERATE MODE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Input and Configuration Panel */}
            <div className="lg:col-span-7 flex flex-col gap-6 animate-fade-up">
              
              {/* QR Code Content Types Tab Panel */}
              <div className="p-5 rounded-2xl border border-white/5" style={{ background: "var(--bg-card)" }}>
                <h3 className="text-xs font-black uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
                  1. Chọn nội dung QR
                </h3>
                
                {/* Horizontal tabs */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {[
                    ["url", "🔗 URL"],
                    ["text", "📝 Văn bản"],
                    ["wifi", "📶 Wifi"],
                    ["vcard", "📇 vCard"],
                    ["vietqr", "💵 VietQR"],
                    ["phone", "📞 Điện thoại"],
                    ["sms", "💬 SMS"],
                    ["email", "✉️ Email"],
                  ].map(([type, label]) => (
                    <button
                      key={type}
                      onClick={() => setQrType(type as QRType)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                        qrType === type
                          ? "bg-white/10 text-white border border-white/5"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Tab fields */}
                <div className="mt-4">
                  {qrType === "url" && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Địa chỉ trang web (URL)</label>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="min-h-[42px] px-3 rounded-xl text-xs outline-none w-full border"
                        style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                      />
                    </div>
                  )}

                  {qrType === "text" && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Văn bản hoặc tin nhắn</label>
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Nhập nội dung cần ghi vào QR..."
                        rows={4}
                        className="p-3 rounded-xl text-xs outline-none w-full border resize-none"
                        style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                      />
                    </div>
                  )}

                  {qrType === "wifi" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Tên mạng (SSID)</label>
                        <input
                          type="text"
                          value={wifiSSID}
                          onChange={(e) => setWifiSSID(e.target.value)}
                          placeholder="Mạng Wifi nhà bạn"
                          className="min-h-[42px] px-3 rounded-xl text-xs outline-none w-full border"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Mật khẩu Wifi</label>
                        <input
                          type="password"
                          value={wifiPassword}
                          onChange={(e) => setWifiPassword(e.target.value)}
                          placeholder="Mật khẩu (nếu có)"
                          className="min-h-[42px] px-3 rounded-xl text-xs outline-none w-full border"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Bảo mật</label>
                        <select
                          value={wifiEncryption}
                          onChange={(e) => setWifiEncryption(e.target.value as "WPA" | "WEP" | "nopass")}
                          className="min-h-[42px] px-3 rounded-xl text-xs outline-none w-full border"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                        >
                          <option value="WPA">WPA / WPA2</option>
                          <option value="WEP">WEP</option>
                          <option value="nopass">Không mật khẩu (Mở)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {qrType === "vcard" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Tên</label>
                        <input
                          type="text"
                          value={vcardFirst}
                          onChange={(e) => setVcardFirst(e.target.value)}
                          placeholder="Tùng"
                          className="min-h-[42px] px-3 rounded-xl text-xs outline-none w-full border"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Họ</label>
                        <input
                          type="text"
                          value={vcardLast}
                          onChange={(e) => setVcardLast(e.target.value)}
                          placeholder="Nguyễn"
                          className="min-h-[42px] px-3 rounded-xl text-xs outline-none w-full border"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Số điện thoại</label>
                        <input
                          type="tel"
                          value={vcardPhone}
                          onChange={(e) => setVcardPhone(e.target.value)}
                          placeholder="0912345678"
                          className="min-h-[42px] px-3 rounded-xl text-xs outline-none w-full border"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Email</label>
                        <input
                          type="email"
                          value={vcardEmail}
                          onChange={(e) => setVcardEmail(e.target.value)}
                          placeholder="contact@tungnguyen.dev"
                          className="min-h-[42px] px-3 rounded-xl text-xs outline-none w-full border"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Công ty</label>
                        <input
                          type="text"
                          value={vcardCompany}
                          onChange={(e) => setVcardCompany(e.target.value)}
                          placeholder="Tung Group"
                          className="min-h-[42px] px-3 rounded-xl text-xs outline-none w-full border"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Chức danh</label>
                        <input
                          type="text"
                          value={vcardTitle}
                          onChange={(e) => setVcardTitle(e.target.value)}
                          placeholder="Software Engineer"
                          className="min-h-[42px] px-3 rounded-xl text-xs outline-none w-full border"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Website</label>
                        <input
                          type="url"
                          value={vcardUrl}
                          onChange={(e) => setVcardUrl(e.target.value)}
                          placeholder="https://tungnguyen.dev"
                          className="min-h-[42px] px-3 rounded-xl text-xs outline-none w-full border"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                    </div>
                  )}

                  {qrType === "vietqr" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Ngân hàng hưởng thụ</label>
                        <select
                          value={vietqrBank}
                          onChange={(e) => setVietqrBank(e.target.value)}
                          className="min-h-[42px] px-3 rounded-xl text-xs outline-none w-full border"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                        >
                          {POPULAR_BANKS.map(bank => (
                            <option key={bank.bin} value={bank.bin}>
                              {bank.shortName} - {bank.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Số tài khoản</label>
                        <input
                          type="text"
                          value={vietqrAccount}
                          onChange={(e) => setVietqrAccount(e.target.value)}
                          placeholder="Nhập số tài khoản ngân hàng"
                          className="min-h-[42px] px-3 rounded-xl text-xs outline-none w-full border"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Tên chủ tài khoản (Không dấu)</label>
                        <input
                          type="text"
                          value={vietqrHolder}
                          onChange={(e) => setVietqrHolder(e.target.value.toUpperCase())}
                          placeholder="NGUYEN VAN A"
                          className="min-h-[42px] px-3 rounded-xl text-xs outline-none w-full border"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Số tiền (VND - Tùy chọn)</label>
                        <input
                          type="number"
                          value={vietqrAmount}
                          onChange={(e) => setVietqrAmount(e.target.value)}
                          placeholder="Ví dụ: 50000"
                          className="min-h-[42px] px-3 rounded-xl text-xs outline-none w-full border"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Nội dung chuyển khoản (Tùy chọn)</label>
                        <input
                          type="text"
                          value={vietqrMemo}
                          onChange={(e) => setVietqrMemo(e.target.value)}
                          placeholder="Ví dụ: Chuyển tiền cà phê"
                          className="min-h-[42px] px-3 rounded-xl text-xs outline-none w-full border"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                    </div>
                  )}

                  {qrType === "phone" && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Số điện thoại</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ví dụ: +84912345678"
                        className="min-h-[42px] px-3 rounded-xl text-xs outline-none w-full border"
                        style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                      />
                    </div>
                  )}

                  {qrType === "sms" && (
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Số điện thoại nhận SMS</label>
                        <input
                          type="tel"
                          value={smsPhone}
                          onChange={(e) => setSmsPhone(e.target.value)}
                          placeholder="Ví dụ: +84912345678"
                          className="min-h-[42px] px-3 rounded-xl text-xs outline-none w-full border"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Nội dung tin nhắn</label>
                        <textarea
                          value={smsMessage}
                          onChange={(e) => setSmsMessage(e.target.value)}
                          placeholder="Nội dung SMS được nhập sẵn..."
                          rows={3}
                          className="p-3 rounded-xl text-xs outline-none w-full border resize-none"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                    </div>
                  )}

                  {qrType === "email" && (
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Địa chỉ email nhận</label>
                        <input
                          type="email"
                          value={emailAddress}
                          onChange={(e) => setEmailAddress(e.target.value)}
                          placeholder="admin@example.com"
                          className="min-h-[42px] px-3 rounded-xl text-xs outline-none w-full border"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Tiêu đề email</label>
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          placeholder="Tiêu đề thư viết sẵn"
                          className="min-h-[42px] px-3 rounded-xl text-xs outline-none w-full border"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Nội dung thư</label>
                        <textarea
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          placeholder="Nội dung email viết sẵn..."
                          rows={3}
                          className="p-3 rounded-xl text-xs outline-none w-full border resize-none"
                          style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Design Customizations Panel */}
              <div className="p-5 rounded-2xl border border-white/5" style={{ background: "var(--bg-card)" }}>
                <h3 className="text-xs font-black uppercase tracking-wider mb-5" style={{ color: "var(--text-secondary)" }}>
                  2. Tùy chỉnh thiết kế QR
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Color Pickers */}
                  <div className="flex flex-col gap-4">
                    <span className="text-[11px] font-bold block" style={{ color: "var(--text-secondary)" }}>Màu sắc mã QR</span>
                    
                    {/* Fg color picker */}
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                        <input
                          type="color"
                          value={fgColor}
                          onChange={(e) => setFgColor(e.target.value)}
                          className="absolute inset-0 w-full h-full scale-150 cursor-pointer border-0 p-0"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-400 font-bold">Màu QR (Foreground)</span>
                        <span className="text-xs font-semibold font-mono">{fgColor}</span>
                      </div>
                    </div>

                    {/* Gradient controls */}
                    <div className="flex flex-col gap-2 mt-2">
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={gradient}
                          onChange={(e) => setGradient(e.target.checked)}
                          className="rounded border-zinc-700 bg-zinc-900 text-cyan-600 focus:ring-cyan-500"
                        />
                        Sử dụng màu Gradient (Chuyển sắc)
                      </label>

                      {gradient && (
                        <div className="pl-6 flex flex-col gap-3 animate-fade-up">
                          <div className="flex items-center gap-3">
                            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                              <input
                                type="color"
                                value={gradientColor}
                                onChange={(e) => setGradientColor(e.target.value)}
                                className="absolute inset-0 w-full h-full scale-150 cursor-pointer border-0 p-0"
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-zinc-400 font-bold">Màu kết thúc Gradient</span>
                              <span className="text-xs font-semibold font-mono">{gradientColor}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-zinc-500 font-bold">Kiểu Gradient</span>
                            <div className="flex gap-2">
                              {["vertical", "horizontal", "diagonal"].map((type) => (
                                <button
                                  key={type}
                                  onClick={() => setGradientType(type as "vertical" | "horizontal" | "diagonal")}
                                  className={`py-1 px-2.5 rounded-md text-[10px] font-bold border transition-all ${
                                    gradientType === type
                                      ? "border-cyan-500 bg-cyan-950/20 text-cyan-400"
                                      : "border-white/5 bg-white/5 text-zinc-400"
                                  }`}
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
                      <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                        <input
                          type="color"
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="absolute inset-0 w-full h-full scale-150 cursor-pointer border-0 p-0"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-400 font-bold">Màu Nền (Background)</span>
                        <span className="text-xs font-semibold font-mono">{bgColor}</span>
                      </div>
                    </div>
                  </div>

                  {/* Shapes Config */}
                  <div className="flex flex-col gap-4">
                    <span className="text-[11px] font-bold block" style={{ color: "var(--text-secondary)" }}>Hình dạng & Hoạ tiết</span>
                    
                    {/* Dot shape select */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-zinc-400 font-bold">Kiểu chấm dữ liệu (Dots)</label>
                      <div className="flex gap-2">
                        {["square", "rounded", "circular"].map((style) => (
                          <button
                            key={style}
                            onClick={() => setDotStyle(style as "square" | "rounded" | "circular")}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              dotStyle === style
                                ? "border-cyan-500 bg-cyan-950/20 text-cyan-400"
                                : "border-white/5 bg-white/5 text-zinc-400"
                            }`}
                          >
                            {style === "square" ? "Vuông" : style === "rounded" ? "Bo góc" : "Tròn"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Eye shape select */}
                    <div className="flex flex-col gap-1.5 mt-1">
                      <label className="text-[10px] text-zinc-400 font-bold">Kiểu góc định vị (Eyes / Finders)</label>
                      <div className="flex gap-2">
                        {["square", "rounded", "circle"].map((style) => (
                          <button
                            key={style}
                            onClick={() => setEyeStyle(style as "square" | "rounded" | "circle")}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              eyeStyle === style
                                ? "border-cyan-500 bg-cyan-950/20 text-cyan-400"
                                : "border-white/5 bg-white/5 text-zinc-400"
                            }`}
                          >
                            {style === "square" ? "Vuông" : style === "rounded" ? "Bo góc" : "Tròn"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Resolution slider */}
                    <div className="flex flex-col gap-1.5 mt-1">
                      <label className="text-[10px] text-zinc-400 font-bold flex justify-between">
                        <span>Độ phân giải tải xuống</span>
                        <span className="font-mono text-cyan-400 font-bold">{qrSize}x{qrSize} px</span>
                      </label>
                      <input
                        type="range"
                        min="256"
                        max="1024"
                        step="128"
                        value={qrSize}
                        onChange={(e) => setQrSize(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Logo Upload Panel */}
              <div className="p-5 rounded-2xl border border-white/5" style={{ background: "var(--bg-card)" }}>
                <h3 className="text-xs font-black uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
                  3. Thêm Logo vào trung tâm (Tùy chọn)
                </h3>

                <div className="flex flex-col sm:flex-row gap-5 items-center">
                  <div className="flex-1 flex flex-col gap-3 w-full">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => document.getElementById("logo-file-input")?.click()}
                        className="py-2 px-4 rounded-xl text-xs font-semibold transition-all"
                        style={{ background: "var(--surface-strong)", border: "1px solid var(--border)", color: "var(--text)" }}
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
                    
                    <p className="text-[10px] text-zinc-500 leading-normal">
                      Hỗ trợ định dạng PNG, JPG. Hệ thống sẽ tự động chuyển cấp độ sửa lỗi QR lên cao nhất (H) để đảm bảo chất lượng quét sau khi chèn logo.
                    </p>
                  </div>

                  {logoSrc && (
                    <div className="flex flex-col gap-2 items-center flex-shrink-0 w-32 animate-fade-up">
                      <div className="w-16 h-16 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center p-1.5 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logoSrc} alt="Logo preview" className="max-w-full max-h-full object-contain rounded-lg" />
                      </div>
                      <div className="w-full flex flex-col gap-1">
                        <span className="text-[9px] text-zinc-400 font-bold text-center">Cỡ: {(logoSize * 100).toFixed(0)}%</span>
                        <input
                          type="range"
                          min="0.10"
                          max="0.20"
                          step="0.02"
                          value={logoSize}
                          onChange={(e) => setLogoSize(Number(e.target.value))}
                          className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Live Preview & Actions Panel */}
            <div className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-24 animate-fade-up">
              
              {/* Live Preview Card */}
              <div className="p-6 rounded-2xl border border-white/5 flex flex-col items-center gap-6" style={{ background: "var(--bg-card)" }}>
                <div className="w-full text-center">
                  <h3 className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>
                    Bản Xem Trước (Live Preview)
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-mono truncate max-w-full" title={qrValue}>
                    {qrValue}
                  </p>
                </div>

                {/* The Generator Canvas wrapper */}
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

                {/* Primary Actions */}
                <div className="w-full flex flex-col gap-2.5 mt-2">
                  <button
                    onClick={downloadQR}
                    className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl text-xs font-bold text-black transition-all shadow-lg shadow-white/5 hover:bg-zinc-200 bg-white"
                  >
                    📥 Tải ảnh QR (.PNG)
                  </button>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={copyCanvasToClipboard}
                      className="flex-1 min-h-[40px] flex items-center justify-center gap-2 rounded-xl text-xs font-bold border transition-all"
                      style={{ background: "var(--surface-strong)", borderColor: "var(--border)", color: "var(--text)" }}
                    >
                      📋 {copied ? "Đã sao chép ảnh!" : "Sao chép ảnh"}
                    </button>
                    
                    <button
                      onClick={() => saveToHistory()}
                      className="flex-1 min-h-[40px] flex items-center justify-center gap-2 rounded-xl text-xs font-bold border transition-all"
                      style={{ background: "var(--surface-strong)", borderColor: "var(--border)", color: "var(--text)" }}
                    >
                      💾 {saved ? "Đã lưu!" : "Lưu vào lịch sử"}
                    </button>
                  </div>
                </div>
              </div>

              {/* History Panel */}
              <div className="p-6 rounded-2xl border border-white/5" style={{ background: "var(--bg-card)" }}>
                <h3 className="text-xs font-black uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
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
          <div className="max-w-2xl mx-auto p-6 rounded-2xl border border-white/5 animate-fade-up" style={{ background: "var(--bg-card)" }}>
            <div className="text-center mb-6">
              <h3 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                Trình Quét Giải Mã QR Code (QR Scanner)
              </h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                Tải lên một bức ảnh có chứa mã QR hoặc bật máy ảnh của bạn để hệ thống tự động nhận diện và đọc thông tin tức thì.
              </p>
            </div>
            
            <QRScanner onScanResult={(text) => {
              console.log("Scanned:", text);
            }} />
          </div>
        )}
      </div>
    </main>
  );
}
