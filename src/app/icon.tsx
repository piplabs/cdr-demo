import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
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
          borderRadius: 8,
          background:
            "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #059669 100%)",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M7 11V8a5 5 0 0 1 10 0v3"
            stroke="white"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <rect
            x="5"
            y="11"
            width="14"
            height="9"
            rx="2"
            stroke="white"
            strokeWidth="2.4"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
