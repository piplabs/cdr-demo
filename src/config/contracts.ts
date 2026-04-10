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
  // DataMarketplace — set after deployment via env var
  DATA_MARKETPLACE: (process.env.NEXT_PUBLIC_DATA_MARKETPLACE ?? "") as `0x${string}`,
  // DePIN Backend — set after deployment via env var
  DEPIN_BACKEND: (process.env.NEXT_PUBLIC_DEPIN_BACKEND ?? "") as `0x${string}`,
  // ConfidentialInference — set after deployment via env var
  CONFIDENTIAL_INFERENCE: (process.env.NEXT_PUBLIC_CONFIDENTIAL_INFERENCE ?? "") as `0x${string}`,
  // WhitelistCondition — set after deployment via env var
  WHITELIST_CONDITION: (process.env.NEXT_PUBLIC_WHITELIST_CONDITION ?? "") as `0x${string}`,
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

/** ConfidentialInference ABI */
export const inferenceAbi = [
  {
    type: "function", name: "registerModel",
    inputs: [{ name: "feePerQuery", type: "uint256" }, { name: "teeImageHash", type: "bytes32" }],
    outputs: [{ name: "modelId", type: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function", name: "submitQuery",
    inputs: [{ name: "modelId", type: "uint256" }],
    outputs: [{ name: "queryId", type: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function", name: "getModel",
    inputs: [{ name: "modelId", type: "uint256" }],
    outputs: [
      { name: "provider", type: "address" }, { name: "feePerQuery", type: "uint256" },
      { name: "weightsVaultUuid", type: "uint32" }, { name: "teeImageHash", type: "bytes32" },
      { name: "status", type: "uint8" }, { name: "totalQueries", type: "uint256" },
      { name: "totalEarnings", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function", name: "getQuery",
    inputs: [{ name: "queryId", type: "uint256" }],
    outputs: [
      { name: "user", type: "address" }, { name: "modelId", type: "uint256" },
      { name: "inputVaultUuid", type: "uint32" }, { name: "resultVaultUuid", type: "uint32" },
      { name: "status", type: "uint8" }, { name: "attestation", type: "bytes" },
    ],
    stateMutability: "view",
  },
  {
    type: "function", name: "getModelCount",
    inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view",
  },
  {
    type: "function", name: "getUserQueries",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }], stateMutability: "view",
  },
  {
    type: "function", name: "getProviderModels",
    inputs: [{ name: "provider", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }], stateMutability: "view",
  },
  {
    type: "event", name: "ModelRegistered",
    inputs: [
      { name: "modelId", type: "uint256", indexed: true },
      { name: "provider", type: "address", indexed: true },
      { name: "feePerQuery", type: "uint256", indexed: false },
      { name: "weightsVaultUuid", type: "uint32", indexed: false },
    ],
  },
  {
    type: "event", name: "QuerySubmitted",
    inputs: [
      { name: "queryId", type: "uint256", indexed: true },
      { name: "modelId", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "inputVaultUuid", type: "uint32", indexed: false },
    ],
  },
  {
    type: "event", name: "ResultSubmitted",
    inputs: [
      { name: "queryId", type: "uint256", indexed: true },
      { name: "resultVaultUuid", type: "uint32", indexed: false },
      { name: "attestation", type: "bytes", indexed: false },
    ],
  },
  {
    type: "event", name: "QueryCompleted",
    inputs: [
      { name: "queryId", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
    ],
  },
] as const;

/** DataMarketplace ABI */
export const marketplaceAbi = [
  {
    type: "function", name: "setup",
    inputs: [{ name: "accessFee", type: "uint256" }],
    outputs: [{ name: "listingId", type: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function", name: "upload",
    inputs: [{ name: "listingId", type: "uint256" }, { name: "ipfsHash", type: "string" }],
    outputs: [], stateMutability: "nonpayable",
  },
  {
    type: "function", name: "purchase",
    inputs: [{ name: "listingId", type: "uint256" }, { name: "requesterPubKey", type: "bytes" }],
    outputs: [], stateMutability: "payable",
  },
  {
    type: "function", name: "getListing",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [
      { name: "owner", type: "address" }, { name: "accessFee", type: "uint256" },
      { name: "cdrUuid", type: "uint32" }, { name: "ipfsHash", type: "string" },
      { name: "uploaded", type: "bool" }, { name: "totalSales", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function", name: "getListingCount",
    inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view",
  },
  {
    type: "function", name: "hasPurchased",
    inputs: [{ name: "listingId", type: "uint256" }, { name: "buyer", type: "address" }],
    outputs: [{ name: "", type: "bool" }], stateMutability: "view",
  },
  {
    type: "event", name: "ListingCreated",
    inputs: [
      { name: "listingId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "cdrUuid", type: "uint32", indexed: true },
      { name: "accessFee", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "DataUploaded",
    inputs: [
      { name: "listingId", type: "uint256", indexed: true },
      { name: "ipfsHash", type: "string", indexed: false },
    ],
  },
  {
    type: "event", name: "DataPurchased",
    inputs: [
      { name: "listingId", type: "uint256", indexed: true },
      { name: "buyer", type: "address", indexed: true },
      { name: "fee", type: "uint256", indexed: false },
    ],
  },
] as const;

export const depinAbi = [
  {
    type: "function", name: "createRequest",
    inputs: [{ name: "teeImageHash", type: "bytes32" }],
    outputs: [{ name: "requestId", type: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function", name: "respondToRequest",
    inputs: [{ name: "requestId", type: "uint256" }],
    outputs: [{ name: "responseId", type: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function", name: "setEvalIpfsHash",
    inputs: [{ name: "requestId", type: "uint256" }, { name: "ipfsHash", type: "string" }],
    outputs: [], stateMutability: "nonpayable",
  },
  {
    type: "function", name: "setDataIpfsHash",
    inputs: [{ name: "responseId", type: "uint256" }, { name: "ipfsHash", type: "string" }],
    outputs: [], stateMutability: "nonpayable",
  },
  {
    type: "function", name: "getRequest",
    inputs: [{ name: "requestId", type: "uint256" }],
    outputs: [
      { name: "requester", type: "address" }, { name: "bounty", type: "uint256" },
      { name: "evalVaultUuid", type: "uint32" }, { name: "evalIpfsHash", type: "string" },
      { name: "teeImageHash", type: "bytes32" }, { name: "status", type: "uint8" },
      { name: "responseCount", type: "uint256" }, { name: "acceptedCount", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function", name: "getResponse",
    inputs: [{ name: "responseId", type: "uint256" }],
    outputs: [
      { name: "provider", type: "address" }, { name: "requestId", type: "uint256" },
      { name: "dataVaultUuid", type: "uint32" }, { name: "dataIpfsHash", type: "string" },
      { name: "status", type: "uint8" }, { name: "evalAttestation", type: "bytes" },
    ],
    stateMutability: "view",
  },
  {
    type: "function", name: "getRequestCount",
    inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view",
  },
  {
    type: "function", name: "getRequestResponses",
    inputs: [{ name: "requestId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }], stateMutability: "view",
  },
  {
    type: "function", name: "getProviderResponses",
    inputs: [{ name: "provider", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }], stateMutability: "view",
  },
  {
    type: "event", name: "RequestCreated",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true },
      { name: "requester", type: "address", indexed: true },
      { name: "bounty", type: "uint256", indexed: false },
      { name: "evalVaultUuid", type: "uint32", indexed: false },
    ],
  },
  {
    type: "event", name: "ResponseSubmitted",
    inputs: [
      { name: "responseId", type: "uint256", indexed: true },
      { name: "requestId", type: "uint256", indexed: true },
      { name: "provider", type: "address", indexed: true },
      { name: "dataVaultUuid", type: "uint32", indexed: false },
    ],
  },
  {
    type: "event", name: "EvalCompleted",
    inputs: [
      { name: "responseId", type: "uint256", indexed: true },
      { name: "passed", type: "bool", indexed: false },
      { name: "attestation", type: "bytes", indexed: false },
    ],
  },
  {
    type: "event", name: "BountyReleased",
    inputs: [
      { name: "responseId", type: "uint256", indexed: true },
      { name: "provider", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

/** WhitelistCondition ABI (minimal — only the functions the frontend calls) */
export const whitelistConditionAbi = [
  {
    type: "function",
    name: "registerWithInitial",
    inputs: [
      { name: "uuid", type: "uint32" },
      { name: "initial", type: "address[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isWhitelisted",
    inputs: [
      { name: "uuid", type: "uint32" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "vaultCreator",
    inputs: [{ name: "uuid", type: "uint32" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "error",
    name: "AlreadyRegistered",
    inputs: [],
  },
  {
    type: "error",
    name: "NotCreator",
    inputs: [],
  },
] as const;
