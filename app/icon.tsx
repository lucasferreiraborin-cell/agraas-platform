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
        }}
      >
        <svg width="38" height="47" viewBox="0 0 64 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M52 14C48 8 40 4 32 6c-12 3-22 14-22 28 0 14 8 26 22 38 1-14 5-26 14-36 6-7 10-14 6-22z"
            fill="#ffffff"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
