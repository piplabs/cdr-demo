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

/// @title ConfidentialInference
/// @notice Confidential model inference using CDR + TEE.
///
/// Model weights are stored encrypted in CDR — never revealed.
/// User queries are stored encrypted in CDR — model provider never sees them.
/// TEE runs inference inside a secure enclave, verified by on-chain binary hash.
/// Results are encrypted to the user's key and stored in a result CDR vault.
///
/// CDR integration:
///   - This contract is readConditionAddr for model, query, and result vaults
///   - It calls CDR.read() for the TEE (CDR skips check since we're readConditionAddr)
///   - Write conditions ensure only the vault owner can write
contract ConfidentialInference {
    // --- Types ---
    enum ModelStatus { Active, Paused, Deregistered }
    enum QueryStatus { Pending, Processing, Completed, Failed }

    struct Model {
        address provider;
        uint256 feePerQuery;
        uint32 weightsVaultUuid;   // CDR vault with encrypted model weights
        bytes32 teeImageHash;       // Expected TEE binary hash
        ModelStatus status;
        uint256 totalQueries;
        uint256 totalEarnings;
    }

    struct Query {
        address user;
        uint256 modelId;
        uint32 inputVaultUuid;     // CDR vault with encrypted user query
        uint32 resultVaultUuid;    // CDR vault with encrypted inference result
        QueryStatus status;
        bytes attestation;         // TEE attestation for the result
    }

    // --- State ---
    ICDR public immutable CDR_CONTRACT;
    address public immutable WRITE_CONDITION;

    uint256 public nextModelId;
    uint256 public nextQueryId;

    mapping(uint256 => Model) public models;
    mapping(uint256 => Query) public queries;

    // Model provider → model IDs
    mapping(address => uint256[]) internal _providerModels;
    // User → query IDs
    mapping(address => uint256[]) internal _userQueries;
    // Model → query IDs
    mapping(uint256 modelId => uint256[]) internal _modelQueries;

    // Authorized TEE addresses
    mapping(address => bool) public authorizedTEE;
    address public admin;

    // --- Events ---
    event ModelRegistered(uint256 indexed modelId, address indexed provider, uint256 feePerQuery, uint32 weightsVaultUuid);
    event ModelStatusChanged(uint256 indexed modelId, uint8 status);
    event QuerySubmitted(uint256 indexed queryId, uint256 indexed modelId, address indexed user, uint32 inputVaultUuid);
    event QueryProcessing(uint256 indexed queryId, uint32 weightsVaultUuid, uint32 inputVaultUuid);
    event ResultSubmitted(uint256 indexed queryId, uint32 resultVaultUuid, bytes attestation);
    event QueryCompleted(uint256 indexed queryId, address indexed user);

    // --- Errors ---
    error NotProvider();
    error NotAuthorizedTEE();
    error InvalidStatus();
    error InsufficientFee();
    error TransferFailed();
    error NotAdmin();
    error ModelNotActive();

    constructor(address writeCondition) {
        CDR_CONTRACT = ICDR(Constants.CDR);
        WRITE_CONDITION = writeCondition;
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyTEE() {
        if (!authorizedTEE[msg.sender]) revert NotAuthorizedTEE();
        _;
    }

    function setTEEAuthorization(address tee, bool authorized) external onlyAdmin {
        authorizedTEE[tee] = authorized;
    }

    // ===== MODEL PROVIDER FUNCTIONS =====

    /// @notice Register a model. Allocates a CDR vault for encrypted weights.
    ///         Provider must write encrypted weights to CDR separately.
    /// @param feePerQuery Fee in wei per inference query
    /// @param teeImageHash Expected hash of the TEE binary that runs inference
    /// @return modelId The new model ID
    function registerModel(
        uint256 feePerQuery,
        bytes32 teeImageHash
    ) external payable returns (uint256 modelId) {
        modelId = nextModelId++;

        bytes memory condData = abi.encode(modelId, true); // true = isModel (vs isQuery)

        uint32 weightsVaultUuid = CDR_CONTRACT.allocate{value: msg.value}(
            false,
            WRITE_CONDITION,   // provider-gated writes
            address(this),     // this contract is readConditionAddr (skips check for TEE reads)
            condData,
            condData
        );

        models[modelId] = Model({
            provider: msg.sender,
            feePerQuery: feePerQuery,
            weightsVaultUuid: weightsVaultUuid,
            teeImageHash: teeImageHash,
            status: ModelStatus.Active,
            totalQueries: 0,
            totalEarnings: 0
        });

        _providerModels[msg.sender].push(modelId);

        emit ModelRegistered(modelId, msg.sender, feePerQuery, weightsVaultUuid);
    }

    /// @notice Pause or unpause a model
    function setModelStatus(uint256 modelId, ModelStatus status) external {
        if (models[modelId].provider != msg.sender) revert NotProvider();
        models[modelId].status = status;
        emit ModelStatusChanged(modelId, uint8(status));
    }

    // ===== USER FUNCTIONS =====

    /// @notice Submit an inference query. Allocates a CDR vault for the encrypted input.
    ///         User must write encrypted input to CDR separately.
    /// @param modelId The model to query
    /// @return queryId The new query ID
    function submitQuery(
        uint256 modelId
    ) external payable returns (uint256 queryId) {
        Model storage model = models[modelId];
        if (model.status != ModelStatus.Active) revert ModelNotActive();

        uint256 allocateFee = CDR_CONTRACT.allocateFee();
        // msg.value must cover: queryFee + allocateFee (for input vault)
        if (msg.value < model.feePerQuery + allocateFee) revert InsufficientFee();

        queryId = nextQueryId++;

        bytes memory condData = abi.encode(queryId, false); // false = isQuery

        uint32 inputVaultUuid = CDR_CONTRACT.allocate{value: allocateFee}(
            false,
            WRITE_CONDITION,   // user-gated writes
            address(this),     // this contract is readConditionAddr
            condData,
            condData
        );

        queries[queryId] = Query({
            user: msg.sender,
            modelId: modelId,
            inputVaultUuid: inputVaultUuid,
            resultVaultUuid: 0,  // Set when TEE submits result
            status: QueryStatus.Pending,
            attestation: ""
        });

        model.totalQueries++;
        _userQueries[msg.sender].push(queryId);
        _modelQueries[modelId].push(queryId);

        emit QuerySubmitted(queryId, modelId, msg.sender, inputVaultUuid);
    }

    // ===== TEE FUNCTIONS =====

    /// @notice TEE starts processing a query — reads model weights and query input from CDR.
    ///         Since this contract IS readConditionAddr, CDR skips the condition check.
    /// @param queryId The query to process
    /// @param teeModelPubKey TEE's ephemeral public key for model weights decryption
    /// @param teeInputPubKey TEE's ephemeral public key for query input decryption
    function processQuery(
        uint256 queryId,
        bytes calldata teeModelPubKey,
        bytes calldata teeInputPubKey
    ) external payable onlyTEE {
        Query storage q = queries[queryId];
        if (q.status != QueryStatus.Pending) revert InvalidStatus();

        q.status = QueryStatus.Processing;
        Model storage model = models[q.modelId];

        uint256 readFee = CDR_CONTRACT.readFee();

        // Read model weights vault (CDR skips check — we're readConditionAddr)
        CDR_CONTRACT.read{value: readFee}(model.weightsVaultUuid, "", teeModelPubKey);

        // Read query input vault (CDR skips check)
        CDR_CONTRACT.read{value: readFee}(q.inputVaultUuid, "", teeInputPubKey);

        emit QueryProcessing(queryId, model.weightsVaultUuid, q.inputVaultUuid);
    }

    /// @notice TEE submits inference result. Allocates a result vault readable by the user.
    /// @param queryId The query that was processed
    /// @param resultVaultUuid The CDR vault UUID where the TEE wrote the encrypted result
    /// @param attestation TEE attestation proving correct execution
    function submitResult(
        uint256 queryId,
        uint32 resultVaultUuid,
        bytes calldata attestation
    ) external onlyTEE {
        Query storage q = queries[queryId];
        if (q.status != QueryStatus.Processing) revert InvalidStatus();

        q.resultVaultUuid = resultVaultUuid;
        q.attestation = attestation;
        q.status = QueryStatus.Completed;

        // Pay the model provider
        Model storage model = models[q.modelId];
        model.totalEarnings += model.feePerQuery;
        (bool sent, ) = model.provider.call{value: model.feePerQuery}("");
        if (!sent) revert TransferFailed();

        emit ResultSubmitted(queryId, resultVaultUuid, attestation);
        emit QueryCompleted(queryId, q.user);
    }

    // ===== VIEW FUNCTIONS =====

    function getModel(uint256 modelId) external view returns (
        address provider, uint256 feePerQuery, uint32 weightsVaultUuid,
        bytes32 teeImageHash, uint8 status, uint256 totalQueries, uint256 totalEarnings
    ) {
        Model storage m = models[modelId];
        return (m.provider, m.feePerQuery, m.weightsVaultUuid,
                m.teeImageHash, uint8(m.status), m.totalQueries, m.totalEarnings);
    }

    function getQuery(uint256 queryId) external view returns (
        address user, uint256 modelId, uint32 inputVaultUuid,
        uint32 resultVaultUuid, uint8 status, bytes memory attestation
    ) {
        Query storage q = queries[queryId];
        return (q.user, q.modelId, q.inputVaultUuid, q.resultVaultUuid,
                uint8(q.status), q.attestation);
    }

    function getModelCount() external view returns (uint256) {
        return nextModelId;
    }

    function getQueryCount() external view returns (uint256) {
        return nextQueryId;
    }

    function getProviderModels(address provider) external view returns (uint256[] memory) {
        return _providerModels[provider];
    }

    function getUserQueries(address user) external view returns (uint256[] memory) {
        return _userQueries[user];
    }

    function getModelQueries(uint256 modelId) external view returns (uint256[] memory) {
        return _modelQueries[modelId];
    }

    /// @notice Fallback read condition — if someone calls CDR.read() directly
    function checkReadCondition(
        uint32 uuid,
        bytes calldata accessAuxData,
        bytes calldata readConditionData,
        address caller
    ) external view returns (bool) {
        // Authorized TEEs can read any vault
        if (authorizedTEE[caller]) return true;

        (uint256 id, bool isModel) = abi.decode(readConditionData, (uint256, bool));
        if (isModel) {
            // Model vault — only provider and TEEs can read
            return models[id].provider == caller;
        } else {
            // Query vault — user who submitted the query can read their result
            return queries[id].user == caller;
        }
    }

    /// @notice Required to receive ETH
    receive() external payable {}
}
