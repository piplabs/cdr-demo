// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title MarketplaceWriteCondition
/// @notice Write condition that only allows the listing owner to write to a marketplace vault.
///         writeConditionData = abi.encode(listingId), looks up the owner from the marketplace.
contract MarketplaceWriteCondition {
    address public marketplace;

    error AlreadyInitialized();

    function initialize(address _marketplace) external {
        if (marketplace != address(0)) revert AlreadyInitialized();
        marketplace = _marketplace;
    }

    /// @notice CDR calls this to check if the writer is authorized.
    /// @dev Parameter order matches ICDRWriteCondition: (uuid, accessAuxData, writeConditionData, caller)
    function checkWriteCondition(
        uint32,
        bytes calldata,
        bytes calldata writeConditionData,
        address caller
    ) external view returns (bool) {
        uint256 listingId = abi.decode(writeConditionData, (uint256));
        (address owner,,,,,) = IDataMarketplace(marketplace).getListing(listingId);
        return caller == owner;
    }
}

interface IDataMarketplace {
    function getListing(uint256 listingId) external view returns (
        address owner, uint256 accessFee, uint32 cdrUuid,
        string memory ipfsHash, bool uploaded, uint256 totalSales
    );
}
