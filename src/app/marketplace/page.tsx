"use client";

import { useState, useEffect, useCallback } from "react";
import { useCDRClient } from "@/hooks/use-cdr-client";
import { useWasm } from "@/providers/wasm-provider";
import { ProgressBar } from "@/components/progress-bar";
import { HowItWorks } from "@/components/how-it-works";
import { TxLink } from "@/components/tx-link";
import { collectPartialsWithProgress } from "@/lib/collect-partials";
import { uuidToLabel } from "@piplabs/cdr-sdk";
import {
  createWalletClient, custom, parseEther, formatEther,
  toHex, toBytes, fromHex, parseEventLogs
} from "viem";
import { useWallets } from "@privy-io/react-auth";
import { cdrAbi, contractAddresses } from "@piplabs/cdr-contracts";
import { cdrDevnet } from "@/config/chain";
import { secp256k1 } from "@noble/curves/secp256k1";
import { decryptPartial as eciesDecrypt, tdh2Combine, decryptFile } from "@piplabs/cdr-crypto";
import { CONTRACTS, marketplaceAbi } from "@/config/contracts";

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const CATEGORIES = ["Analytics", "Research", "Media", "Code", "Other"] as const;

type Tab = "browse" | "sell" | "purchases";

interface ListingData {
  id: number;
  owner: string;
  accessFee: bigint;
  cdrUuid: number;
  ipfsHash: string;
  uploaded: boolean;
  totalSales: number;
  purchased: boolean;
  title: string;
  description: string;
  category: string;
}

export default function MarketplacePage() {
  const { client, publicClient, getWriteClient, address, connected } = useCDRClient();
  const { ready: wasmReady, error: wasmError } = useWasm();
  const { wallets } = useWallets();
  const [tab, setTab] = useState<Tab>("browse");

  // Browse state
  const [listings, setListings] = useState<ListingData[]>([]);
  const [loading, setLoading] = useState(false);

  // Sell state
  const [sellTitle, setSellTitle] = useState("");
  const [sellDescription, setSellDescription] = useState("");
  const [sellCategory, setSellCategory] = useState("");
  const [sellFee, setSellFee] = useState("");
  const [sellSecret, setSellSecret] = useState("");
  const [sellInputMode, setSellInputMode] = useState<"text" | "file">("text");
  const [sellFile, setSellFile] = useState<File | null>(null);
  const [sellPhase, setSellPhase] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [sellProgress, setSellProgress] = useState(0);
  const [sellProgressLabel, setSellProgressLabel] = useState("");
  const [sellError, setSellError] = useState("");
  const [sellTxHash, setSellTxHash] = useState("");
  const [sellResult, setSellResult] = useState<{ listingId: number } | null>(null);

  // Purchase/decrypt state
  const [purchasePhase, setPurchasePhase] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [purchaseProgress, setPurchaseProgress] = useState(0);
  const [purchaseProgressLabel, setPurchaseProgressLabel] = useState("");
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseTxHash, setPurchaseTxHash] = useState("");
  const [decryptedData, setDecryptedData] = useState("");
  const [purchasedFile, setPurchasedFile] = useState<{ cid: string; key: string; fileName: string; fileSize: number } | null>(null);

  // Load all listings
  const loadListings = useCallback(async () => {
    if (!publicClient) return;
    setLoading(true);
    try {
      const count = await publicClient.readContract({
        address: CONTRACTS.DATA_MARKETPLACE,
        abi: marketplaceAbi,
        functionName: "getListingCount",
      }) as bigint;

      const items: ListingData[] = [];
      for (let i = 0; i < Number(count); i++) {
        const [owner, accessFee, cdrUuid, ipfsHash, uploaded, totalSales] = await publicClient.readContract({
          address: CONTRACTS.DATA_MARKETPLACE,
          abi: marketplaceAbi,
          functionName: "getListing",
          args: [BigInt(i)],
        }) as [string, bigint, number, string, boolean, bigint];

        let purchased = false;
        if (address) {
          purchased = await publicClient.readContract({
            address: CONTRACTS.DATA_MARKETPLACE,
            abi: marketplaceAbi,
            functionName: "hasPurchased",
            args: [BigInt(i), address],
          }) as boolean;
        }

        // Parse metadata from ipfsHash field
        let title = `Listing #${i}`;
        let description = "";
        let category = "";
        if (ipfsHash) {
          try {
            const meta = JSON.parse(ipfsHash);
            title = meta.title || title;
            description = meta.description || "";
            category = meta.category || "";
          } catch {
            // Legacy listing without JSON metadata
          }
        }

        items.push({
          id: i, owner, accessFee, cdrUuid, ipfsHash, uploaded,
          totalSales: Number(totalSales), purchased,
          title, description, category,
        });
      }
      setListings(items);
    } catch (err) {
      console.error("Failed to load listings:", err);
    }
    setLoading(false);
  }, [publicClient, address]);

  useEffect(() => {
    if (connected) loadListings();
  }, [connected, loadListings]);

  // --- Sell flow ---
  async function handleSell() {
    setSellPhase("processing");
    setSellProgress(0);
    setSellError("");
    setSellTxHash("");
    setSellResult(null);

    const isFileMode = sellInputMode === "file" && sellFile;

    try {
      const wallet = wallets[0];
      if (!wallet) throw new Error("No wallet");
      const provider = await wallet.getEthereumProvider();
      const walletClient = createWalletClient({
        chain: cdrDevnet,
        transport: custom(provider),
        account: wallet.address as `0x${string}`,
      });

      // File mode: upload file first
      let dataToEncrypt: string;
      if (isFileMode) {
        setSellProgressLabel("Uploading file...");
        setSellProgress(0);
        const formData = new FormData();
        formData.append("file", sellFile);
        formData.append("address", wallet.address);
        const uploadRes = await fetch("/api/storage/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) throw new Error("File upload failed");
        const { cid, encryptionKey, fileName, fileSize } = await uploadRes.json();
        dataToEncrypt = JSON.stringify({ type: "file", cid, key: encryptionKey, fileName, fileSize });
        setSellProgress(15);
        setSellProgressLabel("Creating your listing...");
      } else {
        dataToEncrypt = sellSecret;
        setSellProgressLabel("Creating your listing...");
      }

      // Step 1: Setup listing (allocates CDR vault)
      setSellProgress(isFileMode ? 15 : 5);
      const allocateFee = await publicClient.readContract({
        address: contractAddresses.testnet.cdr as `0x${string}`,
        abi: cdrAbi,
        functionName: "allocateFee",
      }) as bigint;

      const accessFee = parseEther(sellFee);
      const setupTx = await walletClient.writeContract({
        address: CONTRACTS.DATA_MARKETPLACE,
        abi: marketplaceAbi,
        functionName: "setup",
        args: [accessFee],
        value: allocateFee,
      });
      const setupReceipt = await publicClient.waitForTransactionReceipt({ hash: setupTx });
      const setupLogs = parseEventLogs({ abi: marketplaceAbi, logs: setupReceipt.logs, eventName: "ListingCreated" });
      const listingId = Number(setupLogs[0].args.listingId);
      const cdrUuid = Number(setupLogs[0].args.cdrUuid);
      setSellTxHash(setupTx);
      setSellProgress(isFileMode ? 25 : 20);

      // Step 2: Fetch DKG key & Encrypt data
      setSellProgressLabel("Encrypting data...");
      setSellProgress(isFileMode ? 25 : 25);
      const globalPubKey = await client.observer.getGlobalPubKey();

      setSellProgress(isFileMode ? 35 : 35);
      const writeClient = await getWriteClient();
      const dataKey = new TextEncoder().encode(dataToEncrypt);
      const label = uuidToLabel(cdrUuid);
      const ciphertext = await writeClient.uploader.encryptDataKey({ dataKey, globalPubKey, label });
      setSellProgress(50);

      // Step 3: Write encrypted data to CDR vault
      setSellProgressLabel("Storing on-chain...");
      setSellProgress(55);
      const writeFee = await publicClient.readContract({
        address: contractAddresses.testnet.cdr as `0x${string}`,
        abi: cdrAbi,
        functionName: "writeFee",
      }) as bigint;

      await walletClient.writeContract({
        address: contractAddresses.testnet.cdr as `0x${string}`,
        abi: cdrAbi,
        functionName: "write",
        args: [cdrUuid, "0x", toHex(ciphertext.raw)],
        value: writeFee,
      });
      setSellProgress(80);

      // Step 4: Mark listing as uploaded with metadata
      setSellProgressLabel("Publishing...");
      setSellProgress(85);
      const metadata = JSON.stringify({ title: sellTitle, description: sellDescription, category: sellCategory });
      await walletClient.writeContract({
        address: CONTRACTS.DATA_MARKETPLACE,
        abi: marketplaceAbi,
        functionName: "upload",
        args: [BigInt(listingId), metadata],
      });

      setSellProgress(100);
      setSellProgressLabel("Done!");
      setSellResult({ listingId });
      setSellPhase("done");
    } catch (err: unknown) {
      setSellError(err instanceof Error ? err.message : String(err));
      setSellPhase("error");
    }
  }

  // --- Purchase + decrypt flow ---
  async function handlePurchaseAndDecrypt(listing: ListingData) {
    setPurchasePhase("processing");
    setPurchaseProgress(0);
    setPurchaseProgressLabel("Processing payment...");
    setPurchaseError("");
    setPurchaseTxHash("");
    setDecryptedData("");

    try {
      const wallet = wallets[0];
      if (!wallet) throw new Error("No wallet");
      const provider = await wallet.getEthereumProvider();
      const walletClient = createWalletClient({
        chain: cdrDevnet,
        transport: custom(provider),
        account: wallet.address as `0x${string}`,
      });

      // Generate ephemeral keypair for partial decryption
      const privKey = secp256k1.utils.randomPrivateKey();
      const pubKey = secp256k1.getPublicKey(privKey, false);

      // Fetch encrypted data before purchase (need it for decryption later)
      const vault = await publicClient.readContract({
        address: contractAddresses.testnet.cdr as `0x${string}`,
        abi: cdrAbi,
        functionName: "vaults",
        args: [listing.cdrUuid],
      }) as any;
      const encryptedData = toBytes(vault.encryptedData);
      const label = uuidToLabel(listing.cdrUuid);

      // Step 1: Purchase — marketplace calls CDR.read() atomically
      setPurchaseProgress(5);
      const readFee = await publicClient.readContract({
        address: contractAddresses.testnet.cdr as `0x${string}`,
        abi: cdrAbi,
        functionName: "readFee",
      }) as bigint;

      const fromBlock = await publicClient.getBlockNumber();
      const purchaseTx = await walletClient.writeContract({
        address: CONTRACTS.DATA_MARKETPLACE,
        abi: marketplaceAbi,
        functionName: "purchase",
        args: [BigInt(listing.id), toHex(pubKey)],
        value: listing.accessFee + readFee,
      });
      await publicClient.waitForTransactionReceipt({ hash: purchaseTx });
      setPurchaseTxHash(purchaseTx);
      setPurchaseProgress(25);

      // Step 2: Fetch DKG params & collect partials
      setPurchaseProgressLabel("Collecting validator responses...");
      setPurchaseProgress(30);
      const [globalPubKey, threshold] = await Promise.all([
        client.observer.getGlobalPubKey(),
        client.observer.getThreshold(),
      ]);

      const partials = await collectPartialsWithProgress({
        publicClient: publicClient as any,
        uuid: listing.cdrUuid,
        minPartials: threshold,
        fromBlock,
        timeoutMs: 120_000,
        pollIntervalMs: 3_000,
        onProgress: (collected, needed) => {
          const partialPct = 30 + Math.round((collected / needed) * 40);
          setPurchaseProgress(partialPct);
          setPurchaseProgressLabel(`Collecting validator responses (${collected}/${needed})...`);
        },
      });
      setPurchaseProgress(70);

      // Step 3: Decrypt
      setPurchaseProgressLabel("Decrypting...");
      setPurchaseProgress(75);
      const decryptedPartials = await Promise.all(
        partials.map(async (p) => {
          const decrypted = await eciesDecrypt({
            encryptedPartial: toBytes(p.encryptedPartial),
            ephemeralPubKey: toBytes(p.ephemeralPubKey),
            recipientPrivKey: privKey,
          });
          return { pid: p.pid, pubShare: toBytes(p.pubShare), partial: decrypted };
        }),
      );

      const dataKey = await tdh2Combine({
        ciphertext: { raw: encryptedData, label },
        partials: decryptedPartials,
        globalPubKey,
        label,
        threshold,
      });

      const decoded = new TextDecoder().decode(dataKey);

      try {
        const parsed = JSON.parse(decoded);
        if (parsed.type === "file" && parsed.cid) {
          setPurchasedFile(parsed);
          setDecryptedData("");
          setPurchaseProgress(100);
          setPurchaseProgressLabel("Done!");
          setPurchasePhase("done");
          return;
        }
      } catch {
        // Not JSON file payload -- treat as text
      }
      setDecryptedData(decoded);
      setPurchaseProgress(100);
      setPurchaseProgressLabel("Done!");
      setPurchasePhase("done");
    } catch (err: unknown) {
      setPurchaseError(err instanceof Error ? err.message : String(err));
      setPurchasePhase("error");
    }
  }

  async function downloadPurchasedFile() {
    if (!purchasedFile) return;
    const response = await fetch(`/api/storage/download?cid=${purchasedFile.cid}`);
    if (!response.ok) throw new Error("Download failed");
    const encryptedBytes = new Uint8Array(await response.arrayBuffer());
    const key = fromHex(purchasedFile.key as `0x${string}`, "bytes");
    const decrypted = decryptFile({ ciphertext: encryptedBytes, key });

    const blob = new Blob([decrypted as BlobPart]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = purchasedFile.fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  const uploadedListings = listings.filter(l => l.uploaded);
  const purchasedListings = listings.filter(l => l.purchased);

  const sellFormValid = connected && wasmReady && sellTitle.trim() && sellFee.trim() && (sellInputMode === "text" ? sellSecret.trim() : !!sellFile);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="mr-2">&#127978;</span>Data Marketplace
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Buy and sell encrypted data. No middleman, no platform cuts.
        </p>

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
          {(["browse", "sell", "purchases"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                tab === t ? "bg-white/10 text-white" : "text-white/50 hover:text-white/70"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {/* === BROWSE TAB === */}
          {tab === "browse" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/40">
                  {uploadedListings.length} listing{uploadedListings.length !== 1 ? "s" : ""} available
                </p>
                <button
                  onClick={loadListings}
                  className="text-xs text-white/40 transition-colors hover:text-white/60"
                >
                  Refresh
                </button>
              </div>
              {loading && <p className="text-sm text-white/50">Loading...</p>}
              {!loading && uploadedListings.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 px-6 py-10 text-center">
                  <p className="text-sm text-white/40">No listings yet.</p>
                  <p className="mt-1 text-xs text-white/25">
                    Switch to the Sell tab to list your first data.
                  </p>
                </div>
              )}
              {uploadedListings.map((listing) => (
                <div
                  key={listing.id}
                  className="rounded-xl border border-white/8 bg-white/[0.03] p-5 transition-colors hover:bg-white/[0.05]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">{listing.title}</p>
                        {listing.owner.toLowerCase() === address?.toLowerCase() && (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/50">
                            yours
                          </span>
                        )}
                        {listing.category && (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/60">
                            {listing.category}
                          </span>
                        )}
                      </div>
                      {listing.description && (
                        <p className="mt-1.5 line-clamp-2 text-xs text-white/40">
                          {listing.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-xs text-white/30">
                        <span>{listing.totalSales} sale{listing.totalSales !== 1 ? "s" : ""}</span>
                        <span className="h-3 w-px bg-white/10" />
                        <span className="font-mono">{truncateAddress(listing.owner)}</span>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                      <p className="text-lg font-bold tabular-nums text-emerald-300">
                        {formatEther(listing.accessFee)} IP
                      </p>
                      {listing.purchased ? (
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                          Purchased
                        </span>
                      ) : listing.owner.toLowerCase() !== address?.toLowerCase() ? (
                        <button
                          onClick={() => handlePurchaseAndDecrypt(listing)}
                          disabled={!connected || !wasmReady || purchasePhase === "processing"}
                          className="rounded-lg bg-demo-market/20 px-3 py-1.5 text-xs font-medium text-emerald-300 ring-1 ring-demo-market/30 transition-colors hover:bg-demo-market/30 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Buy &rarr;
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}

              {/* Purchase progress */}
              {purchasePhase !== "idle" && (
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-6">
                  <ProgressBar
                    percent={purchaseProgress}
                    label={purchaseProgressLabel}
                    accentClass="bg-demo-market"
                    error={purchasePhase === "error"}
                  />
                  {purchaseTxHash && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">tx</span>
                      <TxLink hash={purchaseTxHash} />
                    </div>
                  )}
                  {purchasePhase === "error" && (
                    <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                      {purchaseError}
                    </div>
                  )}
                  {purchasePhase === "done" && purchasedFile ? (
                    <div className="mt-4 rounded-lg border border-green-500/15 bg-green-500/5 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-green-400/60">Purchased File</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm text-green-300">{purchasedFile.fileName} ({(purchasedFile.fileSize / 1024 / 1024).toFixed(2)} MB)</span>
                        <button onClick={downloadPurchasedFile} className="rounded-md bg-green-500/15 px-3 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-500/25">
                          Download
                        </button>
                      </div>
                    </div>
                  ) : purchasePhase === "done" && decryptedData ? (
                    <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/70">
                        Decrypted Data
                      </p>
                      <p className="mt-1 break-all font-mono text-sm text-emerald-300">
                        {decryptedData}
                      </p>
                    </div>
                  ) : null}
                  {(purchasePhase === "done" || purchasePhase === "error") && (
                    <button
                      onClick={() => { setPurchasePhase("idle"); setPurchasedFile(null); loadListings(); }}
                      className="mt-4 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
                    >
                      {purchasePhase === "done" ? "Done" : "Retry"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* === SELL TAB === */}
          {tab === "sell" && (
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-6">
              {sellPhase === "idle" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                      What are you selling?
                    </label>
                    <input
                      type="text"
                      value={sellTitle}
                      onChange={(e) => setSellTitle(e.target.value)}
                      placeholder="e.g. Q4 2025 DeFi Analytics Report"
                      className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-demo-market/40 focus:ring-1 focus:ring-demo-market/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                      Describe your data
                    </label>
                    <textarea
                      value={sellDescription}
                      onChange={(e) => setSellDescription(e.target.value)}
                      placeholder="What does the buyer get? Include details about format, coverage, etc."
                      rows={3}
                      className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-demo-market/40 focus:ring-1 focus:ring-demo-market/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                      Category
                    </label>
                    <select
                      value={sellCategory}
                      onChange={(e) => setSellCategory(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-demo-market/40 focus:ring-1 focus:ring-demo-market/30"
                    >
                      <option value="" className="bg-neutral-900">None</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c} className="bg-neutral-900">{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                      Price (IP)
                    </label>
                    <input
                      type="text"
                      value={sellFee}
                      onChange={(e) => setSellFee(e.target.value)}
                      placeholder="0.01"
                      className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-demo-market/40 focus:ring-1 focus:ring-demo-market/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                      Data to encrypt
                    </label>
                    <div className="flex gap-1 rounded-md bg-white/5 p-0.5 mb-3">
                      <button onClick={() => setSellInputMode("text")} className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${sellInputMode === "text" ? "bg-white/10 text-white" : "text-white/40"}`}>Text</button>
                      <button onClick={() => setSellInputMode("file")} className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${sellInputMode === "file" ? "bg-white/10 text-white" : "text-white/40"}`}>File</button>
                    </div>
                    {sellInputMode === "file" ? (
                      <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
                        {sellFile ? (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-white/70">{sellFile.name} ({(sellFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                            <button onClick={() => setSellFile(null)} className="text-xs text-white/30 hover:text-white/50">Remove</button>
                          </div>
                        ) : (
                          <label className="cursor-pointer">
                            <span className="text-sm text-white/40">Click to select a file (max 10 MB)</span>
                            <input type="file" className="hidden" onChange={(e) => setSellFile(e.target.files?.[0] ?? null)} />
                          </label>
                        )}
                      </div>
                    ) : (
                      <textarea
                        value={sellSecret}
                        onChange={(e) => setSellSecret(e.target.value)}
                        placeholder="Paste the data buyers will receive after purchase..."
                        rows={4}
                        className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-demo-market/40 focus:ring-1 focus:ring-demo-market/30"
                      />
                    )}
                  </div>
                  <button
                    onClick={handleSell}
                    disabled={!sellFormValid}
                    className="rounded-lg bg-demo-market/20 px-4 py-2.5 text-sm font-medium text-emerald-300 ring-1 ring-demo-market/30 transition-colors hover:bg-demo-market/30 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    List for Sale
                  </button>
                </div>
              )}
              {(sellPhase === "processing" || sellPhase === "error") && (
                <div className="flex flex-col gap-4">
                  <ProgressBar
                    percent={sellProgress}
                    label={sellProgressLabel}
                    accentClass="bg-demo-market"
                    error={sellPhase === "error"}
                  />
                  {sellTxHash && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">tx</span>
                      <TxLink hash={sellTxHash} />
                    </div>
                  )}
                  {sellPhase === "error" && (
                    <>
                      <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                        {sellError}
                      </div>
                      <button
                        onClick={() => setSellPhase("idle")}
                        className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
                      >
                        Retry
                      </button>
                    </>
                  )}
                </div>
              )}
              {sellPhase === "done" && sellResult && (
                <div className="flex flex-col gap-5">
                  <ProgressBar
                    percent={100}
                    label="Done!"
                    accentClass="bg-demo-market"
                  />
                  {sellTxHash && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">tx</span>
                      <TxLink hash={sellTxHash} />
                    </div>
                  )}
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/70">
                      Listing Created
                    </p>
                    <p className="mt-1 text-2xl font-bold text-emerald-400">
                      #{sellResult.listingId}
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      Your data is encrypted and ready for buyers.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSellPhase("idle");
                      setSellTitle("");
                      setSellDescription("");
                      setSellCategory("");
                      setSellSecret("");
                      setSellFee("");
                      setSellFile(null);
                      setSellInputMode("text");
                      loadListings();
                    }}
                    className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
                  >
                    List Another
                  </button>
                </div>
              )}
            </div>
          )}

          {/* === PURCHASES TAB === */}
          {tab === "purchases" && (
            <div className="flex flex-col gap-4">
              {purchasedListings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 px-6 py-10 text-center">
                  <p className="text-sm text-white/40">No purchases yet.</p>
                  <p className="mt-1 text-xs text-white/25">
                    Browse the marketplace and buy data to see it here.
                  </p>
                </div>
              ) : (
                purchasedListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="rounded-xl border border-white/8 bg-white/[0.03] p-5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white">{listing.title}</p>
                          {listing.category && (
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/60">
                              {listing.category}
                            </span>
                          )}
                        </div>
                        {listing.description && (
                          <p className="mt-1 line-clamp-1 text-xs text-white/40">
                            {listing.description}
                          </p>
                        )}
                        <div className="mt-1.5 flex items-center gap-3 text-xs text-white/30">
                          <span className="font-mono">{truncateAddress(listing.owner)}</span>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                        Purchased
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* How it works */}
        <HowItWorks
          layers={[
            {
              title: "Conceptual: How the marketplace works",
              content: (
                <ul className="flex flex-col gap-2 text-white/50">
                  <li>&#8226; Sellers encrypt their data before it ever touches the blockchain -- nobody can read it, not even validators.</li>
                  <li>&#8226; Encrypted data is stored on-chain in a secure vault. The encryption key is split across multiple validators.</li>
                  <li>&#8226; Buyers pay the seller directly -- no intermediary takes a cut.</li>
                  <li>&#8226; After payment, validators each release a fragment of the decryption key. A threshold number of fragments are combined to unlock the data.</li>
                  <li>&#8226; The entire flow is trustless: the seller cannot withhold data after payment, and the buyer cannot access data without paying.</li>
                </ul>
              ),
            },
            {
              title: "Architecture: Contract interaction flow",
              content: (
                <div className="flex flex-col gap-3 font-mono text-xs text-white/50">
                  <div>
                    <p className="mb-1 text-white/30">Listing flow:</p>
                    <p>marketplace.setup(accessFee) &#8594; CDR.allocate()</p>
                    <p>encrypt(data, globalPubKey) &#8594; CDR.write(uuid, ciphertext)</p>
                    <p>marketplace.upload(listingId, metadata)</p>
                  </div>
                  <div>
                    <p className="mb-1 text-white/30">Purchase flow:</p>
                    <p>marketplace.purchase(listingId, pubKey) &#8594; CDR.read(uuid)</p>
                    <p>validators emit partial decryptions</p>
                    <p>collect partials &#8594; ECIES decrypt &#8594; TDH2 combine &#8594; plaintext</p>
                  </div>
                </div>
              ),
            },
            {
              title: "Code: TypeScript snippets",
              content: (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="mb-1 text-xs text-white/30">Creating a listing:</p>
                    <pre className="overflow-x-auto rounded-lg bg-white/[0.03] p-3 text-xs text-white/60">{`// 1. Setup listing (allocates encrypted vault)
const tx = await marketplace.setup(accessFee, { value: allocateFee });
const { listingId, cdrUuid } = parseEvents(tx);

// 2. Encrypt and store data
const globalPubKey = await cdr.observer.getGlobalPubKey();
const ciphertext = await cdr.uploader.encryptDataKey({
  dataKey, globalPubKey, label: uuidToLabel(cdrUuid)
});
await cdr.write(cdrUuid, ciphertext);

// 3. Publish metadata
const meta = JSON.stringify({ title, description, category });
await marketplace.upload(listingId, meta);`}</pre>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-white/30">Purchasing and decrypting:</p>
                    <pre className="overflow-x-auto rounded-lg bg-white/[0.03] p-3 text-xs text-white/60">{`// 1. Pay and trigger decryption
await marketplace.purchase(listingId, ephemeralPubKey,
  { value: accessFee + readFee });

// 2. Collect validator partial decryptions
const partials = await collectPartials(uuid, threshold);

// 3. Decrypt each partial with ephemeral key, then combine
const shares = partials.map(p => eciesDecrypt(p, privKey));
const plaintext = tdh2Combine(ciphertext, shares, globalPubKey);`}</pre>
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
