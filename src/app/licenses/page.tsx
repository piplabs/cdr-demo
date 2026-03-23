"use client";

import { useState, useEffect, useCallback } from "react";
import { CONTRACTS, cdrVaultNFTAbi, licenseTokenAbi } from "@/config/contracts";
import { useCDRClient } from "@/hooks/use-cdr-client";
import { createWalletClient, custom } from "viem";
import { useWallets } from "@privy-io/react-auth";
import { cdrDevnet } from "@/config/chain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VaultInfo {
  tokenId: bigint;
  uuid: number;
  ipId: string;
  creator: string;
  licenseTermsId: bigint;
  totalLicensesMinted: bigint;
}

interface LicenseTokenInfo {
  tokenId: bigint;
  licensorIpId: string;
  licenseTemplate: string;
  licenseTermsId: bigint;
  transferable: boolean;
  commercialRevShare: number;
  revoked: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncateAddress(addr: string) {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LicensesPage() {
  const { publicClient, address, connected } = useCDRClient();
  const { wallets } = useWallets();

  // -- Vault state --
  const [vaults, setVaults] = useState<VaultInfo[]>([]);
  const [vaultsLoading, setVaultsLoading] = useState(false);
  const [vaultsError, setVaultsError] = useState<string | null>(null);

  // -- License tokens state --
  const [licenseTokens, setLicenseTokens] = useState<LicenseTokenInfo[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [tokensError, setTokensError] = useState<string | null>(null);

  // -- Mint form state (keyed by tokenId) --
  const [mintOpen, setMintOpen] = useState<string | null>(null);
  const [mintAmount, setMintAmount] = useState("1");
  const [mintReceiver, setMintReceiver] = useState("");
  const [minting, setMinting] = useState(false);
  const [mintResult, setMintResult] = useState<string | null>(null);

  // -- Transfer form state (keyed by tokenId) --
  const [transferOpen, setTransferOpen] = useState<string | null>(null);
  const [transferRecipient, setTransferRecipient] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Wallet helper
  // ---------------------------------------------------------------------------

  async function getWalletClient() {
    const wallet = wallets[0];
    if (!wallet) throw new Error("No wallet connected");
    const provider = await wallet.getEthereumProvider();
    return createWalletClient({
      chain: cdrDevnet,
      transport: custom(provider),
      account: wallet.address as `0x${string}`,
    });
  }

  // ---------------------------------------------------------------------------
  // Fetch vaults
  // ---------------------------------------------------------------------------

  const fetchVaults = useCallback(async () => {
    if (!connected || !address || !CONTRACTS.CDR_VAULT_NFT) return;
    setVaultsLoading(true);
    setVaultsError(null);
    try {
      const tokenIds = (await publicClient.readContract({
        address: CONTRACTS.CDR_VAULT_NFT,
        abi: cdrVaultNFTAbi,
        functionName: "getCreatorVaults",
        args: [address],
      })) as bigint[];

      const infos: VaultInfo[] = await Promise.all(
        tokenIds.map(async (tokenId) => {
          const [uuid, ipId, creator, licenseTermsId] = (await publicClient.readContract({
            address: CONTRACTS.CDR_VAULT_NFT,
            abi: cdrVaultNFTAbi,
            functionName: "getVaultInfo",
            args: [tokenId],
          })) as [number, string, string, bigint];

          const totalLicensesMinted = (await publicClient.readContract({
            address: CONTRACTS.LICENSE_TOKEN,
            abi: licenseTokenAbi,
            functionName: "getTotalTokensByLicensor",
            args: [ipId as `0x${string}`],
          })) as bigint;

          return { tokenId, uuid, ipId, creator, licenseTermsId, totalLicensesMinted };
        }),
      );

      setVaults(infos);
    } catch (err: unknown) {
      setVaultsError(err instanceof Error ? err.message : String(err));
    } finally {
      setVaultsLoading(false);
    }
  }, [connected, address, publicClient]);

  // ---------------------------------------------------------------------------
  // Fetch license tokens
  // ---------------------------------------------------------------------------

  const fetchLicenseTokens = useCallback(async () => {
    if (!connected || !address) return;
    setTokensLoading(true);
    setTokensError(null);
    try {
      const balance = (await publicClient.readContract({
        address: CONTRACTS.LICENSE_TOKEN,
        abi: licenseTokenAbi,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;

      const count = Number(balance);
      const tokens: LicenseTokenInfo[] = await Promise.all(
        Array.from({ length: count }, (_, i) => i).map(async (index) => {
          const tokenId = (await publicClient.readContract({
            address: CONTRACTS.LICENSE_TOKEN,
            abi: licenseTokenAbi,
            functionName: "tokenOfOwnerByIndex",
            args: [address, BigInt(index)],
          })) as bigint;

          const metadata = (await publicClient.readContract({
            address: CONTRACTS.LICENSE_TOKEN,
            abi: licenseTokenAbi,
            functionName: "getLicenseTokenMetadata",
            args: [tokenId],
          })) as {
            licensorIpId: string;
            licenseTemplate: string;
            licenseTermsId: bigint;
            transferable: boolean;
            commercialRevShare: number;
          };

          const revoked = (await publicClient.readContract({
            address: CONTRACTS.LICENSE_TOKEN,
            abi: licenseTokenAbi,
            functionName: "isLicenseTokenRevoked",
            args: [tokenId],
          })) as boolean;

          return {
            tokenId,
            licensorIpId: metadata.licensorIpId,
            licenseTemplate: metadata.licenseTemplate,
            licenseTermsId: metadata.licenseTermsId,
            transferable: metadata.transferable,
            commercialRevShare: metadata.commercialRevShare,
            revoked,
          };
        }),
      );

      setLicenseTokens(tokens);
    } catch (err: unknown) {
      setTokensError(err instanceof Error ? err.message : String(err));
    } finally {
      setTokensLoading(false);
    }
  }, [connected, address, publicClient]);

  // ---------------------------------------------------------------------------
  // Load on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetchVaults();
    fetchLicenseTokens();
  }, [fetchVaults, fetchLicenseTokens]);

  // ---------------------------------------------------------------------------
  // Mint license tokens
  // ---------------------------------------------------------------------------

  async function handleMint(tokenId: bigint) {
    setMinting(true);
    setMintResult(null);
    try {
      const wc = await getWalletClient();
      const receiver = (mintReceiver.trim() || address) as `0x${string}`;
      const hash = await wc.writeContract({
        address: CONTRACTS.CDR_VAULT_NFT,
        abi: cdrVaultNFTAbi,
        functionName: "mintLicenseTokens",
        args: [tokenId, BigInt(mintAmount), receiver],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      // Try to extract startLicenseTokenId from logs
      const mintEvent = receipt.logs.find(
        (l) => l.topics[0] === "0x" // we'll just show tx hash
      );
      void mintEvent;
      setMintResult(`Success! Tx: ${truncateAddress(hash)}`);
      setMintOpen(null);
      fetchVaults();
      fetchLicenseTokens();
    } catch (err: unknown) {
      setMintResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setMinting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Transfer license token
  // ---------------------------------------------------------------------------

  async function handleTransfer(tokenId: bigint) {
    setTransferring(true);
    setTransferResult(null);
    try {
      const wc = await getWalletClient();
      const hash = await wc.writeContract({
        address: CONTRACTS.LICENSE_TOKEN,
        abi: licenseTokenAbi,
        functionName: "transferFrom",
        args: [address as `0x${string}`, transferRecipient.trim() as `0x${string}`, tokenId],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setTransferResult(`Success! Tx: ${truncateAddress(hash)}`);
      setTransferOpen(null);
      fetchVaults();
      fetchLicenseTokens();
    } catch (err: unknown) {
      setTransferResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setTransferring(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!CONTRACTS.CDR_VAULT_NFT) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="text-white/50">CDRVaultNFT contract not configured</p>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="text-white/50">Connect your wallet to view licenses</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-8 py-8">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight">Licenses</h1>
        <p className="mt-2 text-sm text-white/50">
          Manage your IP vaults and license tokens.
        </p>
      </div>

      {/* ================================================================= */}
      {/* Section 1: My Created Vaults                                      */}
      {/* ================================================================= */}
      <div className="w-full max-w-2xl">
        <h2 className="text-lg font-semibold">My Created Vaults</h2>

        {vaultsLoading && (
          <p className="mt-4 text-sm text-white/40">Loading vaults...</p>
        )}

        {vaultsError && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {vaultsError}
          </div>
        )}

        {!vaultsLoading && !vaultsError && vaults.length === 0 && (
          <p className="mt-4 text-sm text-white/40">No vaults found.</p>
        )}

        <div className="mt-4 flex flex-col gap-4">
          {vaults.map((v) => {
            const key = v.tokenId.toString();
            const isMintOpen = mintOpen === key;

            return (
              <div
                key={key}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-5"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-sm font-medium">
                        Vault UUID: <span className="font-mono text-white/70">{v.uuid}</span>
                      </p>
                      <p className="text-xs text-white/40">
                        IP ID: <span className="font-mono">{truncateAddress(v.ipId)}</span>
                      </p>
                      <p className="text-xs text-white/40">
                        License Terms ID: <span className="font-mono">{v.licenseTermsId.toString()}</span>
                      </p>
                      <p className="text-xs text-white/40">
                        Total Licenses Minted: <span className="font-mono">{v.totalLicensesMinted.toString()}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setMintOpen(isMintOpen ? null : key);
                        setMintAmount("1");
                        setMintReceiver("");
                        setMintResult(null);
                      }}
                      className="shrink-0 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
                    >
                      {isMintOpen ? "Cancel" : "Mint License"}
                    </button>
                  </div>

                  {isMintOpen && (
                    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex gap-3">
                        <input
                          type="number"
                          min="1"
                          placeholder="Amount"
                          value={mintAmount}
                          onChange={(e) => setMintAmount(e.target.value)}
                          className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/20 focus:bg-white/[0.07]"
                        />
                        <input
                          type="text"
                          placeholder="Receiver address (default: you)"
                          value={mintReceiver}
                          onChange={(e) => setMintReceiver(e.target.value)}
                          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/20 focus:bg-white/[0.07]"
                        />
                      </div>
                      <button
                        onClick={() => handleMint(v.tokenId)}
                        disabled={minting || !mintAmount || Number(mintAmount) < 1}
                        className="self-start rounded-lg bg-white/10 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {minting ? "Minting..." : "Mint"}
                      </button>
                    </div>
                  )}
                </div>

                {mintResult && mintOpen === key && (
                  <div className={`mt-3 rounded-lg border px-4 py-3 text-sm ${
                    mintResult.startsWith("Success")
                      ? "border-green-500/20 bg-green-500/5 text-green-400"
                      : "border-red-500/20 bg-red-500/5 text-red-400"
                  }`}>
                    {mintResult}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ================================================================= */}
      {/* Section 2: My License Tokens                                      */}
      {/* ================================================================= */}
      <div className="w-full max-w-2xl">
        <h2 className="text-lg font-semibold">My License Tokens</h2>

        {tokensLoading && (
          <p className="mt-4 text-sm text-white/40">Loading license tokens...</p>
        )}

        {tokensError && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {tokensError}
          </div>
        )}

        {!tokensLoading && !tokensError && licenseTokens.length === 0 && (
          <p className="mt-4 text-sm text-white/40">No license tokens found.</p>
        )}

        <div className="mt-4 flex flex-col gap-4">
          {licenseTokens.map((lt) => {
            const key = lt.tokenId.toString();
            const isTransferOpen = transferOpen === key;
            const canTransfer = lt.transferable && !lt.revoked;

            return (
              <div
                key={key}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-5"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-sm font-medium">
                        Token ID: <span className="font-mono text-white/70">{lt.tokenId.toString()}</span>
                      </p>
                      <p className="text-xs text-white/40">
                        Licensor IP: <span className="font-mono">{truncateAddress(lt.licensorIpId)}</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            lt.transferable
                              ? "bg-green-500/10 text-green-400"
                              : "bg-white/5 text-white/40"
                          }`}
                        >
                          {lt.transferable ? "Transferable" : "Non-transferable"}
                        </span>
                        {lt.revoked && (
                          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                            Revoked
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setTransferOpen(isTransferOpen ? null : key);
                        setTransferRecipient("");
                        setTransferResult(null);
                      }}
                      disabled={!canTransfer}
                      className="shrink-0 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isTransferOpen ? "Cancel" : "Transfer"}
                    </button>
                  </div>

                  {isTransferOpen && (
                    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                      <input
                        type="text"
                        placeholder="Recipient address"
                        value={transferRecipient}
                        onChange={(e) => setTransferRecipient(e.target.value)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/20 focus:bg-white/[0.07]"
                      />
                      <button
                        onClick={() => handleTransfer(lt.tokenId)}
                        disabled={transferring || !transferRecipient.trim()}
                        className="self-start rounded-lg bg-white/10 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {transferring ? "Transferring..." : "Transfer"}
                      </button>
                    </div>
                  )}
                </div>

                {transferResult && transferOpen === key && (
                  <div className={`mt-3 rounded-lg border px-4 py-3 text-sm ${
                    transferResult.startsWith("Success")
                      ? "border-green-500/20 bg-green-500/5 text-green-400"
                      : "border-red-500/20 bg-red-500/5 text-red-400"
                  }`}>
                    {transferResult}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
