"use client";

import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useCDRClient } from "./use-cdr-client";

export function useBalance() {
  const { publicClient, address } = useCDRClient();
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setBalance(null);
      return;
    }

    let cancelled = false;

    const fetch = async () => {
      const raw = await publicClient.getBalance({ address });
      if (!cancelled) {
        const full = formatUnits(raw, 18);
        // Show max 2 decimals
        const [int, dec] = full.split(".");
        setBalance(dec ? `${int}.${dec.slice(0, 2)}` : int);
      }
    };

    fetch();
    const interval = setInterval(fetch, 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [publicClient, address]);

  return balance;
}
