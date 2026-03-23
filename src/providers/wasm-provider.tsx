"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { initWasm, getWasm } from "@piplabs/cdr-crypto";

const WasmContext = createContext<{ ready: boolean; error: string | null }>({
  ready: false,
  error: null,
});

/**
 * Try the standard initWasm() first (works in Node and some bundler configs).
 * If it fails (common in webpack/Next.js because import.meta.url resolves to
 * the chunk URL, not the original .wasm location), fall back to loading the
 * Emscripten module from /public with an explicit locateFile override.
 */
async function initWasmWithFallback(): Promise<void> {
  // Already initialized (e.g. HMR re-mount)
  if (getWasm()) return;

  try {
    await initWasm();
    return;
  } catch {
    // Expected in browser when webpack mangles import.meta.url
  }

  // Fallback: dynamically load the Emscripten JS from public/ and pass
  // locateFile so it can find the .wasm file at a known URL.
  // @ts-expect-error — runtime dynamic import from public/, no TS module
  const mod = await import(/* webpackIgnore: true */ "/cb-mpc-tdh2.js");
  const createModule = mod.default;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Module: any = await createModule({
    locateFile: (path: string) => `/${path}`,
  });

  // Seed the PRNG (mirrors what initWasm does internally)
  if (typeof Module._wasm_seed_random === "function") {
    const seed = new Uint8Array(48);
    globalThis.crypto.getRandomValues(seed);
    const seedPtr = Module._malloc(seed.length);
    Module.HEAPU8.set(seed, seedPtr);
    Module._wasm_seed_random(seedPtr, seed.length);
    Module._free(seedPtr);
  }

  // Inject into the crypto package's singleton via the testing hook.
  // setWasmForTesting accepts a CbMpcWasm instance; we import the class
  // and construct one with our manually-loaded module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const loader = await import("@piplabs/cdr-crypto/dist/wasm/loader.js");
  loader.setWasmForTesting(new loader.CbMpcWasm(Module));
}

export function WasmProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initWasmWithFallback()
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
