import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vault Inspector",
  description: "Developer tool — inspect CDR vault state on-chain.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
