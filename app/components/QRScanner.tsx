"use client";

import React, { useState, useRef, useEffect } from "react";
import jsQR from "jsqr";

interface QRScannerProps {
  onScanResult: (text: string) => void;
}

export default function QRScanner({ onScanResult }: QRScannerProps) {
  const [scanMode, setScanMode] = useState<"file" | "camera">("file");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isCameraActiveRef = useRef(false);

  // Stop camera when component unmounts or mode changes
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [scanMode]);

  async function startCamera() {
    setErrorMsg(null);
    setScanResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true"); // required to tell iOS safari we don't want fullscreen
        videoRef.current.play();
        isCameraActiveRef.current = true;
        setIsCameraActive(true);
        animationFrameRef.current = requestAnimationFrame(tickCamera);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setErrorMsg("Không thể truy cập camera. Vui lòng cấp quyền truy cập camera hoặc tải ảnh lên để quét.");
      setIsCameraActive(false);
    }
  }

  function stopCamera() {
    isCameraActiveRef.current = false;
    setIsCameraActive(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function tickCamera() {
    if (!videoRef.current || !canvasRef.current || !isCameraActiveRef.current) {
      if (isCameraActiveRef.current) {
        animationFrameRef.current = requestAnimationFrame(tickCamera);
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        setScanResult(code.data);
        onScanResult(code.data);
        stopCamera();
        return;
      }
    }
    animationFrameRef.current = requestAnimationFrame(tickCamera);
  }

  // Handle image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setErrorMsg(null);
    setScanResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setErrorMsg("Không thể xử lý ảnh.");
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          setScanResult(code.data);
          onScanResult(code.data);
        } else {
          setErrorMsg("Không tìm thấy mã QR nào trong hình ảnh này. Hãy thử ảnh rõ nét hơn.");
        }
      };
      img.onerror = () => {
        setErrorMsg("Không thể đọc được file ảnh.");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processFile(file);
    }
  };

  const copyToClipboard = () => {
    if (scanResult) {
      navigator.clipboard.writeText(scanResult);
      alert("Đã sao chép nội dung quét được!");
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setErrorMsg(null);
    if (scanMode === "camera") {
      startCamera();
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* Scanner Mode Tabs */}
      <div className="flex p-1 rounded-xl border bg-black/20 w-full max-w-md" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={() => {
            setScanMode("file");
            stopCamera();
          }}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            scanMode === "file"
              ? "text-black font-black"
              : "text-[var(--text-muted)] hover:text-white"
          }`}
          style={scanMode === "file" ? { backgroundColor: "var(--accent)" } : {}}
        >
          Tải ảnh lên
        </button>
        <button
          onClick={() => {
            setScanMode("camera");
            startCamera();
          }}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            scanMode === "camera"
              ? "text-black font-black"
              : "text-[var(--text-muted)] hover:text-white"
          }`}
          style={scanMode === "camera" ? { backgroundColor: "var(--accent)" } : {}}
        >
          Dùng Camera
        </button>
      </div>

      {/* Main Scanner Window */}
      <div className="w-full max-w-md aspect-square relative flex items-center justify-center rounded-2xl overflow-hidden border bg-black/40 shadow-2xl" style={{ borderColor: "var(--border)" }}>
        {scanMode === "file" ? (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-800 hover:border-[var(--accent)]/50 rounded-2xl cursor-pointer transition-all hover:bg-white/[0.02]"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <span className="text-4xl mb-3.5 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">📤</span>
            <p className="text-xs font-bold mb-1 text-[var(--text)]">
              Kéo thả hình ảnh QR vào đây
            </p>
            <p className="text-[10px] text-[var(--text-dim)] text-center">
              Hoặc click để chọn file từ thiết bị
            </p>
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Hidden canvas for extracting pixel data */}
            <canvas ref={canvasRef} className="hidden" />

            {isCameraActive ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
                {/* Laser scan line overlay using theme color */}
                <div 
                  className="absolute inset-x-0 h-0.5 animate-[scan_2s_ease-in-out_infinite]"
                  style={{ 
                    backgroundImage: "linear-gradient(to right, transparent, var(--accent), transparent)",
                    boxShadow: "0 0 10px var(--accent)",
                    top: "5%"
                  }}
                />
                
                {/* Scanner Target Box Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3/5 aspect-square border-2 rounded-xl relative" style={{ borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)" }}>
                    {/* Corner accents */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4" style={{ borderColor: "var(--accent)" }} />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4" style={{ borderColor: "var(--accent)" }} />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4" style={{ borderColor: "var(--accent)" }} />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4" style={{ borderColor: "var(--accent)" }} />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center p-6 text-center animate-fade-up">
                <span className="text-4xl mb-4">🎥</span>
                <button
                  onClick={startCamera}
                  className="py-2.5 px-5 rounded-xl text-xs font-bold transition-all text-black hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: "var(--accent)", boxShadow: "var(--glow-shadow)" }}
                >
                  Mở Máy Ảnh
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status or Result panel */}
      {errorMsg && (
        <div className="w-full max-w-md p-4 rounded-xl border text-xs leading-relaxed" style={{ background: "rgba(239, 68, 68, 0.05)", borderColor: "rgba(239, 68, 68, 0.2)", color: "var(--danger)" }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {scanResult && (
        <div className="w-full max-w-md p-5 rounded-2xl border text-left flex flex-col gap-3 animate-fade-up" style={{ background: "rgba(16, 185, 129, 0.05)", borderColor: "rgba(16, 185, 129, 0.2)" }}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">
              Quét Thành Công
            </span>
            <button
              onClick={resetScanner}
              className="text-[10px] font-bold text-[var(--text-muted)] hover:text-white"
            >
              Quét lại
            </button>
          </div>
          <div className="p-3.5 bg-black/30 border rounded-xl text-xs break-all max-h-36 overflow-y-auto whitespace-pre-wrap select-all font-mono" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
            {scanResult}
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10 active:scale-[0.98]"
            >
              Sao chép nội dung
            </button>
            {scanResult.startsWith("http://") || scanResult.startsWith("https://") ? (
              <a
                href={scanResult}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold text-center transition-all active:scale-[0.98]"
              >
                Mở liên kết
              </a>
            ) : null}
          </div>
        </div>
      )}

      {/* Globally compatible keyframe injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0% { top: 5%; }
          50% { top: 95%; }
          100% { top: 5%; }
        }
      `}} />
    </div>
  );
}
