import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confidential AI",
  description:
    "Run AI models on private, encrypted data. Inputs and outputs stay encrypted end-to-end — inference happens inside TEEs with on-chain attestation.",
  alternates: { canonical: "/ai" },
  openGraph: {
    title: "Confidential AI · CDR",
    description:
      "Run AI models on private, encrypted data. Inputs and outputs stay encrypted end-to-end.",
    url: "/ai",
  },
  twitter: {
    title: "Confidential AI · CDR",
    description:
      "Run AI models on private, encrypted data. Inputs and outputs stay encrypted end-to-end.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
