// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {ConfidentialInference} from "../src/ConfidentialInference.sol";

/// @notice Registers 3 demo AI models on the ConfidentialInference contract.
///         Run with: forge script script/RegisterModels.s.sol --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY
contract RegisterModels is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address payable inferenceAddr = payable(vm.envAddress("CONFIDENTIAL_INFERENCE"));

        vm.startBroadcast(deployerPrivateKey);

        ConfidentialInference inference = ConfidentialInference(inferenceAddr);
        uint256 allocateFee = inference.CDR_CONTRACT().allocateFee();

        // Model 0: Sentiment Analyzer — 0.01 IP per query
        uint256 model0 = inference.registerModel{value: allocateFee}(
            0.01 ether,
            bytes32(uint256(0x01)) // placeholder TEE image hash
        );
        console.log("Model 0 (Sentiment Analyzer) registered, id:", model0);

        // Model 1: Text Summarizer — 0.02 IP per query
        uint256 model1 = inference.registerModel{value: allocateFee}(
            0.02 ether,
            bytes32(uint256(0x02))
        );
        console.log("Model 1 (Text Summarizer) registered, id:", model1);

        // Model 2: Entity Extractor — 0.01 IP per query
        uint256 model2 = inference.registerModel{value: allocateFee}(
            0.01 ether,
            bytes32(uint256(0x03))
        );
        console.log("Model 2 (Entity Extractor) registered, id:", model2);

        vm.stopBroadcast();

        console.log("");
        console.log("All 3 models registered. The Confidential AI page will display them automatically.");
    }
}
