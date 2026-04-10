import { NextRequest, NextResponse } from "next/server";

/**
 * Generic same-origin pass-through to the CometBFT RPC on port 26657.
 *
 * Exists because the browser cannot talk to the CometBFT node directly:
 *   - the node is served over plain HTTP (mixed-content blocks it on HTTPS pages)
 *   - CometBFT RPC does not set CORS headers
 *
 * The actual endpoint lives in the server-only `COMETBFT_RPC_URL` env var
 * and is never shipped to the browser. The SDK is configured with
 * `cometRpcUrl: "/api/comet"` and builds URLs like
 * `/api/comet/abci_query?path=...&data=...`, which this route proxies.
 *
 * Read-only: only GET is supported. All DKG protobuf encoding/decoding lives
 * in the SDK; this route is a byte pipe.
 */

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const upstreamBase = process.env.COMETBFT_RPC_URL;
  if (!upstreamBase) {
    return NextResponse.json(
      { error: "COMETBFT_RPC_URL is not configured" },
      { status: 500 },
    );
  }

  const { path } = await ctx.params;
  const base = upstreamBase.replace(/\/+$/, "");
  const upstreamUrl = `${base}/${path.join("/")}${req.nextUrl.search}`;

  try {
    const resp = await fetch(upstreamUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await resp.text();
    return new NextResponse(body, {
      status: resp.status,
      headers: {
        "content-type": resp.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `comet proxy upstream failed: ${msg}` },
      { status: 502 },
    );
  }
}
