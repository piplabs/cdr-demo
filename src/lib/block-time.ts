// Block time assumption for Story Aeneid testnet. Used only for UI display
// conversion between human-friendly durations and block counts. The contract
// enforces block.number; this is a best-effort display aid.
export const SECONDS_PER_BLOCK = 2;

export function secondsToBlocks(seconds: number): number {
  return Math.max(1, Math.ceil(seconds / SECONDS_PER_BLOCK));
}

export function blocksToSeconds(blocks: bigint | number): number {
  const n = typeof blocks === "bigint" ? Number(blocks) : blocks;
  return n * SECONDS_PER_BLOCK;
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s && !d && !h) parts.push(`${s}s`);
  return parts.join(" ") || "0s";
}

export function formatBlocksAsDuration(blocks: bigint | number): string {
  return formatDuration(blocksToSeconds(blocks));
}
