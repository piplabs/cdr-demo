"use client";

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

  const address = user?.wallet?.address;
  const short = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null;

  return (
    <div className="fixed inset-x-0 top-0 z-[200] flex h-9 items-center justify-between border-b-[0.5px] border-white/[0.06] bg-black/50 px-4 backdrop-blur-[48px] [backdrop-filter:blur(48px)_saturate(1.8)] [-webkit-backdrop-filter:blur(48px)_saturate(1.8)]">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => router.push("/")}
          className="mr-2.5 flex items-center gap-[5px] text-[13px] font-extrabold tracking-tight text-glass-indigo/90"
        >
          <CDRDiamondIcon size={14} className="text-glass-indigo/90" />
          CDR
        </button>
        <div className="flex gap-0.5 rounded-lg bg-white/[0.04] p-0.5">
          {tabs.map((tab) => {
            const isActive =
              tab.route === "/"
                ? pathname === "/"
                : pathname === tab.route || pathname.startsWith(tab.route + "/");
            return (
              <button
                key={tab.route}
                onClick={() => router.push(tab.route)}
                className={`rounded-md px-3 py-1 text-[11px] font-medium transition-all duration-200 [transition-timing-function:cubic-bezier(0.25,1,0.5,1)] ${
                  isActive
                    ? "bg-white/[0.08] text-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.25),inset_0_0.5px_0_rgba(255,255,255,0.05)]"
                    : "text-white/40 hover:text-white/65"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 text-[11px]">
        {balance !== null && (
          <span className="font-semibold text-glass-emerald/85 [font-variant-numeric:tabular-nums]">
            {balance} IP
          </span>
        )}
        <div className="flex items-center gap-1.5 text-white/45">
          <div className="h-[5px] w-[5px] rounded-full bg-[#30d158]" />
          <span>Devnet</span>
        </div>
        {!ready ? (
          <div className="h-6 w-20 animate-pulse rounded-md bg-white/10" />
        ) : !authenticated ? (
          <button
            onClick={login}
            className="rounded-md border-[0.5px] border-white/[0.06] bg-white/[0.04] px-2.5 py-[3px] text-[10px] font-medium text-white/50 transition-colors hover:bg-white/[0.07]"
          >
            Connect
          </button>
        ) : (
          <button
            onClick={logout}
            className="rounded-md border-[0.5px] border-white/[0.06] bg-white/[0.04] px-2.5 py-[3px] text-[10px] font-medium text-white/50 transition-colors hover:bg-white/[0.07]"
          >
            {short}
          </button>
        )}
      </div>
    </div>
  );
}
