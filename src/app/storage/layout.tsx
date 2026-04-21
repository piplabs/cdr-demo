import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Private Storage",
  description:
    "On-chain encrypted data vaults with programmable access control — multi-sig reads, time-windowed access, dead-man switches, and data escrows.",
  alternates: { canonical: "/storage" },
  openGraph: {
    title: "Private Storage · CDR",
    description:
      "On-chain encrypted data vaults with programmable access control — multi-sig reads, time-windowed access, dead-man switches, and data escrows.",
    url: "/storage",
  },
  twitter: {
    title: "Private Storage · CDR",
    description:
      "On-chain encrypted data vaults with programmable access control.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
