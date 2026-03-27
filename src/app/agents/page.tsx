"use client";

import { useState, useRef } from "react";
import { HowItWorks } from "@/components/how-it-works";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Scenario = "market-intelligence" | "user-preferences" | "training-data";
type Phase = "idle" | "running" | "done" | "error";

interface AgentIdentity {
  name: string;
  emoji: string;
  address: string;
  role: string;
}

interface ThoughtEvent {
  type: "thought";
  agent: "A" | "B";
  thought: string;
  step: string;
}

interface DataPreviewEvent {
  type: "data_preview";
  agent: "A" | "B";
  visibility: "full" | "locked" | "decrypting";
  data?: Record<string, unknown>;
  title?: string;
  price?: string;
}

interface AgentsEvent {
  type: "agents";
  agentA: AgentIdentity;
  agentB: AgentIdentity;
}

interface ActionEvent {
  step: number;
  agent: string;
  message: string;
  txHash?: string;
  status: "processing" | "done" | "error";
  data?: Record<string, unknown>;
}

interface FeedItem extends ActionEvent {
  timestamp: Date;
}

/* ------------------------------------------------------------------ */
/*  Scenario definitions                                               */
/* ------------------------------------------------------------------ */

const SCENARIOS: { id: Scenario; emoji: string; title: string; description: string }[] = [
  {
    id: "market-intelligence",
    emoji: "\u{1F4CA}",
    title: "Market Intelligence",
    description: "Agent A has price/trend data. Agent B pays for market insights.",
  },
  {
    id: "user-preferences",
    emoji: "\u{1F464}",
    title: "User Preferences",
    description: "Agent A collected user behavior profiles. Agent B (recommendation engine) buys them.",
  },
  {
    id: "training-data",
    emoji: "\u{1F5C2}",
    title: "Training Data",
    description: "Agent A has labeled datasets. Agent B buys them for model fine-tuning.",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function AgentHeader({ agent }: { agent?: AgentIdentity }) {
  if (!agent) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{agent.emoji}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{agent.name}</p>
        <p className="font-mono text-[10px] text-white/30">{truncateAddress(agent.address)}</p>
      </div>
      <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/40">{agent.role}</span>
    </div>
  );
}

function ThinkingBubble({ thought }: { thought: string }) {
  if (!thought) return null;
  return (
    <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/50 mb-1">Thinking</p>
      <p className="text-xs text-white/60 italic">&ldquo;{thought}&rdquo;</p>
    </div>
  );
}

function DataCard({ preview }: { preview: DataPreviewEvent | null }) {
  if (!preview) return null;

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5">Data</p>
      {preview.visibility === "full" && preview.data && (
        <pre className="text-[11px] text-green-400/70 font-mono whitespace-pre-wrap overflow-x-auto max-h-32 overflow-y-auto">
          {JSON.stringify(preview.data, null, 2)}
        </pre>
      )}
      {preview.visibility === "locked" && (
        <div className="space-y-1.5">
          <p className="text-xs text-white/30">{"\u{1F512}"} Encrypted</p>
          {preview.title && (
            <p className="text-[11px] text-white/20">
              {preview.title} &mdash; {preview.price} IP
            </p>
          )}
          <div className="space-y-1">
            <div className="h-2 rounded bg-white/5" />
            <div className="h-2 rounded bg-white/5 w-3/4" />
            <div className="h-2 rounded bg-white/5 w-1/2" />
          </div>
          <p className="text-[10px] text-white/15">Purchase to unlock</p>
        </div>
      )}
      {preview.visibility === "decrypting" && (
        <div className="space-y-1.5">
          <p className="text-xs text-amber-400/70 animate-pulse">{"\u{1F513}"} Decrypting...</p>
          <div className="space-y-1">
            <div className="h-2 rounded bg-white/5 animate-pulse" />
            <div className="h-2 rounded bg-white/5 animate-pulse w-3/4" />
          </div>
        </div>
      )}
    </div>
  );
}

function ActionLog({ actions, isGlobalDone }: { actions: FeedItem[]; isGlobalDone: boolean }) {
  if (actions.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Actions</p>
      {actions.map((item, i) => {
        const done = isGlobalDone || item.status === "done";
        const processing = !isGlobalDone && item.status === "processing";
        const isErr = item.status === "error";
        return (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0 text-xs leading-none">
              {isErr ? (
                <span className="text-red-400">{"\u2716"}</span>
              ) : done ? (
                <span className="text-emerald-400">{"\u2713"}</span>
              ) : processing ? (
                <span className="animate-pulse text-amber-400">{"\u25CF"}</span>
              ) : (
                <span className="text-white/30">{"\u25CB"}</span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-xs ${isErr ? "text-red-400" : "text-white/60"}`}>{item.message}</p>
              {item.txHash && (
                <p className="font-mono text-[10px] text-white/20">
                  tx: {item.txHash.slice(0, 10)}...{item.txHash.slice(-6)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AgentsPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [decryptedData, setDecryptedData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New state
  const [agents, setAgents] = useState<{ agentA?: AgentIdentity; agentB?: AgentIdentity }>({});
  const [thoughtA, setThoughtA] = useState("");
  const [thoughtB, setThoughtB] = useState("");
  const [dataA, setDataA] = useState<DataPreviewEvent | null>(null);
  const [dataB, setDataB] = useState<DataPreviewEvent | null>(null);
  const [actionsA, setActionsA] = useState<FeedItem[]>([]);
  const [actionsB, setActionsB] = useState<FeedItem[]>([]);
  const [timeline, setTimeline] = useState<FeedItem[]>([]);

  const agentsRef = useRef<{ agentA?: AgentIdentity; agentB?: AgentIdentity }>({});

  /* ---- SSE consumer ---- */

  async function startDemo(scenario: Scenario) {
    setActiveScenario(scenario);
    setPhase("running");
    setDecryptedData(null);
    setError(null);
    setAgents({});
    setThoughtA("");
    setThoughtB("");
    setDataA(null);
    setDataB(null);
    setActionsA([]);
    setActionsB([]);
    setTimeline([]);
    agentsRef.current = {};

    try {
      const response = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const raw = JSON.parse(line.slice(6));
            handleEvent(raw);
          }
        }
      }
      setPhase("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  function handleEvent(raw: Record<string, unknown>) {
    const now = new Date();

    if (raw.type === "agents") {
      const evt = raw as unknown as AgentsEvent;
      setAgents({ agentA: evt.agentA, agentB: evt.agentB });
      agentsRef.current = { agentA: evt.agentA, agentB: evt.agentB };
    } else if (raw.type === "thought") {
      const evt = raw as unknown as ThoughtEvent;
      if (evt.agent === "A") setThoughtA(evt.thought);
      else setThoughtB(evt.thought);
    } else if (raw.type === "data_preview") {
      const evt = raw as unknown as DataPreviewEvent;
      if (evt.agent === "A") setDataA(evt);
      else setDataB(evt);
    } else {
      // Action event
      const action = { ...raw, timestamp: now } as unknown as FeedItem;
      setTimeline((prev) => [...prev, action]);

      const aName = agentsRef.current.agentA?.name;
      if (action.agent === aName) {
        setActionsA((prev) => [...prev, action]);
      } else if (action.agent !== "system") {
        setActionsB((prev) => [...prev, action]);
      }

      if (action.status === "error") setError(action.message);
      if (action.data && action.status === "done") {
        setDecryptedData(
          typeof action.data === "string" ? action.data : JSON.stringify(action.data, null, 2)
        );
      }
    }
  }

  function goBack() {
    setPhase("idle");
    setActiveScenario(null);
    setDecryptedData(null);
    setError(null);
    setAgents({});
    setThoughtA("");
    setThoughtB("");
    setDataA(null);
    setDataB(null);
    setActionsA([]);
    setActionsB([]);
    setTimeline([]);
    agentsRef.current = {};
  }

  /* ---- Derived state ---- */

  const activeScenarioMeta = SCENARIOS.find((s) => s.id === activeScenario);
  const isDone = phase === "done";
  const isError = phase === "error";
  const showBack = isDone || isError;

  /* ---- Render ---- */

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="mr-2">{"\u{1F916}"}</span>Agent Data Exchange
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Watch AI agents buy and sell private data autonomously. Real transactions. No human in the loop.
        </p>

        {/* ============ PHASE: IDLE — Scenario picker ============ */}
        {phase === "idle" && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {SCENARIOS.map((s) => (
              <div
                key={s.id}
                className="group relative flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-5 backdrop-blur-sm transition-colors hover:border-demo-agent/30 hover:bg-white/[0.05]"
              >
                <span className="text-3xl">{s.emoji}</span>
                <div className="flex flex-1 flex-col">
                  <p className="text-sm font-bold text-white">{s.title}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/40">{s.description}</p>
                </div>
                <button
                  onClick={() => startDemo(s.id)}
                  className="mt-2 rounded-lg bg-demo-agent/20 px-3 py-2 text-xs font-medium text-amber-300 ring-1 ring-demo-agent/30 transition-colors hover:bg-demo-agent/30"
                >
                  Start &rarr;
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ============ PHASE: RUNNING / DONE / ERROR ============ */}
        {phase !== "idle" && (
          <div className="mt-8 flex flex-col gap-5">
            {/* Scenario title + back button */}
            <div className="flex items-center justify-between">
              {activeScenarioMeta && (
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <span>{activeScenarioMeta.emoji}</span>
                  <span className="font-medium">{activeScenarioMeta.title}</span>
                </div>
              )}
              {showBack && (
                <button
                  onClick={goBack}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/15"
                >
                  &larr; Back
                </button>
              )}
            </div>

            {/* Split-screen agent panels */}
            <div className="grid grid-cols-2 gap-3">
              {/* Agent A Panel */}
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 flex flex-col gap-3">
                {agents.agentA ? (
                  <AgentHeader agent={agents.agentA} />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{"\u{1F916}"}</span>
                    <p className="text-sm text-white/30">Agent A</p>
                  </div>
                )}
                <ThinkingBubble thought={thoughtA} />
                <DataCard preview={dataA} />
                <ActionLog actions={actionsA} isGlobalDone={isDone} />
                {actionsA.length === 0 && !thoughtA && !dataA && (
                  <p className="text-xs text-white/20">Waiting...</p>
                )}
              </div>

              {/* Agent B Panel */}
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 flex flex-col gap-3">
                {agents.agentB ? (
                  <AgentHeader agent={agents.agentB} />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{"\u{1F916}"}</span>
                    <p className="text-sm text-white/30">Agent B</p>
                  </div>
                )}
                <ThinkingBubble thought={thoughtB} />
                <DataCard preview={dataB} />
                <ActionLog actions={actionsB} isGlobalDone={isDone} />
                {actionsB.length === 0 && !thoughtB && !dataB && (
                  <p className="text-xs text-white/20">Waiting...</p>
                )}
              </div>
            </div>

            {/* Shared timeline */}
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/30">Timeline</p>
              {timeline.length === 0 && (
                <p className="text-sm text-white/30">Waiting for events...</p>
              )}
              <div className="flex flex-col gap-2">
                {timeline.map((item, i) => {
                  const itemDone = isDone || item.status === "done";
                  const isProcessing = !isDone && item.status === "processing";
                  const isItemError = item.status === "error";

                  return (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex-shrink-0 text-xs leading-none">
                        {isItemError ? (
                          <span className="text-red-400">{"\u2716"}</span>
                        ) : itemDone ? (
                          <span className="text-emerald-400">{"\u2713"}</span>
                        ) : isProcessing ? (
                          <span className="animate-pulse text-amber-400">{"\u25CF"}</span>
                        ) : (
                          <span className="text-white/30">{"\u25CB"}</span>
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${isItemError ? "text-red-400" : "text-white/70"}`}>
                          {item.message}
                        </p>
                        {item.txHash && (
                          <p className="mt-0.5 font-mono text-[10px] text-white/30">
                            tx: {item.txHash.slice(0, 10)}...{item.txHash.slice(-6)}
                          </p>
                        )}
                      </div>
                      <span className="flex-shrink-0 text-[10px] tabular-nums text-white/20">
                        {formatTime(item.timestamp)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Decrypted data (success) */}
            {isDone && decryptedData && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/70">
                  Decrypted Data
                </p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all font-mono text-sm text-emerald-300">
                  {decryptedData}
                </pre>
              </div>
            )}

            {/* Error box */}
            {isError && error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-red-400/70">Error</p>
                <p className="mt-1 text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Back button (bottom, when no top back shown) */}
            {showBack && (
              <button
                onClick={goBack}
                className="self-start rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
              >
                &larr; Back to Scenarios
              </button>
            )}
          </div>
        )}

        {/* How it works */}
        <HowItWorks
          layers={[
            {
              title: "Conceptual: Agent data exchange",
              content: (
                <ul className="flex flex-col gap-2 text-white/50">
                  <li>&#8226; Autonomous agents discover data listings on the marketplace smart contract.</li>
                  <li>&#8226; Agent B pays Agent A on-chain -- funds transfer atomically with access rights.</li>
                  <li>&#8226; Encrypted data is stored in a CDR vault. The decryption key is split across validators.</li>
                  <li>&#8226; After purchase, validators release key fragments. The buyer agent combines them to decrypt client-side.</li>
                  <li>&#8226; No trusted middleman -- the entire exchange is verifiable and non-custodial.</li>
                </ul>
              ),
            },
            {
              title: "Architecture: On-chain interaction flow",
              content: (
                <div className="flex flex-col gap-3 font-mono text-xs text-white/50">
                  <div>
                    <p className="mb-1 text-white/30">Seller (Agent A):</p>
                    <p>marketplace.setup(accessFee) &#8594; CDR.allocate()</p>
                    <p>encrypt(data, globalPubKey) &#8594; CDR.write(uuid, ciphertext)</p>
                    <p>marketplace.upload(listingId, metadata)</p>
                  </div>
                  <div>
                    <p className="mb-1 text-white/30">Buyer (Agent B):</p>
                    <p>marketplace.purchase(listingId, pubKey) &#8594; CDR.read(uuid)</p>
                    <p>validators emit partial decryptions</p>
                    <p>collect partials &#8594; ECIES decrypt &#8594; TDH2 combine &#8594; plaintext</p>
                  </div>
                </div>
              ),
            },
            {
              title: "Code: Marketplace contract + SSE streaming",
              content: (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="mb-1 text-xs text-white/30">Marketplace contract interaction:</p>
                    <pre className="overflow-x-auto rounded-lg bg-white/[0.03] p-3 text-xs text-white/60">{`// Seller lists data
const tx = await marketplace.setup(accessFee, { value: allocateFee });
const { listingId, cdrUuid } = parseEvents(tx);
const ciphertext = encrypt(data, globalPubKey, label);
await cdr.write(cdrUuid, ciphertext);
await marketplace.upload(listingId, metadata);

// Buyer purchases & decrypts
await marketplace.purchase(listingId, ephemeralPubKey,
  { value: accessFee + readFee });
const partials = await collectPartials(uuid, threshold);
const plaintext = tdh2Combine(ciphertext, partials);`}</pre>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-white/30">SSE streaming pattern:</p>
                    <pre className="overflow-x-auto rounded-lg bg-white/[0.03] p-3 text-xs text-white/60">{`const res = await fetch("/api/agents/run", {
  method: "POST",
  body: JSON.stringify({ scenario }),
});
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = "";
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\\n\\n");
  buffer = lines.pop() || "";
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const event = JSON.parse(line.slice(6));
      // update UI with event
    }
  }
}`}</pre>
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
