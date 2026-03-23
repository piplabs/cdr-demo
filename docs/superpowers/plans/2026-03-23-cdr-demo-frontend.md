# CDR Demo Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an aesthetic Next.js frontend demo showcasing CDR vault encryption/decryption with Privy wallet connection, plus a faucet page for gas tokens.

**Architecture:** Standalone Next.js 14 App Router project. Privy for wallet connection (embedded + external wallets). `@piplabs/cdr-sdk` linked from sibling monorepo via `file:` protocol. Tailwind CSS for styling. Dark theme, card-based layout with step-by-step progress indicators for multi-tx flows.

**Tech Stack:** Next.js 14, React 18, TypeScript, Privy (`@privy-io/react-auth`), viem, `@piplabs/cdr-sdk` (local), Tailwind CSS

---

## File Structure

```
cdr-demo/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── .env.local.example
├── public/
│   └── (wasm files copied here at build time)
├── src/
│   ├── app/
│   │   ├── layout.tsx          — Root layout, Privy + WASM providers, nav
│   │   ├── page.tsx            — Landing page
│   │   ├── globals.css         — Tailwind imports + custom styles
│   │   ├── encrypt/
│   │   │   └── page.tsx        — Encrypt page
│   │   ├── decrypt/
│   │   │   └── page.tsx        — Decrypt page
│   │   ├── faucet/
│   │   │   └── page.tsx        — Faucet page
│   │   └── api/
│   │       └── faucet/
│   │           └── route.ts    — Faucet API route
│   ├── config/
│   │   └── chain.ts            — Chain definition + contract addresses
│   ├── providers/
│   │   ├── privy-provider.tsx  — Privy wrapper with chain config
│   │   └── wasm-provider.tsx   — initWasm() context provider
│   ├── components/
│   │   ├── nav.tsx             — Navigation bar
│   │   ├── connect-button.tsx  — Privy login/logout button
│   │   ├── step-indicator.tsx  — Multi-step progress indicator
│   │   └── tx-link.tsx         — Transaction hash display with copy
│   └── hooks/
│       └── use-cdr-client.ts   — Hook to create CDRClient from Privy wallet
└── docs/
    └── superpowers/
        └── plans/
            └── 2026-03-23-cdr-demo-frontend.md
```

**Key design decisions:**
- WASM `.wasm` + `.js` files are copied to `public/` via a postinstall script so the Emscripten loader can fetch them by URL in the browser
- `use-cdr-client` hook bridges Privy's wallet provider → viem clients → CDRClient
- The encrypt/decrypt pages are client components with step-by-step state machines
- Faucet API route is server-side only, reads private key from env

---

## Task 1: Project Scaffolding & Dependencies

**Files:**
- Create: `cdr-demo/package.json`
- Create: `cdr-demo/tsconfig.json`
- Create: `cdr-demo/next.config.ts`
- Create: `cdr-demo/tailwind.config.ts`
- Create: `cdr-demo/postcss.config.mjs`
- Create: `cdr-demo/.env.local.example`
- Create: `cdr-demo/.gitignore`

- [ ] **Step 1: Initialize project with package.json**

```json
{
  "name": "cdr-demo",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "postinstall": "node scripts/copy-wasm.js"
  },
  "dependencies": {
    "next": "^14.2",
    "react": "^18.3",
    "react-dom": "^18.3",
    "@privy-io/react-auth": "^2",
    "viem": "^2.21",
    "@piplabs/cdr-sdk": "file:../cdr-sdk/packages/sdk",
    "@piplabs/cdr-crypto": "file:../cdr-sdk/packages/crypto",
    "@piplabs/cdr-contracts": "file:../cdr-sdk/packages/contracts"
  },
  "devDependencies": {
    "typescript": "^5.5",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@types/node": "^20",
    "tailwindcss": "^3.4",
    "postcss": "^8",
    "autoprefixer": "^10"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create next.config.ts with WASM support**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
    // Allow importing .wasm files
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
};

export default nextConfig;
```

- [ ] **Step 4: Create Tailwind + PostCSS config**

`tailwind.config.ts`:
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4ff",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

`postcss.config.mjs`:
```javascript
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
export default config;
```

- [ ] **Step 5: Create .env.local.example and .gitignore**

`.env.local.example`:
```
NEXT_PUBLIC_RPC_URL=http://52.243.51.231:8545
NEXT_PUBLIC_CHAIN_ID=90931
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
CDR_FAUCET_PRIVATE_KEY=0x...
```

`.gitignore`:
```
node_modules/
.next/
.env.local
public/*.wasm
public/cb-mpc-tdh2.js
```

- [ ] **Step 6: Create WASM copy script**

Create `cdr-demo/scripts/copy-wasm.js`:
```javascript
import { copyFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const wasmDir = resolve(__dirname, "../node_modules/@piplabs/cdr-crypto/dist/wasm");
const publicDir = resolve(__dirname, "../public");

mkdirSync(publicDir, { recursive: true });
copyFileSync(resolve(wasmDir, "cb-mpc-tdh2.wasm"), resolve(publicDir, "cb-mpc-tdh2.wasm"));
copyFileSync(resolve(wasmDir, "cb-mpc-tdh2.js"), resolve(publicDir, "cb-mpc-tdh2.js"));
console.log("WASM files copied to public/");
```

- [ ] **Step 7: Install dependencies**

Run: `cd /Users/jwpark/Work/PIPLabs/project-cdr/cdr-demo && npm install`

- [ ] **Step 8: Verify project builds**

Run: `cd /Users/jwpark/Work/PIPLabs/project-cdr/cdr-demo && npx next build`
Expected: Build succeeds (may warn about no pages yet)

- [ ] **Step 9: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold cdr-demo project with Next.js, Privy, Tailwind, WASM support"
```

---

## Task 2: Chain Config & Providers

**Files:**
- Create: `src/config/chain.ts`
- Create: `src/providers/privy-provider.tsx`
- Create: `src/providers/wasm-provider.tsx`

- [ ] **Step 1: Create chain config**

`src/config/chain.ts`:
```typescript
import { defineChain } from "viem";

export const cdrDevnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 90931),
  name: "CDR Devnet",
  nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL ?? "http://52.243.51.231:8545"],
    },
  },
});
```

- [ ] **Step 2: Create Privy provider**

`src/providers/privy-provider.tsx`:
```tsx
"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { cdrDevnet } from "@/config/chain";

export function CDRPrivyProvider({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? ""}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#6366f1",
        },
        defaultChain: cdrDevnet,
        supportedChains: [cdrDevnet],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
```

- [ ] **Step 3: Create WASM provider**

`src/providers/wasm-provider.tsx`:
```tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { initWasm } from "@piplabs/cdr-crypto";

const WasmContext = createContext<{ ready: boolean; error: string | null }>({
  ready: false,
  error: null,
});

export function WasmProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initWasm()
      .then(() => setReady(true))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <WasmContext.Provider value={{ ready, error }}>
      {children}
    </WasmContext.Provider>
  );
}

export function useWasm() {
  return useContext(WasmContext);
}
```

Note: The WASM provider may need adjustment if `initWasm()` has issues in the browser due to the Emscripten module's `import.meta.url` resolution. If so, we may need to override `locateFile` to point at `/cb-mpc-tdh2.wasm`. This will be addressed during integration testing.

- [ ] **Step 4: Commit**

```bash
git add src/config/ src/providers/
git commit -m "feat: add chain config, Privy provider, and WASM provider"
```

---

## Task 3: Shared Components

**Files:**
- Create: `src/components/nav.tsx`
- Create: `src/components/connect-button.tsx`
- Create: `src/components/step-indicator.tsx`
- Create: `src/components/tx-link.tsx`

- [ ] **Step 1: Create Nav component**

`src/components/nav.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "./connect-button";

const links = [
  { href: "/", label: "Home" },
  { href: "/encrypt", label: "Encrypt" },
  { href: "/decrypt", label: "Decrypt" },
  { href: "/faucet", label: "Faucet" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-white/10 bg-black/40 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <span className="text-lg font-bold text-white">CDR Demo</span>
          <div className="flex gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  pathname === link.href
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <ConnectButton />
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Create ConnectButton**

`src/components/connect-button.tsx`:
```tsx
"use client";

import { usePrivy } from "@privy-io/react-auth";

export function ConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  if (!ready) return <div className="h-9 w-24 animate-pulse rounded-lg bg-white/10" />;

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        Connect
      </button>
    );
  }

  const address = user?.wallet?.address;
  const short = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connected";

  return (
    <button
      onClick={logout}
      className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
    >
      {short}
    </button>
  );
}
```

- [ ] **Step 3: Create StepIndicator**

`src/components/step-indicator.tsx`:
```tsx
export type StepStatus = "pending" | "active" | "done" | "error";

interface Step {
  label: string;
  status: StepStatus;
}

export function StepIndicator({ steps }: { steps: Step[] }) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                step.status === "done"
                  ? "bg-green-500/20 text-green-400"
                  : step.status === "active"
                    ? "bg-brand-500/20 text-brand-500 animate-pulse"
                    : step.status === "error"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-white/5 text-white/30"
              }`}
            >
              {step.status === "done" ? "\u2713" : i + 1}
            </div>
            <span
              className={`text-sm ${
                step.status === "active"
                  ? "text-white"
                  : step.status === "done"
                    ? "text-white/60"
                    : "text-white/30"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="h-px w-8 bg-white/10" />
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create TxLink**

`src/components/tx-link.tsx`:
```tsx
"use client";

import { useState } from "react";

export function TxLink({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);
  const short = `${hash.slice(0, 10)}...${hash.slice(-8)}`;

  const copy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded bg-white/5 px-2 py-1 font-mono text-xs text-white/70 transition-colors hover:bg-white/10"
    >
      {short}
      <span className="text-white/40">{copied ? "copied" : "copy"}</span>
    </button>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/
git commit -m "feat: add shared UI components (nav, connect, steps, tx link)"
```

---

## Task 4: Root Layout & Landing Page

**Files:**
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

- [ ] **Step 1: Create globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-950 text-white antialiased;
}
```

- [ ] **Step 2: Create root layout**

`src/app/layout.tsx`:
```tsx
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
```

- [ ] **Step 3: Create landing page**

`src/app/page.tsx`:
```tsx
import Link from "next/link";

const cards = [
  {
    href: "/encrypt",
    title: "Encrypt",
    description: "Store a secret in a CDR vault. Your data is TDH2-encrypted to the DKG network's threshold public key.",
    icon: "\uD83D\uDD12",
  },
  {
    href: "/decrypt",
    title: "Decrypt",
    description: "Read a vault and recover the original secret. Validators provide partial decryptions that are combined client-side.",
    icon: "\uD83D\uDD13",
  },
  {
    href: "/faucet",
    title: "Faucet",
    description: "Get testnet IP tokens to pay for vault operations on the CDR devnet.",
    icon: "\uD83D\uDCA7",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">CDR Vault Demo</h1>
        <p className="mt-3 text-lg text-white/60">
          Threshold-encrypted data vaults on Story L1
        </p>
      </div>
      <div className="grid w-full gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-xl border border-white/10 bg-white/[0.02] p-6 transition-all hover:border-white/20 hover:bg-white/[0.04]"
          >
            <div className="text-2xl">{card.icon}</div>
            <h2 className="mt-3 text-lg font-semibold">{card.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-white/50">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify dev server starts**

Run: `cd /Users/jwpark/Work/PIPLabs/project-cdr/cdr-demo && npm run dev`
Expected: Server starts on localhost:3000, landing page renders

- [ ] **Step 5: Commit**

```bash
git add src/app/
git commit -m "feat: add root layout with providers and landing page"
```

---

## Task 5: CDR Client Hook

**Files:**
- Create: `src/hooks/use-cdr-client.ts`

- [ ] **Step 1: Create the hook**

`src/hooks/use-cdr-client.ts`:
```typescript
"use client";

import { useMemo } from "react";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { CDRClient } from "@piplabs/cdr-sdk";
import { cdrDevnet } from "@/config/chain";

export function useCDRClient() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();

  const wallet = wallets[0];

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: cdrDevnet,
        transport: http(cdrDevnet.rpcUrls.default.http[0]),
      }),
    [],
  );

  const client = useMemo(() => {
    if (!authenticated || !wallet) {
      return new CDRClient({ network: "testnet", publicClient });
    }

    // We'll create the full client with walletClient lazily in getWriteClient
    return new CDRClient({ network: "testnet", publicClient });
  }, [authenticated, wallet, publicClient]);

  const getWriteClient = async () => {
    if (!wallet) throw new Error("No wallet connected");
    const provider = await wallet.getEthereumProvider();
    const walletClient = createWalletClient({
      chain: cdrDevnet,
      transport: custom(provider),
      account: wallet.address as `0x${string}`,
    });
    return new CDRClient({ network: "testnet", publicClient, walletClient });
  };

  return {
    client,
    publicClient,
    getWriteClient,
    address: wallet?.address as `0x${string}` | undefined,
    connected: authenticated && !!wallet,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/
git commit -m "feat: add useCDRClient hook bridging Privy to CDRClient"
```

---

## Task 6: Encrypt Page

**Files:**
- Create: `src/app/encrypt/page.tsx`

- [ ] **Step 1: Create encrypt page**

`src/app/encrypt/page.tsx`:

This is a `"use client"` component with a state machine:
- **idle** — waiting for user input (textarea for secret string)
- **encrypting** — step 1: allocate vault, step 2: encrypt data, step 3: write to chain
- **done** — show vault UUID, tx hashes
- **error** — show error message with retry

Flow:
1. User enters plaintext string
2. Click "Encrypt & Store"
3. `TextEncoder.encode(input)` → `dataKey`
4. Fetch global pub key via `observer.getGlobalPubKey()`
5. Call `uploader.uploadCDR()` with:
   - `writeConditionAddr` = user's address
   - `readConditionAddr` = user's address
   - `writeConditionData` = "0x"
   - `readConditionData` = "0x"
   - `updatable` = false
   - `accessAuxData` = "0x"
6. Display result: vault UUID + both tx hashes

Key implementation detail: `getWriteClient()` is async because it needs to get the Ethereum provider from Privy. Call it at the start of the encrypt flow.

The page should show the StepIndicator with steps: "Fetch DKG Key" → "Allocate Vault" → "Encrypt" → "Write On-Chain"

Note: `uploadCDR()` bundles allocate+encrypt+write, but we want granular step display. Consider calling `allocate()`, `encryptDataKey()`, and `write()` separately to update steps individually.

- [ ] **Step 2: Verify encrypt page renders**

Run: Navigate to `localhost:3000/encrypt`
Expected: Page renders with input field and disabled button (wallet not connected)

- [ ] **Step 3: Commit**

```bash
git add src/app/encrypt/
git commit -m "feat: add encrypt page with multi-step vault creation flow"
```

---

## Task 7: Decrypt Page

**Files:**
- Create: `src/app/decrypt/page.tsx`

- [ ] **Step 1: Create decrypt page**

`src/app/decrypt/page.tsx`:

`"use client"` component with state machine:
- **idle** — input field for vault UUID (number)
- **decrypting** — steps: fetch vault → generate keypair → submit read tx → collect partials → decrypt
- **done** — display recovered plaintext string
- **error** — show error with retry

Flow:
1. User enters vault UUID
2. Click "Decrypt"
3. Generate ephemeral secp256k1 keypair:
   ```typescript
   import { secp256k1 } from "@noble/curves/secp256k1";
   const privKey = secp256k1.utils.randomPrivateKey();
   const pubKey = secp256k1.getPublicKey(privKey, false); // uncompressed 65 bytes
   ```
4. Fetch DKG params: `observer.getGlobalPubKey()`, `observer.getThreshold()`
5. Call `consumer.accessCDR()` with:
   - `requesterPubKey` = hex of uncompressed pubkey
   - `recipientPrivKey` = privKey bytes
   - `accessAuxData` = "0x"
6. `TextDecoder.decode(dataKey)` → display original string

Note: We need `@noble/curves` as a dependency. It's already a transitive dep of `@piplabs/cdr-crypto`, but we should add it explicitly since we use it directly.

StepIndicator steps: "Fetch DKG Params" → "Submit Read" → "Collect Partials" → "Decrypt"

For the "Collect Partials" step, the `accessCDR()` convenience method handles the polling internally. We can't get intermediate progress from it. That's acceptable — the step indicator just stays on "Collect Partials" with an animated pulse until it resolves.

- [ ] **Step 2: Verify decrypt page renders**

Run: Navigate to `localhost:3000/decrypt`
Expected: Page renders with UUID input field

- [ ] **Step 3: Commit**

```bash
git add src/app/decrypt/
git commit -m "feat: add decrypt page with partial collection and TDH2 combine"
```

---

## Task 8: Faucet Page & API Route

**Files:**
- Create: `src/app/faucet/page.tsx`
- Create: `src/app/api/faucet/route.ts`

- [ ] **Step 1: Create faucet API route**

`src/app/api/faucet/route.ts`:
```typescript
import { createWalletClient, createPublicClient, http, parseEther, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { cdrDevnet } from "@/config/chain";
import { NextResponse } from "next/server";

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const DRIP_AMOUNT = parseEther("1"); // 1 IP

export async function POST(request: Request) {
  const privKey = process.env.CDR_FAUCET_PRIVATE_KEY;
  if (!privKey) {
    return NextResponse.json({ error: "Faucet not configured" }, { status: 503 });
  }

  const body = await request.json();
  const { address } = body;

  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const normalized = address.toLowerCase();
  const lastRequest = cooldowns.get(normalized);
  if (lastRequest && Date.now() - lastRequest < COOLDOWN_MS) {
    const waitSecs = Math.ceil((COOLDOWN_MS - (Date.now() - lastRequest)) / 1000);
    return NextResponse.json(
      { error: `Rate limited. Try again in ${waitSecs}s` },
      { status: 429 },
    );
  }

  const account = privateKeyToAccount(privKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: cdrDevnet,
    transport: http(cdrDevnet.rpcUrls.default.http[0]),
  });

  const publicClient = createPublicClient({
    chain: cdrDevnet,
    transport: http(cdrDevnet.rpcUrls.default.http[0]),
  });

  try {
    const txHash = await walletClient.sendTransaction({
      to: address as `0x${string}`,
      value: DRIP_AMOUNT,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    cooldowns.set(normalized, Date.now());

    return NextResponse.json({ txHash, amount: "1" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create faucet page**

`src/app/faucet/page.tsx`:

`"use client"` component:
- Address input (auto-filled from connected wallet if available)
- "Request 1 IP" button
- POST to `/api/faucet`
- Show tx hash on success, error message on failure
- Show countdown timer if rate-limited

- [ ] **Step 3: Verify faucet page renders**

Run: Navigate to `localhost:3000/faucet`
Expected: Page renders with address input

- [ ] **Step 4: Commit**

```bash
git add src/app/faucet/ src/app/api/
git commit -m "feat: add faucet page and API route with rate limiting"
```

---

## Task 9: WASM Browser Integration

**Files:**
- Modify: `src/providers/wasm-provider.tsx` (if needed)
- Modify: `next.config.ts` (if needed)

- [ ] **Step 1: Test WASM loading in browser**

Run: `npm run dev`, open browser, check console for WASM init errors.

The Emscripten module uses `import.meta.url` to locate `cb-mpc-tdh2.wasm`. In a webpack-bundled environment, `import.meta.url` may not resolve to the original file location. If this fails:

Option A: Override `locateFile` in the Emscripten module init. This requires modifying how `initWasm()` is called — we may need to use the crypto package's lower-level API or patch the loader.

Option B: Configure Next.js webpack to copy .wasm files alongside the JS chunks and preserve import.meta.url resolution.

Option C: If `initWasm()` works out of the box (it uses dynamic import and the .wasm file is co-located), no changes needed.

- [ ] **Step 2: Fix any WASM loading issues**

Apply the fix based on what fails in step 1. Most likely fix: ensure `next.config.ts` has proper WASM handling and the copy-wasm script placed files correctly.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve WASM loading in browser environment"
```

---

## Task 10: End-to-End Testing & Polish

- [ ] **Step 1: Set up .env.local with real values**

```
NEXT_PUBLIC_RPC_URL=http://52.243.51.231:8545
NEXT_PUBLIC_CHAIN_ID=90931
NEXT_PUBLIC_PRIVY_APP_ID=<real-privy-app-id>
CDR_FAUCET_PRIVATE_KEY=<real-private-key>
```

- [ ] **Step 2: Test faucet flow**

1. Navigate to /faucet
2. Enter an address or connect wallet
3. Click "Request 1 IP"
4. Verify tx hash appears and balance increases

- [ ] **Step 3: Test encrypt flow**

1. Navigate to /encrypt
2. Connect wallet
3. Enter a test string (e.g., "hello cdr")
4. Click "Encrypt & Store"
5. Verify vault UUID and tx hashes appear
6. Note the vault UUID for decrypt test

- [ ] **Step 4: Test decrypt flow**

1. Navigate to /decrypt
2. Connect wallet (same or different)
3. Enter the vault UUID from step 3
4. Click "Decrypt"
5. Verify the original string "hello cdr" is recovered

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: finalize end-to-end tested CDR demo"
```
