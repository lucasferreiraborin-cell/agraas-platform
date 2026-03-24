"use client";

import dynamic from "next/dynamic";

const WeightDist = dynamic(() => import("./WeightDist"), { ssr: false });

type WeightRow = { range_label: string; count: number | null; range_order?: number | null };

export default function WeightDistWrapper({ rows }: { rows: WeightRow[] }) {
  return <WeightDist rows={rows} />;
}
