// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Constants} from "./Constants.sol";

interface ICDR {
    function allocate(
        bool updatable,
        address writeConditionAddr,
        address readConditionAddr,
        bytes calldata writeConditionData,
        bytes calldata readConditionData
    ) external payable returns (uint32 newVaultUuid);

    function read(
        uint32 uuid,
        bytes memory accessAuxData,
        bytes calldata requesterPubKey
    ) external payable;

    function allocateFee() external view returns (uint256);
    function readFee() external view returns (uint256);
}

/// @title DataMarketplace
/// @notice Decentralized data marketplace using CDR for encrypted data access control.
///
/// Flow:
///   1. Provider calls setup(accessFee) → allocates CDR vault with this contract as readConditionAddr
///   2. Provider encrypts data, uploads to IPFS, writes encrypted key to CDR, calls upload()
///   3. Consumer calls purchase(listingId, requesterPubKey) with accessFee + CDR readFee
///   4. This contract calls CDR.read() — since we ARE the readConditionAddr, CDR skips the check
///   5. Consumer collects partials off-chain, decrypts data client-side
///
/// The marketplace also implements checkReadCondition as a safety fallback — if someone
/// calls CDR.read() directly (not through purchase), this verifies they have purchased.
contract DataMarketplace {
    // --- Types ---
    struct Listing {
        address owner;
        uint256 accessFee;
        uint32 cdrUuid;
        string ipfsHash;
        bool uploaded;
        uint256 totalSales;
    }

    // --- State ---
    ICDR public immutable CDR_CONTRACT;
    address public immutable WRITE_CONDITION;

    uint256 public nextListingId;
    mapping(uint256 listingId => Listing) public listings;
    mapping(uint256 listingId => mapping(address buyer => bool)) public hasPurchased;

    // Reverse lookup: CDR uuid → listingId
    mapping(uint32 cdrUuid => uint256 listingId) public uuidToListing;

    // Provider's listings
    mapping(address provider => uint256[]) internal _providerListings;

    // --- Events ---
    event ListingCreated(uint256 indexed listingId, address indexed owner, uint32 indexed cdrUuid, uint256 accessFee);
    event DataUploaded(uint256 indexed listingId, string ipfsHash);
    event DataPurchased(uint256 indexed listingId, address indexed buyer, uint256 fee);

    // --- Errors ---
    error NotListingOwner();
    error AlreadyUploaded();
    error NotUploaded();
    error AlreadyPurchased();
    error InsufficientFee();
    error ListingNotFound();
    error TransferFailed();

    constructor(address writeCondition) {
        CDR_CONTRACT = ICDR(Constants.CDR);
        WRITE_CONDITION = writeCondition;
    }

    /// @notice Create a new data listing. Allocates a CDR vault with this contract as readConditionAddr.
    /// @param accessFee The price in wei to access the data
    /// @return listingId The marketplace listing ID
    function setup(uint256 accessFee) external payable returns (uint256 listingId) {
        listingId = nextListingId++;

        // readConditionData encodes the listingId for the fallback checkReadCondition
        bytes memory readCondData = abi.encode(listingId);
        // writeConditionData encodes the listingId so the write condition can look up the owner
        bytes memory writeCondData = abi.encode(listingId);

        uint32 cdrUuid = CDR_CONTRACT.allocate{value: msg.value}(
            false,                  // not updatable
            WRITE_CONDITION,        // listing-owner-gated writes
            address(this),          // this contract is readConditionAddr (CDR skips check for us)
            writeCondData,
            readCondData
        );

        listings[listingId] = Listing({
            owner: msg.sender,
            accessFee: accessFee,
            cdrUuid: cdrUuid,
            ipfsHash: "",
            uploaded: false,
            totalSales: 0
        });

        uuidToListing[cdrUuid] = listingId;
        _providerListings[msg.sender].push(listingId);

        emit ListingCreated(listingId, msg.sender, cdrUuid, accessFee);
    }

    /// @notice Mark listing as uploaded after provider has written encrypted data to CDR and IPFS.
    /// @param listingId The listing to update
    /// @param ipfsHash The IPFS CID where encrypted bulk data is stored
    function upload(uint256 listingId, string calldata ipfsHash) external {
        Listing storage listing = listings[listingId];
        if (listing.owner != msg.sender) revert NotListingOwner();
        if (listing.uploaded) revert AlreadyUploaded();

        listing.ipfsHash = ipfsHash;
        listing.uploaded = true;

        emit DataUploaded(listingId, ipfsHash);
    }

    /// @notice Purchase access and trigger CDR read in one transaction.
    ///         Consumer must send accessFee + CDR readFee as msg.value.
    /// @param listingId The listing to purchase
    /// @param requesterPubKey The consumer's ephemeral public key for partial decryption encryption
    function purchase(
        uint256 listingId,
        bytes calldata requesterPubKey
    ) external payable {
        Listing storage listing = listings[listingId];
        if (listing.owner == address(0)) revert ListingNotFound();
        if (!listing.uploaded) revert NotUploaded();
        if (hasPurchased[listingId][msg.sender]) revert AlreadyPurchased();

        uint256 readFee = CDR_CONTRACT.readFee();
        if (msg.value < listing.accessFee + readFee) revert InsufficientFee();

        hasPurchased[listingId][msg.sender] = true;
        listing.totalSales++;

        // Forward access fee to the data provider
        (bool sent, ) = listing.owner.call{value: listing.accessFee}("");
        if (!sent) revert TransferFailed();

        // Call CDR.read() — since this contract IS the readConditionAddr, CDR skips the check
        CDR_CONTRACT.read{value: readFee}(
            listing.cdrUuid,
            "",              // no accessAuxData needed (we're the readConditionAddr)
            requesterPubKey
        );

        emit DataPurchased(listingId, msg.sender, listing.accessFee);

        // Refund excess ETH
        uint256 excess = msg.value - listing.accessFee - readFee;
        if (excess > 0) {
            (bool refunded, ) = msg.sender.call{value: excess}("");
            if (!refunded) revert TransferFailed();
        }
    }

    /// @notice CDR read condition callback (fallback safety).
    ///         Called if someone calls CDR.read() directly instead of through purchase().
    ///         Verifies the caller has previously purchased.
    function checkReadCondition(
        uint32,
        bytes calldata,
        bytes calldata readConditionData,
        address caller
    ) external view returns (bool) {
        uint256 listingId = abi.decode(readConditionData, (uint256));
        // Owner always has read access
        if (listings[listingId].owner == caller) return true;
        return hasPurchased[listingId][caller];
    }

    // --- View functions ---

    function getListing(uint256 listingId) external view returns (
        address owner,
        uint256 accessFee,
        uint32 cdrUuid,
        string memory ipfsHash,
        bool uploaded,
        uint256 totalSales
    ) {
        Listing storage l = listings[listingId];
        return (l.owner, l.accessFee, l.cdrUuid, l.ipfsHash, l.uploaded, l.totalSales);
    }

    function getProviderListings(address provider) external view returns (uint256[] memory) {
        return _providerListings[provider];
    }

    function getListingCount() external view returns (uint256) {
        return nextListingId;
    }
}
