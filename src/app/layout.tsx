import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import { CDRPrivyProvider } from "@/providers/privy-provider";
import { WasmProvider } from "@/providers/wasm-provider";
import { DesktopShell } from "@/components/desktop/desktop-shell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CDR: Privacy Infra for AI",
  description: "Threshold-encrypted data vaults. Share secrets, trade data, run confidential AI — no single point of trust.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
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
