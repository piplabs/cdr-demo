"use client";

import { useState } from "react";

export function TxLink({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);
  const short = `${hash.slice(0, 10)}...${hash.slice(-8)}`;

  const copy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded bg-white/5 px-2 py-1 font-mono text-xs text-white/70 transition-colors hover:bg-white/10"
    >
      {short}
      <span className="text-white/40">{copied ? "copied" : "copy"}</span>
    </button>
  );
}
