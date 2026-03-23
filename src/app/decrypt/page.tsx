"use client";

import { useState, useRef } from "react";
import { encodeAbiParameters, parseEventLogs, toBytes, toHex, type PublicClient } from "viem";
import { useCDRClient } from "@/hooks/use-cdr-client";
import { CONTRACTS, cdrVaultNFTAbi, licenseTokenAbi } from "@/config/contracts";
import { useWasm } from "@/providers/wasm-provider";
import { StepIndicator, type Step, type StepStatus } from "@/components/step-indicator";
import { TxLink } from "@/components/tx-link";
import { secp256k1 } from "@noble/curves/secp256k1";
import { cdrAbi, contractAddresses } from "@piplabs/cdr-contracts";
import { decryptPartial as eciesDecrypt, tdh2Combine } from "@piplabs/cdr-crypto";
import { uuidToLabel } from "@piplabs/cdr-sdk";
import type { PartialDecryptionEvent } from "@piplabs/cdr-sdk";

type Phase = "idle" | "decrypting" | "done" | "error";

const STEPS = [
  {
    label: "Fetch DKG Params",
    description: "Retrieve the network's threshold public key and quorum parameters.",
  },
  {
    label: "Submit Read",
    description: "Send a read request transaction with an ephemeral public key.",
  },
  {
    label: "Collect Partials",
    description: "Wait for validators to submit encrypted partial decryptions.",
  },
  {
    label: "Decrypt",
    description: "ECIES-decrypt each partial, then TDH2-combine to recover the secret.",
  },
] as const;

/**
 * Poll for partial decryption events with a progress callback.
 * Reimplements collectPartials logic so we can report collected count.
 */
async function collectPartialsWithProgress(params: {
  publicClient: PublicClient;
  uuid: number;
  minPartials: number;
  fromBlock: bigint;
  timeoutMs: number;
  pollIntervalMs: number;
  onProgress: (collected: number, needed: number) => void;
}): Promise<PartialDecryptionEvent[]> {
  const { publicClient, uuid, minPartials, fromBlock, timeoutMs, pollIntervalMs, onProgress } = params;
  const cdrAddress = contractAddresses.testnet.cdr;
  const deadline = Date.now() + timeoutMs;

  let lastScannedBlock = fromBlock;
  const collected = new Map<string, PartialDecryptionEvent>();
  onProgress(0, minPartials);

  while (Date.now() < deadline) {
    const currentBlock = await publicClient.getBlockNumber();
    if (currentBlock >= lastScannedBlock) {
      const rawLogs = await publicClient.getLogs({
        address: cdrAddress,
        fromBlock: lastScannedBlock,
        toBlock: currentBlock,
      });
      lastScannedBlock = currentBlock + BigInt(1);

      const parsed = parseEventLogs({
        abi: cdrAbi,
        logs: rawLogs,
        eventName: "EncryptedPartialDecryptionSubmitted",
      });

      for (const log of parsed) {
        if (log.args.uuid === uuid) {
          const key = `${log.args.validator}-${log.args.pid}`;
          if (!collected.has(key)) {
            collected.set(key, {
              validator: log.args.validator,
              round: log.args.round,
              pid: log.args.pid,
              encryptedPartial: log.args.encryptedPartial,
              ephemeralPubKey: log.args.ephemeralPubKey,
              pubShare: log.args.pubShare,
              requesterPubKey: log.args.requesterPubKey,
              uuid: log.args.uuid,
              signature: log.args.signature,
            } as PartialDecryptionEvent);
            onProgress(collected.size, minPartials);
          }
        }
      }
    }

    if (collected.size >= minPartials) {
      return [...collected.values()].slice(0, minPartials);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(
    `Timed out collecting partials: got ${collected.size}/${minPartials} in ${timeoutMs / 1000}s`,
  );
}

export default function DecryptPage() {
  const { client, publicClient, getWriteClient, connected, address } = useCDRClient();
  const { ready: wasmReady } = useWasm();

  const [vaultUuid, setVaultUuid] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [plaintext, setPlaintext] = useState("");
  const [txHash, setTxHash] = useState("");

  // Partial collection progress
  const [partialsCollected, setPartialsCollected] = useState(0);
  const [partialsNeeded, setPartialsNeeded] = useState(0);

  // Keep a ref so buildSteps always has latest values without re-render deps
  const progressRef = useRef({ collected: 0, needed: 0 });

  function buildSteps(): Step[] {
    return STEPS.map((step, i) => {
      let status: StepStatus = "pending";
      if (phase === "done") {
        status = "done";
      } else if (phase === "error" && i === currentStep) {
        status = "error";
      } else if (phase === "error" && i < currentStep) {
        status = "done";
      } else if (phase === "decrypting") {
        if (i < currentStep) status = "done";
        else if (i === currentStep) status = "active";
      }

      let detail: React.ReactNode = undefined;

      // Show tx hash on "Submit Read" when done
      if (i === 1 && txHash && status === "done") {
        detail = (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/30">tx</span>
            <TxLink hash={txHash} />
          </div>
        );
      }

      // Show partials progress on "Collect Partials" when active
      if (i === 2 && (status === "active" || status === "done") && partialsNeeded > 0) {
        const collected = partialsCollected;
        const needed = partialsNeeded;
        const pct = needed > 0 ? Math.min((collected / needed) * 100, 100) : 0;
        detail = (
          <div className="mt-1 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-white/50">
                {collected} / {needed} partials
              </span>
              {status === "active" && collected < needed && (
                <span className="text-xs text-white/30">waiting...</span>
              )}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  status === "done" ? "bg-green-500/60" : "bg-brand-500/60"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      }

      return { ...step, status, detail };
    });
  }

  async function handleDecrypt() {
    setPhase("decrypting");
    setCurrentStep(0);
    setErrorMsg("");
    setPlaintext("");
    setTxHash("");
    setPartialsCollected(0);
    setPartialsNeeded(0);

    try {
      // Step 0: Fetch DKG Params
      const writeClient = await getWriteClient();
      const [globalPubKey, threshold] = await Promise.all([
        client.observer.getGlobalPubKey(),
        client.observer.getThreshold(),
      ]);
      setPartialsNeeded(threshold);
      progressRef.current.needed = threshold;

      // Step 1: Submit Read
      setCurrentStep(1);
      const privKey = secp256k1.utils.randomPrivateKey();
      const pubKey = secp256k1.getPublicKey(privKey, false);

      // Fetch the vault's encrypted data first
      const uuid = Number(vaultUuid);
      const vault = await (publicClient as any).readContract({
        address: contractAddresses.testnet.cdr,
        abi: cdrAbi,
        functionName: "vaults",
        args: [uuid],
      });
      const encryptedData = toBytes((vault as any).encryptedData);
      const label = uuidToLabel(uuid);
      const readConditionAddr = (vault as any).readConditionAddr as string;

      // Check if this vault uses the license read condition
      let accessAuxData: `0x${string}` = "0x";
      if (
        CONTRACTS.CDR_VAULT_NFT &&
        readConditionAddr.toLowerCase() === CONTRACTS.LICENSE_READ_CONDITION.toLowerCase()
      ) {
        if (!address) {
          throw new Error("Wallet not connected");
        }

        // Get user's license token balance
        const balance = await (publicClient as any).readContract({
          address: CONTRACTS.LICENSE_TOKEN,
          abi: licenseTokenAbi,
          functionName: "balanceOf",
          args: [address],
        }) as bigint;

        // Get the vault's ipId from CDRVaultNFT
        const vaultTokenId = await (publicClient as any).readContract({
          address: CONTRACTS.CDR_VAULT_NFT,
          abi: cdrVaultNFTAbi,
          functionName: "vaultToToken",
          args: [uuid],
        }) as bigint;

        console.log(`[decrypt] vaultToToken(${uuid}) = ${vaultTokenId}, balance = ${balance}`);
        let vaultIpId: string | null = null;
        if (vaultTokenId > BigInt(0)) {
          const info = await (publicClient as any).readContract({
            address: CONTRACTS.CDR_VAULT_NFT,
            abi: cdrVaultNFTAbi,
            functionName: "getVaultInfo",
            args: [vaultTokenId],
          }) as [number, string, string, bigint]; // [uuid, ipId, creator, termsId]
          vaultIpId = info[1];
          console.log(`[decrypt] getVaultInfo raw:`, info, `ipId=${vaultIpId}`);
        }

        // Find user's license tokens for this IP
        const matchingTokenIds: bigint[] = [];
        for (let i = BigInt(0); i < balance; i++) {
          const ltId = await (publicClient as any).readContract({
            address: CONTRACTS.LICENSE_TOKEN,
            abi: licenseTokenAbi,
            functionName: "tokenOfOwnerByIndex",
            args: [address, i],
          }) as bigint;

          const licensorIp = await (publicClient as any).readContract({
            address: CONTRACTS.LICENSE_TOKEN,
            abi: licenseTokenAbi,
            functionName: "getLicensorIpId",
            args: [ltId],
          }) as string;

          console.log(`[decrypt] license token ${ltId}: licensorIp=${licensorIp}, vaultIpId=${vaultIpId}`);
          if (vaultIpId && licensorIp.toLowerCase() === vaultIpId.toLowerCase()) {
            matchingTokenIds.push(ltId);
          }
        }

        if (matchingTokenIds.length === 0) {
          throw new Error("You don't have a license token for this vault's IP. Visit the Licenses page to acquire one.");
        }

        // Encode as abi.encode(uint256[])
        accessAuxData = encodeAbiParameters(
          [{ type: "uint256[]" }],
          [matchingTokenIds],
        );
      }

      const fromBlock = await publicClient.getBlockNumber();
      const readTxHash = await writeClient.consumer.read({
        uuid,
        accessAuxData,
        requesterPubKey: toHex(pubKey),
      });
      setTxHash(readTxHash.txHash);

      // Step 2: Collect Partials (with progress)
      setCurrentStep(2);
      const partials = await collectPartialsWithProgress({
        publicClient: publicClient as any,
        uuid,
        minPartials: threshold,
        fromBlock,
        timeoutMs: 120_000,
        pollIntervalMs: 3_000,
        onProgress: (collected, needed) => {
          setPartialsCollected(collected);
          progressRef.current.collected = collected;
        },
      });

      // Step 3: Decrypt
      setCurrentStep(3);

      // ECIES-decrypt each partial
      const decryptedPartials = await Promise.all(
        partials.map(async (p) => {
          const decrypted = await eciesDecrypt({
            encryptedPartial: toBytes(p.encryptedPartial),
            ephemeralPubKey: toBytes(p.ephemeralPubKey),
            recipientPrivKey: privKey,
          });
          return {
            pid: p.pid,
            pubShare: toBytes(p.pubShare),
            partial: decrypted,
          };
        }),
      );

      // TDH2-combine
      const dataKey = await tdh2Combine({
        ciphertext: { raw: encryptedData, label },
        partials: decryptedPartials,
        globalPubKey,
        label,
        threshold,
      });

      const decoded = new TextDecoder().decode(dataKey);

      setPlaintext(decoded);
      setPhase("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isConditionRevert =
        msg.toLowerCase().includes("revert") ||
        msg.toLowerCase().includes("execution reverted");
      if (isConditionRevert && currentStep <= 1) {
        setErrorMsg(
          "Transaction reverted — you may not meet the vault's read condition (e.g. missing a license token).",
        );
      } else {
        setErrorMsg(msg);
      }
      setPhase("error");
    }
  }

  function handleRetry() {
    setPhase("idle");
    setCurrentStep(0);
    setErrorMsg("");
    setPartialsCollected(0);
    setPartialsNeeded(0);
  }

  const canSubmit = connected && wasmReady && vaultUuid.trim().length > 0;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-white/[0.02] p-8">
        <h1 className="text-2xl font-bold tracking-tight">Decrypt Vault</h1>
        <p className="mt-2 text-sm text-white/50">
          Recover the original secret from a CDR vault by its UUID.
        </p>

        {/* Status messages */}
        {!connected && (
          <p className="mt-4 text-sm text-yellow-400/80">
            Connect your wallet to decrypt a vault.
          </p>
        )}
        {connected && !wasmReady && (
          <p className="mt-4 text-sm text-yellow-400/80">
            Loading WASM crypto module…
          </p>
        )}

        {/* Idle / Input */}
        {(phase === "idle" || phase === "error") && (
          <div className="mt-6 flex flex-col gap-4">
            <div>
              <label
                htmlFor="vault-uuid"
                className="mb-1.5 block text-sm font-medium text-white/70"
              >
                Vault UUID
              </label>
              <input
                id="vault-uuid"
                type="number"
                placeholder="e.g. 42"
                value={vaultUuid}
                onChange={(e) => setVaultUuid(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-white/20 focus:bg-white/[0.07]"
              />
            </div>
            <button
              onClick={handleDecrypt}
              disabled={!canSubmit}
              className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Decrypt
            </button>
          </div>
        )}

        {/* Decrypting — progress */}
        {phase === "decrypting" && (
          <div className="mt-6">
            <StepIndicator steps={buildSteps()} />
          </div>
        )}

        {/* Error */}
        {phase === "error" && (
          <div className="mt-6 flex flex-col gap-4">
            <StepIndicator steps={buildSteps()} />
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
              <p className="text-sm text-red-400">{errorMsg}</p>
            </div>
            {errorMsg.includes("read condition") && (
              <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-sm text-white/50">
                  You can still view the vault's metadata on the{" "}
                  <a
                    href={`/vault?uuid=${vaultUuid}`}
                    className="text-brand-500 underline underline-offset-2 hover:text-brand-50"
                  >
                    Vault page
                  </a>.
                </p>
              </div>
            )}
            {errorMsg.includes("license token") && (
              <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-sm text-white/50">
                  You need a license token to decrypt this vault. Visit the{" "}
                  <a
                    href="/licenses"
                    className="text-brand-500 underline underline-offset-2 hover:text-brand-50"
                  >
                    Licenses page
                  </a>{" "}
                  to acquire one.
                </p>
              </div>
            )}
            <button
              onClick={handleRetry}
              className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              Retry
            </button>
          </div>
        )}

        {/* Done */}
        {phase === "done" && (
          <div className="mt-6 flex flex-col gap-5">
            <StepIndicator steps={buildSteps()} />

            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-white/40">
                Recovered Secret
              </p>
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
                <p className="break-all font-mono text-sm text-green-300">
                  {plaintext}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-white/40">
                Read Tx
              </p>
              <TxLink hash={txHash} />
            </div>

            <button
              onClick={handleRetry}
              className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              Decrypt Another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
