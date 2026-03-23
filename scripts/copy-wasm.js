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
