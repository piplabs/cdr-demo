import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bounty Board",
  description:
    "Post data bounties with trustless evaluation. TEE-attested submissions, on-chain payouts — hunters submit encrypted work and get paid when it passes.",
  alternates: { canonical: "/bounties" },
  openGraph: {
    title: "Bounty Board · CDR",
    description:
      "Post data bounties with trustless evaluation. TEE-attested submissions, on-chain payouts.",
    url: "/bounties",
  },
  twitter: {
    title: "Bounty Board · CDR",
    description:
      "Post data bounties with trustless evaluation and on-chain payouts.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
