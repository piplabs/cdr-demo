import { createWalletClient, createPublicClient, http, parseEther, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { cdrDevnet } from "@/config/chain";
import { NextResponse } from "next/server";

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const DRIP_AMOUNT = parseEther("1"); // 1 IP

export async function POST(request: Request) {
  const privKey = process.env.CDR_FAUCET_PRIVATE_KEY;
  if (!privKey) {
    return NextResponse.json({ error: "Faucet not configured" }, { status: 503 });
  }

  const body = await request.json();
  const { address } = body;

  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const normalized = address.toLowerCase();
  const lastRequest = cooldowns.get(normalized);
  if (lastRequest && Date.now() - lastRequest < COOLDOWN_MS) {
    const waitSecs = Math.ceil((COOLDOWN_MS - (Date.now() - lastRequest)) / 1000);
    return NextResponse.json(
      { error: `Rate limited. Try again in ${waitSecs}s` },
      { status: 429 },
    );
  }

  const account = privateKeyToAccount(privKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: cdrDevnet,
    transport: http(cdrDevnet.rpcUrls.default.http[0]),
  });

  const publicClient = createPublicClient({
    chain: cdrDevnet,
    transport: http(cdrDevnet.rpcUrls.default.http[0]),
  });

  try {
    const balance = await publicClient.getBalance({ address: address as `0x${string}` });
    if (balance >= parseEther("0.5")) {
      return NextResponse.json(
        { error: "Address already has 0.5 IP or more. Faucet is only available for addresses with less than 0.5 IP." },
        { status: 400 },
      );
    }
    const txHash = await walletClient.sendTransaction({
      to: address as `0x${string}`,
      value: DRIP_AMOUNT,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    cooldowns.set(normalized, Date.now());

    return NextResponse.json({ txHash, amount: "1" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
