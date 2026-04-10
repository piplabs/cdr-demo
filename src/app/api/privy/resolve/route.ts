// Pregenerates Privy embedded wallets for a batch of emails. Same appId +
// same email deterministically yields the same wallet across the sender's
// pre-create and the recipient's later login — that's the identity invariant
// the whole sharing flow hinges on.

import { NextRequest, NextResponse } from "next/server";
import { EMAIL_RE } from "@/lib/recipients";

const PRIVY_API = "https://auth.privy.io/api/v1/users";
const MAX_EMAILS = 3;

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  // Reap expired entries so unique-IP traffic can't grow the map unbounded.
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
  const bucket = buckets.get(ip);
  if (!bucket) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT) return false;
  bucket.count += 1;
  return true;
}

type PrivyLinkedAccount = { type: string; address?: string };
type PrivyUserResponse = {
  id?: string;
  linked_accounts?: PrivyLinkedAccount[];
};

async function resolveOne(
  email: string,
  appId: string,
  appSecret: string,
): Promise<`0x${string}`> {
  const res = await fetch(PRIVY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "privy-app-id": appId,
      Authorization:
        "Basic " + Buffer.from(`${appId}:${appSecret}`).toString("base64"),
    },
    body: JSON.stringify({
      linked_accounts: [{ type: "email", address: email }],
      wallets: [{ chain_type: "ethereum" }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Privy ${res.status}: ${body.slice(0, 200) || "no body"}`,
    );
  }

  const data = (await res.json()) as PrivyUserResponse;
  const walletAccount = data.linked_accounts?.find(
    (a) => a.type === "wallet" && typeof a.address === "string",
  );
  if (!walletAccount?.address) {
    throw new Error(`Privy returned no wallet for ${email}`);
  }
  return walletAccount.address as `0x${string}`;
}

export async function POST(req: NextRequest) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) {
    console.error("[privy/resolve] missing PRIVY_APP_ID or PRIVY_APP_SECRET");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  if (!rateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 },
    );
  }

  let body: { emails?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawEmails = body.emails;
  if (!Array.isArray(rawEmails)) {
    return NextResponse.json(
      { error: "emails must be an array" },
      { status: 400 },
    );
  }
  if (rawEmails.length === 0 || rawEmails.length > MAX_EMAILS) {
    return NextResponse.json(
      { error: `emails must have 1 to ${MAX_EMAILS} entries` },
      { status: 400 },
    );
  }

  const emails: string[] = [];
  for (const entry of rawEmails) {
    if (typeof entry !== "string") {
      return NextResponse.json(
        { error: "emails must all be strings" },
        { status: 400 },
      );
    }
    const normalized = entry.trim().toLowerCase();
    if (normalized.length > 254 || !EMAIL_RE.test(normalized)) {
      return NextResponse.json(
        { error: `invalid email: ${entry}` },
        { status: 400 },
      );
    }
    emails.push(normalized);
  }

  try {
    const results = await Promise.all(
      emails.map(async (email) => ({
        email,
        address: await resolveOne(email, appId, appSecret),
      })),
    );
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[privy/resolve] upstream failure", err);
    return NextResponse.json(
      { error: "Could not resolve recipients via Privy" },
      { status: 502 },
    );
  }
}
