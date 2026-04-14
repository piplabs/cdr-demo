"use client";

import { useCallback, useRef, useState } from "react";
import { createWalletClient, custom, toHex } from "viem";
import { CONTRACTS, deadManSwitchConditionAbi } from "@/config/contracts";
import { classifyRecipient, dedupeAddresses, type ClassifiedRecipient } from "@/lib/recipients";
import { uuidToLabel } from "@piplabs/cdr-sdk";
import { useWallets } from "@privy-io/react-auth";
import { useCDRClient } from "@/hooks/use-cdr-client";
import { cdrDevnet } from "@/config/chain";
import { ProgressBar } from "@/components/progress-bar";
import { DurationPicker } from "./duration-picker";
import { secondsToBlocks } from "@/lib/block-time";

type Phase = "idle" | "working" | "done" | "error";

export function DeadManSwitchTab(props: {
  wasmReady: boolean;
  connected: boolean;
}) {
  const { client, publicClient, getWriteClient, address } = useCDRClient();
  const { wallets } = useWallets();

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [secretText, setSecretText] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "file">("text");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recipients, setRecipients] = useState<string[]>(["", "", ""]);
  const [durationSeconds, setDurationSeconds] = useState(3600); // default 1h
  const [creatorCanRead, setCreatorCanRead] = useState(true);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const copyTimeout = useRef<ReturnType<typeof setTimeout>>();

  const classified: ClassifiedRecipient[] = recipients.map(classifyRecipient);
  const hasInvalidRecipient = classified.some(
    (c, i) => recipients[i].trim().length > 0 && c.kind === "invalid",
  );

  function reset() {
    setPhase("idle");
    setProgress(0);
    setProgressLabel("");
    setErrorMsg("");
    setSelectedFile(null);
  }

  function resetAllInputs() {
    reset();
    setSecretText("");
    setShareLink("");
    setRecipients(["", "", ""]);
    setDurationSeconds(3600);
    setCreatorCanRead(true);
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    if (copyTimeout.current) clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopied(false), 2000);
  }

  const handleCreate = useCallback(async () => {
    setPhase("working");
    setProgress(0);
    setProgressLabel("Resolving recipients...");
    setShareLink("");
    setErrorMsg("");

    try {
      if (!CONTRACTS.DEADMAN_SWITCH_CONDITION) {
        throw new Error(
          "DeadManSwitchCondition address not configured (NEXT_PUBLIC_DEADMAN_SWITCH_CONDITION)",
        );
      }

      const classifiedList = recipients
        .filter((r) => r.trim().length > 0)
        .map(classifyRecipient);
      const invalid = classifiedList.find((c) => c.kind === "invalid");
      if (invalid) throw new Error(`Invalid recipient: ${invalid.value}`);

      const emails = classifiedList
        .filter((c): c is { kind: "email"; value: string } => c.kind === "email")
        .map((c) => c.value);
      const rawAddrs = classifiedList
        .filter(
          (c): c is { kind: "address"; value: `0x${string}` } => c.kind === "address",
        )
        .map((c) => c.value);

      let resolvedEmailAddrs: `0x${string}`[] = [];
      if (emails.length > 0) {
        const res = await fetch("/api/privy/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "unknown" }));
          throw new Error(body.error || `Privy resolve failed (${res.status})`);
        }
        const data = (await res.json()) as {
          results: { email: string; address: `0x${string}` }[];
        };
        resolvedEmailAddrs = data.results.map((r) => r.address);
      }

      const whitelist = dedupeAddresses([...resolvedEmailAddrs, ...rawAddrs]);
      setProgress(15);

      let filePayload: {
        cid: string;
        key: string;
        fileName: string;
        fileSize: number;
      } | null = null;
      if (inputMode === "file" && selectedFile) {
        setProgressLabel("Uploading file...");
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("address", address!);
        const uploadRes = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || "File upload failed");
        }
        filePayload = await uploadRes.json();
        setProgress(30);
      }

      setProgressLabel("Creating secure vault...");
      const writeClient = await getWriteClient();
      const { uuid } = await writeClient.uploader.allocate({
        updatable: false,
        writeConditionAddr: CONTRACTS.DEADMAN_SWITCH_CONDITION,
        readConditionAddr: CONTRACTS.DEADMAN_SWITCH_CONDITION,
        writeConditionData: "0x",
        readConditionData: "0x",
      });
      setProgress(45);

      setProgressLabel("Arming dead man's switch...");
      const wallet = wallets[0];
      if (!wallet) throw new Error("No wallet connected");
      const provider = await wallet.getEthereumProvider();
      const walletClient = createWalletClient({
        chain: cdrDevnet,
        transport: custom(provider),
        account: wallet.address as `0x${string}`,
      });
      const durationBlocks = BigInt(secondsToBlocks(durationSeconds));
      const [, globalPubKey] = await Promise.all([
        walletClient
          .writeContract({
            address: CONTRACTS.DEADMAN_SWITCH_CONDITION,
            abi: deadManSwitchConditionAbi,
            functionName: "register",
            args: [uuid, durationBlocks, whitelist, creatorCanRead],
          })
          .then((hash) => publicClient.waitForTransactionReceipt({ hash })),
        client.observer.getGlobalPubKey(),
      ]);
      setProgress(60);

      setProgressLabel("Encrypting your secret...");
      const payloadBytes = filePayload
        ? new TextEncoder().encode(
            JSON.stringify({
              type: "file",
              cid: filePayload.cid,
              key: filePayload.key,
              fileName: filePayload.fileName,
              fileSize: filePayload.fileSize,
            }),
          )
        : new TextEncoder().encode(secretText);
      const label = uuidToLabel(uuid);
      const ciphertext = await writeClient.uploader.encryptDataKey({
        dataKey: payloadBytes,
        globalPubKey,
        label,
      });
      setProgress(80);

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setProgressLabel("Failed");
      setPhase("error");
    }
  }, [
    address, client, getWriteClient, publicClient, secretText, inputMode,
    selectedFile, recipients, wallets, durationSeconds, creatorCanRead,
  ]);

  const canCreate =
    props.connected &&
    props.wasmReady &&
    !hasInvalidRecipient &&
    (inputMode === "text" ? secretText.trim().length > 0 : !!selectedFile);

  return (
    <div className="mt-4 flex flex-col gap-6">
      {phase === "idle" && (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-white/50">Vault contents</label>
              <div className="liquid-segmented flex gap-0.5 rounded-full p-0.5">
                {(["text", "file"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setInputMode(m)}
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                      inputMode === m ? "liquid-panel-soft text-white" : "text-white/40"
                    }`}
                  >
                    {m === "text" ? "Text" : "File"}
                  </button>
                ))}
              </div>
            </div>
            {inputMode === "file" ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
                {selectedFile ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">
                      {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                    <button onClick={() => setSelectedFile(null)} className="text-xs text-white/30 hover:text-white/50">
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <span className="text-sm text-white/40">Click to select a file (max 10 MB)</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                )}
              </div>
            ) : (
              <textarea
                value={secretText}
                onChange={(e) => setSecretText(e.target.value)}
                placeholder="Type something sensitive..."
                rows={4}
                className="liquid-input w-full resize-none rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30"
              />
            )}
          </div>

          <DurationPicker
            valueSeconds={durationSeconds}
            onChange={setDurationSeconds}
          />

          <label className="flex items-center gap-2 text-xs text-white/60">
            <input
              type="checkbox"
              checked={creatorCanRead}
              onChange={(e) => setCreatorCanRead(e.target.checked)}
            />
            Allow me to view vault contents while locked
          </label>

          <div>
            <label className="mb-1 block text-xs font-medium text-white/50">
              Share with (optional)
            </label>
            <p className="mb-2 text-[11px] text-white/30">
              Up to 3 emails or wallet addresses. They can decrypt only after the timer expires.
            </p>
            <div className="flex flex-col gap-1.5">
              {recipients.map((value, idx) => {
                const c = classified[idx];
                const showError = value.trim().length > 0 && c.kind === "invalid";
                const showOk = value.trim().length > 0 && c.kind !== "invalid";
                return (
                  <div key={idx}>
                    <div className="relative">
                      <input
                        value={value}
                        onChange={(e) => {
                          const next = [...recipients];
                          next[idx] = e.target.value;
                          setRecipients(next);
                        }}
                        placeholder="email@example.com or 0x…"
                        className="w-full rounded-2xl border-[0.5px] border-white/[0.06] bg-white/[0.02] px-4 py-2 pr-8 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-white/20"
                      />
                      {showOk && (
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-green-400/70">✓</span>
                      )}
                      {showError && (
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-red-400/70">✕</span>
                      )}
                    </div>
                    {showError && (
                      <p className="mt-0.5 text-[10px] text-red-400/70">
                        Not a valid email or wallet address
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            disabled={!canCreate}
            onClick={handleCreate}
            className="liquid-button liquid-button-indigo rounded-2xl px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            Arm Switch & Store →
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
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                {errorMsg}
              </div>
              <button
                onClick={reset}
                className="liquid-button rounded-2xl px-4 py-2.5 text-sm font-medium"
              >
                Try Again
              </button>
            </>
          )}
        </div>
      )}

      {phase === "done" && shareLink && (
        <div className="flex flex-col gap-4">
          <ProgressBar percent={100} label="Done!" accentClass="bg-demo-secret" />
          <div>
            <label className="mb-2 block text-xs font-medium text-white/50">Shareable link</label>
            <div className="flex items-center gap-2 rounded-2xl border border-green-500/20 bg-green-500/5 px-4 py-3">
              <span className="min-w-0 flex-1 truncate font-mono text-sm text-green-300">{shareLink}</span>
              <button
                onClick={() => copyToClipboard(shareLink)}
                className="liquid-button shrink-0 rounded-full px-3 py-1 text-xs font-medium"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <button
            onClick={resetAllInputs}
            className="rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
          >
            Create Another
          </button>
        </div>
      )}
    </div>
  );
}
