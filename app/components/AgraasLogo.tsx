"use client";

const BRAND_GREEN = "#2E8B3E";

/**
 * Agraas leaf mark (símbolo) — folha vertical com nervura central diagonal.
 * Inspirado no logo oficial da marca.
 */
export function AgraasLeaf({ size = 48, color = BRAND_GREEN }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Agraas"
      role="img"
    >
      {/* Folha: forma de gota levemente inclinada, mais fina na base, bulbosa no topo */}
      <path
        d="M52 14C48 8 40 4 32 6c-12 3-22 14-22 28 0 14 8 26 22 38 1-14 5-26 14-36 6-7 10-14 6-22z"
        fill={color}
      />
      {/* Nervura central diagonal — separa a folha em duas metades */}
      <path
        d="M14 62 C22 48 34 34 52 14"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * Agraas lockup completo — símbolo + wordmark lado a lado.
 * Use quando tiver espaço horizontal (navs desktop, footer, hero).
 */
export function AgraasLockup({
  size = 32,
  color = BRAND_GREEN,
  variant = "color",
}: {
  size?: number;
  color?: string;
  variant?: "color" | "white";
}) {
  const strokeColor = variant === "white" ? "#ffffff" : color;
  const textColor = variant === "white" ? "#ffffff" : color;

  return (
    <div className="inline-flex items-center gap-2.5" style={{ height: size }}>
      <AgraasLeaf size={size} color={variant === "white" ? "#ffffff" : color} />
      <span
        style={{
          fontSize: size * 0.78,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: textColor,
          lineHeight: 1,
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        }}
      >
        Agraas
      </span>
    </div>
  );
}

/**
 * Default export — lockup padrão para uso geral (navbar, footer).
 */
export default function AgraasLogo({ size = 32 }: { size?: number }) {
  return <AgraasLockup size={size} />;
}
