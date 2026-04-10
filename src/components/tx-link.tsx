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
      className="liquid-button inline-flex items-center gap-1.5 rounded px-2 py-1 font-mono text-xs"
    >
      {short}
      <span className="theme-text-tertiary">{copied ? "copied" : "copy"}</span>
    </button>
  );
}
