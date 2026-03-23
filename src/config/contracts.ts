// ============================================================
// Deployed contract addresses on CDR Devnet (chain ID 90931)
// ============================================================

export const CONTRACTS = {
  CDR: "0xCCCcCC0000000000000000000000000000000005" as const,
  LICENSE_READ_CONDITION: "0xD42912755319665397FF090fBB63B1a31aE87Cee" as const,
  LICENSE_TOKEN: "0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC" as const,
  PIL_TEMPLATE: "0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316" as const,
  IP_ASSET_REGISTRY: "0x77319B4031e6eF1250907aa00018B8B1c67a244b" as const,
  LICENSING_MODULE: "0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f" as const,
  // CDRVaultNFT — set after deployment via env var
  CDR_VAULT_NFT: (process.env.NEXT_PUBLIC_CDR_VAULT_NFT ?? "") as `0x${string}`,
} as const;

// ============================================================
// ABIs
// ============================================================

export const cdrVaultNFTAbi = [
  {
    type: "function",
    name: "createVault",
    inputs: [{ name: "licenseTermsId", type: "uint256" }],
    outputs: [
      { name: "tokenId", type: "uint256" },
      { name: "uuid", type: "uint32" },
      { name: "ipId", type: "address" },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "mintLicenseTokens",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ name: "startLicenseTokenId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getCreatorVaults",
    inputs: [{ name: "creator", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getVaultInfo",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "uuid", type: "uint32" },
      { name: "ipId", type: "address" },
      { name: "creator", type: "address" },
      { name: "licenseTermsId", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAllocateFee",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "defaultLicenseTermsId",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "vaultToToken",
    inputs: [{ name: "vaultUuid", type: "uint32" }],
    outputs: [{ name: "tokenId", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "VaultCreated",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "uuid", type: "uint32", indexed: true },
      { name: "ipId", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: false },
      { name: "licenseTermsId", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LicenseTokensMinted",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "receiver", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "startLicenseTokenId", type: "uint256", indexed: false },
    ],
  },
] as const;

/** Minimal LicenseToken ABI (ERC721Enumerable + metadata queries) */
export const licenseTokenAbi = [
  // ERC721
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ownerOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "transferFrom",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // ERC721Enumerable
  {
    type: "function",
    name: "tokenOfOwnerByIndex",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  // LicenseToken-specific
  {
    type: "function",
    name: "getLicenseTokenMetadata",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "licensorIpId", type: "address" },
          { name: "licenseTemplate", type: "address" },
          { name: "licenseTermsId", type: "uint256" },
          { name: "transferable", type: "bool" },
          { name: "commercialRevShare", type: "uint32" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getLicensorIpId",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isLicenseTokenRevoked",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTotalTokensByLicensor",
    inputs: [{ name: "licensorIpId", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;
