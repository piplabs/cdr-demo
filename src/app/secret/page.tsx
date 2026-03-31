"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fromHex, toBytes, toHex } from "viem";
import { secp256k1 } from "@noble/curves/secp256k1";
import { cdrAbi, contractAddresses } from "@piplabs/cdr-contracts";
import { decryptFile, decryptPartial as eciesDecrypt, tdh2Combine } from "@piplabs/cdr-crypto";
import { uuidToLabel } from "@piplabs/cdr-sdk";

import { useCDRClient } from "@/hooks/use-cdr-client";
import { useWasm } from "@/providers/wasm-provider";
import { ProgressBar } from "@/components/progress-bar";
import { HowItWorks } from "@/components/how-it-works";
import { collectPartialsWithProgress } from "@/lib/collect-partials";
import { AppWindow } from "@/components/desktop/app-window";
import { AppNavbar } from "@/components/desktop/app-navbar";
import { LockIcon } from "@/components/desktop/dock-icons";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Tab = "create" | "reveal";
type Phase = "idle" | "working" | "done" | "error";

/* ------------------------------------------------------------------ */
/*  Inner component (needs useSearchParams)                            */
/* ------------------------------------------------------------------ */

function SecretShareInner() {
  const { client, publicClient, getWriteClient, address, connected } =
    useCDRClient();
  const { ready: wasmReady, error: wasmError } = useWasm();
  const searchParams = useSearchParams();

  /* ---- URL pre-fill ---- */
  const prefilledId = searchParams.get("id") ?? "";
  const defaultTab: Tab = prefilledId ? "reveal" : "create";

  /* ---- UI state ---- */
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  /* ---- Create state ---- */
  const [secretText, setSecretText] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "file">("text");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  /* ---- Reveal state ---- */
  const [revealInput, setRevealInput] = useState(prefilledId);
  const [revealedText, setRevealedText] = useState("");
  const [revealedFile, setRevealedFile] = useState<{ cid: string; key: string; fileName: string; fileSize: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Sync prefilled id when searchParams change
  useEffect(() => {
    if (prefilledId) {
      setRevealInput(prefilledId);
      setTab("reveal");
    }
  }, [prefilledId]);

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                          */
  /* ---------------------------------------------------------------- */

  function reset() {
    setPhase("idle");
    setProgress(0);
    setProgressLabel("");
    setErrorMsg("");
    setSelectedFile(null);
    setRevealedFile(null);
  }

  function parseVaultId(raw: string): number {
    // Accept full URL like .../secret/42 or just "42"
    const trimmed = raw.trim();
    const urlMatch = trimmed.match(/\/secret\/(\d+)/);
    if (urlMatch) return Number(urlMatch[1]);
    const num = Number(trimmed);
    if (!Number.isFinite(num) || num < 0) throw new Error("Invalid secret ID");
    return num;
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    if (copyTimeout.current) clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopied(false), 2000);
  }

  async function downloadRevealedFile() {
    if (!revealedFile) return;
    const response = await fetch(`/api/storage/download?cid=${revealedFile.cid}`);
    if (!response.ok) throw new Error("Download failed");
    const encryptedBytes = new Uint8Array(await response.arrayBuffer());
    const key = fromHex(revealedFile.key as `0x${string}`, "bytes");
    const decrypted = decryptFile({ ciphertext: encryptedBytes, key });

    const blob = new Blob([decrypted as unknown as BlobPart]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = revealedFile.fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------------------------------------------------------------- */
  /*  Create flow                                                      */
  /* ---------------------------------------------------------------- */

  const handleCreate = useCallback(async () => {
    setPhase("working");
    setProgress(0);
    setProgressLabel("Creating secure vault...");
    setShareLink("");
    setErrorMsg("");

    try {
      if (inputMode === "file" && selectedFile) {
        // Step 1: Upload file to storage backend
        setProgress(5);
        setProgressLabel("Uploading file...");
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("address", address!);
        const uploadRes = await fetch("/api/storage/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || "File upload failed");
        }
        const { cid, encryptionKey, fileName, fileSize } = await uploadRes.json();
        setProgress(30);

        // Step 2: Allocate vault
        setProgressLabel("Creating secure vault...");
        const writeClient = await getWriteClient();
        const { uuid } = await writeClient.uploader.allocate({
          updatable: false,
          writeConditionAddr: address!,
          readConditionAddr: address!,
          writeConditionData: "0x",
          readConditionData: "0x",
        });
        setProgress(45);

        // Step 3: Encrypt file reference payload
        setProgressLabel("Encrypting reference...");
        const payload = JSON.stringify({ type: "file", cid, key: encryptionKey, fileName, fileSize });
        const dataKey = new TextEncoder().encode(payload);
        const globalPubKey = await client.observer.getGlobalPubKey();
        const label = uuidToLabel(uuid);
        const ciphertext = await writeClient.uploader.encryptDataKey({ dataKey, globalPubKey, label });
        setProgress(65);

        // Step 4: Write to CDR
        setProgressLabel("Storing on-chain...");
        await writeClient.uploader.write({
          uuid,
          accessAuxData: "0x",
          encryptedData: toHex(ciphertext.raw),
        });

        setProgress(100);
        setProgressLabel("Done!");
        const link = `${window.location.origin}/secret/${uuid}`;
        setShareLink(link);
        setPhase("done");
      } else {
        // Text mode flow
        // Step 1: Allocate vault
        setProgress(10);
        setProgressLabel("Creating secure vault...");
        const writeClient = await getWriteClient();
        const { uuid } = await writeClient.uploader.allocate({
          updatable: false,
          writeConditionAddr: address!,
          readConditionAddr: address!,
          writeConditionData: "0x",
          readConditionData: "0x",
        });

        // Step 2: Fetch DKG key
        setProgress(35);
        setProgressLabel("Connecting to key network...");
        const globalPubKey = await client.observer.getGlobalPubKey();

        // Step 3: Encrypt
        setProgress(55);
        setProgressLabel("Encrypting your secret...");
        const dataKey = new TextEncoder().encode(secretText);
        const label = uuidToLabel(uuid);
        const ciphertext = await writeClient.uploader.encryptDataKey({
          dataKey,
          globalPubKey,
          label,
        });

        // Step 4: Write on-chain
        setProgress(75);
        setProgressLabel("Storing on-chain...");
        await writeClient.uploader.write({
          uuid,
          accessAuxData: "0x",
          encryptedData: toHex(ciphertext.raw),
        });

        // Done
        setProgress(100);
        setProgressLabel("Done!");
        const link = `${window.location.origin}/secret/${uuid}`;
        setShareLink(link);
        setPhase("done");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setProgressLabel("Failed");
      setPhase("error");
    }
  }, [address, client, getWriteClient, secretText, inputMode, selectedFile]);

  /* ---------------------------------------------------------------- */
  /*  Reveal flow                                                      */
  /* ---------------------------------------------------------------- */

  const handleReveal = useCallback(async () => {
    setPhase("working");
    setProgress(0);
    setProgressLabel("Requesting decryption...");
    setRevealedText("");
    setErrorMsg("");

    try {
      const uuid = parseVaultId(revealInput);

      // Step 1: Fetch DKG params
      setProgress(10);
      setProgressLabel("Requesting decryption...");
      const writeClient = await getWriteClient();
      const [globalPubKey, threshold] = await Promise.all([
        client.observer.getGlobalPubKey(),
        client.observer.getThreshold(),
      ]);

      // Generate ephemeral key pair
      const privKey = secp256k1.utils.randomPrivateKey();
      const pubKey = secp256k1.getPublicKey(privKey, false);

      // Fetch vault encrypted data
      const vault = await (publicClient as any).readContract({
        address: contractAddresses.testnet.cdr,
        abi: cdrAbi,
        functionName: "vaults",
        args: [uuid],
      });
      const encryptedData = toBytes((vault as any).encryptedData);
      const label = uuidToLabel(uuid);

      // Submit read
      setProgress(25);
      const fromBlock = await publicClient.getBlockNumber();
      await writeClient.consumer.read({
        uuid,
        accessAuxData: "0x",
        requesterPubKey: toHex(pubKey),
      });

      // Step 2: Collect partials
      setProgress(40);
      setProgressLabel(
        `Collecting validator responses (0/${threshold})...`,
      );
      const partials = await collectPartialsWithProgress({
        publicClient: publicClient as any,
        uuid,
        minPartials: threshold,
        fromBlock,
        timeoutMs: 120_000,
        pollIntervalMs: 3_000,
        onProgress: (collected, needed) => {
          const pct = 40 + Math.round((collected / needed) * 40);
          setProgress(pct);
          setProgressLabel(
            `Collecting validator responses (${collected}/${needed})...`,
          );
        },
      });

      // Step 3: Decrypt
      setProgress(85);
      setProgressLabel("Decrypting...");

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

      const dataKey = await tdh2Combine({
        ciphertext: { raw: encryptedData, label },
        partials: decryptedPartials,
        globalPubKey,
        label,
        threshold,
      });

      const decoded = new TextDecoder().decode(dataKey);

      // Try to parse as file payload
      try {
        const parsed = JSON.parse(decoded);
        if (parsed.type === "file" && parsed.cid) {
          setRevealedFile(parsed);
          setRevealedText("");
          setProgress(100);
          setProgressLabel("Done!");
          setPhase("done");
          return;
        }
      } catch {
        // Not JSON — treat as plain text (fall through)
      }

      // Done
      setProgress(100);
      setProgressLabel("Done!");
      setRevealedText(decoded);
      setPhase("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setProgressLabel("Failed");
      setPhase("error");
    }
  }, [client, getWriteClient, publicClient, revealInput]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const canCreate = connected && wasmReady && (inputMode === "text" ? secretText.trim().length > 0 : !!selectedFile);
  const canReveal = connected && wasmReady && revealInput.trim().length > 0;
  const isWorking = phase === "working";

  return (
    <>
      <AppNavbar
        icon={<LockIcon size={14} className="text-glass-indigo" />}
        iconBg="bg-gradient-to-br from-[rgba(129,140,248,0.2)] to-[rgba(129,140,248,0.06)] border-[0.5px] border-[rgba(129,140,248,0.15)]"
        title="Private Storage"
        tabs={[
          { label: "Create", active: tab === "create", onClick: () => { if (!isWorking) { setTab("create"); reset(); } } },
          { label: "Reveal", active: tab === "reveal", onClick: () => { if (!isWorking) { setTab("reveal"); reset(); } } },
        ]}
      />
      <div className="mx-auto max-w-lg px-14 pb-20 pt-9">
        {/* Header */}
        <h1 className="text-2xl font-bold tracking-tight">Secret Share</h1>
        <p className="mt-2 text-sm text-white/50">
          Encrypt a secret and share it via a link. Only you can reveal it.
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

        {/* ============================================================ */}
        {/*  CREATE TAB                                                   */}
        {/* ============================================================ */}
        {tab === "create" && (
          <div className="mt-6 flex flex-col gap-5">
            {phase === "idle" && (
              <>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/40">
                    Your Secret
                  </label>
                  <div className="flex gap-1 rounded-md bg-white/5 p-0.5 mb-3">
                    <button
                      onClick={() => setInputMode("text")}
                      className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                        inputMode === "text" ? "bg-white/10 text-white" : "text-white/40"
                      }`}
                    >
                      Text
                    </button>
                    <button
                      onClick={() => setInputMode("file")}
                      className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                        inputMode === "file" ? "bg-white/10 text-white" : "text-white/40"
                      }`}
                    >
                      File
                    </button>
                  </div>
                  {inputMode === "file" ? (
                    <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
                      {selectedFile ? (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white/70">{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                          <button onClick={() => setSelectedFile(null)} className="text-xs text-white/30 hover:text-white/50">Remove</button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <span className="text-sm text-white/40">Click to select a file (max 10 MB)</span>
                          <input type="file" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
                        </label>
                      )}
                    </div>
                  ) : (
                    <textarea
                      value={secretText}
                      onChange={(e) => setSecretText(e.target.value)}
                      placeholder="Type something secret..."
                      rows={4}
                      className="w-full resize-none rounded-lg border-[0.5px] border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-white/20"
                    />
                  )}
                </div>
                <button
                  disabled={!canCreate}
                  onClick={handleCreate}
                  className="rounded-lg bg-[rgba(129,140,248,0.08)] border-[0.5px] border-[rgba(129,140,248,0.18)] text-glass-indigo shadow-[inset_0_0.5px_0_rgba(255,255,255,0.04)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[rgba(129,140,248,0.14)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Create Secret Link
                </button>
              </>
            )}

            {(phase === "working" || phase === "error") && (
              <div className="flex flex-col gap-4">
                <ProgressBar
                  percent={progress}
                  label={progressLabel}
                  accentClass="bg-demo-secret"
                  error={phase === "error"}
                />
                {phase === "error" && (
                  <>
                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                      {errorMsg}
                    </div>
                    <button
                      onClick={reset}
                      className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
                    >
                      Try Again
                    </button>
                  </>
                )}
              </div>
            )}

            {phase === "done" && shareLink && (
              <div className="flex flex-col gap-4">
                <ProgressBar
                  percent={100}
                  label="Done!"
                  accentClass="bg-demo-secret"
                />
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/40">
                    Shareable Link
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
                    <span className="min-w-0 flex-1 truncate font-mono text-sm text-green-300">
                      {shareLink}
                    </span>
                    <button
                      onClick={() => copyToClipboard(shareLink)}
                      className="shrink-0 rounded-md bg-white/10 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-white/15"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    reset();
                    setSecretText("");
                    setShareLink("");
                  }}
                  className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
                >
                  Create Another
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/*  REVEAL TAB                                                   */}
        {/* ============================================================ */}
        {tab === "reveal" && (
          <div className="mt-6 flex flex-col gap-5">
            {phase === "idle" && (
              <>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/40">
                    Secret Link or ID
                  </label>
                  <input
                    value={revealInput}
                    onChange={(e) => setRevealInput(e.target.value)}
                    placeholder="Paste a link or enter a number..."
                    className="w-full rounded-lg border-[0.5px] border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-white/20"
                  />
                </div>
                <button
                  disabled={!canReveal}
                  onClick={handleReveal}
                  className="rounded-lg bg-[rgba(129,140,248,0.08)] border-[0.5px] border-[rgba(129,140,248,0.18)] text-glass-indigo shadow-[inset_0_0.5px_0_rgba(255,255,255,0.04)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[rgba(129,140,248,0.14)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Reveal
                </button>
              </>
            )}

            {(phase === "working" || phase === "error") && (
              <div className="flex flex-col gap-4">
                <ProgressBar
                  percent={progress}
                  label={progressLabel}
                  accentClass="bg-demo-secret"
                  error={phase === "error"}
                />
                {phase === "error" && (
                  <>
                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                      {errorMsg}
                    </div>
                    <button
                      onClick={reset}
                      className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
                    >
                      Try Again
                    </button>
                  </>
                )}
              </div>
            )}

            {phase === "done" && (revealedText || revealedFile) && (
              <div className="flex flex-col gap-4">
                <ProgressBar
                  percent={100}
                  label="Done!"
                  accentClass="bg-demo-secret"
                />
                {revealedFile ? (
                  <div className="rounded-lg border border-green-500/15 bg-green-500/5 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-green-400/60">
                      Revealed File
                    </p>
                    {/* Vault content (decrypted payload) */}
                    <div className="mt-3">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">
                        Vault Content
                      </p>
                      <pre className="mt-1 overflow-x-auto rounded-md bg-black/30 px-3 py-2 font-mono text-xs leading-relaxed text-green-300/80">
                        {JSON.stringify(revealedFile, null, 2)}
                      </pre>
                    </div>
                    {/* IPFS link */}
                    <div className="mt-3">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">
                        IPFS Source
                      </p>
                      <a
                        href={`https://w3s.link/ipfs/${revealedFile.cid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block truncate font-mono text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        https://w3s.link/ipfs/{revealedFile.cid}
                      </a>
                    </div>
                    {/* Download */}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-green-300">{revealedFile.fileName} ({(revealedFile.fileSize / 1024 / 1024).toFixed(2)} MB)</span>
                      <button
                        onClick={downloadRevealedFile}
                        className="rounded-md bg-green-500/15 px-3 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-500/25"
                      >
                        Download &amp; Decrypt
                      </button>
                    </div>
                  </div>
                ) : revealedText ? (
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/40">
                      Revealed Secret
                    </label>
                    <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
                      <p className="break-all font-mono text-sm text-green-300">
                        {revealedText}
                      </p>
                    </div>
                  </div>
                ) : null}
                <button
                  onClick={() => {
                    reset();
                    setRevealedText("");
                  }}
                  className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
                >
                  Reveal Another
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/*  HOW IT WORKS                                                 */}
        {/* ============================================================ */}
        <HowItWorks
          layers={[
            {
              title: "Layer 1 -- Conceptual",
              content: (
                <ul className="flex list-disc flex-col gap-2 pl-4">
                  <li>
                    Your secret is encrypted using <strong>threshold encryption</strong> -- no single party ever sees the plaintext.
                  </li>
                  <li>
                    A network of validators each hold a <em>share</em> of the decryption key. No individual share is useful on its own.
                  </li>
                  <li>
                    To decrypt, a quorum (e.g. 2-of-3) of validators must independently produce partial decryptions.
                  </li>
                  <li>
                    The partial decryptions are combined client-side to recover the original secret. Validators never learn what the secret is.
                  </li>
                  <li>
                    Access control is enforced on-chain: only the vault owner (the wallet that created it) can trigger the decryption process.
                  </li>
                </ul>
              ),
            },
            {
              title: "Layer 2 -- Architecture",
              content: (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/30">
                      Encrypt Flow
                    </p>
                    <ol className="flex list-decimal flex-col gap-1 pl-4 font-mono text-xs">
                      <li>CDR.allocate(writeCondition, readCondition) -- create vault</li>
                      <li>DKG.getGlobalPubKey() -- fetch threshold public key</li>
                      <li>TDH2.encrypt(secret, globalPubKey, label) -- encrypt locally</li>
                      <li>CDR.write(uuid, ciphertext) -- store on-chain</li>
                    </ol>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/30">
                      Decrypt Flow
                    </p>
                    <ol className="flex list-decimal flex-col gap-1 pl-4 font-mono text-xs">
                      <li>CDR.read(uuid, ephemeralPubKey) -- request decryption</li>
                      <li>Validators emit EncryptedPartialDecryptionSubmitted events</li>
                      <li>ECIES.decrypt(partial, ephemeralPrivKey) -- decrypt each partial</li>
                      <li>TDH2.combine(partials, ciphertext) -- recover secret</li>
                    </ol>
                  </div>
                </div>
              ),
            },
            {
              title: "Layer 3 -- Code",
              content: (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/30">
                      Allocate &amp; Encrypt
                    </p>
                    <pre className="overflow-x-auto rounded-md bg-black/40 p-3 text-xs leading-relaxed">
{`const { uuid } = await cdr.uploader.allocate({
  updatable: false,
  writeConditionAddr: myAddress,
  readConditionAddr: myAddress,
  writeConditionData: "0x",
  readConditionData: "0x",
});

const globalPubKey = await cdr.observer.getGlobalPubKey();
const label = uuidToLabel(uuid);
const ct = await cdr.uploader.encryptDataKey({
  dataKey: new TextEncoder().encode(secret),
  globalPubKey,
  label,
});

await cdr.uploader.write({
  uuid,
  accessAuxData: "0x",
  encryptedData: toHex(ct.raw),
});`}
                    </pre>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/30">
                      Read &amp; Decrypt
                    </p>
                    <pre className="overflow-x-auto rounded-md bg-black/40 p-3 text-xs leading-relaxed">
{`const privKey = secp256k1.utils.randomPrivateKey();
const pubKey  = secp256k1.getPublicKey(privKey, false);

await cdr.consumer.read({
  uuid,
  accessAuxData: "0x",
  requesterPubKey: toHex(pubKey),
});

// Poll for partial decryptions from validators
const partials = await collectPartials(uuid, threshold);

// ECIES-decrypt each partial, then TDH2-combine
const decrypted = partials.map(p =>
  eciesDecrypt({ ...p, recipientPrivKey: privKey })
);
const secret = await tdh2Combine({
  ciphertext, partials: decrypted,
  globalPubKey, label, threshold,
});`}
                    </pre>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Page wrapper with Suspense for useSearchParams                     */
/* ------------------------------------------------------------------ */

export default function SecretSharePage() {
  return (
    <AppWindow>
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-white/30">Loading...</p>
          </div>
        }
      >
        <SecretShareInner />
      </Suspense>
    </AppWindow>
  );
}
