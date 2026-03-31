// Halal Certified SVG Badge
// Two outer rings, Arabic text, HALAL/CERTIFIED/100%, 4 cardinal stars, lateral ornaments

export function HalalBadgeSVG({ size = 120 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Halal Certified"
      role="img"
    >
      {/* White background */}
      <circle cx="60" cy="60" r="59" fill="white" />

      {/* Outer ring 1 */}
      <circle cx="60" cy="60" r="56" fill="none" stroke="#1a6b3c" strokeWidth="2.5" />

      {/* Outer ring 2 */}
      <circle cx="60" cy="60" r="51" fill="none" stroke="#1a6b3c" strokeWidth="1" />

      {/* 4-pointed stars at cardinal points of outer ring (r=56) */}
      {/* North (60, 4) */}
      <path d="M60,0 L61.06,2.94 L64,4 L61.06,5.06 L60,8 L58.94,5.06 L56,4 L58.94,2.94 Z" fill="#1a6b3c" />
      {/* East (116, 60) */}
      <path d="M116,56 L117.06,58.94 L120,60 L117.06,61.06 L116,64 L114.94,61.06 L112,60 L114.94,58.94 Z" fill="#1a6b3c" />
      {/* South (60, 116) */}
      <path d="M60,112 L61.06,114.94 L64,116 L61.06,117.06 L60,120 L58.94,117.06 L56,116 L58.94,114.94 Z" fill="#1a6b3c" />
      {/* West (4, 60) */}
      <path d="M4,56 L5.06,58.94 L8,60 L5.06,61.06 L4,64 L2.94,61.06 L0,60 L2.94,58.94 Z" fill="#1a6b3c" />

      {/* Divider line above Arabic */}
      <line x1="24" y1="30" x2="96" y2="30" stroke="#1a6b3c" strokeWidth="0.75" />

      {/* Arabic حلال */}
      <text
        x="60" y="54"
        textAnchor="middle"
        fontFamily="serif"
        fontSize="34"
        fontWeight="600"
        fill="#1a6b3c"
      >حلال</text>

      {/* Divider line below Arabic */}
      <line x1="24" y1="62" x2="96" y2="62" stroke="#1a6b3c" strokeWidth="0.75" />

      {/* HALAL */}
      <text
        x="60" y="74"
        textAnchor="middle"
        fontFamily="sans-serif"
        fontSize="11"
        fontWeight="600"
        fill="#1a6b3c"
        letterSpacing="3"
      >HALAL</text>

      {/* Lateral ornaments flanking HALAL */}
      <line x1="12" y1="71" x2="21" y2="71" stroke="#1a6b3c" strokeWidth="0.75" />
      <line x1="99" y1="71" x2="108" y2="71" stroke="#1a6b3c" strokeWidth="0.75" />

      {/* CERTIFIED */}
      <text
        x="60" y="85"
        textAnchor="middle"
        fontFamily="sans-serif"
        fontSize="8"
        fill="#1a6b3c"
        letterSpacing="1.5"
      >CERTIFIED</text>

      {/* 100% */}
      <text
        x="60" y="98"
        textAnchor="middle"
        fontFamily="sans-serif"
        fontSize="11"
        fontWeight="bold"
        fill="#1a6b3c"
      >100%</text>
    </svg>
  );
}
