import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "License Management",
  description: "Developer tool — manage Story Protocol IP licenses.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
