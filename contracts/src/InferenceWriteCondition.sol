// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title InferenceWriteCondition
/// @notice Write condition for inference vaults. Allows only the vault owner to write.
///         For model vaults: owner = model provider
///         For query vaults: owner = querying user
///         writeConditionData = abi.encode(id, isModel)
contract InferenceWriteCondition {
    address public inferenceContract;

    error AlreadyInitialized();

    function initialize(address _inferenceContract) external {
        if (inferenceContract != address(0)) revert AlreadyInitialized();
        inferenceContract = _inferenceContract;
    }

    function checkWriteCondition(
        uint32 uuid,
        bytes calldata accessAuxData,
        bytes calldata writeConditionData,
        address caller
    ) external view returns (bool) {
        (uint256 id, bool isModel) = abi.decode(writeConditionData, (uint256, bool));

        if (isModel) {
            (address provider,,,,,,) = IConfidentialInference(inferenceContract).getModel(id);
            return caller == provider;
        } else {
            (address user,,,,,) = IConfidentialInference(inferenceContract).getQuery(id);
            return caller == user;
        }
    }
}

interface IConfidentialInference {
    function getModel(uint256 modelId) external view returns (
        address provider, uint256 feePerQuery, uint32 weightsVaultUuid,
        bytes32 teeImageHash, uint8 status, uint256 totalQueries, uint256 totalEarnings
    );
    function getQuery(uint256 queryId) external view returns (
        address user, uint256 modelId, uint32 inputVaultUuid,
        uint32 resultVaultUuid, uint8 status, bytes memory attestation
    );
}
