import { NextResponse } from "next/server";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "http://52.243.51.231:8545";

export async function POST(request: Request) {
  try {
    const body = await request.text();

    const resp = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32603, message: e.message } },
      { status: 502 },
    );
  }
}
