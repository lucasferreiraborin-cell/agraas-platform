"use client";

import dynamic from "next/dynamic";

const IABreakdown = dynamic(() => import("./IABreakdown"), { ssr: false });

type IARow = {
  service_number: number;
  inseminated: number | null;
  diagnosed: number | null;
  pregnant: number | null;
  conception_rate: number | null;
};

export default function IABreakdownWrapper({ rows }: { rows: IARow[] }) {
  return <IABreakdown rows={rows} />;
}
