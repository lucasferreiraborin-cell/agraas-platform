"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";

interface Props {
  withdrawals7d: number;
  noPesagem30d: number;
  shipmentsStale: number;
  lotsUpcoming: number;
}

function todayKey() {
  return `notification-dismissed-${new Date().toISOString().slice(0, 10)}`;
}

export default function NotificationBanner({
  withdrawals7d, noPesagem30d, shipmentsStale, lotsUpcoming,
}: Props) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    setDismissed(localStorage.getItem(todayKey()) === "1");
  }, []);

  const total = withdrawals7d + noPesagem30d + shipmentsStale + lotsUpcoming;
  if (total === 0 || dismissed) return null;

  const parts: string[] = [];
  if (withdrawals7d > 0) parts.push(`${withdrawals7d} carência${withdrawals7d > 1 ? "s" : ""}`);
  if (noPesagem30d > 0) parts.push(`${noPesagem30d} sem pesagem`);
  if (shipmentsStale > 0) parts.push(`${shipmentsStale} embarque${shipmentsStale > 1 ? "s" : ""} desatualizado${shipmentsStale > 1 ? "s" : ""}`);
  if (lotsUpcoming > 0) parts.push(`${lotsUpcoming} lote${lotsUpcoming > 1 ? "s" : ""} embarcando`);

  function dismiss() {
    localStorage.setItem(todayKey(), "1");
    setDismissed(true);
  }

  return (
    <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5">
      <Bell size={18} className="shrink-0 text-amber-600" />
      <p className="flex-1 text-sm text-amber-800">
        <span className="font-semibold">{total} alerta{total > 1 ? "s" : ""} ativo{total > 1 ? "s" : ""}</span>
        {" — "}
        {parts.join(", ")}
      </p>
      <Link
        href="/alertas"
        className="shrink-0 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
      >
        Ver detalhes
      </Link>
      <button
        onClick={dismiss}
        className="shrink-0 rounded-lg p-1 text-amber-400 transition hover:bg-amber-100 hover:text-amber-600"
        aria-label="Fechar alertas"
      >
        <X size={16} />
      </button>
    </div>
  );
}
