"use client";

import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function AnimalQRCode({ agraasId, animalName }: { agraasId: string; animalName: string }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/passaporte/${agraasId}`
    : `/passaporte/${agraasId}`;

  function downloadQR() {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `passaporte-${agraasId}.png`;
    a.click();
  }

  async function copyLink() {
    const url = `${window.location.origin}/passaporte/${agraasId}`;
    await navigator.clipboard.writeText(url);
    // Brief feedback via button text change
    const btn = document.getElementById("copy-btn");
    if (btn) { btn.textContent = "✓ Copiado!"; setTimeout(() => { btn.textContent = "Copiar link"; }, 2000); }
  }

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        QR Code do passaporte
      </p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Escaneie para acessar o passaporte público — sem login necessário
      </p>

      <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div ref={canvasRef} className="rounded-2xl border border-[var(--border)] p-3 bg-white shadow-sm">
          <QRCodeCanvas
            value={`${typeof window !== "undefined" ? window.location.origin : "https://agraas-platform.vercel.app"}/passaporte/${agraasId}`}
            size={140}
            level="H"
            imageSettings={{
              src: "/logo-qr.png",
              height: 28,
              width: 28,
              excavate: true,
            }}
          />
        </div>

        <div className="flex flex-col gap-3 flex-1 w-full sm:w-auto">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">ID público</p>
            <p className="mt-1 font-mono text-sm font-bold text-[var(--text-primary)]">{agraasId}</p>
          </div>

          <button
            onClick={downloadQR}
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-soft)]"
          >
            ↓ Download QR Code
          </button>

          <button
            id="copy-btn"
            onClick={copyLink}
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-soft)]"
          >
            Copiar link
          </button>
        </div>
      </div>
    </div>
  );
}
