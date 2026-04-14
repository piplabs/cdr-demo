import { defineChain } from "viem";

/**
 * Public HTTPS RPC for Story Aeneid. Used as the chain's default so third-party
 * consumers of `cdrDevnet` (notably Privy's embedded wallet and block watchers)
 * talk to the upstream node directly instead of hammering our own /api/rpc
 * proxy with wallet-state heartbeats.
 *
 * The CDR public client in `use-cdr-client.ts` still explicitly uses /api/rpc
 * — that proxy exists so the app can swap RPC endpoints server-side without
 * redeploying the frontend, and so credentials (if ever added) stay off the
 * browser.
 */
export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://aeneid.storyrpc.io";

export const cdrDevnet = defineChain({
  id: 1315,
  name: "Story Aeneid Testnet",
  nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
  rpcUrls: {
    default: {
      http: [RPC_URL],
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
});
