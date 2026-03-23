// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title VaultWriteCondition
/// @notice CDR write condition that gates vault writes to the original creator.
///         The CDRVaultNFT contract updates the creator mapping when a vault is created.
contract VaultWriteCondition {
    address public vaultNFT;
    mapping(uint32 uuid => address creator) public vaultCreator;

    error OnlyVaultNFT();
    error AlreadyInitialized();

    modifier onlyVaultNFT() {
        if (msg.sender != vaultNFT) revert OnlyVaultNFT();
        _;
    }

    /// @notice Set the CDRVaultNFT address. Can only be called once.
    /// @param _vaultNFT The address of the CDRVaultNFT contract
    function initialize(address _vaultNFT) external {
        if (vaultNFT != address(0)) revert AlreadyInitialized();
        vaultNFT = _vaultNFT;
    }

    /// @notice Register the creator for a vault. Called by CDRVaultNFT during createVault.
    /// @param uuid The vault UUID
    /// @param creator The address of the vault creator
    function setCreator(uint32 uuid, address creator) external onlyVaultNFT {
        vaultCreator[uuid] = creator;
    }

    /// @notice Check if the caller is the vault's creator.
    /// @param uuid The vault UUID
    /// @param caller The address attempting to write
    /// @return True if the caller is the creator
    function checkWriteCondition(
        uint32 uuid,
        bytes calldata,
        bytes calldata,
        address caller
    ) external view returns (bool) {
        return vaultCreator[uuid] == caller;
    }
}
