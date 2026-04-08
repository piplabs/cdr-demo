import { defineChain } from "viem";

/**
 * The raw (HTTP) RPC URL is used server-side where mixed-content restrictions
 * don't apply.  Client-side code goes through the Next.js /api/rpc proxy so
 * the browser never makes an insecure HTTP request from an HTTPS page.
 */
export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://aeneid.storyrpc.io";

export const cdrDevnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 1315),
  name: "Story Aeneid Testnet",
  nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["/api/rpc"],
    },
  },
});
