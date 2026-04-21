import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 38,
          background:
            "linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #059669 100%)",
          boxShadow: "inset 0 2px 0 rgba(255,255,255,0.25)",
        }}
      >
        <svg width="108" height="108" viewBox="0 0 24 24" fill="none">
          <path
            d="M7 11V8a5 5 0 0 1 10 0v3"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <rect
            x="5"
            y="11"
            width="14"
            height="9"
            rx="2"
            stroke="white"
            strokeWidth="2.2"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
