"use client";

import dynamic from "next/dynamic";

const ShipTrackingMap = dynamic(
  () => import("@/app/components/ShipTrackingMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[408px] overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a14] animate-pulse">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/8">
          <div className="h-4 w-4 rounded-full bg-white/10" />
          <div className="h-3 w-48 rounded bg-white/10" />
        </div>
        <div className="flex items-center justify-center h-full text-white/20 text-sm pb-12">
          Carregando mapa…
        </div>
      </div>
    ),
  }
);

export type ShipTrackingMapProps = {
  departureDate: string;
  arrivalDate?: string | null;
  shipName?: string | null;
  animalsOnBoard: number;
  lotName: string;
  originPort?: string | null;
  destinationPort?: string | null;
};

export default function ShipTrackingMapWrapper(props: ShipTrackingMapProps) {
  return <ShipTrackingMap {...props} />;
}
