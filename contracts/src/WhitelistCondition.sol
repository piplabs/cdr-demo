// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title WhitelistCondition
/// @notice Generic CDR condition that gates vault access to an owner-managed allowlist.
///         Vault creator registers, then adds/removes addresses. Only whitelisted addresses
///         pass the condition check.
contract WhitelistCondition {
    mapping(uint32 uuid => address creator) public vaultCreator;
    mapping(uint32 uuid => mapping(address => bool)) public isWhitelisted;

    error AlreadyRegistered();
    error NotCreator();

    /// @notice Register a vault UUID. Creator is automatically whitelisted.
    /// @param uuid The CDR vault UUID (from CDR.allocate)
    function register(uint32 uuid) external {
        if (vaultCreator[uuid] != address(0)) revert AlreadyRegistered();
        vaultCreator[uuid] = msg.sender;
        isWhitelisted[uuid][msg.sender] = true;
    }

    /// @notice Register a vault and seed the whitelist in one call.
    ///         Creator is `msg.sender` and is automatically whitelisted.
    ///         Duplicates in `initial` are harmless (idempotent writes).
    /// @param uuid The CDR vault UUID (from CDR.allocate)
    /// @param initial Addresses to add to the whitelist besides the creator
    function registerWithInitial(uint32 uuid, address[] calldata initial) external {
        if (vaultCreator[uuid] != address(0)) revert AlreadyRegistered();
        vaultCreator[uuid] = msg.sender;
        isWhitelisted[uuid][msg.sender] = true;
        for (uint256 i = 0; i < initial.length; i++) {
            isWhitelisted[uuid][initial[i]] = true;
        }
    }

    /// @notice Add an address to the vault's whitelist. Only the creator can call.
    /// @param uuid The CDR vault UUID
    /// @param account The address to whitelist
    function addToWhitelist(uint32 uuid, address account) external {
        if (vaultCreator[uuid] != msg.sender) revert NotCreator();
        isWhitelisted[uuid][account] = true;
    }

    /// @notice Remove an address from the vault's whitelist. Only the creator can call.
    /// @param uuid The CDR vault UUID
    /// @param account The address to remove
    function removeFromWhitelist(uint32 uuid, address account) external {
        if (vaultCreator[uuid] != msg.sender) revert NotCreator();
        isWhitelisted[uuid][account] = false;
    }

    /// @notice CDR write condition check. Returns true if caller is whitelisted.
    function checkWriteCondition(
        uint32 uuid,
        bytes calldata,
        bytes calldata,
        address caller
    ) external view returns (bool) {
        return isWhitelisted[uuid][caller];
    }

    /// @notice CDR read condition check. Same logic as write.
    function checkReadCondition(
        uint32 uuid,
        bytes calldata,
        bytes calldata,
        address caller
    ) external view returns (bool) {
        return isWhitelisted[uuid][caller];
    }
}
