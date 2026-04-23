interface SectionDividerProps {
  variant?: "slope" | "curve" | "wave" | "grid";
  from?: string;
  to?: string;
  flip?: boolean;
  className?: string;
}

const VARIANT_HEIGHT: Record<Required<SectionDividerProps>["variant"], number> = {
  slope: 80,
  curve: 100,
  wave: 90,
  grid:  60,
};

export default function SectionDivider({
  variant = "slope",
  from = "var(--bg)",
  to = "#0f3517",
  flip = false,
  className = "",
}: SectionDividerProps) {
  const h = VARIANT_HEIGHT[variant];

  const path = (() => {
    switch (variant) {
      case "slope":
        return flip
          ? `M0 ${h} L1440 0 L1440 ${h} Z`
          : `M0 0 L1440 ${h} L0 ${h} Z`;
      case "curve":
        return flip
          ? `M0 ${h} C480 0 960 0 1440 ${h} Z`
          : `M0 0 C480 ${h} 960 ${h} 1440 0 L1440 ${h} L0 ${h} Z`;
      case "wave":
        return flip
          ? `M0 ${h} C360 ${h * 0.2} 720 ${h * 1.1} 1080 ${h * 0.55} S1440 0 1440 0 L1440 ${h} Z`
          : `M0 0 C360 ${h * 0.8} 720 ${-h * 0.1} 1080 ${h * 0.45} S1440 ${h} 1440 ${h} L0 ${h} Z`;
      case "grid":
      default:
        return null;
    }
  })();

  if (variant === "grid") {
    return (
      <div
        aria-hidden
        className={`relative h-[60px] w-full overflow-hidden ${className}`}
        style={{
          background: `linear-gradient(180deg, ${from} 0%, ${to} 100%)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(hsla(0,0%,100%,.04) 1px, transparent 1px), linear-gradient(90deg, hsla(0,0%,100%,.04) 1px, transparent 1px)",
            backgroundSize: "4rem 4rem",
          }}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className={`relative w-full ${className}`}
      style={{
        height: h,
        background: from,
      }}
    >
      <svg
        width="100%"
        height={h}
        viewBox={`0 0 1440 ${h}`}
        preserveAspectRatio="none"
        className="absolute inset-0 block"
      >
        <path d={path ?? ""} fill={to} />
      </svg>
    </div>
  );
}
