"use client";

import dynamic from "next/dynamic";
import type { PropertyPin } from "./BrazilMap";

const BrazilMap = dynamic(() => import("./BrazilMap"), { ssr: false });

export default function BrazilMapWrapper({ properties }: { properties: PropertyPin[] }) {
  return <BrazilMap properties={properties} />;
}
