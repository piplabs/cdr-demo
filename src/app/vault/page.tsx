"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useCDRClient } from "@/hooks/use-cdr-client";

interface VaultData {
  updatable: boolean;
  writeConditionAddr: string;
  readConditionAddr: string;
  writeConditionData: string;
  readConditionData: string;
  encryptedData: string;
}

interface VaultListItem {
  uuid: number;
  updatable: boolean;
  writeConditionAddr: string;
  readConditionAddr: string;
}

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

function truncateAddress(addr: string) {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function VaultPage() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <Suspense>
        <VaultPageInner />
      </Suspense>
    </div>
  );
}

function VaultPageInner() {
  const { client, publicClient } = useCDRClient();
  const searchParams = useSearchParams();
  const [uuid, setUuid] = useState("");
  const [vault, setVault] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoLoaded, setAutoLoaded] = useState(false);

  // All vaults list
  const [allVaults, setAllVaults] = useState<VaultListItem[]>([]);
  const [loadingVaults, setLoadingVaults] = useState(true);
  const [vaultsError, setVaultsError] = useState<string | null>(null);

  // Track the highest uuid we've already shown so Refresh only pulls new ones.
  const highestUuidRef = useRef<number | null>(null);

  // Fetch vaults from the server-cached /api/vaults endpoint.
  // First call fetches the full list; subsequent calls request only entries
  // with uuid > highestUuidRef and merge them into the existing state.
  const fetchAllVaults = useCallback(async (mode: "full" | "delta" = "full") => {
    setLoadingVaults(true);
    setVaultsError(null);
    try {
      const qs =
        mode === "delta" && highestUuidRef.current !== null
          ? `?sinceUuid=${highestUuidRef.current}`
          : "";
      const resp = await fetch(`/api/vaults${qs}`, { cache: "no-store" });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({ error: resp.statusText }));
        throw new Error(body.error ?? `HTTP ${resp.status}`);
      }
      const data = (await resp.json()) as {
        vaults: VaultListItem[];
        total: number;
        mode: "full" | "delta";
      };

      if (data.mode === "delta") {
        // Merge newer entries on top; list stays newest-first.
        setAllVaults((prev) => {
          const fresh = [...data.vaults].sort((a, b) => b.uuid - a.uuid);
          return [...fresh, ...prev];
        });
        if (data.vaults.length > 0) {
          const maxUuid = Math.max(...data.vaults.map((v) => v.uuid));
          highestUuidRef.current = Math.max(highestUuidRef.current ?? -1, maxUuid);
        }
      } else {
        const sorted = [...data.vaults].sort((a, b) => b.uuid - a.uuid);
        setAllVaults(sorted);
        highestUuidRef.current = sorted.length > 0 ? sorted[0].uuid : null;
      }
    } catch (err: unknown) {
      setVaultsError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingVaults(false);
    }
  }, []);

  useEffect(() => {
    fetchAllVaults("full");
  }, [fetchAllVaults]);

  // Auto-fill and load from ?uuid= query param
  useEffect(() => {
    const paramUuid = searchParams.get("uuid");
    if (paramUuid && !autoLoaded) {
      setUuid(paramUuid);
      setAutoLoaded(true);
    }
  }, [searchParams, autoLoaded]);

  async function handleLookup(lookupUuid?: string) {
    const target = lookupUuid ?? uuid;
    if (!target.toString().trim()) return;
    setUuid(target.toString());
    setLoading(true);
    setError(null);
    setVault(null);

    try {
      const v = await client.observer.getVault(Number(target));
      setVault({
        updatable: (v as any).updatable,
        writeConditionAddr: (v as any).writeConditionAddr,
        readConditionAddr: (v as any).readConditionAddr,
        writeConditionData: (v as any).writeConditionData,
        readConditionData: (v as any).readConditionData,
        encryptedData: (v as any).encryptedData,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const encryptedLen = vault?.encryptedData
    ? Math.max(0, (vault.encryptedData.length - 2) / 2)
    : 0;

  const hasReadCondition = vault && vault.readConditionAddr !== ZERO_ADDR;
  const hasWriteCondition = vault && vault.writeConditionAddr !== ZERO_ADDR;

  return (
    <div className="px-14 pb-20 pt-9">
      {/* All Vaults List */}
      <div className="liquid-panel mx-auto max-w-2xl rounded-[28px] p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">All Vaults</h1>
            <p className="mt-1 text-sm text-white/50">
              {loadingVaults
                ? "Loading..."
                : `${allVaults.length} vault${allVaults.length !== 1 ? "s" : ""} created on-chain`}
            </p>
          </div>
          <button
            onClick={() => fetchAllVaults("delta")}
            disabled={loadingVaults}
            className="liquid-button rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-40"
          >
            Refresh
          </button>
        </div>

        {vaultsError && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {vaultsError}
          </div>
        )}

        {!loadingVaults && allVaults.length > 0 && (
          <div className="mt-4 max-h-96 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-[rgba(8,8,16,0.95)]">
                <tr className="border-b border-white/10 text-xs text-white/40">
                  <th className="pb-2 pr-4 font-medium">UUID</th>
                  <th className="pb-2 pr-4 font-medium">State</th>
                  <th className="pb-2 pr-4 font-medium">Read Condition</th>
                  <th className="pb-2 font-medium">Write Condition</th>
                </tr>
              </thead>
              <tbody>
                {allVaults.map((v) => (
                  <tr
                    key={v.uuid}
                    onClick={() => handleLookup(String(v.uuid))}
                    className="cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.04]"
                  >
                    <td className="py-2.5 pr-4 font-mono text-sm font-medium text-white/80">
                      {v.uuid}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          v.updatable
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-white/5 text-white/40"
                        }`}
                      >
                        {v.updatable ? "Updatable" : "Immutable"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-white/50">
                      {v.readConditionAddr === ZERO_ADDR
                        ? "Open"
                        : truncateAddress(v.readConditionAddr)}
                    </td>
                    <td className="py-2.5 font-mono text-xs text-white/50">
                      {v.writeConditionAddr === ZERO_ADDR
                        ? "Open"
                        : truncateAddress(v.writeConditionAddr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loadingVaults && allVaults.length === 0 && !vaultsError && (
          <div className="liquid-panel-soft mt-4 rounded-2xl px-4 py-6 text-center text-sm text-white/40">
            No vaults have been created yet.
          </div>
        )}

        {loadingVaults && (
          <div className="mt-4 flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
          </div>
        )}
      </div>

      {/* Vault Details */}
      <div className="liquid-panel mx-auto mt-8 max-w-2xl rounded-[28px] p-8">
        <h2 className="text-lg font-bold tracking-tight">Vault Details</h2>
        <p className="mt-1 text-sm text-white/50">
          Click a vault above or enter a UUID to inspect.
        </p>

        {/* Lookup form */}
        <div className="mt-4 flex gap-3">
          <input
            type="number"
            placeholder="Vault UUID"
            value={uuid}
            onChange={(e) => setUuid(e.target.value)}
            className="liquid-input flex-1 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/30"
          />
          <button
            onClick={() => handleLookup()}
            disabled={loading || !uuid.trim()}
            className="liquid-button liquid-button-violet rounded-2xl px-5 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Loading..." : "Lookup"}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Vault details */}
        {vault && (
          <div className="mt-6 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Vault #{uuid}
              </h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  vault.updatable
                    ? "bg-yellow-500/10 text-yellow-400"
                    : "bg-white/5 text-white/40"
                }`}
              >
                {vault.updatable ? "Updatable" : "Immutable"}
              </span>
            </div>

            {/* Properties */}
            <div className="liquid-panel-soft flex flex-col gap-3 rounded-2xl p-4">
              <Row
                label="Encrypted Data"
                value={
                  encryptedLen > 0
                    ? `${encryptedLen} bytes`
                    : "Empty"
                }
                mono={false}
              />
              <Row
                label="Write Condition"
                value={
                  hasWriteCondition
                    ? vault.writeConditionAddr
                    : "None (open)"
                }
                mono={!!hasWriteCondition}
              />
              <Row
                label="Read Condition"
                value={
                  hasReadCondition
                    ? vault.readConditionAddr
                    : "None (open)"
                }
                mono={!!hasReadCondition}
              />
              {hasWriteCondition && vault.writeConditionData !== "0x" && (
                <Row
                  label="Write Condition Data"
                  value={vault.writeConditionData}
                  mono
                  truncate
                />
              )}
              {hasReadCondition && vault.readConditionData !== "0x" && (
                <Row
                  label="Read Condition Data"
                  value={vault.readConditionData}
                  mono
                  truncate
                />
              )}
            </div>

            {/* Encrypted data preview */}
            {encryptedLen > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium uppercase tracking-wider text-white/40">
                  Ciphertext (hex)
                </p>
                <div className="liquid-panel-soft max-h-24 overflow-auto rounded-2xl px-3 py-2">
                  <p className="break-all font-mono text-xs leading-relaxed text-white/40">
                    {vault.encryptedData}
                  </p>
                </div>
              </div>
            )}

            {/* Info about decryption */}
            {hasReadCondition ? (
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
                <p className="text-sm text-yellow-400">
                  This vault has a read condition contract. You need to meet the
                  condition (e.g. hold a license token) to decrypt.
                </p>
              </div>
            ) : (
              <div className="liquid-panel-soft rounded-2xl px-4 py-3">
                <p className="text-sm text-white/50">
                  This vault has no read condition. Anyone can decrypt it from
                  the{" "}
                  <a
                    href="/storage"
                    className="liquid-link underline underline-offset-2"
                  >
                    Private Storage
                  </a>{" "}
                  app.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
  truncate = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  const displayValue = truncate && value.length > 24
    ? `${value.slice(0, 12)}...${value.slice(-10)}`
    : value;

  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-xs text-white/40">{label}</span>
      <span
        className={`text-right text-xs ${mono ? "font-mono" : ""} text-white/70`}
        title={truncate ? value : undefined}
      >
        {displayValue}
      </span>
    </div>
  );
}
