"use client";

export default function AgraasLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Agraas" role="img">
      {/* Leaf shape */}
      <path
        d="M32 8C20 8 10 20 10 34c0 10 6 18 14 22 2-4 5-10 8-18 3 8 6 14 8 18 8-4 14-12 14-22C54 20 44 8 32 8z"
        fill="#5d9c44"
      />
      {/* Leaf vein */}
      <path
        d="M32 16v32"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M32 22c-6 4-10 10-12 16M32 22c6 4 10 10 12 16"
        stroke="white"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.35"
      />
      {/* Cow silhouette hint */}
      <circle cx="26" cy="32" r="2" fill="white" opacity="0.7" />
      <circle cx="38" cy="32" r="2" fill="white" opacity="0.7" />
    </svg>
  );
}
