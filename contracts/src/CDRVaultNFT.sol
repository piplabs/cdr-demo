// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Constants} from "./Constants.sol";
import {VaultWriteCondition} from "./VaultWriteCondition.sol";

/// @notice Minimal interfaces for external contracts (avoid importing full Story Protocol stack)

interface ICDR {
    function allocate(
        bool updatable,
        address writeConditionAddr,
        address readConditionAddr,
        bytes calldata writeConditionData,
        bytes calldata readConditionData
    ) external payable returns (uint32 newVaultUuid);

    function allocateFee() external view returns (uint256);
}

interface IIPAssetRegistry {
    function register(
        uint256 chainid,
        address tokenContract,
        uint256 tokenId
    ) external returns (address id);

    function ipId(
        uint256 chainId,
        address tokenContract,
        uint256 tokenId
    ) external view returns (address);
}

interface ILicensingModule {
    function attachLicenseTerms(
        address ipId,
        address licenseTemplate,
        uint256 licenseTermsId
    ) external;

    function mintLicenseTokens(
        address licensorIpId,
        address licenseTemplate,
        uint256 licenseTermsId,
        uint256 amount,
        address receiver,
        bytes calldata royaltyContext,
        uint256 maxMintingFee,
        uint32 maxRevenueShare
    ) external returns (uint256 startLicenseTokenId);
}

/// @dev PILTerms struct — must match PILicenseTemplate exactly
struct PILTerms {
    bool transferable;
    address royaltyPolicy;
    uint256 defaultMintingFee;
    uint256 expiration;
    bool commercialUse;
    bool commercialAttribution;
    address commercializerChecker;
    bytes commercializerCheckerData;
    uint32 commercialRevShare;
    uint256 commercialRevCeiling;
    bool derivativesAllowed;
    bool derivativesAttribution;
    bool derivativesApproval;
    bool derivativesReciprocal;
    uint256 derivativeRevCeiling;
    address currency;
    string uri;
}

interface IPILicenseTemplate {
    function registerLicenseTerms(PILTerms calldata terms) external returns (uint256 id);
    function getLicenseTermsId(PILTerms calldata terms) external view returns (uint256);
}

/// @title CDRVaultNFT
/// @notice Unified contract for creating CDR vaults registered as Story Protocol IP assets.
///
///   createVault() atomically:
///     1. Mints an ERC721 token (held by this contract → contract is IP owner)
///     2. Registers the NFT as IP via IPAssetRegistry
///     3. Allocates a CDR vault with license-gated read + creator-gated write
///     4. Attaches license terms to the IP
///     5. Stores all mappings for frontend querying
///
///   The contract holds all NFTs so it remains the IP owner and can call
///   LicensingModule on behalf of creators without complex permission setup.
contract CDRVaultNFT is ERC721Enumerable {
    // --- External contracts ---
    ICDR public immutable CDR_CONTRACT;
    IIPAssetRegistry public immutable IP_ASSET_REGISTRY;
    ILicensingModule public immutable LICENSING_MODULE;
    IPILicenseTemplate public immutable PIL_TEMPLATE;
    VaultWriteCondition public immutable WRITE_CONDITION;
    address public immutable LICENSE_READ_CONDITION;
    address public immutable LICENSE_TOKEN;

    // --- State ---
    uint256 public defaultLicenseTermsId;
    uint256 private _nextTokenId;

    // tokenId → vault data
    mapping(uint256 tokenId => uint32 vaultUuid) public tokenToVault;
    mapping(uint256 tokenId => address ipId) public tokenToIpId;
    mapping(uint256 tokenId => address creator) public tokenCreator;
    mapping(uint256 tokenId => uint256 licenseTermsId) public tokenLicenseTerms;

    // Reverse lookup
    mapping(uint32 vaultUuid => uint256 tokenId) public vaultToToken;

    // Creator → token list
    mapping(address creator => uint256[]) internal _creatorTokens;

    // --- Events ---
    event VaultCreated(
        uint256 indexed tokenId,
        uint32 indexed uuid,
        address indexed ipId,
        address creator,
        uint256 licenseTermsId
    );
    event LicenseTokensMinted(
        uint256 indexed tokenId,
        address indexed receiver,
        uint256 amount,
        uint256 startLicenseTokenId
    );

    // --- Errors ---
    error NotCreator();
    error InvalidLicenseTerms();

    constructor() ERC721("CDR Vault", "CDRV") {
        CDR_CONTRACT = ICDR(Constants.CDR);
        IP_ASSET_REGISTRY = IIPAssetRegistry(Constants.IP_ASSET_REGISTRY);
        LICENSING_MODULE = ILicensingModule(Constants.LICENSING_MODULE);
        PIL_TEMPLATE = IPILicenseTemplate(Constants.PIL_TEMPLATE);
        LICENSE_READ_CONDITION = Constants.LICENSE_READ_CONDITION;
        LICENSE_TOKEN = Constants.LICENSE_TOKEN;

        // Deploy write condition and link it to this contract
        WRITE_CONDITION = new VaultWriteCondition();
        WRITE_CONDITION.initialize(address(this));

        // Register default non-commercial transferable PIL terms
        PILTerms memory defaultTerms;
        defaultTerms.transferable = true;
        // All other fields default to false/0/address(0)/""
        defaultLicenseTermsId = PIL_TEMPLATE.registerLicenseTerms(defaultTerms);
    }

    /// @notice Create a vault, register as IP, and attach license terms — all in one tx.
    /// @param licenseTermsId The PIL license terms ID to attach. Pass 0 to use the default.
    /// @return tokenId The minted NFT token ID
    /// @return uuid The CDR vault UUID
    /// @return ipId The Story Protocol IP asset address
    function createVault(
        uint256 licenseTermsId
    ) external payable returns (uint256 tokenId, uint32 uuid, address ipId) {
        uint256 termsId = licenseTermsId > 0 ? licenseTermsId : defaultLicenseTermsId;

        // 1. Mint NFT to this contract (so we remain IP owner for auth)
        tokenId = ++_nextTokenId;
        _mint(address(this), tokenId);

        // 2. Register as IP asset
        ipId = IP_ASSET_REGISTRY.register(block.chainid, address(this), tokenId);

        // 3. Allocate CDR vault with conditions
        bytes memory readCondData = abi.encode(LICENSE_TOKEN, ipId);
        uuid = CDR_CONTRACT.allocate{value: msg.value}(
            false,                    // not updatable
            address(WRITE_CONDITION), // creator-gated writes
            LICENSE_READ_CONDITION,   // license-gated reads
            bytes(""),                // no extra write condition data
            readCondData
        );

        // 4. Register creator in write condition
        WRITE_CONDITION.setCreator(uuid, msg.sender);

        // 5. Attach license terms
        LICENSING_MODULE.attachLicenseTerms(ipId, address(PIL_TEMPLATE), termsId);

        // 6. Store mappings
        tokenToVault[tokenId] = uuid;
        tokenToIpId[tokenId] = ipId;
        tokenCreator[tokenId] = msg.sender;
        tokenLicenseTerms[tokenId] = termsId;
        vaultToToken[uuid] = tokenId;
        _creatorTokens[msg.sender].push(tokenId);

        emit VaultCreated(tokenId, uuid, ipId, msg.sender, termsId);
    }

    /// @notice Mint license tokens for a vault's IP. Only the vault creator can call.
    /// @param tokenId The NFT token ID (identifies the vault + IP)
    /// @param amount Number of license tokens to mint
    /// @param receiver Address to receive the license tokens
    /// @return startLicenseTokenId The first minted license token ID
    function mintLicenseTokens(
        uint256 tokenId,
        uint256 amount,
        address receiver
    ) external returns (uint256 startLicenseTokenId) {
        if (tokenCreator[tokenId] != msg.sender) revert NotCreator();

        address ipId = tokenToIpId[tokenId];
        uint256 termsId = tokenLicenseTerms[tokenId];

        startLicenseTokenId = LICENSING_MODULE.mintLicenseTokens(
            ipId,
            address(PIL_TEMPLATE),
            termsId,
            amount,
            receiver,
            bytes(""), // no royalty context
            0,         // maxMintingFee (0 = no limit for non-commercial)
            0          // maxRevenueShare
        );

        emit LicenseTokensMinted(tokenId, receiver, amount, startLicenseTokenId);
    }

    /// @notice Get all token IDs created by an address.
    function getCreatorVaults(address creator) external view returns (uint256[] memory) {
        return _creatorTokens[creator];
    }

    /// @notice Get full vault info for a token.
    function getVaultInfo(uint256 tokenId) external view returns (
        uint32 uuid,
        address ipId,
        address creator,
        uint256 licenseTermsId
    ) {
        return (
            tokenToVault[tokenId],
            tokenToIpId[tokenId],
            tokenCreator[tokenId],
            tokenLicenseTerms[tokenId]
        );
    }

    /// @notice Get the CDR allocate fee (for frontend to know msg.value).
    function getAllocateFee() external view returns (uint256) {
        return CDR_CONTRACT.allocateFee();
    }

    /// @dev Required for ERC721Enumerable
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
