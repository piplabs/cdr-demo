import Link from "next/link";

const demos = [
  {
    href: "/secret",
    emoji: "🔒",
    title: "Secret Share",
    description: "Share secrets with zero-trust links",
  },
  {
    href: "/marketplace",
    emoji: "🏪",
    title: "Data Market",
    description: "Buy and sell encrypted data, no middleman",
  },
  {
    href: "/agents",
    emoji: "🤖",
    title: "Agent Exchange",
    description: "AI agents trade data autonomously",
  },
  {
    href: "/ai",
    emoji: "🧠",
    title: "Confidential AI",
    description: "Run models on your private data",
  },
  {
    href: "/bounties",
    emoji: "🎯",
    title: "Bounty Board",
    description: "Post data bounties with trustless evaluation",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-16">
      {/* Hero */}
      <div className="relative text-center">
        {/* Glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(99,102,241,0.12)_0%,transparent_70%)]" />

        <p className="relative text-[11px] font-medium uppercase tracking-[4px] text-indigo-400/70">
          CDR — Privacy Infra for AI
        </p>
        <h1 className="relative mt-5 text-4xl font-bold leading-[1.2] tracking-tight sm:text-5xl">
          Your data.
          <br />
          Your rules.
          <br />
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            No single point of trust.
          </span>
        </h1>
        <p className="relative mx-auto mt-5 max-w-md text-sm leading-relaxed text-white/40">
          Threshold encryption powered by a decentralized key network. No server
          ever sees your data.
        </p>
        <div className="relative mt-8 flex items-center justify-center gap-3">
          <Link
            href="/secret"
            className="rounded-lg bg-indigo-500/15 px-5 py-2.5 text-sm font-semibold text-indigo-300 ring-1 ring-indigo-500/30 transition-colors hover:bg-indigo-500/25"
          >
            Try Secret Share →
          </Link>
          <Link
            href="/vault"
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-white/60 ring-1 ring-white/15 transition-colors hover:text-white/80"
          >
            Read the Docs
          </Link>
        </div>
      </div>

      {/* Demo cards */}
      <div className="grid w-full gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {demos.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className="group rounded-xl border border-white/8 bg-white/[0.03] p-5 transition-all hover:border-white/15 hover:bg-white/[0.05]"
          >
            <span className="text-2xl">{d.emoji}</span>
            <h2 className="mt-3 text-sm font-semibold">{d.title}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-white/35">
              {d.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
