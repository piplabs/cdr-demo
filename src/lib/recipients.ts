/**
 * Pure helpers for classifying and deduplicating recipient inputs for
 * CDR private-storage sharing. A recipient is either an email (which
 * must be resolved via Privy to a wallet address) or a raw 0x address.
 */

export type ClassifiedRecipient =
  | { kind: "email"; value: string }
  | { kind: "address"; value: `0x${string}` }
  | { kind: "invalid"; value: string; reason: string };

// RFC 5322-ish: intentionally lenient. Server-side also validates.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function classifyRecipient(raw: string): ClassifiedRecipient {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { kind: "invalid", value: raw, reason: "empty" };
  }
  if (trimmed.length > 254) {
    return { kind: "invalid", value: raw, reason: "too long" };
  }
  if (ADDRESS_RE.test(trimmed)) {
    return { kind: "address", value: trimmed as `0x${string}` };
  }
  if (EMAIL_RE.test(trimmed)) {
    return { kind: "email", value: trimmed.toLowerCase() };
  }
  return {
    kind: "invalid",
    value: raw,
    reason: "not a valid email or 0x address",
  };
}

/**
 * Dedupe a list of addresses case-insensitively, preserving the first
 * occurrence's original casing.
 */
export function dedupeAddresses(
  addrs: `0x${string}`[],
): `0x${string}`[] {
  const seen = new Set<string>();
  const out: `0x${string}`[] = [];
  for (const a of addrs) {
    const key = a.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}
