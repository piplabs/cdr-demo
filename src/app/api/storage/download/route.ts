import { NextRequest } from "next/server";

const GATEWAY_URL = "https://w3s.link/ipfs";

export async function GET(request: NextRequest) {
  const cid = request.nextUrl.searchParams.get("cid");
  if (!cid) {
    return new Response(JSON.stringify({ error: "cid parameter required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const response = await fetch(`${GATEWAY_URL}/${cid}`);
    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: `Gateway fetch failed: ${response.status}`,
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    const bytes = await response.arrayBuffer();
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(bytes.byteLength),
      },
    });
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Download failed",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
