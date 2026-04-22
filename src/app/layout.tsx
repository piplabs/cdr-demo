import type { Metadata, Viewport } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import "./globals.css";
import { CDRPrivyProvider } from "@/providers/privy-provider";
import { WasmProvider } from "@/providers/wasm-provider";
import { DesktopShell } from "@/components/desktop/desktop-shell";

const diatype = localFont({
  src: "./fonts/ABCDiatypeSemiMono-Regular.woff2",
  variable: "--font-diatype",
  weight: "400",
  style: "normal",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://usecdr.dev";
const SITE_NAME = "CDR";
const DEFAULT_TITLE = "CDR — Privacy Infra for AI";
const DEFAULT_DESCRIPTION =
  "Threshold-encrypted data vaults on Story L1. Share secrets, trade data, and run confidential AI with on-chain guarantees — no single point of trust.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s · CDR",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  authors: [{ name: "PIP Labs", url: "https://piplabs.xyz" }],
  creator: "PIP Labs",
  publisher: "PIP Labs",
  category: "technology",
  keywords: [
    "CDR",
    "confidential data rails",
    "threshold encryption",
    "threshold decryption",
    "TDH2",
    "MPC",
    "privacy infrastructure",
    "confidential AI",
    "encrypted storage",
    "data marketplace",
    "zero-trust",
    "decentralized key network",
    "Story Protocol",
    "Story L1",
    "web3 privacy",
    "on-chain encryption",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@storyprotocol",
    creator: "@storyprotocol",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f17" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={diatype.variable}>
      <body className={diatype.className}>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var theme = localStorage.getItem("cdr-theme");
                  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
                } catch (e) {
                  document.documentElement.dataset.theme = "light";
                }
              })();
            `,
          }}
        />
        <CDRPrivyProvider>
          <WasmProvider>
            <DesktopShell>
              {children}
            </DesktopShell>
          </WasmProvider>
        </CDRPrivyProvider>
      </body>
    </html>
  );
}
