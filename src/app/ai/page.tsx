"use client";

import { useState, useEffect, useCallback } from "react";
import { formatEther } from "viem";
import { useCDRClient } from "@/hooks/use-cdr-client";
import { ProgressBar } from "@/components/progress-bar";
import { HowItWorks } from "@/components/how-it-works";
import { CONTRACTS, inferenceAbi } from "@/config/contracts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "browse" | "queries";

interface ModelMeta {
  emoji: string;
  name: string;
  description: string;
}

const MODEL_META: Record<number, ModelMeta> = {
  0: {
    emoji: "\ud83d\udcdd",
    name: "Sentiment Analyzer",
    description:
      "Analyzes emotional tone and returns sentiment score with confidence",
  },
  1: {
    emoji: "\ud83d\udcca",
    name: "Text Summarizer",
    description:
      "Condenses text into key points with word count and reading time",
  },
  2: {
    emoji: "\ud83d\udd0d",
    name: "Entity Extractor",
    description:
      "Extracts emails, URLs, numbers, and proper nouns from text",
  },
};

interface ModelOnChain {
  feePerQuery: bigint;
  totalQueries: bigint;
  status: number;
}

interface QueryResult {
  result: Record<string, unknown>;
  attestation: string;
}

interface UserQuery {
  queryId: number;
  modelId: number;
  status: number;
  attestation: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const contractDeployed = (): boolean => {
  const addr: string = CONTRACTS.CONFIDENTIAL_INFERENCE;
  return addr !== "" && addr !== "0x";
};

function truncateHash(h: string): string {
  if (h.length <= 14) return h;
  return `${h.slice(0, 6)}...${h.slice(-4)}`;
}

const STATUS_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Processing",
  2: "Completed",
};

function statusColor(s: number): string {
  if (s === 2) return "bg-green-500/10 text-green-400";
  if (s === 1) return "bg-cyan-500/10 text-cyan-400";
  return "bg-yellow-500/10 text-yellow-400";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ConfidentialAIPage() {
  const { publicClient, getWriteClient, address, connected } = useCDRClient();

  const [tab, setTab] = useState<Tab>("browse");

  // Model data from chain (keyed by modelId)
  const [models, setModels] = useState<Record<number, ModelOnChain>>({});

  // Per-model form state
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [running, setRunning] = useState<Record<number, boolean>>({});
  const [progress, setProgress] = useState<Record<number, { pct: number; label: string }>>({});
  const [results, setResults] = useState<Record<number, QueryResult>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});

  // My Queries tab
  const [userQueries, setUserQueries] = useState<UserQuery[]>([]);
  const [queriesLoading, setQueriesLoading] = useState(false);

  // -------------------------------------------------------------------------
  // Load model data from chain
  // -------------------------------------------------------------------------

  const loadModels = useCallback(async () => {
    if (!publicClient || !contractDeployed()) return;
    try {
      for (const id of [0, 1, 2]) {
        try {
          const data = (await publicClient.readContract({
            address: CONTRACTS.CONFIDENTIAL_INFERENCE,
            abi: inferenceAbi,
            functionName: "getModel",
            args: [BigInt(id)],
          })) as [string, bigint, number, string, number, bigint, bigint];
          setModels((prev) => ({
            ...prev,
            [id]: {
              feePerQuery: data[1],
              totalQueries: data[5],
              status: data[4],
            },
          }));
        } catch {
          // model may not exist on-chain yet
        }
      }
    } catch {
      // contract read failed
    }
  }, [publicClient]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // -------------------------------------------------------------------------
  // Load user queries
  // -------------------------------------------------------------------------

  const loadUserQueries = useCallback(async () => {
    if (!publicClient || !contractDeployed() || !address) return;
    setQueriesLoading(true);
    try {
      const ids = (await publicClient.readContract({
        address: CONTRACTS.CONFIDENTIAL_INFERENCE,
        abi: inferenceAbi,
        functionName: "getUserQueries",
        args: [address],
      })) as bigint[];

      const items: UserQuery[] = [];
      for (const qId of ids) {
        const q = (await publicClient.readContract({
          address: CONTRACTS.CONFIDENTIAL_INFERENCE,
          abi: inferenceAbi,
          functionName: "getQuery",
          args: [qId],
        })) as [string, bigint, number, number, number, string];
        items.push({
          queryId: Number(qId),
          modelId: Number(q[1]),
          status: q[4],
          attestation: q[5],
        });
      }
      setUserQueries(items);
    } catch {
      // ignore
    }
    setQueriesLoading(false);
  }, [publicClient, address]);

  useEffect(() => {
    if (tab === "queries") loadUserQueries();
  }, [tab, loadUserQueries]);

  // -------------------------------------------------------------------------
  // Run query
  // -------------------------------------------------------------------------

  async function handleRunQuery(modelId: number) {
    const input = inputs[modelId];
    if (!input?.trim()) return;

    setRunning((p) => ({ ...p, [modelId]: true }));
    setErrors((p) => ({ ...p, [modelId]: "" }));
    setResults((p) => {
      const n = { ...p };
      delete n[modelId];
      return n;
    });

    const setP = (pct: number, label: string) =>
      setProgress((p) => ({ ...p, [modelId]: { pct, label } }));

    try {
      // Step 1: Encrypting
      setP(10, "Encrypting your input...");
      await delay(600);
      setP(25, "Encrypting your input...");

      // Step 2: On-chain submitQuery (if contract deployed)
      setP(30, "Submitting to model...");

      if (contractDeployed() && connected) {
        try {
          const writeClient = await getWriteClient();
          const fee = models[modelId]?.feePerQuery ?? BigInt(0);

          // Use the CDR writeClient's underlying walletClient for the tx
          const walletClient = (writeClient as any).walletClient;
          if (walletClient) {
            await walletClient.writeContract({
              address: CONTRACTS.CONFIDENTIAL_INFERENCE,
              abi: inferenceAbi,
              functionName: "submitQuery",
              args: [BigInt(modelId)],
              value: fee,
            });
          }
        } catch (err) {
          console.warn("On-chain submitQuery failed (continuing with API):", err);
        }
      }

      setP(50, "Submitting to model...");

      // Step 3: TEE processing via API
      setP(55, "TEE processing...");
      const res = await fetch("/api/ai/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId, input: input.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? "API request failed");
      }

      setP(85, "TEE processing...");
      const data = (await res.json()) as QueryResult;

      setP(100, "Result ready!");
      setResults((p) => ({ ...p, [modelId]: data }));
    } catch (err) {
      setErrors((p) => ({
        ...p,
        [modelId]: err instanceof Error ? err.message : String(err),
      }));
      setP(0, "");
    } finally {
      setRunning((p) => ({ ...p, [modelId]: false }));
    }
  }

  function resetModel(modelId: number) {
    setResults((p) => {
      const n = { ...p };
      delete n[modelId];
      return n;
    });
    setInputs((p) => ({ ...p, [modelId]: "" }));
    setProgress((p) => {
      const n = { ...p };
      delete n[modelId];
      return n;
    });
    setErrors((p) => ({ ...p, [modelId]: "" }));
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <h1 className="text-2xl font-bold tracking-tight">
          {"\ud83e\udde0"} Confidential AI
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Run private inference on encrypted data. Your input stays confidential
          — only the result is revealed.
        </p>

        {!connected && (
          <div className="mt-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-400">
            Connect your wallet to submit on-chain queries.
          </div>
        )}

        {!contractDeployed() && (
          <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50">
            On-chain integration requires the ConfidentialInference contract to
            be deployed. Queries will be processed via API only.
          </div>
        )}

        {/* Tab nav */}
        <div className="mt-6 flex gap-1 rounded-lg bg-white/5 p-1">
          {(["browse", "queries"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              {t === "browse" ? "Browse Models" : "My Queries"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="mt-6">
          {/* === BROWSE MODELS === */}
          {tab === "browse" && (
            <div className="flex flex-col gap-5">
              {[0, 1, 2].map((modelId) => {
                const meta = MODEL_META[modelId];
                const chain = models[modelId];
                const input = inputs[modelId] ?? "";
                const isRunning = running[modelId] ?? false;
                const prog = progress[modelId];
                const result = results[modelId];
                const error = errors[modelId];
                const fee = chain
                  ? formatEther(chain.feePerQuery)
                  : "0.001";
                const queries = chain ? Number(chain.totalQueries) : 0;

                return (
                  <div
                    key={modelId}
                    className="rounded-xl border border-white/8 bg-white/[0.03] p-5"
                  >
                    {/* Card header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold">
                          {meta.emoji} {meta.name}
                        </p>
                        <p className="mt-1 text-sm text-white/50">
                          {meta.description}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-3 flex items-center gap-3 text-xs text-white/40">
                      <span>{queries} queries</span>
                      <span className="h-3 w-px bg-white/10" />
                      <span>{fee} IP per query</span>
                    </div>

                    {/* Result or form */}
                    {result ? (
                      <div className="mt-4 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                            Result
                          </span>
                          <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-medium text-cyan-400">
                            Verified by TEE &#10003;
                          </span>
                        </div>
                        <pre className="mt-3 overflow-x-auto rounded-md bg-black/30 p-3 text-xs leading-relaxed text-white/80">
                          {JSON.stringify(result.result, null, 2)}
                        </pre>
                        <p className="mt-3 font-mono text-xs text-white/30">
                          Attestation: {truncateHash(result.attestation)}
                        </p>
                        <button
                          onClick={() => resetModel(modelId)}
                          className="mt-3 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/15"
                        >
                          Run Another Query
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-col gap-3">
                        <textarea
                          value={input}
                          onChange={(e) =>
                            setInputs((p) => ({
                              ...p,
                              [modelId]: e.target.value,
                            }))
                          }
                          placeholder="Type your prompt (encrypted before sending)..."
                          rows={3}
                          disabled={isRunning}
                          className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-cyan-500/30 focus:ring-1 focus:ring-demo-ai/30 disabled:opacity-50"
                        />

                        {/* Progress bar */}
                        {isRunning && prog && prog.pct > 0 && (
                          <ProgressBar
                            percent={prog.pct}
                            label={prog.label}
                            accentClass="bg-demo-ai"
                          />
                        )}

                        {/* Error */}
                        {error && (
                          <p className="text-xs text-red-400">{error}</p>
                        )}

                        {/* Submit */}
                        {!isRunning && (
                          <button
                            onClick={() => handleRunQuery(modelId)}
                            disabled={!input.trim()}
                            className="rounded-lg bg-demo-ai/20 px-4 py-2.5 text-sm font-medium text-cyan-300 ring-1 ring-demo-ai/30 transition-colors hover:bg-demo-ai/30 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Run Privately &mdash; {fee} IP
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* === MY QUERIES === */}
          {tab === "queries" && (
            <div className="flex flex-col gap-4">
              {!connected || !contractDeployed() ? (
                <div className="rounded-xl border border-dashed border-white/10 px-6 py-10 text-center">
                  <p className="text-sm text-white/40">
                    Connect wallet and ensure contract is deployed.
                  </p>
                </div>
              ) : queriesLoading ? (
                <p className="text-sm text-white/50">Loading queries...</p>
              ) : userQueries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 px-6 py-10 text-center">
                  <p className="text-sm text-white/40">No queries yet.</p>
                  <p className="mt-1 text-xs text-white/25">
                    Run a private query from the Browse Models tab.
                  </p>
                </div>
              ) : (
                userQueries.map((q) => {
                  const meta = MODEL_META[q.modelId] ?? {
                    emoji: "?",
                    name: `Model #${q.modelId}`,
                  };
                  return (
                    <div
                      key={q.queryId}
                      className="rounded-xl border border-white/8 bg-white/[0.03] p-5"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {meta.emoji} {meta.name}
                          </p>
                          <p className="mt-1 font-mono text-xs text-white/30">
                            Query #{q.queryId}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(q.status)}`}
                        >
                          {STATUS_LABELS[q.status] ?? "Unknown"}
                        </span>
                      </div>
                      {q.attestation &&
                        q.attestation !== "0x" &&
                        q.attestation !== "0x0000000000000000000000000000000000000000000000000000000000000000" && (
                          <p className="mt-2 font-mono text-xs text-white/30">
                            Attestation: {truncateHash(q.attestation)}
                          </p>
                        )}
                    </div>
                  );
                })
              )}
              {connected && contractDeployed() && (
                <button
                  onClick={loadUserQueries}
                  className="text-xs text-white/40 transition-colors hover:text-white/60"
                >
                  Refresh
                </button>
              )}
            </div>
          )}
        </div>

        {/* How it works */}
        <HowItWorks
          layers={[
            {
              title: "Layer 1 — What is Confidential AI?",
              content: (
                <ul className="flex flex-col gap-2 text-sm text-white/50">
                  <li>
                    Your input is encrypted before it leaves your browser —
                    nobody can see your prompt.
                  </li>
                  <li>
                    Model weights are stored in an encrypted CDR vault — the
                    model provider&apos;s IP stays protected.
                  </li>
                  <li>
                    A Trusted Execution Environment (TEE) decrypts both input
                    and weights, runs inference in an isolated enclave, and
                    produces a cryptographic attestation.
                  </li>
                  <li>
                    Only the result (and its attestation proof) is revealed to
                    you — the raw input and weights are never exposed.
                  </li>
                  <li>
                    On-chain payment enforces fair compensation to the model
                    provider for each query.
                  </li>
                </ul>
              ),
            },
            {
              title: "Layer 2 — On-chain flow",
              content: (
                <ol className="flex flex-col gap-2 text-sm text-white/50">
                  <li>
                    1. User encrypts input with the network&apos;s threshold
                    public key and stores it in a CDR vault.
                  </li>
                  <li>
                    2. User calls{" "}
                    <code className="rounded bg-white/5 px-1 py-0.5 text-xs text-cyan-300">
                      submitQuery(modelId)
                    </code>{" "}
                    with the model fee — this creates an on-chain record and
                    triggers the TEE.
                  </li>
                  <li>
                    3. The TEE decrypts the user&apos;s input vault and the
                    model&apos;s weights vault inside the enclave.
                  </li>
                  <li>
                    4. Inference runs inside the TEE — neither the host nor
                    the model provider can observe the computation.
                  </li>
                  <li>
                    5. The TEE writes the encrypted result to a new CDR vault,
                    submits an attestation on-chain, and marks the query
                    complete.
                  </li>
                  <li>
                    6. The user decrypts the result vault to read the output.
                  </li>
                </ol>
              ),
            },
            {
              title: "Layer 3 — Code snippets",
              content: (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                      Submit a query
                    </p>
                    <pre className="overflow-x-auto rounded-md bg-black/30 p-3 text-xs leading-relaxed text-white/70">
{`const tx = await walletClient.writeContract({
  address: CONFIDENTIAL_INFERENCE,
  abi: inferenceAbi,
  functionName: "submitQuery",
  args: [BigInt(modelId)],
  value: feePerQuery,
});`}
                    </pre>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                      Encrypt user input to CDR vault
                    </p>
                    <pre className="overflow-x-auto rounded-md bg-black/30 p-3 text-xs leading-relaxed text-white/70">
{`const globalPubKey = await cdrClient.observer.getGlobalPubKey();
const label = uuidToLabel(inputVaultUuid);
const ciphertext = await cdrClient.uploader.encryptDataKey({
  dataKey: new TextEncoder().encode(userInput),
  globalPubKey,
  label,
});`}
                    </pre>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                      Process via API (demo)
                    </p>
                    <pre className="overflow-x-auto rounded-md bg-black/30 p-3 text-xs leading-relaxed text-white/70">
{`const res = await fetch("/api/ai/process", {
  method: "POST",
  body: JSON.stringify({ modelId, input }),
});
const { result, attestation } = await res.json();`}
                    </pre>
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

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
