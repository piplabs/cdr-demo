import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CDR — Privacy Infra for AI. Threshold-encrypted data vaults on Story L1.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "linear-gradient(180deg, #0b0f17 0%, #141924 100%)",
          color: "#f4f6fa",
          fontFamily:
            "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          position: "relative",
        }}
      >
        {/* Indigo glow — top right */}
        <div
          style={{
            position: "absolute",
            top: "-260px",
            right: "-220px",
            width: "900px",
            height: "900px",
            display: "flex",
            background:
              "radial-gradient(circle, rgba(79,70,229,0.45) 0%, rgba(79,70,229,0) 65%)",
          }}
        />
        {/* Emerald glow — bottom left */}
        <div
          style={{
            position: "absolute",
            bottom: "-260px",
            left: "-220px",
            width: "900px",
            height: "900px",
            display: "flex",
            background:
              "radial-gradient(circle, rgba(5,150,105,0.32) 0%, rgba(5,150,105,0) 65%)",
          }}
        />

        {/* Top row: logo + domain */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                background: "#ffffff",
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              }}
            >
              {/* Story Protocol "S" mark */}
              <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
                <path
                  fill="#0b0f17"
                  d="M16 3C9.4 3 5 6.2 5 11c0 4.5 3.4 6.7 10 7.9l2 .4c3.7.7 5 1.4 5 3.2 0 2-2.6 3.3-6 3.3s-6-1.3-6-3.3H5c0 5.2 4.6 8.5 11 8.5s11-3.3 11-8.5c0-4.5-3.4-6.7-10-7.9l-2-.4C11.3 13.5 10 12.8 10 11c0-2 2.6-3.3 6-3.3s6 1.3 6 3.3h5c0-4.8-4.4-8-11-8z"
                />
              </svg>
            </div>
            <div
              style={{
                fontSize: "30px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#f4f6fa",
                display: "flex",
              }}
            >
              Confidential Data Rails
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 18px",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.04)",
              fontSize: "20px",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "#f4f6fa",
            }}
          >
            usecdr.dev
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: "92px",
              lineHeight: 1.04,
              fontWeight: 700,
              letterSpacing: "-0.035em",
              color: "#f4f6fa",
              maxWidth: "1040px",
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            <span>Private data,&nbsp;</span>
            <span
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #a5b4fc 0%, #6ee7b7 55%, #93c5fd 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              predictable rails.
            </span>
          </div>
          <div
            style={{
              marginTop: "28px",
              fontSize: "28px",
              lineHeight: 1.4,
              color: "#c9d1de",
              maxWidth: "1040px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex" }}>
              Threshold encryption powered by a decentralized key network.
            </div>
            <div style={{ display: "flex" }}>
              Store, share, and trade encrypted data with on-chain guarantees.
            </div>
          </div>
        </div>

        {/* Bottom row: feature pills + brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 14px 10px 16px",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#8a94a6",
              }}
            >
              Demo
            </div>
            <div
              style={{
                display: "flex",
                width: "1px",
                height: "18px",
                background: "rgba(255,255,255,0.14)",
              }}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              {[
                { label: "Private Storage", dot: "#818cf8" },
                { label: "Data Marketplace", dot: "#34d399" },
              ].map((pill) => (
                <div
                  key={pill.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 12px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.06)",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#e6ebf4",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: "7px",
                      height: "7px",
                      borderRadius: "999px",
                      background: pill.dot,
                    }}
                  />
                  {pill.label}
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#8a94a6",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            Built on Story L1
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
