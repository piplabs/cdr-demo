// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title DeadManSwitchCondition
/// @notice CDR condition that gates vault access to whitelisted addresses
///         once an extendable block-based timer has expired. The creator
///         heartbeats the vault by calling `extend()` to reset the timer.
contract DeadManSwitchCondition {
    struct VaultInfo {
        address creator;
        uint256 unlockBlock;
        uint256 duration;
        bool creatorCanReadWhileLocked;
        bool registered;
    }

    mapping(uint32 uuid => VaultInfo) internal _vaults;
    mapping(uint32 uuid => mapping(address => bool)) public isWhitelisted;

    error AlreadyRegistered();
    error NotRegistered();
    error NotCreator();
    error ZeroDuration();

    function register(
        uint32 uuid,
        uint256 durationBlocks,
        address[] calldata recipients,
        bool creatorCanRead
    ) external {
        if (_vaults[uuid].registered) revert AlreadyRegistered();
        if (durationBlocks == 0) revert ZeroDuration();

        _vaults[uuid] = VaultInfo({
            creator: msg.sender,
            unlockBlock: block.number + durationBlocks,
            duration: durationBlocks,
            creatorCanReadWhileLocked: creatorCanRead,
            registered: true
        });
        isWhitelisted[uuid][msg.sender] = true;
        for (uint256 i = 0; i < recipients.length; i++) {
            isWhitelisted[uuid][recipients[i]] = true;
        }
    }

    function getVaultInfo(uint32 uuid)
        external
        view
        returns (
            address creator,
            uint256 unlockBlock,
            uint256 duration,
            bool creatorCanReadWhileLocked,
            bool registered
        )
    {
        VaultInfo storage v = _vaults[uuid];
        return (v.creator, v.unlockBlock, v.duration, v.creatorCanReadWhileLocked, v.registered);
    }

    function checkReadCondition(
        uint32 uuid,
        bytes calldata,
        bytes calldata,
        address caller
    ) external view returns (bool) {
        VaultInfo storage v = _vaults[uuid];
        if (!v.registered) return false;
        if (!isWhitelisted[uuid][caller]) return false;
        if (caller == v.creator && v.creatorCanReadWhileLocked) return true;
        return block.number >= v.unlockBlock;
    }

    function extend(uint32 uuid) external {
        VaultInfo storage v = _vaults[uuid];
        if (!v.registered) revert NotRegistered();
        if (v.creator != msg.sender) revert NotCreator();
        v.unlockBlock = block.number + v.duration;
    }

    function addToWhitelist(uint32 uuid, address account) external {
        VaultInfo storage v = _vaults[uuid];
        if (!v.registered) revert NotRegistered();
        if (v.creator != msg.sender) revert NotCreator();
        isWhitelisted[uuid][account] = true;
    }

    function removeFromWhitelist(uint32 uuid, address account) external {
        VaultInfo storage v = _vaults[uuid];
        if (!v.registered) revert NotRegistered();
        if (v.creator != msg.sender) revert NotCreator();
        isWhitelisted[uuid][account] = false;
    }
}
