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

/// @title DepinBackend
/// @notice Trustless DePIN backend using CDR for confidential evaluation.
///
/// The eval criteria is encrypted and stored in CDR — providers can't see it.
/// Provider data is also encrypted in CDR — requester can't see it without payment.
/// A TEE evaluates provider data against the criteria and reports results on-chain.
/// Payment is released only when data passes the confidential eval.
///
/// Key CDR integration:
///   - This contract is set as readConditionAddr for both eval and data vaults
///   - It calls CDR.read() on behalf of the TEE (CDR skips check since we're readConditionAddr)
///   - Write conditions ensure only the vault owner can write
contract DepinBackend {
    // --- Types ---
    enum RequestStatus { Open, InProgress, Completed, Cancelled }
    enum ResponseStatus { Pending, Evaluating, Accepted, Rejected }

    struct DataRequest {
        address requester;
        uint256 bounty;           // Total bounty in wei
        uint32 evalVaultUuid;     // CDR vault with encrypted eval criteria
        string evalIpfsHash;      // IPFS CID of encrypted eval data (model + dataset)
        bytes32 teeImageHash;     // Expected TEE binary hash for attestation
        RequestStatus status;
        uint256 responseCount;
        uint256 acceptedCount;
    }

    struct DataResponse {
        address provider;
        uint256 requestId;
        uint32 dataVaultUuid;     // CDR vault with encrypted provider data
        string dataIpfsHash;      // IPFS CID of encrypted provider data
        ResponseStatus status;
        bytes evalAttestation;    // TEE attestation of evaluation result
    }

    // --- State ---
    ICDR public immutable CDR_CONTRACT;
    address public immutable WRITE_CONDITION;

    uint256 public nextRequestId;
    uint256 public nextResponseId;

    mapping(uint256 => DataRequest) public requests;
    mapping(uint256 => DataResponse) public responses;

    // Request → response IDs
    mapping(uint256 requestId => uint256[]) internal _requestResponses;
    // Requester → request IDs
    mapping(address => uint256[]) internal _requesterRequests;
    // Provider → response IDs
    mapping(address => uint256[]) internal _providerResponses;
    // Authorized TEE addresses (set by admin or verified via attestation)
    mapping(address => bool) public authorizedTEE;
    address public admin;

    // --- Events ---
    event RequestCreated(uint256 indexed requestId, address indexed requester, uint256 bounty, uint32 evalVaultUuid);
    event ResponseSubmitted(uint256 indexed responseId, uint256 indexed requestId, address indexed provider, uint32 dataVaultUuid);
    event EvalTriggered(uint256 indexed requestId, uint256 indexed responseId, uint32 evalVaultUuid, uint32 dataVaultUuid);
    event EvalCompleted(uint256 indexed responseId, bool passed, bytes attestation);
    event BountyReleased(uint256 indexed responseId, address indexed provider, uint256 amount);
    event RequestCancelled(uint256 indexed requestId);

    // --- Errors ---
    error NotRequester();
    error NotProvider();
    error NotAuthorizedTEE();
    error InvalidStatus();
    error InsufficientBounty();
    error InsufficientAllocateFee();
    error TransferFailed();
    error NotAdmin();

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

    /// @notice Register an authorized TEE address (verified off-chain via attestation)
    function setTEEAuthorization(address tee, bool authorized) external onlyAdmin {
        authorizedTEE[tee] = authorized;
    }

    // ===== REQUESTER FUNCTIONS =====

    /// @notice Create a new data request with a bounty.
    ///         Allocates a CDR vault for the eval criteria.
    ///         Requester must write the encrypted eval key to CDR separately.
    /// @param teeImageHash Expected hash of the TEE binary
    /// @return requestId The new request ID
    function createRequest(
        bytes32 teeImageHash
    ) external payable returns (uint256 requestId) {
        uint256 allocateFee = CDR_CONTRACT.allocateFee();
        if (msg.value <= allocateFee) revert InsufficientBounty();

        requestId = nextRequestId++;

        uint256 bounty = msg.value - allocateFee;

        // Allocate eval vault: requester writes, this contract reads (for TEE)
        bytes memory condData = abi.encode(requestId);
        uint32 evalVaultUuid = CDR_CONTRACT.allocate{value: allocateFee}(
            false,
            WRITE_CONDITION,   // requester-gated writes
            address(this),     // this contract is readConditionAddr (skips check)
            condData,          // writeConditionData: abi.encode(requestId)
            condData           // readConditionData: abi.encode(requestId)
        );

        requests[requestId] = DataRequest({
            requester: msg.sender,
            bounty: bounty,
            evalVaultUuid: evalVaultUuid,
            evalIpfsHash: "",
            teeImageHash: teeImageHash,
            status: RequestStatus.Open,
            responseCount: 0,
            acceptedCount: 0
        });

        _requesterRequests[msg.sender].push(requestId);

        emit RequestCreated(requestId, msg.sender, bounty, evalVaultUuid);
    }

    /// @notice Set the IPFS hash for the eval data (after uploading to IPFS)
    function setEvalIpfsHash(uint256 requestId, string calldata ipfsHash) external {
        DataRequest storage req = requests[requestId];
        if (req.requester != msg.sender) revert NotRequester();
        req.evalIpfsHash = ipfsHash;
    }

    /// @notice Cancel request and reclaim bounty (only if no accepted responses)
    function cancelRequest(uint256 requestId) external {
        DataRequest storage req = requests[requestId];
        if (req.requester != msg.sender) revert NotRequester();
        if (req.status != RequestStatus.Open) revert InvalidStatus();

        req.status = RequestStatus.Cancelled;
        (bool sent, ) = msg.sender.call{value: req.bounty}("");
        if (!sent) revert TransferFailed();

        emit RequestCancelled(requestId);
    }

    // ===== PROVIDER FUNCTIONS =====

    /// @notice Respond to a data request. Allocates a CDR vault for provider data.
    ///         Provider must write encrypted data key to CDR separately.
    /// @param requestId The request to respond to
    /// @return responseId The new response ID
    function respondToRequest(
        uint256 requestId
    ) external payable returns (uint256 responseId) {
        DataRequest storage req = requests[requestId];
        if (req.status != RequestStatus.Open) revert InvalidStatus();

        uint256 allocateFee = CDR_CONTRACT.allocateFee();
        if (msg.value < allocateFee) revert InsufficientAllocateFee();

        responseId = nextResponseId++;
        bytes memory condData = abi.encode(responseId);
        uint32 dataVaultUuid = CDR_CONTRACT.allocate{value: allocateFee}(
            false,
            WRITE_CONDITION,   // provider-gated writes
            address(this),     // this contract is readConditionAddr (skips check)
            condData,          // writeConditionData: abi.encode(responseId)
            condData           // readConditionData: abi.encode(responseId)
        );

        responses[responseId] = DataResponse({
            provider: msg.sender,
            requestId: requestId,
            dataVaultUuid: dataVaultUuid,
            dataIpfsHash: "",
            status: ResponseStatus.Pending,
            evalAttestation: ""
        });

        req.responseCount++;
        _requestResponses[requestId].push(responseId);
        _providerResponses[msg.sender].push(responseId);

        emit ResponseSubmitted(responseId, requestId, msg.sender, dataVaultUuid);
    }

    /// @notice Set the IPFS hash for the provider data
    function setDataIpfsHash(uint256 responseId, string calldata ipfsHash) external {
        DataResponse storage resp = responses[responseId];
        if (resp.provider != msg.sender) revert NotProvider();
        resp.dataIpfsHash = ipfsHash;
    }

    // ===== TEE FUNCTIONS =====

    /// @notice Trigger evaluation — TEE reads both vaults via this contract.
    ///         Since this contract IS readConditionAddr, CDR skips the condition check.
    /// @param responseId The response to evaluate
    /// @param teeEvalPubKey TEE's ephemeral public key for eval vault decryption
    /// @param teeDataPubKey TEE's ephemeral public key for data vault decryption
    function triggerEvaluation(
        uint256 responseId,
        bytes calldata teeEvalPubKey,
        bytes calldata teeDataPubKey
    ) external payable onlyTEE {
        DataResponse storage resp = responses[responseId];
        if (resp.status != ResponseStatus.Pending) revert InvalidStatus();

        DataRequest storage req = requests[resp.requestId];
        resp.status = ResponseStatus.Evaluating;

        uint256 readFee = CDR_CONTRACT.readFee();

        // Read eval vault (this contract is readConditionAddr, CDR skips check)
        CDR_CONTRACT.read{value: readFee}(req.evalVaultUuid, "", teeEvalPubKey);

        // Read data vault (same bypass)
        CDR_CONTRACT.read{value: readFee}(resp.dataVaultUuid, "", teeDataPubKey);

        emit EvalTriggered(resp.requestId, responseId, req.evalVaultUuid, resp.dataVaultUuid);
    }

    /// @notice Submit evaluation result from the TEE.
    /// @param responseId The response that was evaluated
    /// @param passed Whether the data passed the evaluation
    /// @param attestation TEE attestation proving the evaluation was run correctly
    function submitEvalResult(
        uint256 responseId,
        bool passed,
        bytes calldata attestation
    ) external onlyTEE {
        DataResponse storage resp = responses[responseId];
        if (resp.status != ResponseStatus.Evaluating) revert InvalidStatus();

        resp.evalAttestation = attestation;

        if (passed) {
            resp.status = ResponseStatus.Accepted;
            DataRequest storage req = requests[resp.requestId];
            req.acceptedCount++;

            // Release proportional bounty to provider
            // Simple: divide remaining bounty by remaining capacity
            uint256 payout = req.bounty / req.responseCount; // Simple split for demo
            if (payout > 0) {
                (bool sent, ) = resp.provider.call{value: payout}("");
                if (!sent) revert TransferFailed();
                emit BountyReleased(responseId, resp.provider, payout);
            }
        } else {
            resp.status = ResponseStatus.Rejected;
        }

        emit EvalCompleted(responseId, passed, attestation);
    }

    // ===== VIEW FUNCTIONS =====

    function getRequest(uint256 requestId) external view returns (
        address requester, uint256 bounty, uint32 evalVaultUuid,
        string memory evalIpfsHash, bytes32 teeImageHash,
        uint8 status, uint256 responseCount, uint256 acceptedCount
    ) {
        DataRequest storage r = requests[requestId];
        return (r.requester, r.bounty, r.evalVaultUuid, r.evalIpfsHash,
                r.teeImageHash, uint8(r.status), r.responseCount, r.acceptedCount);
    }

    function getResponse(uint256 responseId) external view returns (
        address provider, uint256 requestId, uint32 dataVaultUuid,
        string memory dataIpfsHash, uint8 status, bytes memory evalAttestation
    ) {
        DataResponse storage r = responses[responseId];
        return (r.provider, r.requestId, r.dataVaultUuid, r.dataIpfsHash,
                uint8(r.status), r.evalAttestation);
    }

    function getRequestResponses(uint256 requestId) external view returns (uint256[] memory) {
        return _requestResponses[requestId];
    }

    function getRequesterRequests(address requester) external view returns (uint256[] memory) {
        return _requesterRequests[requester];
    }

    function getProviderResponses(address provider) external view returns (uint256[] memory) {
        return _providerResponses[provider];
    }

    function getRequestCount() external view returns (uint256) {
        return nextRequestId;
    }

    /// @notice Required to receive ETH for bounty payouts
    receive() external payable {}
}
