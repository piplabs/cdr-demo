import * as Client from "@storacha/client";
import { StoreMemory } from "@storacha/client/stores";
import * as Ed25519 from "@storacha/client/principal/ed25519";
import * as Proof from "@storacha/client/proof";

import type { Client as StorachaClient } from "@storacha/client";

let clientPromise: Promise<StorachaClient> | null = null;

/**
 * Returns a configured Storacha client singleton.
 * Creates the client on first call and caches it for subsequent calls.
 */
export function getStorachaClient(): Promise<StorachaClient> {
  if (clientPromise) return clientPromise;

  clientPromise = createClient().catch((err) => {
    // Reset so next call retries
    clientPromise = null;
    throw err;
  });

  return clientPromise;
}

async function createClient(): Promise<StorachaClient> {
  const key = process.env.STORACHA_KEY;
  if (!key) {
    throw new Error(
      "STORACHA_KEY environment variable is not set. " +
        "Set it to a base64-encoded ed25519 private key."
    );
  }

  const spaceDid = process.env.STORACHA_SPACE_DID;
  if (!spaceDid) {
    throw new Error(
      "STORACHA_SPACE_DID environment variable is not set. " +
        "Set it to the DID of the Storacha space to use (e.g. did:key:z6Mk...)."
    );
  }

  const proof = process.env.STORACHA_PROOF;
  if (!proof) {
    throw new Error(
      "STORACHA_PROOF environment variable is not set. " +
        "Set it to the base64 delegation proof from: storacha delegation create --base64"
    );
  }

  const principal = Ed25519.parse(key);
  const store = new StoreMemory();
  const client = await Client.create({ principal, store });

  // Add the UCAN delegation proof so the agent can write to the space
  const delegation = await Proof.parse(proof);
  const space = await client.addSpace(delegation);
  await client.setCurrentSpace(space.did());

  return client;
}
