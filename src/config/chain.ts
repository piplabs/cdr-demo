import { defineChain } from "viem";

export const cdrDevnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 90931),
  name: "CDR Devnet",
  nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL ?? "http://52.243.51.231:8545"],
    },
  },
});
