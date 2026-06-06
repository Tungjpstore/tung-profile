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
      <div className="flex gap-2 p-1.5 rounded-xl border border-white/5 bg-white/5 w-full max-w-md">
        <button
          onClick={() => {
            setScanMode("file");
            stopCamera();
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            scanMode === "file"
              ? "bg-white/10 text-white border border-white/5"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Tải ảnh lên
        </button>
        <button
          onClick={() => {
            setScanMode("camera");
            startCamera();
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            scanMode === "camera"
              ? "bg-white/10 text-white border border-white/5"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Sử dụng Camera
        </button>
      </div>

      {/* Main Scanner Window */}
      <div className="w-full max-w-md aspect-video sm:aspect-square relative flex items-center justify-center rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-2xl">
        {scanMode === "file" ? (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-2xl cursor-pointer transition-all hover:bg-white/5"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <span className="text-4xl mb-4">📤</span>
            <p className="text-sm font-semibold mb-1 text-center">
              Kéo thả hình ảnh QR vào đây
            </p>
            <p className="text-xs text-zinc-500 text-center">
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
                {/* Laser scan line overlay */}
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-cyan-500/20 via-cyan-400 to-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.7)] animate-[scan_2s_ease-in-out_infinite]" />
                
                {/* Scanner Target Box Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3/5 aspect-square border-2 border-cyan-400/50 rounded-xl relative">
                    {/* Corner accents */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-cyan-400" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-cyan-400" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-cyan-400" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-cyan-400" />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center p-6 text-center">
                <span className="text-4xl mb-4">🎥</span>
                <button
                  onClick={startCamera}
                  className="py-2.5 px-5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all"
                >
                  Bật Camera
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status or Result panel */}
      {errorMsg && (
        <div className="w-full max-w-md p-4 rounded-xl border border-red-500/10 bg-red-950/20 text-red-400 text-xs leading-5">
          ⚠️ {errorMsg}
        </div>
      )}

      {scanResult && (
        <div className="w-full max-w-md p-5 rounded-2xl border border-emerald-500/10 bg-emerald-950/10 text-left flex flex-col gap-3 animate-fade-up">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
              Quét Thành Công
            </span>
            <button
              onClick={resetScanner}
              className="text-[10px] font-bold text-zinc-400 hover:text-white"
            >
              Quét lại
            </button>
          </div>
          <div className="p-3 bg-zinc-900/50 border border-white/5 rounded-xl text-xs break-all max-h-36 overflow-y-auto whitespace-pre-wrap select-all font-mono">
            {scanResult}
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-emerald-500/10"
            >
              Sao chép
            </button>
            {scanResult.startsWith("http://") || scanResult.startsWith("https://") ? (
              <a
                href={scanResult}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold text-center transition-all"
              >
                Mở liên kết
              </a>
            ) : null}
          </div>
        </div>
      )}

      {/* Style for Scanner Laser animation */}
      <style jsx global>{`
        @keyframes scan {
          0% { top: 5%; }
          50% { top: 95%; }
          100% { top: 5%; }
        }
      `}</style>
    </div>
  );
}
