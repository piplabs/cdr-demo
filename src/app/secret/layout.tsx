import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Secret Share",
  description:
    "Share secrets via zero-trust links. Threshold-encrypted payloads decryptable only by intended recipients — no single point of trust.",
  alternates: { canonical: "/secret" },
  openGraph: {
    title: "Secret Share · CDR",
    description:
      "Share secrets via zero-trust links. Threshold-encrypted payloads decryptable only by intended recipients.",
    url: "/secret",
  },
  twitter: {
    title: "Secret Share · CDR",
    description:
      "Share secrets via zero-trust links. Threshold-encrypted payloads decryptable only by intended recipients.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
