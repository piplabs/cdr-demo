"use client";

import { useRouter } from "next/navigation";
import { LockIcon, ShopIcon } from "@/components/desktop/dock-icons";

const appCards = [
  {
    id: "storage",
    route: "/storage",
    title: "Private Storage",
    tagline: "On-chain encrypted data vaults with programmable access control",
    pills: ["Threshold Encryption", "Multi-sig Access", "Time-windowed", "Data Escrows"],
    description: "Store private data on-chain without deploying smart contracts — or use contracts for advanced access control like multi-sig reads, time-windowed access, and dead-man switches.",
    icon: <LockIcon size={24} className="text-glass-indigo" />,
    iconBg: "liquid-icon-indigo",
    accent: "text-glass-indigo",
    eyebrow: "Vaults",
  },
  {
    id: "marketplace",
    route: "/marketplace",
    title: "Data Marketplace",
    tagline: "Atomic exchange of private data with on-chain payment guarantees",
    pills: ["Atomic Swaps", "Subscriptions", "NFT-gated", "IP Licensing"],
    description: "Providers upload encrypted data and set access terms. Buyers pay and automatically gain decryption. Supports subscriptions, NFT-gated access, and Story Protocol IP licensing.",
    icon: <ShopIcon size={24} className="text-glass-emerald" />,
    iconBg: "liquid-icon-emerald",
    accent: "text-glass-emerald",
    eyebrow: "Exchange",
  },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-[900px] px-6">
      <div className="pb-8 pt-2">
        {/* Hero */}
        <div className="mb-14 text-center">
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.34em] text-white/38">
            Confidential Data Routing
          </p>
          <h1 className="mx-auto mb-4 max-w-[760px] text-[44px] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-[60px]">
            Private data flows through clear, deliberate surfaces.
            <br />
            <span className="text-white/62">
              No saturated hero gradient, no fake glow, no single point of trust.
            </span>
          </h1>
          <p className="mx-auto max-w-[520px] text-[15px] leading-relaxed text-white/[0.46] sm:text-base">
            Threshold encryption powered by a decentralized key network.
            Explore the demo apps through a lighter liquid-glass shell that keeps the data layer legible.
          </p>
        </div>

        {/* App cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {appCards.map((card) => (
            <div
              key={card.id}
              onClick={() => router.push(card.route)}
              className="liquid-panel group relative flex cursor-pointer flex-col gap-6 overflow-hidden rounded-[30px] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-white/12 hover:bg-white/[0.07]"
            >
              <div className="pointer-events-none absolute inset-x-6 top-4 h-px bg-white/10" />
              <div className={`liquid-icon-tile h-[54px] w-[54px] flex-shrink-0 rounded-[18px] ${card.iconBg}`}>
                {card.icon}
              </div>
              <div className="relative z-[1] flex-1">
                <p className={`mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] ${card.accent}/60`}>
                  {card.eyebrow}
                </p>
                <h3 className="mb-1 text-[19px] font-semibold tracking-[-0.03em]">{card.title}</h3>
                <p className="mb-4 text-sm text-white/48">{card.tagline}</p>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {card.pills.map((pill) => (
                    <span key={pill} className="liquid-chip rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">
                      {pill}
                    </span>
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-white/38">{card.description}</p>
                <div className={`mt-5 inline-flex items-center gap-2 text-sm font-semibold transition-[gap] duration-250 group-hover:gap-3 ${card.accent}`}>
                  Open App
                  <span aria-hidden="true">→</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
