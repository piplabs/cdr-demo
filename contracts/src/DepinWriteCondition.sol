// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title DepinWriteCondition
/// @notice Write condition for DePIN vaults. Allows only the vault creator to write.
///         For eval vaults: creator = requester. For data vaults: creator = provider.
///         writeConditionData = abi.encode(requestId or responseId)
contract DepinWriteCondition {
    address public depinContract;

    error AlreadyInitialized();

    function initialize(address _depinContract) external {
        if (depinContract != address(0)) revert AlreadyInitialized();
        depinContract = _depinContract;
    }

    /// @notice Check if the caller is authorized to write.
    ///         We check both request creators and response providers.
    function checkWriteCondition(
        uint32,
        bytes calldata,
        bytes calldata writeConditionData,
        address caller
    ) external view returns (bool) {
        uint256 id = abi.decode(writeConditionData, (uint256));

        // Try as request first
        (address requester,,,,,,, ) = IDepinBackend(depinContract).getRequest(id);
        if (requester == caller) return true;

        // Try as response
        (address provider,,,,, ) = IDepinBackend(depinContract).getResponse(id);
        if (provider == caller) return true;

        return false;
    }
}

interface IDepinBackend {
    function getRequest(uint256 requestId) external view returns (
        address requester, uint256 bounty, uint32 evalVaultUuid,
        string memory evalIpfsHash, bytes32 teeImageHash,
        uint8 status, uint256 responseCount, uint256 acceptedCount
    );
    function getResponse(uint256 responseId) external view returns (
        address provider, uint256 requestId, uint32 dataVaultUuid,
        string memory dataIpfsHash, uint8 status, bytes memory evalAttestation
    );
}
