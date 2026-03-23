import { copyFileSync, existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Try symlinked path first (link: protocol), fall back to node_modules
const symlinkedDir = resolve(__dirname, "../cdr-sdk/packages/crypto/dist/wasm");
const nmDir = resolve(__dirname, "../node_modules/@piplabs/cdr-crypto/dist/wasm");
const wasmDir = existsSync(resolve(symlinkedDir, "cb-mpc-tdh2.wasm")) ? symlinkedDir : nmDir;
const publicDir = resolve(__dirname, "../public");

if (!existsSync(resolve(wasmDir, "cb-mpc-tdh2.wasm"))) {
  console.log("WASM files not yet built, skipping copy (will run during build)");
  process.exit(0);
}

mkdirSync(publicDir, { recursive: true });
copyFileSync(resolve(wasmDir, "cb-mpc-tdh2.wasm"), resolve(publicDir, "cb-mpc-tdh2.wasm"));
copyFileSync(resolve(wasmDir, "cb-mpc-tdh2.js"), resolve(publicDir, "cb-mpc-tdh2.js"));
console.log("WASM files copied to public/");
