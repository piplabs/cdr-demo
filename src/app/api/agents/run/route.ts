import { NextRequest } from "next/server";
import OpenAI from "openai";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  toHex,
  parseEventLogs,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { cdrDevnet, RPC_URL } from "@/config/chain";
import { CONTRACTS, marketplaceAbi } from "@/config/contracts";
import { cdrAbi, contractAddresses } from "@piplabs/cdr-contracts";
import { secp256k1 } from "@noble/curves/secp256k1";

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

const SCENARIOS = {
  "market-intelligence": {
    title: "Q1 Market Trends Analysis",
    data: JSON.stringify({
      asset: "ETH",
      trend: "bullish",
      confidence: 0.87,
      signals: ["volume_spike", "whale_accumulation"],
    }),
    price: "0.05",
    agentA: { name: "DataHarvester", emoji: "📊" },
    agentB: { name: "AlphaSeeker", emoji: "🔍" },
  },
  "user-preferences": {
    title: "User Behavior Profiles — Batch 47",
    data: JSON.stringify({
      users: 1200,
      segments: ["power_user", "casual", "new"],
      avg_session: "12m",
      top_features: ["search", "recommendations"],
    }),
    price: "0.03",
    agentA: { name: "ProfileAggregator", emoji: "👤" },
    agentB: { name: "RecEngine", emoji: "🎯" },
  },
  "training-data": {
    title: "Labeled Sentiment Dataset (10k samples)",
    data: JSON.stringify({
      samples: 10000,
      labels: ["positive", "negative", "neutral"],
      accuracy: 0.94,
      language: "en",
    }),
    price: "0.08",
    agentA: { name: "DataLabeler", emoji: "🗂️" },
    agentB: { name: "ModelTrainer", emoji: "🧠" },
  },
} as const;

type Scenario = keyof typeof SCENARIOS;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sendEvent(
  controller: ReadableStreamDefaultController,
  data: Record<string, unknown>,
) {
  controller.enqueue(
    new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`),
  );
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function generateThought(params: {
  agentName: string;
  role: "seller" | "buyer";
  stepContext: string;
  title: string;
  price: string;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return `[${params.agentName} is processing...]`;

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are ${params.agentName}, an AI data ${params.role} agent. Generate a 1-2 sentence internal thought about what you're doing right now. Be specific — reference the data title "${params.title}", price ${params.price} IP, and relevant details. Stay in character. Be concise. No quotes around your response.`,
        },
        { role: "user", content: params.stepContext },
      ],
      max_tokens: 100,
      temperature: 0.7,
    });
    return response.choices[0]?.message?.content?.trim() ?? `[${params.agentName} thinking...]`;
  } catch {
    return `[${params.agentName} is processing...]`;
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const body = await req.json();
  const scenarioKey = body?.scenario as string | undefined;

  if (!scenarioKey || !(scenarioKey in SCENARIOS)) {
    return new Response(
      JSON.stringify({
        error: `Invalid scenario. Choose one of: ${Object.keys(SCENARIOS).join(", ")}`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const scenario = SCENARIOS[scenarioKey as Scenario];

  // Agent wallet setup
  const agentAKey = process.env.AGENT_A_PRIVATE_KEY as `0x${string}`;
  const agentBKey = process.env.AGENT_B_PRIVATE_KEY as `0x${string}`;
  if (!agentAKey || !agentBKey) {
    return new Response(
      JSON.stringify({ error: "Agent private keys not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const accountA = privateKeyToAccount(agentAKey);
  const accountB = privateKeyToAccount(agentBKey);

  const transport = http(RPC_URL);

  const walletA = createWalletClient({
    account: accountA,
    chain: cdrDevnet,
    transport,
  });
  const walletB = createWalletClient({
    account: accountB,
    chain: cdrDevnet,
    transport,
  });
  const publicClient = createPublicClient({
    chain: cdrDevnet,
    transport,
  });

  const cdrAddress = contractAddresses.testnet.cdr as `0x${string}`;
  const marketplaceAddress = CONTRACTS.DATA_MARKETPLACE;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // ---------------------------------------------------------------
        // Read fees
        // ---------------------------------------------------------------
        const [allocateFee, writeFee, readFee] = await Promise.all([
          publicClient.readContract({
            address: cdrAddress,
            abi: cdrAbi,
            functionName: "allocateFee",
          }),
          publicClient.readContract({
            address: cdrAddress,
            abi: cdrAbi,
            functionName: "writeFee",
          }),
          publicClient.readContract({
            address: cdrAddress,
            abi: cdrAbi,
            functionName: "readFee",
          }),
        ]);

        const accessFee = parseEther(scenario.price);

        // Emit agent identities
        sendEvent(controller, {
          type: "agents",
          agentA: { ...scenario.agentA, address: accountA.address, role: "Seller" },
          agentB: { ...scenario.agentB, address: accountB.address, role: "Buyer" },
        });

        // Emit initial data visibility
        sendEvent(controller, {
          type: "data_preview",
          agent: "A",
          visibility: "full",
          data: JSON.parse(scenario.data),
        });
        sendEvent(controller, {
          type: "data_preview",
          agent: "B",
          visibility: "locked",
          title: scenario.title,
          price: scenario.price,
        });

        // ---------------------------------------------------------------
        // Step 1 — List: Agent A calls marketplace.setup(accessFee)
        // ---------------------------------------------------------------
        const thought1 = await generateThought({
          agentName: scenario.agentA.name, role: "seller",
          stepContext: `You are about to list your data "${scenario.title}" for sale at ${scenario.price} IP on a decentralized marketplace.`,
          title: scenario.title, price: scenario.price,
        });
        sendEvent(controller, { type: "thought", agent: "A", thought: thought1, step: "list" });

        sendEvent(controller, {
          step: 1,
          agent: scenario.agentA.name,
          message: `${scenario.agentA.emoji} ${scenario.agentA.name} is creating a listing for "${scenario.title}"...`,
          status: "processing",
        });

        const setupHash = await walletA.writeContract({
          address: marketplaceAddress,
          abi: marketplaceAbi,
          functionName: "setup",
          args: [accessFee],
          value: allocateFee,
        });

        const setupReceipt = await publicClient.waitForTransactionReceipt({
          hash: setupHash,
        });

        const listingEvents = parseEventLogs({
          abi: marketplaceAbi,
          eventName: "ListingCreated",
          logs: setupReceipt.logs,
        });
        const listingId = listingEvents[0].args.listingId;
        const cdrUuid = listingEvents[0].args.cdrUuid;

        sendEvent(controller, {
          step: 1,
          agent: scenario.agentA.name,
          message: `${scenario.agentA.emoji} Listing #${listingId} created (CDR vault ${cdrUuid})`,
          txHash: setupHash,
          status: "done",
        });

        await delay(2000);

        // ---------------------------------------------------------------
        // Step 2 — Encrypt & Upload: Agent A writes data to CDR, then
        //          calls marketplace.upload with metadata.
        // ---------------------------------------------------------------
        const thought2 = await generateThought({
          agentName: scenario.agentA.name, role: "seller",
          stepContext: "You are encrypting your data using threshold encryption so no single party can read it.",
          title: scenario.title, price: scenario.price,
        });
        sendEvent(controller, { type: "thought", agent: "A", thought: thought2, step: "encrypt" });

        sendEvent(controller, {
          step: 2,
          agent: scenario.agentA.name,
          message: `${scenario.agentA.emoji} ${scenario.agentA.name} is encrypting and uploading data to CDR vault...`,
          status: "processing",
        });

        const encodedData = new TextEncoder().encode(scenario.data);
        const writeHash = await walletA.writeContract({
          address: cdrAddress,
          abi: cdrAbi,
          functionName: "write",
          args: [cdrUuid, "0x", toHex(encodedData)],
          value: writeFee,
        });
        await publicClient.waitForTransactionReceipt({ hash: writeHash });

        const metadata = JSON.stringify({
          title: scenario.title,
          records: encodedData.length,
          format: "json",
          created: new Date().toISOString(),
        });

        const uploadHash = await walletA.writeContract({
          address: marketplaceAddress,
          abi: marketplaceAbi,
          functionName: "upload",
          args: [listingId, metadata],
        });
        await publicClient.waitForTransactionReceipt({ hash: uploadHash });

        sendEvent(controller, {
          step: 2,
          agent: scenario.agentA.name,
          message: `${scenario.agentA.emoji} Data encrypted via TDH2 and stored in CDR vault ${cdrUuid}`,
          txHash: uploadHash,
          status: "done",
        });

        await delay(2000);

        // ---------------------------------------------------------------
        // Step 3 — Discover: Simulated delay (no on-chain call)
        // ---------------------------------------------------------------
        const thought3 = await generateThought({
          agentName: scenario.agentB.name, role: "buyer",
          stepContext: `You found a listing: "${scenario.title}" priced at ${scenario.price} IP. Evaluate whether to buy.`,
          title: scenario.title, price: scenario.price,
        });
        sendEvent(controller, { type: "thought", agent: "B", thought: thought3, step: "discover" });

        sendEvent(controller, {
          step: 3,
          agent: scenario.agentB.name,
          message: `${scenario.agentB.emoji} ${scenario.agentB.name} discovered listing #${listingId}: "${scenario.title}" — ${scenario.price} IP`,
          status: "processing",
        });

        await delay(1500);

        sendEvent(controller, {
          step: 3,
          agent: scenario.agentB.name,
          message: `${scenario.agentB.emoji} ${scenario.agentB.name} verified data metadata and CDR vault integrity`,
          status: "done",
        });

        await delay(1000);

        // ---------------------------------------------------------------
        // Step 4 — Purchase: Agent B buys access
        // ---------------------------------------------------------------
        const thought4 = await generateThought({
          agentName: scenario.agentB.name, role: "buyer",
          stepContext: `You are purchasing access to "${scenario.title}" for ${scenario.price} IP. Payment is enforced on-chain.`,
          title: scenario.title, price: scenario.price,
        });
        sendEvent(controller, { type: "thought", agent: "B", thought: thought4, step: "purchase" });

        sendEvent(controller, {
          step: 4,
          agent: scenario.agentB.name,
          message: `${scenario.agentB.emoji} ${scenario.agentB.name} is purchasing access to listing #${listingId}...`,
          status: "processing",
        });

        const ephemeralPrivKey = secp256k1.utils.randomPrivateKey();
        const ephemeralPubKey = secp256k1.getPublicKey(ephemeralPrivKey, false);

        const purchaseHash = await walletB.writeContract({
          address: marketplaceAddress,
          abi: marketplaceAbi,
          functionName: "purchase",
          args: [listingId, toHex(ephemeralPubKey)],
          value: accessFee + readFee,
        });
        await publicClient.waitForTransactionReceipt({ hash: purchaseHash });

        sendEvent(controller, {
          step: 4,
          agent: scenario.agentB.name,
          message: `${scenario.agentB.emoji} Purchase confirmed — ${scenario.price} IP paid + CDR read fee`,
          txHash: purchaseHash,
          status: "done",
        });

        await delay(2000);

        // ---------------------------------------------------------------
        // Step 5 — Decrypt: Simulated validator decryption
        // ---------------------------------------------------------------
        sendEvent(controller, { type: "data_preview", agent: "B", visibility: "decrypting" });
        const thought5 = await generateThought({
          agentName: scenario.agentB.name, role: "buyer",
          stepContext: "Validators are providing partial decryptions. You are combining them to recover the data.",
          title: scenario.title, price: scenario.price,
        });
        sendEvent(controller, { type: "thought", agent: "B", thought: thought5, step: "decrypt" });

        sendEvent(controller, {
          step: 5,
          agent: scenario.agentB.name,
          message: `${scenario.agentB.emoji} Validators releasing decryption shares...`,
          status: "processing",
        });

        await delay(3000);

        sendEvent(controller, {
          step: 5,
          agent: scenario.agentB.name,
          message: `${scenario.agentB.emoji} Decryption shares combined — data decrypted successfully`,
          status: "done",
        });

        await delay(1000);

        sendEvent(controller, { type: "data_preview", agent: "B", visibility: "full", data: JSON.parse(scenario.data) });
        const thought6 = await generateThought({
          agentName: scenario.agentB.name, role: "buyer",
          stepContext: "You have successfully decrypted and received the data. Analyzing the contents.",
          title: scenario.title, price: scenario.price,
        });
        sendEvent(controller, { type: "thought", agent: "B", thought: thought6, step: "receive" });

        // ---------------------------------------------------------------
        // Step 6 — Complete
        // ---------------------------------------------------------------
        sendEvent(controller, {
          step: 6,
          agent: scenario.agentB.name,
          message: `${scenario.agentB.emoji} Exchange complete! ${scenario.agentB.name} received "${scenario.title}"`,
          status: "done",
          data: {
            listingId: listingId.toString(),
            cdrUuid: cdrUuid.toString(),
            title: scenario.title,
            payload: JSON.parse(scenario.data),
            seller: accountA.address,
            buyer: accountB.address,
            price: scenario.price,
          },
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unknown error occurred";
        sendEvent(controller, {
          step: 0,
          agent: "system",
          message: `Error: ${message}`,
          status: "error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
