"use client";

import { useState } from "react";
import Link from "next/link";

export default function MarketplaceCTAModal({ action, onClose }: { action: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-4 w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600" type="button">✕</button>

        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
            <span className="text-3xl">🌾</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Junte-se ao maior marketplace do agronegócio</h2>
          <p className="mt-2 text-sm text-gray-500">
            Para {action}, crie sua conta Agraas gratuita.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <Link href="/cadastro"
            className="block w-full rounded-xl bg-[#3B5E2B] py-3 text-center text-sm font-bold text-white hover:bg-[#2d4a21] transition">
            Criar conta gratuita
          </Link>
          <Link href="/login"
            className="block w-full rounded-xl border border-gray-200 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
            Já tenho conta — Entrar
          </Link>
        </div>
      </div>
    </div>
  );
}
