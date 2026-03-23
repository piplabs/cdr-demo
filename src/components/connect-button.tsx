"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useBalance } from "@/hooks/use-balance";

export function ConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const balance = useBalance();

  if (!ready) return <div className="h-9 w-24 animate-pulse rounded-lg bg-white/10" />;

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        Connect
      </button>
    );
  }

  const address = user?.wallet?.address;
  const short = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connected";

  return (
    <div className="flex items-center gap-3">
      {balance !== null && (
        <span className="text-sm text-white/60">
          {balance} <span className="text-white/40">IP</span>
        </span>
      )}
      <button
        onClick={logout}
        className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
      >
        {short}
      </button>
    </div>
  );
}
