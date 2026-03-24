import { defineChain } from "viem";

/**
 * The raw (HTTP) RPC URL is used server-side where mixed-content restrictions
 * don't apply.  Client-side code goes through the Next.js /api/rpc proxy so
 * the browser never makes an insecure HTTP request from an HTTPS page.
 */
export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "http://52.243.51.231:8545";

export const cdrDevnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 90931),
  name: "CDR Devnet",
  nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["/api/rpc"],
    },
  },
});
