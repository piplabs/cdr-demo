import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CDRPrivyProvider } from "@/providers/privy-provider";
import { WasmProvider } from "@/providers/wasm-provider";
import { Nav } from "@/components/nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CDR Demo",
  description: "Encrypt and decrypt data using CDR vaults on Story L1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <CDRPrivyProvider>
          <WasmProvider>
            <div className="flex min-h-screen flex-col">
              <Nav />
              <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12">
                {children}
              </main>
            </div>
          </WasmProvider>
        </CDRPrivyProvider>
      </body>
    </html>
  );
}
