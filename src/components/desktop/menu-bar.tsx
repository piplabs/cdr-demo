"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useBalance } from "@/hooks/use-balance";
import { CDRDiamondIcon } from "./dock-icons";

interface MenuTab {
  label: string;
  route: string;
}

const tabs: MenuTab[] = [
  { label: "Home", route: "/" },
  { label: "Private Storage", route: "/storage" },
  { label: "Data Market", route: "/marketplace" },
  { label: "Faucet", route: "/faucet" },
  { label: "Vault", route: "/vault" },
];

export function MenuBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, authenticated, login, logout, user } = usePrivy();
  const balance = useBalance();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  const address = user?.wallet?.address;
  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;

  useEffect(() => {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    setTheme(current);
    setMounted(true);
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("cdr-theme", next);
    setTheme(next);
  }

  return (
    <header className="sticky top-0 z-[200] border-b border-[color:var(--line-soft)] bg-[color:var(--glass-bg-strong)] [backdrop-filter:blur(20px)_saturate(1.5)]">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-[color:var(--text-primary)]"
          >
            <CDRDiamondIcon size={16} className="text-[#4338ca]" />
            CDR
          </button>
          <nav className="flex items-center gap-1">
            {tabs.map((tab) => {
              const isActive =
                tab.route === "/"
                  ? pathname === "/"
                  : pathname === tab.route || pathname.startsWith(tab.route + "/");
              return (
                <button
                  key={tab.route}
                  onClick={() => router.push(tab.route)}
                  className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                    isActive
                      ? "bg-[color:var(--surface-soft)] text-[color:var(--text-primary)]"
                      : "text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-[12px]">
          {balance !== null && (
            <span className="font-medium text-[color:var(--text-secondary)] [font-variant-numeric:tabular-nums]">
              {balance} IP
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[color:var(--text-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
            Devnet
          </span>
          <button
            onClick={toggleTheme}
            aria-label={mounted ? `Switch to ${theme === "light" ? "dark" : "light"} mode` : "Toggle theme"}
            className="liquid-button flex h-7 w-7 items-center justify-center rounded-md text-[color:var(--text-secondary)]"
          >
            {mounted ? (
              theme === "light" ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              )
            ) : null}
          </button>
          {!ready ? (
            <div className="h-7 w-24 animate-pulse rounded-md bg-[color:var(--surface-soft)]" />
          ) : !authenticated ? (
            <button
              onClick={login}
              className="liquid-button liquid-button-primary rounded-md px-3 py-1.5 text-[12px] font-semibold"
            >
              Connect
            </button>
          ) : (
            <button
              onClick={logout}
              className="liquid-button rounded-md px-3 py-1.5 text-[12px] font-medium"
            >
              {short}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
