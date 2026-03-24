"use client";

import dynamic from "next/dynamic";

const InsumosBar = dynamic(() => import("./InsumosBar"), { ssr: false });

type InsumosRow = { category: string; value: number; pct: number };

export default function InsumosBarWrapper({ rows }: { rows: InsumosRow[] }) {
  return <InsumosBar rows={rows} />;
}
