import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Testnet Faucet",
  description: "Developer tool — claim testnet IP on Story Aeneid.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
