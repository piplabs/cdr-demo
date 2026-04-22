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
        {/* Top row: Story wordmark + domain */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", color: "#ffffff" }}>
            {/* Story wordmark */}
            <svg width="200" height="46" viewBox="0 0 401 92" fill="currentColor">
              <path d="M34.9,92C54,92,69.5,80.5,69.5,61.1C69.5,43,56,30.3,34.9,30.3v13.4c-9.7,0-16.9-4.3-16.9-13.1c0-8.8,6.2-14,17.4-14c9.2,0,14.7,3.8,16.1,8.8h17C67.2,11.4,54,0,35,0C14.9,0,0.6,12.6,0.6,31c0,18.4,14.9,29.5,34.3,29.5V47.8c10.3,0,17.4,4.6,17.4,13.7c0,9-7.2,14.1-17.3,14.1c-9.1,0-15.4-4-17.3-9.5H0C2.5,80.6,15.8,92,34.9,92z" />
              <polygon points="101,90 120.3,90 120.3,19.5 147.9,19.5 147.9,2.1 73.4,2.1 73.4,19.5 101,19.5" />
              <path d="M192.9,92v-9c20.3,0,35.5-15.9,35.5-37h9.4c0-25-19.4-46-44.9-46c-27.4,0-45.1,19.1-45.1,46C147.8,71,167.4,92,192.9,92z M220.5,46h-8.6c0,11.4-8.4,19.8-19,19.8v8.6c-15.5,0-26.7-12.9-26.7-28.3c0-16.7,10-28,26.7-28C208.4,18,220.5,29.9,220.5,46z" />
              <path d="M297.8,32.5c0,9-4.9,13.4-14.2,13.4h-17.8V19.6H283C292.3,19.6,297.8,23.5,297.8,32.5z M246.8,90h19.1V63.3h17.8c1.1,0,2.1-0.1,3.2-0.1L300.7,90h20.4L304,57.8c8.1-5.6,12.1-14.8,12.1-25.2c0-17-10.4-30.4-33.1-30.4h-36.2V90z" />
              <path d="M354.8,90h18.4V52.9L401,2.2h-21.2l-25,46.9V90z M338.7,40.6h20.7L338.7,2.2h-20.7L338.7,40.6z" />
            </svg>
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
              fontSize: "72px",
              lineHeight: 1.08,
              letterSpacing: "-0.04em",
              color: "#ffffff",
              maxWidth: "1040px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex" }}>Private data on-chain</div>
            <div style={{ display: "flex" }}>Confidential Data Rails Demo</div>
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
              Store, secure, and share private data on-chain.
            </div>
            <div style={{ display: "flex" }}>
              Threshold encryption powered by a decentralized network.
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
