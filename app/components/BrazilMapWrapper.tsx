"use client";

import dynamic from "next/dynamic";
import type { PropertyPin } from "./BrazilMap";

const BrazilMap = dynamic(() => import("./BrazilMap"), { ssr: false });

export default function BrazilMapWrapper({
  properties,
  selectedId,
  onSelect,
}: {
  properties: PropertyPin[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  return <BrazilMap properties={properties} selectedId={selectedId} onSelect={onSelect} />;
}
