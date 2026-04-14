"use client";

import { useEffect, useState } from "react";
import { createWalletClient, custom } from "viem";
import { CONTRACTS, deadManSwitchConditionAbi } from "@/config/contracts";
import { useCDRClient } from "@/hooks/use-cdr-client";
import { useWallets } from "@privy-io/react-auth";
import { cdrDevnet } from "@/config/chain";
import { formatBlocksAsDuration } from "@/lib/block-time";

type VaultState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      creator: `0x${string}`;
      unlockBlock: bigint;
      duration: bigint;
      creatorCanRead: boolean;
      isCallerWhitelisted: boolean;
      publicAfterUnlock: boolean;
      currentBlock: bigint;
    };

export function DeadManSwitchReveal(props: {
  uuid: number;
  onUnlocked: () => void;
}) {
  const { uuid, onUnlocked } = props;
  const { publicClient, address } = useCDRClient();
  const { wallets } = useWallets();
  const [state, setState] = useState<VaultState>({ kind: "loading" });
  const [extending, setExtending] = useState(false);
  const [extendError, setExtendError] = useState("");

  async function loadState() {
    try {
      const [info, whitelisted, currentBlock] = await Promise.all([
        publicClient.readContract({
          address: CONTRACTS.DEADMAN_SWITCH_CONDITION,
          abi: deadManSwitchConditionAbi,
          functionName: "getVaultInfo",
          args: [uuid],
        }) as Promise<readonly [`0x${string}`, bigint, bigint, boolean, boolean, boolean]>,
        address
          ? (publicClient.readContract({
              address: CONTRACTS.DEADMAN_SWITCH_CONDITION,
              abi: deadManSwitchConditionAbi,
              functionName: "isWhitelisted",
              args: [uuid, address],
            }) as Promise<boolean>)
          : Promise.resolve(false),
        publicClient.getBlockNumber(),
      ]);
      const [creator, unlockBlock, duration, creatorCanRead, registered, publicAfterUnlock] = info;
      if (!registered) {
        setState({ kind: "error", message: "Vault not registered on DeadManSwitchCondition." });
        return;
      }
      setState({
        kind: "ready",
        creator,
        unlockBlock,
        duration,
        creatorCanRead,
        isCallerWhitelisted: whitelisted,
        publicAfterUnlock,
        currentBlock,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setState({ kind: "error", message: msg });
    }
  }

  useEffect(() => {
    loadState();
    const t = setInterval(loadState, 2_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid, address]);

  async function handleExtend() {
    if (state.kind !== "ready") return;
    setExtending(true);
    setExtendError("");
    try {
      const wallet = wallets[0];
      if (!wallet) throw new Error("No wallet connected");
      const provider = await wallet.getEthereumProvider();
      const walletClient = createWalletClient({
        chain: cdrDevnet,
        transport: custom(provider),
        account: wallet.address as `0x${string}`,
      });
      const hash = await walletClient.writeContract({
        address: CONTRACTS.DEADMAN_SWITCH_CONDITION,
        abi: deadManSwitchConditionAbi,
        functionName: "extend",
        args: [uuid],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await loadState();
    } catch (err: unknown) {
      setExtendError(err instanceof Error ? err.message : String(err));
    } finally {
      setExtending(false);
    }
  }

  if (state.kind === "loading") {
    return <p className="text-sm text-white/40">Loading vault state...</p>;
  }
  if (state.kind === "error") {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
        {state.message}
      </div>
    );
  }

  const isCreator = address && state.creator.toLowerCase() === address.toLowerCase();
  const remainingBlocks =
    state.currentBlock >= state.unlockBlock ? 0n : state.unlockBlock - state.currentBlock;
  const isUnlocked = remainingBlocks === 0n;
  const canDecrypt =
    isUnlocked
      ? state.isCallerWhitelisted || state.publicAfterUnlock
      : isCreator && state.creatorCanRead;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
        <p className="text-xs font-medium text-white/50">Dead man's switch</p>
        {isUnlocked ? (
          <p className="mt-1 text-sm text-green-300">
            {state.publicAfterUnlock
              ? "Unlocked — anyone can decrypt."
              : "Unlocked — recipients can decrypt."}
          </p>
        ) : (
          <p className="mt-1 text-sm text-amber-300">
            Locked — ~{formatBlocksAsDuration(remainingBlocks)} remaining
            <span className="ml-2 text-[11px] text-white/40">
              ({remainingBlocks.toString()} blocks)
            </span>
          </p>
        )}
        <p className="mt-1 text-[11px] text-white/30">
          Creator:{" "}
          {isCreator ? (
            <span className="rounded-full border border-white/15 bg-white/[0.06] px-1.5 py-[1px] text-[10px] font-medium uppercase tracking-wide text-white/70">
              owner
            </span>
          ) : (
            <>
              {state.creator.slice(0, 6)}…{state.creator.slice(-4)}
            </>
          )}
          {" · "}Duration: {formatBlocksAsDuration(state.duration)}
          {" · "}Creator-visible while locked: {state.creatorCanRead ? "yes" : "no"}
        </p>
      </div>

      {isCreator ? (
        ((!isUnlocked) || canDecrypt) && (
          <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-white/40">
              Owner actions
            </p>
            {!isUnlocked && (
              <>
                <button
                  onClick={handleExtend}
                  disabled={extending}
                  className="liquid-button liquid-button-indigo rounded-2xl px-4 py-2.5 text-sm font-medium disabled:opacity-40"
                >
                  {extending ? "Extending..." : `Extend (+${formatBlocksAsDuration(state.duration)})`}
                </button>
                {extendError && (
                  <p className="text-xs text-red-400/80">{extendError}</p>
                )}
              </>
            )}
            {canDecrypt && (
              <button
                onClick={onUnlocked}
                className="liquid-button rounded-2xl px-4 py-2.5 text-sm font-medium"
              >
                Reveal Contents
              </button>
            )}
            {!canDecrypt && !isUnlocked && !state.creatorCanRead && (
              <p className="text-xs text-white/40">
                You chose not to read this vault while locked. Reveal unlocks when the timer expires.
              </p>
            )}
          </div>
        )
      ) : canDecrypt ? (
        <button
          onClick={onUnlocked}
          className="liquid-button rounded-2xl px-4 py-2.5 text-sm font-medium"
        >
          Reveal Contents
        </button>
      ) : !isUnlocked ? (
        <p className="text-xs text-white/40">
          Reveal unlocks when the timer expires.
        </p>
      ) : (
        <p className="text-xs text-white/40">
          This vault is not shared with your wallet.
        </p>
      )}
    </div>
  );
}
