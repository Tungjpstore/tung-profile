"use client";

import React, { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRGeneratorProps {
  value: string;
  fgColor: string;
  bgColor: string;
  gradient: boolean;
  gradientColor: string;
  gradientType: "vertical" | "horizontal" | "diagonal";
  dotStyle: "square" | "rounded" | "circular";
  eyeStyle: "square" | "rounded" | "circle";
  logoSrc?: string;
  logoSize: number; // e.g. 0.15 for 15%
  errorCorrectionLevel: "L" | "M" | "Q" | "H";
  size: number;
  includeMargin: boolean;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export default function QRGenerator({
  value,
  fgColor = "#000000",
  bgColor = "#ffffff",
  gradient = false,
  gradientColor = "#000000",
  gradientType = "vertical",
  dotStyle = "square",
  eyeStyle = "square",
  logoSrc,
  logoSize = 0.15,
  errorCorrectionLevel = "M",
  size = 512,
  includeMargin = true,
  onCanvasReady,
}: QRGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset canvas dimensions for high quality drawing
    canvas.width = size;
    canvas.height = size;

    try {
      // Create QR code matrix
      // Force error correction level to H if logo is used to ensure scanability
      const ecl = logoSrc ? "H" : errorCorrectionLevel;
      const qr = QRCode.create(value || "Tung Nguyen", {
        errorCorrectionLevel: ecl,
      });

      const matrixSize = qr.modules.size;
      const margin = includeMargin ? Math.ceil(size * 0.05) : 0;
      const drawSize = size - margin * 2;
      const cellSize = drawSize / matrixSize;

      // Draw background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);

      // Define style colors
      let fillStyle: string | CanvasGradient = fgColor;
      if (gradient) {
        let grad;
        if (gradientType === "vertical") {
          grad = ctx.createLinearGradient(0, margin, 0, size - margin);
        } else if (gradientType === "horizontal") {
          grad = ctx.createLinearGradient(margin, 0, size - margin, 0);
        } else {
          grad = ctx.createLinearGradient(margin, margin, size - margin, size - margin);
        }
        grad.addColorStop(0, fgColor);
        grad.addColorStop(1, gradientColor);
        fillStyle = grad;
      }

      ctx.fillStyle = fillStyle;

      // Check if coordinate is in the three main finder patterns (eyes)
      // Top-Left: (0,0) to (6,6)
      // Top-Right: (matrixSize - 7, 0) to (matrixSize - 1, 6)
      // Bottom-Left: (0, matrixSize - 7) to (6, matrixSize - 1)
      const isEye = (row: number, col: number) => {
        if (row < 7 && col < 7) return "top-left";
        if (row < 7 && col >= matrixSize - 7) return "top-right";
        if (row >= matrixSize - 7 && col < 7) return "bottom-left";
        return null;
      };

      // Check if coordinate is within the logo bounding box
      const center = matrixSize / 2;
      const logoModules = matrixSize * logoSize;
      const buffer = 0.5; // Small buffer module spacing around logo
      const logoHalf = logoModules / 2 + buffer;

      const isLogoArea = (row: number, col: number) => {
        if (!logoSrc) return false;
        // Check if row/col is in the center square area
        return (
          Math.abs(row - center + 0.5) < logoHalf &&
          Math.abs(col - center + 0.5) < logoHalf
        );
      };

      // 1. Draw the stylized eyes (finder patterns)
      const drawEyePattern = (xOffset: number, yOffset: number) => {
        const eyeX = margin + xOffset * cellSize;
        const eyeY = margin + yOffset * cellSize;
        const totalEyeSize = 7 * cellSize;

        ctx.fillStyle = fillStyle;

        if (eyeStyle === "square") {
          // Outer frame
          ctx.fillRect(eyeX, eyeY, totalEyeSize, totalEyeSize);
          // Inner clear
          ctx.fillStyle = bgColor;
          ctx.fillRect(
            eyeX + cellSize,
            eyeY + cellSize,
            5 * cellSize,
            5 * cellSize
          );
          // Center dot
          ctx.fillStyle = fillStyle;
          ctx.fillRect(
            eyeX + 2 * cellSize,
            eyeY + 2 * cellSize,
            3 * cellSize,
            3 * cellSize
          );
        } else if (eyeStyle === "rounded") {
          const outerRadius = 1.8 * cellSize;
          const innerRadius = 0.8 * cellSize;

          // Outer frame
          drawRoundRect(ctx, eyeX, eyeY, totalEyeSize, totalEyeSize, outerRadius);
          ctx.fillStyle = fillStyle;
          ctx.fill();

          // Inner clear
          drawRoundRect(
            ctx,
            eyeX + cellSize,
            eyeY + cellSize,
            5 * cellSize,
            5 * cellSize,
            outerRadius - cellSize > 0 ? outerRadius - cellSize : 0
          );
          ctx.fillStyle = bgColor;
          ctx.fill();

          // Center dot
          drawRoundRect(
            ctx,
            eyeX + 2 * cellSize,
            eyeY + 2 * cellSize,
            3 * cellSize,
            3 * cellSize,
            innerRadius
          );
          ctx.fillStyle = fillStyle;
          ctx.fill();
        } else if (eyeStyle === "circle") {
          const cx = eyeX + totalEyeSize / 2;
          const cy = eyeY + totalEyeSize / 2;

          // Outer circle
          ctx.beginPath();
          ctx.arc(cx, cy, 3.5 * cellSize, 0, 2 * Math.PI);
          ctx.fillStyle = fillStyle;
          ctx.fill();

          // Inner clear
          ctx.beginPath();
          ctx.arc(cx, cy, 2.5 * cellSize, 0, 2 * Math.PI);
          ctx.fillStyle = bgColor;
          ctx.fill();

          // Center dot
          ctx.beginPath();
          ctx.arc(cx, cy, 1.5 * cellSize, 0, 2 * Math.PI);
          ctx.fillStyle = fillStyle;
          ctx.fill();
        }
      };

      // Draw the three finder patterns
      drawEyePattern(0, 0); // Top-Left
      drawEyePattern(matrixSize - 7, 0); // Top-Right
      drawEyePattern(0, matrixSize - 7); // Bottom-Left

      // 2. Draw other data modules
      ctx.fillStyle = fillStyle;
      for (let row = 0; row < matrixSize; row++) {
        for (let col = 0; col < matrixSize; col++) {
          // Skip if cell belongs to eye or logo area
          if (isEye(row, col)) continue;
          if (isLogoArea(row, col)) continue;

          // Draw dark modules
          if (qr.modules.get(row, col)) {
            const x = margin + col * cellSize;
            const y = margin + row * cellSize;

            if (dotStyle === "square") {
              // Standard pixel
              ctx.fillRect(x, y, cellSize + 0.5, cellSize + 0.5); // Add 0.5 to prevent sub-pixel gaps
            } else if (dotStyle === "circular") {
              // Perfect circles
              ctx.beginPath();
              ctx.arc(
                x + cellSize / 2,
                y + cellSize / 2,
                (cellSize / 2) * 0.85,
                0,
                2 * Math.PI
              );
              ctx.fill();
            } else if (dotStyle === "rounded") {
              // Slightly rounded pixels
              drawRoundRect(ctx, x + 0.05 * cellSize, y + 0.05 * cellSize, cellSize * 0.9, cellSize * 0.9, cellSize * 0.25);
              ctx.fill();
            }
          }
        }
      }

      // 3. Draw the center logo if present
      if (logoSrc) {
        const logoImage = new Image();
        logoImage.src = logoSrc;
        logoImage.crossOrigin = "anonymous";
        logoImage.onload = () => {
          const logoWidth = drawSize * logoSize;
          const logoX = margin + (drawSize - logoWidth) / 2;
          const logoY = margin + (drawSize - logoWidth) / 2;

          // Draw solid background card for logo
          ctx.fillStyle = bgColor;
          const bgPadding = Math.max(4, cellSize * 0.4);
          drawRoundRect(
            ctx,
            logoX - bgPadding,
            logoY - bgPadding,
            logoWidth + bgPadding * 2,
            logoWidth + bgPadding * 2,
            Math.max(6, logoWidth * 0.15)
          );
          ctx.fill();

          // Draw logo image
          ctx.drawImage(logoImage, logoX, logoY, logoWidth, logoWidth);

          // Report canvas is ready with logo drawn
          if (onCanvasReady) {
            onCanvasReady(canvas);
          }
        };
      } else {
        // No logo, canvas is ready immediately
        if (onCanvasReady) {
          onCanvasReady(canvas);
        }
      }
    } catch (err) {
      console.error("Failed to generate QR Code:", err);
    }
  }, [
    value,
    fgColor,
    bgColor,
    gradient,
    gradientColor,
    gradientType,
    dotStyle,
    eyeStyle,
    logoSrc,
    logoSize,
    errorCorrectionLevel,
    size,
    includeMargin,
    onCanvasReady,
  ]);

  return (
    <div 
      className="relative flex items-center justify-center p-3.5 rounded-2xl border transition-all duration-300 max-w-full bg-black/20"
      style={{ 
        boxShadow: "var(--glow-shadow)", 
        borderColor: "color-mix(in srgb, var(--accent) 25%, var(--border))" 
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-auto aspect-square max-w-[260px] sm:max-w-[320px] rounded-xl shadow-xl transition-all duration-300"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}

// Helper for canvas drawing with roundRect support (custom fallback helper)
function drawRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof context.roundRect === "function") {
    context.beginPath();
    context.roundRect(x, y, w, h, r);
    context.closePath();
  } else {
    if (r > w / 2) r = w / 2;
    if (r > h / 2) r = h / 2;
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + w - r, y);
    context.quadraticCurveTo(x + w, y, x + w, y + r);
    context.lineTo(x + w, y + h - r);
    context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    context.lineTo(x + r, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  }
}

