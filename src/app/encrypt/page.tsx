"use client";

import { useState } from "react";
import Link from "next/link";
import { useCDRClient } from "@/hooks/use-cdr-client";
import { useWasm } from "@/providers/wasm-provider";
import { StepIndicator, type Step, type StepStatus } from "@/components/step-indicator";
import { TxLink } from "@/components/tx-link";
import { uuidToLabel } from "@piplabs/cdr-sdk";
import { createWalletClient, custom, parseEventLogs, toHex } from "viem";
import { useWallets } from "@privy-io/react-auth";
import { CONTRACTS, cdrVaultNFTAbi } from "@/config/contracts";
import { cdrAbi, contractAddresses } from "@piplabs/cdr-contracts";
import { cdrDevnet } from "@/config/chain";

type Phase = "idle" | "encrypting" | "done" | "error";

const STEPS_DEFAULT = [
  {
    label: "Fetch DKG Key",
    description: "Retrieve the network's threshold public key from the DKG contract.",
  },
  {
    label: "Allocate Vault",
    description: "Create a new on-chain vault with your address as the read/write condition.",
  },
  {
    label: "Encrypt Data",
    description: "TDH2-encrypt your secret to the DKG public key using a vault-derived label.",
  },
  {
    label: "Write On-Chain",
    description: "Store the encrypted ciphertext in the vault.",
  },
] as const;

const STEPS_IP = [
  {
    label: "Create Vault & Register IP",
    description: "Mint NFT, register as IP Asset, allocate vault, and attach license terms.",
  },
  {
    label: "Fetch DKG Key",
    description: "Retrieve the network's threshold public key from the DKG contract.",
  },
  {
    label: "Encrypt Data",
    description: "TDH2-encrypt your secret to the DKG public key using a vault-derived label.",
  },
  {
    label: "Write On-Chain",
    description: "Store the encrypted ciphertext in the vault via CDR.write().",
  },
] as const;

export default function EncryptPage() {
  const { client, publicClient, getWriteClient, address, connected } = useCDRClient();
  const { ready: wasmReady, error: wasmError } = useWasm();
  const { wallets } = useWallets();

  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [registerAsIP, setRegisterAsIP] = useState(false);

  // Result state
  const [vaultUuid, setVaultUuid] = useState<number | null>(null);
  const [allocateTxHash, setAllocateTxHash] = useState("");
  const [writeTxHash, setWriteTxHash] = useState("");
  const [ipId, setIpId] = useState<string | null>(null);

  const steps = registerAsIP ? STEPS_IP : STEPS_DEFAULT;

  function buildSteps(): Step[] {
    const failed = phase === "error";
    return steps.map((step, i) => {
      let status: StepStatus = "pending";
      if (phase === "done") {
        status = "done";
      } else if (i < currentStep) {
        status = "done";
      } else if (i === currentStep) {
        status = failed ? "error" : "active";
      }

      let detail: React.ReactNode = undefined;

      if (registerAsIP) {
        // IP mode: step 0 = create vault, step 3 = write
        if (i === 0 && allocateTxHash && status === "done") {
          detail = (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/30">tx</span>
                <TxLink hash={allocateTxHash} />
              </div>
              {vaultUuid !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/30">uuid</span>
                  <span className="font-mono text-xs text-green-400">{vaultUuid}</span>
                </div>
              )}
              {ipId && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/30">ipId</span>
                  <span className="font-mono text-xs text-purple-400">{ipId}</span>
                </div>
              )}
            </div>
          );
        }
        if (i === 3 && writeTxHash && status === "done") {
          detail = (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/30">tx</span>
              <TxLink hash={writeTxHash} />
            </div>
          );
        }
      } else {
        // Default mode: step 1 = allocate, step 3 = write
        if (i === 1 && allocateTxHash && status === "done") {
          detail = (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/30">tx</span>
              <TxLink hash={allocateTxHash} />
              {vaultUuid !== null && (
                <>
                  <span className="text-xs text-white/30">uuid</span>
                  <span className="font-mono text-xs text-green-400">{vaultUuid}</span>
                </>
              )}
            </div>
          );
        }
        if (i === 3 && writeTxHash && status === "done") {
          detail = (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/30">tx</span>
              <TxLink hash={writeTxHash} />
            </div>
          );
        }
      }

      return { ...step, status, detail };
    });
  }

  async function handleEncrypt() {
    setPhase("encrypting");
    setCurrentStep(0);
    setErrorMsg("");
    setVaultUuid(null);
    setAllocateTxHash("");
    setWriteTxHash("");
    setIpId(null);

    try {
      if (registerAsIP) {
        await handleEncryptIP();
      } else {
        await handleEncryptDefault();
      }
      setPhase("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setPhase("error");
    }
  }

  async function handleEncryptDefault() {
    // Step 0: Fetch DKG Key
    const globalPubKey = await client.observer.getGlobalPubKey();

    // Step 1: Allocate Vault
    setCurrentStep(1);
    const writeClient = await getWriteClient();
    const { txHash: allocateTx, uuid } = await writeClient.uploader.allocate({
      updatable: false,
      writeConditionAddr: address!,
      readConditionAddr: address!,
      writeConditionData: "0x",
      readConditionData: "0x",
    });
    setAllocateTxHash(allocateTx);
    setVaultUuid(uuid);

    // Step 2: Encrypt
    setCurrentStep(2);
    const dataKey = new TextEncoder().encode(input);
    const label = uuidToLabel(uuid);
    const ciphertext = await writeClient.uploader.encryptDataKey({
      dataKey,
      globalPubKey,
      label,
    });

    // Step 3: Write On-Chain
    setCurrentStep(3);
    const { txHash: writeTx } = await writeClient.uploader.write({
      uuid,
      accessAuxData: "0x",
      encryptedData: toHex(ciphertext.raw),
    });
    setWriteTxHash(writeTx);
  }

  async function handleEncryptIP() {
    const wallet = wallets[0];
    if (!wallet) throw new Error("No wallet connected");
    const provider = await wallet.getEthereumProvider();
    const walletClient = createWalletClient({
      chain: cdrDevnet,
      transport: custom(provider),
      account: wallet.address as `0x${string}`,
    });

    // Step 0: Create Vault & Register IP
    const fee = await publicClient.readContract({
      address: CONTRACTS.CDR_VAULT_NFT,
      abi: cdrVaultNFTAbi,
      functionName: "getAllocateFee",
    });

    const txHash = await walletClient.writeContract({
      address: CONTRACTS.CDR_VAULT_NFT,
      abi: cdrVaultNFTAbi,
      functionName: "createVault",
      args: [BigInt(0)],
      value: fee,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const parsed = parseEventLogs({
      abi: cdrVaultNFTAbi,
      logs: receipt.logs,
      eventName: "VaultCreated",
    });
    const { uuid, ipId: vaultIpId } = parsed[0].args;
    setAllocateTxHash(txHash);
    setVaultUuid(uuid);
    setIpId(vaultIpId);

    // Step 1: Fetch DKG Key
    setCurrentStep(1);
    const globalPubKey = await client.observer.getGlobalPubKey();

    // Step 2: Encrypt
    setCurrentStep(2);
    const writeClient = await getWriteClient();
    const dataKey = new TextEncoder().encode(input);
    const label = uuidToLabel(uuid);
    const ciphertext = await writeClient.uploader.encryptDataKey({
      dataKey,
      globalPubKey,
      label,
    });

    // Step 3: Write On-Chain via CDR.write()
    setCurrentStep(3);
    const writeFee = await publicClient.readContract({
      address: contractAddresses.testnet.cdr as `0x${string}`,
      abi: cdrAbi,
      functionName: "writeFee",
    });

    const writeTx = await walletClient.writeContract({
      address: contractAddresses.testnet.cdr as `0x${string}`,
      abi: cdrAbi,
      functionName: "write",
      args: [uuid, "0x", toHex(ciphertext.raw)],
      value: writeFee,
    });
    setWriteTxHash(writeTx);
  }

  function handleRetry() {
    setPhase("idle");
    setCurrentStep(0);
    setErrorMsg("");
    setVaultUuid(null);
    setAllocateTxHash("");
    setWriteTxHash("");
    setIpId(null);
  }

  const canSubmit = connected && wasmReady && input.trim().length > 0;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-white/[0.02] p-8">
        <h1 className="text-2xl font-bold tracking-tight">Encrypt &amp; Store</h1>
        <p className="mt-2 text-sm text-white/50">
          Encrypt a secret and store it in a CDR vault on-chain.
        </p>

        {/* Wallet / WASM warnings */}
        {!connected && (
          <div className="mt-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-400">
            Connect your wallet to continue.
          </div>
        )}
        {connected && !wasmReady && !wasmError && (
          <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50">
            Loading WASM cryptography module...
          </div>
        )}
        {wasmError && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            WASM failed to load: {wasmError}
          </div>
        )}

        {/* Idle — input form */}
        {phase === "idle" && (
          <div className="mt-6 flex flex-col gap-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your secret string..."
              rows={4}
              className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-white/20"
            />

            {/* Register as IP Asset toggle */}
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={registerAsIP}
                  onClick={() => setRegisterAsIP((v) => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                    registerAsIP ? "bg-purple-500" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                      registerAsIP ? "translate-x-[18px]" : "translate-x-[3px]"
                    }`}
                  />
                </button>
                <span className="text-sm text-white/70">Register as IP Asset</span>
              </label>
              {registerAsIP && (
                <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2 text-xs text-purple-300/80">
                  Your vault will be registered as a Story Protocol IP Asset with license-gated read access.
                </div>
              )}
            </div>

            <button
              disabled={!canSubmit}
              onClick={handleEncrypt}
              className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {registerAsIP ? "Encrypt & Register IP" : "Encrypt & Store"}
            </button>
          </div>
        )}

        {/* Encrypting — progress */}
        {phase === "encrypting" && (
          <div className="mt-6">
            <StepIndicator steps={buildSteps()} />
          </div>
        )}

        {/* Error */}
        {phase === "error" && (
          <div className="mt-6 flex flex-col gap-4">
            <StepIndicator steps={buildSteps()} />
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              {errorMsg}
            </div>
            <button
              onClick={handleRetry}
              className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
            >
              Retry
            </button>
          </div>
        )}

        {/* Done — results */}
        {phase === "done" && (
          <div className="mt-6 flex flex-col gap-5">
            <StepIndicator steps={buildSteps()} />

            <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wider text-green-400/70">
                Vault UUID
              </p>
              <p className="mt-1 text-2xl font-bold text-green-400">
                {vaultUuid}
              </p>
              <p className="mt-1 text-xs text-white/40">
                Save this UUID — you will need it to decrypt.
              </p>
            </div>

            {registerAsIP && ipId && (
              <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wider text-purple-400/70">
                  IP Asset ID
                </p>
                <p className="mt-1 break-all font-mono text-sm font-bold text-purple-400">
                  {ipId}
                </p>
                <p className="mt-2 text-xs text-white/40">
                  <Link href="/licenses" className="text-purple-400 underline underline-offset-2 hover:text-purple-300">
                    Go to Licenses page
                  </Link>
                  {" "}to mint license tokens for read access.
                </p>
              </div>
            )}

            <button
              onClick={handleRetry}
              className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
            >
              Encrypt Another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
