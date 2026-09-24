"use client";

import { useEffect, useRef } from "react";

export function AsciiWaveHorizontal({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const chars = "░▒▓█▓▒░";
    const width = 200;
    const height = 24;

    const animate = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0)";
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.font = "14px JetBrains Mono, monospace";

      // Draw multiple wave layers
      const waveOffsets = [0, 0.3, 0.6];
      
      for (const offset of waveOffsets) {
        for (let x = 0; x < width; x++) {
          const wave1 = Math.sin((x * 0.08) + time + offset * 10) * 3;
          const wave2 = Math.sin((x * 0.12) + time * 1.2 + offset * 5) * 2;
          const wave3 = Math.sin((x * 0.04) + time * 0.6) * 4;
          
          const combinedWave = wave1 + wave2 + wave3;
          const baseY = offset * height;
          const normalizedY = (combinedWave + 9) / 18;
          
          for (let y = 0; y < height; y++) {
            const yNorm = y / height;
            const distance = Math.abs(yNorm - normalizedY);
            
            if (distance < 0.2) {
              const intensity = 1 - (distance / 0.2);
              const charIndex = Math.floor(intensity * (chars.length - 1));
              const char = chars[charIndex];
              
              const alpha = intensity * 0.7 * (1 - offset * 0.5);
              ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
              ctx.fillText(char, x * 10, (y + baseY * 0.3) * 16 + 14);
            }
          }
        }
      }

      time += 0.03;
      animationId = requestAnimationFrame(animate);
    };

    canvas.width = width * 10;
    canvas.height = height * 20;
    animate();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`${className}`}
      style={{ imageRendering: "auto" }}
    />
  );
}
