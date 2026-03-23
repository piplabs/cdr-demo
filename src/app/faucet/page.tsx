"use client";

import { useState, useEffect, useCallback } from "react";
import { isAddress } from "viem";
import { useCDRClient } from "@/hooks/use-cdr-client";
import { useBalance } from "@/hooks/use-balance";
import { TxLink } from "@/components/tx-link";

export default function FaucetPage() {
  const { address: walletAddress, connected } = useCDRClient();
  const balance = useBalance();
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Auto-fill from connected wallet
  useEffect(() => {
    if (connected && walletAddress) {
      setAddress(walletAddress);
    }
  }, [connected, walletAddress]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const requestTokens = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Parse countdown from rate-limit message
        const match = data.error?.match(/in (\d+)s/);
        if (match) {
          setCountdown(Number(match[1]));
        }
        setError(data.error);
        return;
      }

      setTxHash(data.txHash);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [address]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isValid = address && isAddress(address);
  const disabled = loading || !isValid || countdown > 0;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Faucet</h1>
        <p className="mt-2 text-sm text-white/50">
          Get testnet IP tokens to pay for vault operations
        </p>
        <p className="mt-1 text-xs text-white/35">
          Only available for addresses with balance below 0.5 IP
        </p>
      </div>

      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <label className="block text-sm font-medium text-white/70">
          Recipient address
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="0x..."
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-white/25"
        />

        {connected && balance !== null && (
          <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
            <span className="text-sm text-white/50">Your balance: </span>
            <span className="text-sm font-medium text-white">{balance} IP</span>
          </div>
        )}

        <button
          onClick={requestTokens}
          disabled={disabled}
          className="mt-4 w-full rounded-lg bg-white/10 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading
            ? "Sending..."
            : countdown > 0
              ? `Try again in ${formatCountdown(countdown)}`
              : "Request 1 IP"}
        </button>

        {txHash && (
          <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-white/60">
              Sent 1 IP successfully
            </p>
            <div className="mt-2">
              <TxLink hash={txHash} />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
