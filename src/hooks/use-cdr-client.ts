"use client";

import { useMemo } from "react";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { CDRClient } from "@piplabs/cdr-sdk";
import { cdrDevnet } from "@/config/chain";

export function useCDRClient() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();

  const wallet = wallets[0];

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: cdrDevnet,
        transport: http(cdrDevnet.rpcUrls.default.http[0]),
      }),
    [],
  );

  const client = useMemo(() => {
    // Cast needed: cdr-sdk bundles its own viem types which are structurally
    // identical but nominally distinct from the app's copy of viem.
    return new CDRClient({
      network: "testnet",
      publicClient: publicClient as any,
      dkgSource: "cosmos-abci",
      cometRpcUrl: "/api/comet",
    });
  }, [publicClient]);

  const getWriteClient = async () => {
    if (!wallet) throw new Error("No wallet connected");
    const provider = await wallet.getEthereumProvider();
    const walletClient = createWalletClient({
      chain: cdrDevnet,
      transport: custom(provider),
      account: wallet.address as `0x${string}`,
    });
    return new CDRClient({
      network: "testnet",
      publicClient: publicClient as any,
      walletClient: walletClient as any,
      dkgSource: "cosmos-abci",
      cometRpcUrl: "/api/comet",
    });
  };

  return {
    client,
    publicClient,
    getWriteClient,
    address: wallet?.address as `0x${string}` | undefined,
    connected: authenticated && !!wallet,
  };
}
