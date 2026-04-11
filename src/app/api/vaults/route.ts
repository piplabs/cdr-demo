import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { contractAddresses } from "@piplabs/cdr-contracts";
import { cdrDevnet } from "@/config/chain";

/**
 * Incremental vault-list cache.
 *
 * Scans the CDR contract's VaultAllocated events since the last seen block,
 * appends any new entries to a module-level cache, and returns the full list.
 * On a warm instance this costs one eth_blockNumber + one small getLogs call
 * per request instead of rescanning all history every time the client mounts.
 *
 * The cache is per-process and lives only as long as the Node instance stays
 * warm — a cold start rescans from block 0 once, then the watermark advances.
 *
 * Not multi-instance safe. For real deployments swap the module-level object
 * for Redis / KV / SQLite; the refresh() logic stays identical.
 */

export const dynamic = "force-dynamic";

const UPSTREAM_RPC =
  process.env.CDR_UPSTREAM_RPC_URL ??
  process.env.NEXT_PUBLIC_RPC_URL ??
  "https://aeneid.storyrpc.io";

const CDR_ADDRESS = contractAddresses.testnet.cdr as `0x${string}`;
const CHUNK_SIZE = 100_000n;

interface VaultListItem {
  uuid: number;
  updatable: boolean;
  writeConditionAddr: string;
  readConditionAddr: string;
}

const vaultAllocatedEvent = {
  type: "event" as const,
  name: "VaultAllocated" as const,
  inputs: [
    { name: "uuid", type: "uint32" as const, indexed: false },
    { name: "updatable", type: "bool" as const, indexed: false },
    { name: "writeConditionAddr", type: "address" as const, indexed: false },
    { name: "readConditionAddr", type: "address" as const, indexed: false },
    { name: "writeConditionData", type: "bytes" as const, indexed: false },
    { name: "readConditionData", type: "bytes" as const, indexed: false },
  ],
};

type Cache = { vaults: VaultListItem[]; latestBlock: bigint };

// Stash on globalThis so Next.js dev-mode HMR doesn't throw away the cache on
// every file change. In production this is equivalent to a plain module var.
const globalKey = "__cdr_vault_cache__" as const;
const g = globalThis as unknown as { [globalKey]?: Cache | null; __cdr_vault_inflight__?: Promise<void> | null };
g[globalKey] ??= null;
g.__cdr_vault_inflight__ ??= null;

const client = createPublicClient({
  chain: cdrDevnet,
  transport: http(UPSTREAM_RPC),
});

async function refresh(): Promise<void> {
  const latest = await client.getBlockNumber();
  const cached = g[globalKey];
  const from = cached ? cached.latestBlock + 1n : 0n;
  if (from > latest) return;

  const appended: VaultListItem[] = [];
  for (let start = from; start <= latest; start += CHUNK_SIZE) {
    const end = start + CHUNK_SIZE - 1n > latest ? latest : start + CHUNK_SIZE - 1n;
    const logs = await client.getLogs({
      address: CDR_ADDRESS,
      event: vaultAllocatedEvent,
      fromBlock: start,
      toBlock: end,
    });
    for (const log of logs) {
      const a = log.args as {
        uuid: number;
        updatable: boolean;
        writeConditionAddr: string;
        readConditionAddr: string;
      };
      appended.push({
        uuid: Number(a.uuid),
        updatable: a.updatable,
        writeConditionAddr: a.writeConditionAddr,
        readConditionAddr: a.readConditionAddr,
      });
    }
  }

  g[globalKey] = {
    vaults: [...(cached?.vaults ?? []), ...appended],
    latestBlock: latest,
  };
}

export async function GET(request: Request) {
  try {
    // Collapse concurrent refreshes into a single inflight promise so a burst
    // of client requests on a cold cache don't each kick off their own scan.
    if (!g.__cdr_vault_inflight__) {
      g.__cdr_vault_inflight__ = refresh().finally(() => {
        g.__cdr_vault_inflight__ = null;
      });
    }
    await g.__cdr_vault_inflight__;

    const cached = g[globalKey];
    const vaults = cached?.vaults ?? [];
    const latestBlock = cached ? cached.latestBlock.toString() : "0";

    // Optional delta mode: client passes ?sinceUuid=N and gets only newer entries.
    const url = new URL(request.url);
    const sinceUuidRaw = url.searchParams.get("sinceUuid");
    if (sinceUuidRaw !== null) {
      const sinceUuid = Number(sinceUuidRaw);
      const delta = Number.isFinite(sinceUuid)
        ? vaults.filter((v) => v.uuid > sinceUuid)
        : vaults;
      return NextResponse.json({
        vaults: delta,
        total: vaults.length,
        latestBlock,
        mode: "delta",
      });
    }

    return NextResponse.json({
      vaults,
      total: vaults.length,
      latestBlock,
      mode: "full",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
