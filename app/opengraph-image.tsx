import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Agraas — O agro do Brasil, auditável em tempo real";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px 90px",
          background:
            "linear-gradient(135deg, #0f3517 0%, #1E5E26 55%, #2E8B3E 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Green glow */}
        <div
          style={{
            position: "absolute",
            right: -200,
            top: -200,
            width: 700,
            height: 700,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(46,139,62,0.4) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        {/* Top: logo + label */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2E8B3E",
              fontSize: 38,
              fontWeight: 700,
              letterSpacing: "-0.08em",
            }}
          >
            A
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                color: "white",
                fontSize: 32,
                fontWeight: 600,
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
            >
              Agraas
            </span>
            <span
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 14,
                fontWeight: 500,
                marginTop: 4,
              }}
            >
              Plataforma do agro brasileiro
            </span>
          </div>
        </div>

        {/* Center: main claim */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "relative",
            maxWidth: 900,
          }}
        >
          <span
            style={{
              color: "#8dbc5f",
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            Plataforma em operação · Jussara-GO
          </span>
          <span
            style={{
              color: "white",
              fontSize: 82,
              fontWeight: 500,
              letterSpacing: "-0.035em",
              lineHeight: 0.98,
            }}
          >
            O agro do Brasil,
          </span>
          <span
            style={{
              color: "rgba(255,255,255,0.88)",
              fontSize: 82,
              fontWeight: 500,
              letterSpacing: "-0.035em",
              lineHeight: 0.98,
              fontStyle: "italic",
            }}
          >
            auditável em tempo real.
          </span>
        </div>

        {/* Bottom: KPIs */}
        <div
          style={{
            display: "flex",
            gap: 48,
            position: "relative",
            borderTop: "1px solid rgba(255,255,255,0.15)",
            paddingTop: 28,
          }}
        >
          {[
            { v: "5", l: "cadeias integradas" },
            { v: "104+", l: "módulos na plataforma" },
            { v: "1", l: "passaporte por animal" },
          ].map((k) => (
            <div key={k.l} style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  color: "white",
                  fontSize: 38,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                {k.v}
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  marginTop: 8,
                }}
              >
                {k.l}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
