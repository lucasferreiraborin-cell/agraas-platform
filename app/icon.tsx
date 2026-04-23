import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2E8B3E 0%, #1E5E26 100%)",
          borderRadius: 12,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: "-0.08em",
          }}
        >
          A
        </span>
      </div>
    ),
    { ...size },
  );
}
