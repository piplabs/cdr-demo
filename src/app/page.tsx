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
    description:
      "Store private data on-chain without deploying smart contracts — or use contracts for advanced access control like multi-sig reads, time-windowed access, and dead-man switches.",
    icon: <LockIcon size={22} className="text-glass-indigo" />,
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
    description:
      "Providers upload encrypted data and set access terms. Buyers pay and automatically gain decryption. Supports subscriptions, NFT-gated access, and Story Protocol IP licensing.",
    icon: <ShopIcon size={22} className="text-glass-emerald" />,
    iconBg: "liquid-icon-emerald",
    accent: "text-glass-emerald",
    eyebrow: "Exchange",
  },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-6xl px-6">
      {/* Hero */}
      <section className="pb-16 pt-8">
        <p className="mb-5 text-[12px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-tertiary)]">
          Confidential Data Routing
        </p>
        <h1 className="max-w-[860px] text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] text-[color:var(--text-primary)] sm:text-[64px]">
          Private data, <span className="text-[color:var(--text-tertiary)]">predictable rails.</span>
        </h1>
        <p className="mt-6 max-w-[620px] text-[17px] leading-[1.55] text-[color:var(--text-secondary)]">
          Threshold encryption powered by a decentralized key network. Store, share, and trade
          encrypted data with on-chain guarantees — no single point of trust.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => router.push("/storage")}
            className="liquid-button liquid-button-primary rounded-md px-4 py-2.5 text-[14px] font-semibold"
          >
            Open Private Storage
          </button>
          <button
            onClick={() => router.push("/marketplace")}
            className="liquid-button rounded-md px-4 py-2.5 text-[14px] font-semibold"
          >
            Browse Marketplace
          </button>
        </div>
      </section>

      {/* App cards */}
      <section className="grid gap-5 pb-8 md:grid-cols-2">
        {appCards.map((card) => (
          <button
            key={card.id}
            onClick={() => router.push(card.route)}
            className="liquid-panel group relative flex flex-col gap-5 rounded-2xl p-7 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--line-strong)] hover:shadow-[0_12px_32px_rgba(11,15,23,0.1)]"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.iconBg}`}
            >
              {card.icon}
            </div>
            <div className="flex-1">
              <p
                className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${card.accent}`}
              >
                {card.eyebrow}
              </p>
              <h3 className="mb-1.5 text-[22px] font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]">
                {card.title}
              </h3>
              <p className="mb-4 text-[14px] text-[color:var(--text-tertiary)]">{card.tagline}</p>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {card.pills.map((pill) => (
                  <span
                    key={pill}
                    className="liquid-chip rounded-full px-2.5 py-1 text-[11px] font-medium tracking-normal"
                  >
                    {pill}
                  </span>
                ))}
              </div>
              <p className="text-[14px] leading-[1.6] text-[color:var(--text-secondary)]">
                {card.description}
              </p>
              <div
                className={`mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold transition-[gap] duration-200 group-hover:gap-2.5 ${card.accent}`}
              >
                Open app
                <span aria-hidden="true">→</span>
              </div>
            </div>
          </button>
        ))}
      </section>
    </div>
  );
}
