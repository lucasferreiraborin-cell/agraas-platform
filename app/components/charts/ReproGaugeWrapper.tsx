"use client";

import dynamic from "next/dynamic";

const ReproGauge = dynamic(() => import("./ReproGauge"), { ssr: false });

type Props = { pct: number; apt: number; inseminated: number; toInseminate: number };

export default function ReproGaugeWrapper(props: Props) {
  return <ReproGauge {...props} />;
}
