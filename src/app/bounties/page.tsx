"use client";

import { useState, useEffect, useCallback } from "react";
import { useCDRClient } from "@/hooks/use-cdr-client";
import { useWasm } from "@/providers/wasm-provider";
import { ProgressBar } from "@/components/progress-bar";
import { HowItWorks } from "@/components/how-it-works";
import { uuidToLabel } from "@piplabs/cdr-sdk";
import {
  createWalletClient, custom, parseEther, formatEther,
  toHex, parseEventLogs, keccak256, toBytes,
} from "viem";
import { useWallets } from "@privy-io/react-auth";
import { cdrAbi, contractAddresses } from "@piplabs/cdr-contracts";
import { cdrDevnet } from "@/config/chain";
import { CONTRACTS, depinAbi } from "@/config/contracts";

const RESPONSE_STATUS = ["Pending", "Evaluating", "Accepted", "Rejected"] as const;

type Tab = "open" | "post" | "submissions";

interface RequestData {
  id: number;
  requester: string;
  bounty: bigint;
  evalVaultUuid: number;
  evalIpfsHash: string;
  teeImageHash: string;
  status: number;
  responseCount: number;
  acceptedCount: number;
  title: string;
  description: string;
}

interface ResponseData {
  id: number;
  provider: string;
  requestId: number;
  dataVaultUuid: number;
  dataIpfsHash: string;
  status: number;
  evalAttestation: string;
  title: string;
}

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function BountiesPage() {
  const { client, publicClient, getWriteClient, address, connected } = useCDRClient();
  const { ready: wasmReady, error: wasmError } = useWasm();
  const { wallets } = useWallets();
  const [tab, setTab] = useState<Tab>("open");

  // Open Bounties state
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(false);

  // Post Bounty state
  const [postTitle, setPostTitle] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [postEvalCriteria, setPostEvalCriteria] = useState("");
  const [postBountyAmount, setPostBountyAmount] = useState("");
  const [postPhase, setPostPhase] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [postProgress, setPostProgress] = useState(0);
  const [postProgressLabel, setPostProgressLabel] = useState("");
  const [postError, setPostError] = useState("");
  const [postResult, setPostResult] = useState<{ requestId: number; title: string } | null>(null);

  // Submit Data state (inline on bounty cards)
  const [submitTarget, setSubmitTarget] = useState<number | null>(null);
  const [submitData, setSubmitData] = useState("");
  const [submitPhase, setSubmitPhase] = useState<"idle" | "processing" | "evaluating" | "done" | "error">("idle");
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitProgressLabel, setSubmitProgressLabel] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitResult, setSubmitResult] = useState<{ accepted: boolean; attestation: string } | null>(null);

  // My Submissions state
  const [myResponses, setMyResponses] = useState<ResponseData[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Load all requests
  const loadRequests = useCallback(async () => {
    if (!publicClient) return;
    setLoading(true);
    try {
      const count = await publicClient.readContract({
        address: CONTRACTS.DEPIN_BACKEND,
        abi: depinAbi,
        functionName: "getRequestCount",
      }) as bigint;

      const items: RequestData[] = [];
      for (let i = 0; i < Number(count); i++) {
        const [requester, bounty, evalVaultUuid, evalIpfsHash, teeImageHash, status, responseCount, acceptedCount] =
          await publicClient.readContract({
            address: CONTRACTS.DEPIN_BACKEND,
            abi: depinAbi,
            functionName: "getRequest",
            args: [BigInt(i)],
          }) as [string, bigint, number, string, string, number, bigint, bigint];

        let title = `Bounty #${i}`;
        let description = "";
        if (evalIpfsHash) {
          try {
            const meta = JSON.parse(evalIpfsHash);
            title = meta.title || title;
            description = meta.description || "";
          } catch { /* legacy bounty */ }
        }

        items.push({
          id: i, requester, bounty, evalVaultUuid,
          evalIpfsHash, teeImageHash,
          status, responseCount: Number(responseCount), acceptedCount: Number(acceptedCount),
          title, description,
        });
      }
      setRequests(items);
    } catch (err) {
      console.error("Failed to load bounties:", err);
    }
    setLoading(false);
  }, [publicClient]);

  // Load my submissions
  const loadMyResponses = useCallback(async () => {
    if (!publicClient || !address) return;
    setLoadingResponses(true);
    try {
      const responseIds = await publicClient.readContract({
        address: CONTRACTS.DEPIN_BACKEND,
        abi: depinAbi,
        functionName: "getProviderResponses",
        args: [address as `0x${string}`],
      }) as bigint[];

      const items: ResponseData[] = [];
      for (const rid of responseIds) {
        const [provider, requestId, dataVaultUuid, dataIpfsHash, status, evalAttestation] =
          await publicClient.readContract({
            address: CONTRACTS.DEPIN_BACKEND,
            abi: depinAbi,
            functionName: "getResponse",
            args: [rid],
          }) as [string, bigint, number, string, number, string];

        let title = `Response #${Number(rid)}`;
        if (dataIpfsHash) {
          try {
            const meta = JSON.parse(dataIpfsHash);
            title = meta.title || title;
          } catch { /* legacy response */ }
        }

        items.push({
          id: Number(rid), provider, requestId: Number(requestId),
          dataVaultUuid, dataIpfsHash, status, evalAttestation, title,
        });
      }
      setMyResponses(items);
    } catch (err) {
      console.error("Failed to load submissions:", err);
    }
    setLoadingResponses(false);
  }, [publicClient, address]);

  useEffect(() => {
    if (connected) loadRequests();
  }, [connected, loadRequests]);

  useEffect(() => {
    if (connected && tab === "submissions") loadMyResponses();
  }, [connected, tab, loadMyResponses]);

  // --- Post Bounty Flow ---
  async function handlePostBounty() {
    setPostPhase("processing");
    setPostProgress(5);
    setPostProgressLabel("Creating bounty...");
    setPostError("");
    setPostResult(null);

    try {
      const wallet = wallets[0];
      if (!wallet) throw new Error("No wallet");
      const provider = await wallet.getEthereumProvider();
      const walletClient = createWalletClient({
        chain: cdrDevnet,
        transport: custom(provider),
        account: wallet.address as `0x${string}`,
      });

      // Read allocate fee
      const allocateFee = await publicClient.readContract({
        address: contractAddresses.testnet.cdr as `0x${string}`,
        abi: cdrAbi,
        functionName: "allocateFee",
      }) as bigint;

      const bounty = parseEther(postBountyAmount);
      const teeImageHash = ("0x" + "00".repeat(32)) as `0x${string}`;

      // Step 1: createRequest on-chain
      setPostProgress(10);
      const createTx = await walletClient.writeContract({
        address: CONTRACTS.DEPIN_BACKEND,
        abi: depinAbi,
        functionName: "createRequest",
        args: [teeImageHash],
        value: bounty + allocateFee,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: createTx });
      const logs = parseEventLogs({ abi: depinAbi, logs: receipt.logs, eventName: "RequestCreated" });
      const requestId = Number(logs[0].args.requestId);
      const evalVaultUuid = Number(logs[0].args.evalVaultUuid);
      setPostProgress(30);

      // Step 2: Encrypt evaluation criteria
      setPostProgressLabel("Encrypting evaluation criteria...");
      setPostProgress(35);
      const globalPubKey = await client.observer.getGlobalPubKey();

      setPostProgress(45);
      const writeClient = await getWriteClient();
      const dataKey = new TextEncoder().encode(postEvalCriteria);
      const label = uuidToLabel(evalVaultUuid);
      const ciphertext = await writeClient.uploader.encryptDataKey({ dataKey, globalPubKey, label });
      setPostProgress(55);

      // Step 3: Write encrypted eval criteria to CDR vault
      setPostProgressLabel("Publishing...");
      setPostProgress(60);
      const writeFee = await publicClient.readContract({
        address: contractAddresses.testnet.cdr as `0x${string}`,
        abi: cdrAbi,
        functionName: "writeFee",
      }) as bigint;

      await walletClient.writeContract({
        address: contractAddresses.testnet.cdr as `0x${string}`,
        abi: cdrAbi,
        functionName: "write",
        args: [evalVaultUuid, "0x", toHex(ciphertext.raw)],
        value: writeFee,
      });
      setPostProgress(80);

      // Step 4: Store title/description metadata via setEvalIpfsHash
      setPostProgressLabel("Saving metadata...");
      setPostProgress(85);
      const metadata = JSON.stringify({ title: postTitle, description: postDescription });
      await walletClient.writeContract({
        address: CONTRACTS.DEPIN_BACKEND,
        abi: depinAbi,
        functionName: "setEvalIpfsHash",
        args: [BigInt(requestId), metadata],
      });

      setPostProgress(100);
      setPostProgressLabel("Done!");
      setPostResult({ requestId, title: postTitle });
      setPostPhase("done");
    } catch (err: unknown) {
      setPostError(err instanceof Error ? err.message : String(err));
      setPostPhase("error");
    }
  }

  // --- Submit Data Flow (inline on bounty card) ---
  async function handleSubmitData(requestId: number) {
    setSubmitTarget(requestId);
    setSubmitPhase("processing");
    setSubmitProgress(5);
    setSubmitProgressLabel("Registering submission...");
    setSubmitError("");
    setSubmitResult(null);

    try {
      const wallet = wallets[0];
      if (!wallet) throw new Error("No wallet");
      const provider = await wallet.getEthereumProvider();
      const walletClient = createWalletClient({
        chain: cdrDevnet,
        transport: custom(provider),
        account: wallet.address as `0x${string}`,
      });

      // Read allocate fee
      const allocateFee = await publicClient.readContract({
        address: contractAddresses.testnet.cdr as `0x${string}`,
        abi: cdrAbi,
        functionName: "allocateFee",
      }) as bigint;

      // Step 1: respondToRequest on-chain
      setSubmitProgress(10);
      const respondTx = await walletClient.writeContract({
        address: CONTRACTS.DEPIN_BACKEND,
        abi: depinAbi,
        functionName: "respondToRequest",
        args: [BigInt(requestId)],
        value: allocateFee,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: respondTx });
      const logs = parseEventLogs({ abi: depinAbi, logs: receipt.logs, eventName: "ResponseSubmitted" });
      const responseId = Number(logs[0].args.responseId);
      const dataVaultUuid = Number(logs[0].args.dataVaultUuid);
      setSubmitProgress(25);

      // Step 2: Encrypt data
      setSubmitProgressLabel("Encrypting data...");
      setSubmitProgress(30);
      const globalPubKey = await client.observer.getGlobalPubKey();

      setSubmitProgress(40);
      const writeClient = await getWriteClient();
      const dataKey = new TextEncoder().encode(submitData);
      const label = uuidToLabel(dataVaultUuid);
      const ciphertext = await writeClient.uploader.encryptDataKey({ dataKey, globalPubKey, label });
      setSubmitProgress(50);

      // Step 3: Write encrypted data to CDR vault
      setSubmitProgressLabel("Storing on-chain...");
      setSubmitProgress(55);
      const writeFee = await publicClient.readContract({
        address: contractAddresses.testnet.cdr as `0x${string}`,
        abi: cdrAbi,
        functionName: "writeFee",
      }) as bigint;

      await walletClient.writeContract({
        address: contractAddresses.testnet.cdr as `0x${string}`,
        abi: cdrAbi,
        functionName: "write",
        args: [dataVaultUuid, "0x", toHex(ciphertext.raw)],
        value: writeFee,
      });
      setSubmitProgress(65);

      // Step 4: Store metadata via setDataIpfsHash
      setSubmitProgressLabel("Saving metadata...");
      const responseMeta = JSON.stringify({ title: `Submission for Bounty #${requestId}` });
      await walletClient.writeContract({
        address: CONTRACTS.DEPIN_BACKEND,
        abi: depinAbi,
        functionName: "setDataIpfsHash",
        args: [BigInt(responseId), responseMeta],
      });
      setSubmitProgress(70);

      // Step 5: Trigger evaluation
      setSubmitPhase("evaluating");
      setSubmitProgress(50);
      setSubmitProgressLabel("Evaluating submission in TEE...");

      const evalResponse = await fetch("/api/bounties/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseId }),
      });
      const evalResult = await evalResponse.json();

      setSubmitResult({
        accepted: evalResult.accepted,
        attestation: evalResult.attestation || "",
      });
      setSubmitProgress(100);
      setSubmitProgressLabel("Evaluation complete!");
      setSubmitPhase("done");
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : String(err));
      setSubmitPhase("error");
    }
  }

  function resetSubmit() {
    setSubmitPhase("idle");
    setSubmitTarget(null);
    setSubmitData("");
    setSubmitResult(null);
    loadRequests();
  }

  // Helper: get bounty title by request id
  function getBountyTitle(reqId: number): string {
    const req = requests.find((r) => r.id === reqId);
    return req ? req.title : `Bounty #${reqId}`;
  }

  const postFormValid = connected && wasmReady && postTitle.trim() && postEvalCriteria.trim() && postBountyAmount.trim();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="mr-2">&#127919;</span>Bounty Board
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Post data bounties. Contributors submit data. Quality is evaluated confidentially — no one can cheat.
        </p>

        {/* Wallet / WASM warnings */}
        {!connected && (
          <div className="mt-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-400">
            Connect your wallet to continue.
          </div>
        )}
        {connected && !wasmReady && !wasmError && (
          <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50">
            Loading cryptography module...
          </div>
        )}
        {wasmError && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            Crypto module failed to load: {wasmError}
          </div>
        )}

        {/* Tab navigation */}
        <div className="mt-6 flex gap-1 rounded-lg bg-white/5 p-1">
          {([
            { key: "open" as Tab, label: "Open Bounties" },
            { key: "post" as Tab, label: "Post Bounty" },
            { key: "submissions" as Tab, label: "My Submissions" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.key ? "bg-white/10 text-white" : "text-white/50 hover:text-white/70"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {/* === OPEN BOUNTIES TAB === */}
          {tab === "open" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/40">
                  {requests.length} bount{requests.length !== 1 ? "ies" : "y"} posted
                </p>
                <button
                  onClick={loadRequests}
                  className="text-xs text-white/40 transition-colors hover:text-white/60"
                >
                  Refresh
                </button>
              </div>

              {loading && <p className="text-sm text-white/50">Loading...</p>}
              {!loading && requests.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 px-6 py-10 text-center">
                  <p className="text-sm text-white/30">No bounties yet.</p>
                  <p className="mt-1 text-xs text-white/20">
                    Switch to &ldquo;Post Bounty&rdquo; to create the first one.
                  </p>
                </div>
              )}

              {requests.map((req) => {
                const isOwn = req.requester.toLowerCase() === address?.toLowerCase();
                const isSubmittingToThis = submitTarget === req.id && submitPhase !== "idle";

                return (
                  <div key={req.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white">{req.title}</p>
                          {isOwn && (
                            <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-400">
                              yours
                            </span>
                          )}
                        </div>
                        {req.description && (
                          <p className="mt-1.5 line-clamp-2 text-xs text-white/40">
                            {req.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/30">
                          <span>{req.responseCount} submission{req.responseCount !== 1 ? "s" : ""}</span>
                          <span className="h-3 w-px bg-white/10" />
                          {req.acceptedCount > 0 && (
                            <>
                              <span className="text-green-400/60">{req.acceptedCount} accepted</span>
                              <span className="h-3 w-px bg-white/10" />
                            </>
                          )}
                          <span className="font-mono" title={req.requester}>
                            {shortenAddress(req.requester)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                        <p className="text-lg font-bold tabular-nums text-rose-400">
                          {formatEther(req.bounty)} <span className="text-xs font-normal text-rose-400/60">IP</span>
                        </p>
                        {!isOwn && submitPhase === "idle" && (
                          <button
                            onClick={() => setSubmitTarget(req.id)}
                            disabled={!connected || !wasmReady}
                            className="rounded-lg bg-demo-bounty/20 px-3 py-1.5 text-xs font-medium text-rose-300 ring-1 ring-demo-bounty/30 transition-colors hover:bg-demo-bounty/30 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Submit Data
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline submit form */}
                    {!isOwn && submitTarget === req.id && submitPhase === "idle" && (
                      <div className="mt-4 border-t border-white/5 pt-4">
                        <textarea
                          value={submitData}
                          onChange={(e) => setSubmitData(e.target.value)}
                          placeholder="Enter your data submission..."
                          rows={3}
                          className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-demo-bounty/40 focus:ring-1 focus:ring-demo-bounty/30"
                        />
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => handleSubmitData(req.id)}
                            disabled={!submitData.trim()}
                            className="rounded-lg bg-demo-bounty/20 px-3 py-1.5 text-xs font-medium text-rose-300 ring-1 ring-demo-bounty/30 transition-colors hover:bg-demo-bounty/30 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Submit
                          </button>
                          <button
                            onClick={() => { setSubmitTarget(null); setSubmitData(""); }}
                            className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:bg-white/10"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Submit progress / evaluation */}
                    {isSubmittingToThis && (
                      <div className="mt-4 border-t border-white/5 pt-4">
                        <ProgressBar
                          percent={submitProgress}
                          label={submitProgressLabel}
                          accentClass="bg-demo-bounty"
                          error={submitPhase === "error"}
                        />

                        {submitPhase === "evaluating" && (
                          <div className="mt-3 flex items-center gap-2">
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-rose-400/30 border-t-rose-400" />
                            <span className="text-xs text-rose-400/70">Evaluating in TEE...</span>
                          </div>
                        )}

                        {submitPhase === "error" && (
                          <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                            {submitError}
                          </div>
                        )}

                        {submitPhase === "done" && submitResult && (
                          <div className={`mt-3 rounded-lg border px-4 py-3 ${
                            submitResult.accepted
                              ? "border-green-500/20 bg-green-500/5"
                              : "border-red-500/20 bg-red-500/5"
                          }`}>
                            <p className={`text-xs font-medium ${
                              submitResult.accepted ? "text-green-400" : "text-red-400"
                            }`}>
                              {submitResult.accepted ? "Accepted" : "Rejected"}
                            </p>
                            {submitResult.attestation && (
                              <p className="mt-1 break-all font-mono text-xs text-white/40">
                                Attestation: {submitResult.attestation.slice(0, 20)}...{submitResult.attestation.slice(-8)}
                              </p>
                            )}
                          </div>
                        )}

                        {(submitPhase === "done" || submitPhase === "error") && (
                          <button
                            onClick={resetSubmit}
                            className="mt-3 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/15"
                          >
                            Done
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* === POST BOUNTY TAB === */}
          {tab === "post" && (
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-6">
              {postPhase === "idle" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                      What data do you need?
                    </label>
                    <input
                      type="text"
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      placeholder="e.g. High-resolution satellite imagery of coastal regions"
                      className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-demo-bounty/40 focus:ring-1 focus:ring-demo-bounty/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                      Describe the data you&apos;re looking for
                    </label>
                    <textarea
                      value={postDescription}
                      onChange={(e) => setPostDescription(e.target.value)}
                      placeholder="What format, coverage, quality requirements, etc."
                      rows={3}
                      className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-demo-bounty/40 focus:ring-1 focus:ring-demo-bounty/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                      How should submissions be judged?
                    </label>
                    <textarea
                      value={postEvalCriteria}
                      onChange={(e) => setPostEvalCriteria(e.target.value)}
                      placeholder="Define scoring criteria, acceptance thresholds, required fields..."
                      rows={4}
                      className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-demo-bounty/40 focus:ring-1 focus:ring-demo-bounty/30"
                    />
                    <p className="mt-1 text-xs italic text-white/30">
                      Encrypted — contributors cannot see this. Only the TEE evaluator has access.
                    </p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                      Bounty Amount (IP)
                    </label>
                    <input
                      type="text"
                      value={postBountyAmount}
                      onChange={(e) => setPostBountyAmount(e.target.value)}
                      placeholder="1.0"
                      className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-demo-bounty/40 focus:ring-1 focus:ring-demo-bounty/30"
                    />
                  </div>
                  <button
                    onClick={handlePostBounty}
                    disabled={!postFormValid}
                    className="rounded-lg bg-demo-bounty/20 px-4 py-2.5 text-sm font-medium text-rose-300 ring-1 ring-demo-bounty/30 transition-colors hover:bg-demo-bounty/30 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Post Bounty
                  </button>
                </div>
              )}
              {(postPhase === "processing" || postPhase === "error") && (
                <div className="flex flex-col gap-4">
                  <ProgressBar
                    percent={postProgress}
                    label={postProgressLabel}
                    accentClass="bg-demo-bounty"
                    error={postPhase === "error"}
                  />
                  {postPhase === "error" && (
                    <>
                      <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                        {postError}
                      </div>
                      <button
                        onClick={() => setPostPhase("idle")}
                        className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
                      >
                        Retry
                      </button>
                    </>
                  )}
                </div>
              )}
              {postPhase === "done" && postResult && (
                <div className="flex flex-col gap-5">
                  <ProgressBar
                    percent={100}
                    label="Done!"
                    accentClass="bg-demo-bounty"
                  />
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-400/70">
                      Bounty Posted
                    </p>
                    <p className="mt-1 text-2xl font-bold text-rose-400">
                      {postResult.title}
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      Bounty #{postResult.requestId} is live. Contributors can now submit data.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setPostPhase("idle");
                      setPostTitle("");
                      setPostDescription("");
                      setPostEvalCriteria("");
                      setPostBountyAmount("");
                      loadRequests();
                    }}
                    className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
                  >
                    Post Another
                  </button>
                </div>
              )}
            </div>
          )}

          {/* === MY SUBMISSIONS TAB === */}
          {tab === "submissions" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/40">
                  Your data submissions and their evaluation status.
                </p>
                <button
                  onClick={loadMyResponses}
                  className="text-xs text-white/40 transition-colors hover:text-white/60"
                >
                  Refresh
                </button>
              </div>

              {loadingResponses && <p className="text-sm text-white/50">Loading...</p>}
              {!loadingResponses && myResponses.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 px-6 py-10 text-center">
                  <p className="text-sm text-white/30">No submissions yet.</p>
                  <p className="mt-1 text-xs text-white/20">
                    Browse open bounties to submit data.
                  </p>
                </div>
              )}

              {myResponses.map((resp) => {
                const statusLabel = RESPONSE_STATUS[resp.status] || "Unknown";
                return (
                  <div key={resp.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white">{resp.title}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/30">
                          <span>For {getBountyTitle(resp.requestId)}</span>
                          <span className="h-3 w-px bg-white/10" />
                          <span className="font-mono">vault {resp.dataVaultUuid}</span>
                        </div>
                        {resp.status === 2 && resp.evalAttestation && (
                          <p className="mt-2 break-all font-mono text-xs text-white/30">
                            Attestation: {resp.evalAttestation.slice(0, 20)}...{resp.evalAttestation.slice(-8)}
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        resp.status === 2 ? "bg-green-500/10 text-green-400"
                          : resp.status === 3 ? "bg-red-500/10 text-red-400"
                          : resp.status === 1 ? "bg-amber-500/10 text-amber-400"
                          : "bg-white/5 text-white/50"
                      }`}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* How it works */}
        <HowItWorks
          layers={[
            {
              title: "Conceptual: How the bounty board works",
              content: (
                <ul className="flex flex-col gap-2 text-white/50">
                  <li>&#8226; A requester posts a data bounty with encrypted evaluation criteria that no one else can see.</li>
                  <li>&#8226; Contributors submit their data, which is also encrypted and stored in individual CDR vaults.</li>
                  <li>&#8226; A TEE (Trusted Execution Environment) decrypts both the criteria and the submitted data, then evaluates quality confidentially.</li>
                  <li>&#8226; If the data passes the quality threshold, the bounty is released to the contributor automatically.</li>
                  <li>&#8226; No one can cheat: the requester cannot see submissions without paying, and contributors cannot see the evaluation criteria.</li>
                </ul>
              ),
            },
            {
              title: "Architecture: Contract interaction flow",
              content: (
                <div className="flex flex-col gap-3 font-mono text-xs text-white/50">
                  <div>
                    <p className="mb-1 text-white/30">Posting a bounty:</p>
                    <p>depin.createRequest(teeImageHash) &#8594; CDR.allocate()</p>
                    <p>encrypt(evalCriteria, globalPubKey) &#8594; CDR.write(evalVaultUuid)</p>
                    <p>depin.setEvalIpfsHash(requestId, metadata)</p>
                  </div>
                  <div>
                    <p className="mb-1 text-white/30">Submitting data:</p>
                    <p>depin.respondToRequest(requestId) &#8594; CDR.allocate()</p>
                    <p>encrypt(data, globalPubKey) &#8594; CDR.write(dataVaultUuid)</p>
                    <p>depin.setDataIpfsHash(responseId, metadata)</p>
                  </div>
                  <div>
                    <p className="mb-1 text-white/30">Evaluation:</p>
                    <p>TEE decrypts eval criteria + submitted data</p>
                    <p>TEE evaluates quality &#8594; emits EvalCompleted</p>
                    <p>bounty released to provider if accepted</p>
                  </div>
                </div>
              ),
            },
            {
              title: "Code: TypeScript snippets",
              content: (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="mb-1 text-xs text-white/30">Posting a bounty:</p>
                    <pre className="overflow-x-auto rounded-lg bg-white/[0.03] p-3 text-xs text-white/60">{`// 1. Create request with bounty amount
const tx = await depin.createRequest(teeImageHash,
  { value: bountyAmount + allocateFee });
const { requestId, evalVaultUuid } = parseEvents(tx);

// 2. Encrypt eval criteria to CDR vault
const globalPubKey = await cdr.observer.getGlobalPubKey();
const ciphertext = await cdr.uploader.encryptDataKey({
  dataKey: evalCriteria, globalPubKey,
  label: uuidToLabel(evalVaultUuid)
});
await cdr.write(evalVaultUuid, ciphertext);

// 3. Store public metadata
await depin.setEvalIpfsHash(requestId,
  JSON.stringify({ title, description }));`}</pre>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-white/30">Submitting data for a bounty:</p>
                    <pre className="overflow-x-auto rounded-lg bg-white/[0.03] p-3 text-xs text-white/60">{`// 1. Respond to request (allocates data vault)
const tx = await depin.respondToRequest(requestId,
  { value: allocateFee });
const { responseId, dataVaultUuid } = parseEvents(tx);

// 2. Encrypt and store data
const ciphertext = await cdr.uploader.encryptDataKey({
  dataKey: myData, globalPubKey,
  label: uuidToLabel(dataVaultUuid)
});
await cdr.write(dataVaultUuid, ciphertext);

// 3. Trigger TEE evaluation
const result = await fetch("/api/bounties/evaluate",
  { body: JSON.stringify({ responseId }) });`}</pre>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
