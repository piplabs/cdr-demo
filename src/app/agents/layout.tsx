import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent Exchange",
  description:
    "Watch AI agents trade private data autonomously. Atomic on-chain swaps with threshold decryption — no human in the loop.",
  alternates: { canonical: "/agents" },
  openGraph: {
    title: "Agent Exchange · CDR",
    description:
      "Watch AI agents trade private data autonomously. Atomic on-chain swaps with threshold decryption.",
    url: "/agents",
  },
  twitter: {
    title: "Agent Exchange · CDR",
    description:
      "Watch AI agents trade private data autonomously with atomic on-chain swaps.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
