import { keccak256, toHex } from "viem";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { responseId } = body;
  if (responseId === undefined) {
    return NextResponse.json({ error: "responseId required" }, { status: 400 });
  }

  // Simulate TEE processing delay (10-15 seconds)
  await new Promise((r) => setTimeout(r, 10_000 + Math.random() * 5_000));

  // Generate mock attestation
  const attestationInput = `${responseId}-${Date.now()}`;
  const attestation = keccak256(toHex(new TextEncoder().encode(attestationInput)));

  return NextResponse.json({
    accepted: true,
    attestation,
    responseId: Number(responseId),
  });
}
