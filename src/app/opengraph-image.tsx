import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CDR — Privacy Infra for AI. Threshold-encrypted data vaults on Story L1.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadDiatype(): Promise<ArrayBuffer | null> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://usecdr.dev");
  try {
    const res = await fetch(`${base}/fonts/ABCDiatypeSemiMono-Regular.woff`);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OpenGraphImage() {
  const fontData = await loadDiatype();

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
          background: "#000000",
          color: "#ffffff",
          fontFamily: "ABCDiatypeSemiMono, ui-monospace, monospace",
          fontWeight: 400,
          fontStyle: "normal",
          letterSpacing: "-0.04em",
        }}
      >
        {/* Top row: logo + domain */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
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
              }}
            >
              {/* Story Protocol "S" mark */}
              <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
                <path
                  fill="#000000"
                  d="M16 3C9.4 3 5 6.2 5 11c0 4.5 3.4 6.7 10 7.9l2 .4c3.7.7 5 1.4 5 3.2 0 2-2.6 3.3-6 3.3s-6-1.3-6-3.3H5c0 5.2 4.6 8.5 11 8.5s11-3.3 11-8.5c0-4.5-3.4-6.7-10-7.9l-2-.4C11.3 13.5 10 12.8 10 11c0-2 2.6-3.3 6-3.3s6 1.3 6 3.3h5c0-4.8-4.4-8-11-8z"
                />
              </svg>
            </div>
            <div
              style={{
                fontSize: "30px",
                letterSpacing: "-0.04em",
                color: "#ffffff",
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
              border: "1px solid rgba(255,255,255,0.2)",
              fontSize: "20px",
              letterSpacing: "-0.04em",
              color: "#ffffff",
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
          }}
        >
          <div
            style={{
              fontSize: "92px",
              lineHeight: 1.04,
              letterSpacing: "-0.04em",
              color: "#ffffff",
              maxWidth: "1040px",
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            <span>Private data, predictable rails.</span>
          </div>
          <div
            style={{
              marginTop: "28px",
              fontSize: "28px",
              lineHeight: 1.4,
              letterSpacing: "-0.04em",
              color: "#a1a1a1",
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
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 14px 10px 16px",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "11px",
                letterSpacing: "-0.04em",
                textTransform: "uppercase",
                color: "#a1a1a1",
              }}
            >
              Demo
            </div>
            <div
              style={{
                display: "flex",
                width: "1px",
                height: "18px",
                background: "rgba(255,255,255,0.2)",
              }}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              {["Private Storage", "Data Marketplace"].map((label) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 12px",
                    borderRadius: "999px",
                    border: "1px solid rgba(255,255,255,0.2)",
                    fontSize: "14px",
                    letterSpacing: "-0.04em",
                    color: "#ffffff",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              fontSize: "16px",
              color: "#a1a1a1",
              letterSpacing: "-0.04em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            Built on Story L1
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [
            {
              name: "ABCDiatypeSemiMono",
              data: fontData,
              weight: 400,
              style: "normal",
            },
          ]
        : undefined,
    },
  );
}
