import { parseEventLogs } from "viem";
import { cdrAbi, contractAddresses } from "@piplabs/cdr-contracts";
import type { PartialDecryptionEvent } from "@piplabs/cdr-sdk";

export async function collectPartialsWithProgress(params: {
  publicClient: any;
  uuid: number;
  minPartials: number;
  fromBlock: bigint;
  timeoutMs: number;
  pollIntervalMs: number;
  onProgress: (collected: number, needed: number) => void;
}): Promise<PartialDecryptionEvent[]> {
  const { publicClient, uuid, minPartials, fromBlock, timeoutMs, pollIntervalMs, onProgress } = params;
  const cdrAddress = contractAddresses.testnet.cdr;
  const deadline = Date.now() + timeoutMs;
  let lastScannedBlock = fromBlock;
  const collected = new Map<string, PartialDecryptionEvent>();
  onProgress(0, minPartials);

  while (Date.now() < deadline) {
    const currentBlock = await publicClient.getBlockNumber();
    if (currentBlock >= lastScannedBlock) {
      const rawLogs = await publicClient.getLogs({
        address: cdrAddress,
        fromBlock: lastScannedBlock,
        toBlock: currentBlock,
      });
      lastScannedBlock = currentBlock + BigInt(1);
      const parsed = parseEventLogs({
        abi: cdrAbi,
        logs: rawLogs,
        eventName: "EncryptedPartialDecryptionSubmitted",
      });
      for (const log of parsed) {
        if (log.args.uuid === uuid) {
          const key = `${log.args.validator}-${log.args.pid}`;
          if (!collected.has(key)) {
            collected.set(key, {
              validator: log.args.validator,
              round: log.args.round,
              pid: log.args.pid,
              encryptedPartial: log.args.encryptedPartial,
              ephemeralPubKey: log.args.ephemeralPubKey,
              pubShare: log.args.pubShare,
              requesterPubKey: log.args.requesterPubKey,
              uuid: log.args.uuid,
              signature: log.args.signature,
            } as PartialDecryptionEvent);
            onProgress(collected.size, minPartials);
          }
        }
      }
    }
    if (collected.size >= minPartials) return [...collected.values()].slice(0, minPartials);
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  throw new Error(`Timed out: ${collected.size}/${minPartials} partials in ${timeoutMs / 1000}s`);
}
