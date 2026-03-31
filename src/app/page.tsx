"use client";

import { useRouter } from "next/navigation";
import { AppWindow } from "@/components/desktop/app-window";
import { AppNavbar } from "@/components/desktop/app-navbar";
import { CDRDiamondIcon, LockIcon, ShopIcon } from "@/components/desktop/dock-icons";

const appCards = [
  {
    id: "storage",
    route: "/storage",
    title: "Private Storage",
    tagline: "On-chain encrypted data vaults with programmable access control",
    pills: ["Threshold Encryption", "Multi-sig Access", "Time-windowed", "Data Escrows"],
    description: "Store private data on-chain without deploying smart contracts — or use contracts for advanced access control like multi-sig reads, time-windowed access, and dead-man switches.",
    icon: <LockIcon size={24} className="text-glass-indigo" />,
    iconBg: "bg-gradient-to-br from-[rgba(129,140,248,0.18)] to-[rgba(129,140,248,0.05)] border-[0.5px] border-[rgba(129,140,248,0.15)]",
    accent: "text-glass-indigo",
    glowColor: "rgba(129,140,248,0.07)",
  },
  {
    id: "marketplace",
    route: "/marketplace",
    title: "Data Marketplace",
    tagline: "Atomic exchange of private data with on-chain payment guarantees",
    pills: ["Atomic Swaps", "Subscriptions", "NFT-gated", "IP Licensing"],
    description: "Providers upload encrypted data and set access terms. Buyers pay and automatically gain decryption. Supports subscriptions, NFT-gated access, and Story Protocol IP licensing.",
    icon: <ShopIcon size={24} className="text-glass-emerald" />,
    iconBg: "bg-gradient-to-br from-[rgba(52,211,153,0.18)] to-[rgba(52,211,153,0.05)] border-[0.5px] border-[rgba(52,211,153,0.15)]",
    accent: "text-glass-emerald",
    glowColor: "rgba(52,211,153,0.07)",
  },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <AppWindow>
      <AppNavbar
        icon={<CDRDiamondIcon size={14} className="text-glass-indigo/80" />}
        iconBg="bg-white/[0.06] border-[0.5px] border-white/[0.08]"
        title="CDR Home"
      />
      <div className="mx-auto max-w-[840px] px-14 pb-20 pt-[52px]">
        {/* Hero */}
        <div className="mb-[52px] text-center">
          <p className="mb-[18px] text-[11px] font-semibold uppercase tracking-[4px] text-glass-indigo/45">
            Confidential Data Routing
          </p>
          <h1 className="mb-4 text-[44px] font-extrabold leading-[1.15] tracking-[-1.5px]">
            Your data. Your rules.
            <br />
            <span className="bg-gradient-to-br from-glass-indigo via-glass-violet to-[#c4b5fd] bg-clip-text text-transparent">
              No single point of trust.
            </span>
          </h1>
          <p className="mx-auto max-w-[400px] text-sm leading-relaxed text-white/[0.28]">
            Threshold encryption powered by a decentralized key network.
            Explore applications built on CDR.
          </p>
        </div>

        {/* App cards */}
        <div className="flex flex-col gap-4">
          {appCards.map((card) => (
            <div
              key={card.id}
              onClick={() => router.push(card.route)}
              className="group relative flex cursor-pointer gap-6 overflow-hidden rounded-[20px] border-[0.5px] border-white/[0.05] bg-white/[0.022] p-7 shadow-[inset_0_0.5px_0_rgba(255,255,255,0.03)] backdrop-blur-[20px] transition-all duration-[350ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/[0.04] hover:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.06),0_12px_48px_rgba(0,0,0,0.25)]"
            >
              {/* Refraction glow */}
              <div
                className="pointer-events-none absolute -right-1/4 -top-[40%] h-[280px] w-[280px] rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{ background: `radial-gradient(circle, ${card.glowColor}, transparent 65%)` }}
              />
              {/* Icon */}
              <div className={`flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-[14px] shadow-[inset_0_0.5px_0_rgba(255,255,255,0.08)] ${card.iconBg}`}>
                {card.icon}
              </div>
              {/* Body */}
              <div className="relative z-[1] flex-1">
                <h3 className="mb-[5px] text-[17px] font-bold tracking-[-0.2px]">{card.title}</h3>
                <p className="mb-3 text-xs text-white/40">{card.tagline}</p>
                <div className="mb-3 flex flex-wrap gap-[5px]">
                  {card.pills.map((pill) => (
                    <span key={pill} className="rounded-full border-[0.5px] border-white/[0.06] bg-white/[0.03] px-[9px] py-[3px] text-[9px] font-semibold uppercase tracking-[0.5px] text-white/30">
                      {pill}
                    </span>
                  ))}
                </div>
                <p className="text-xs leading-relaxed text-white/[0.22]">{card.description}</p>
                <div className={`mt-3.5 inline-flex items-center gap-[5px] text-xs font-semibold transition-[gap] duration-[250ms] group-hover:gap-[9px] ${card.accent}`}>
                  Open App →
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppWindow>
  );
}
