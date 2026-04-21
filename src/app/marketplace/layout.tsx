import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Marketplace",
  description:
    "Atomic exchange of private data with on-chain payment guarantees. Subscriptions, NFT-gated access, and Story Protocol IP licensing.",
  alternates: { canonical: "/marketplace" },
  openGraph: {
    title: "Data Marketplace · CDR",
    description:
      "Atomic exchange of private data with on-chain payment guarantees. Subscriptions, NFT-gated access, and Story Protocol IP licensing.",
    url: "/marketplace",
  },
  twitter: {
    title: "Data Marketplace · CDR",
    description:
      "Atomic exchange of private data with on-chain payment guarantees.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
