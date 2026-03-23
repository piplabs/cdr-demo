import Link from "next/link";

const cards = [
  {
    href: "/encrypt",
    title: "Encrypt",
    description: "Store a secret in a CDR vault. Your data is TDH2-encrypted to the DKG network's threshold public key.",
  },
  {
    href: "/decrypt",
    title: "Decrypt",
    description: "Read a vault and recover the original secret. Validators provide partial decryptions that are combined client-side.",
  },
  {
    href: "/vault",
    title: "Vault",
    description: "Inspect a vault's metadata, conditions, and ciphertext without decrypting.",
  },
  {
    href: "/licenses",
    title: "Licenses",
    description: "Manage your IP vaults and license tokens. Mint new licenses or transfer existing ones.",
  },
  {
    href: "/faucet",
    title: "Faucet",
    description: "Get testnet IP tokens to pay for vault operations on the CDR devnet.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">CDR Vault Demo</h1>
        <p className="mt-3 text-lg text-white/60">
          Threshold-encrypted data vaults on Story L1
        </p>
      </div>
      <div className="grid w-full gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-xl border border-white/10 bg-white/[0.02] p-6 transition-all hover:border-white/20 hover:bg-white/[0.04]"
          >
            <h2 className="text-lg font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
