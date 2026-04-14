// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {DataMarketplace} from "../src/DataMarketplace.sol";
import {MarketplaceWriteCondition} from "../src/MarketplaceWriteCondition.sol";
import {DepinBackend} from "../src/DepinBackend.sol";
import {DepinWriteCondition} from "../src/DepinWriteCondition.sol";
import {ConfidentialInference} from "../src/ConfidentialInference.sol";
import {InferenceWriteCondition} from "../src/InferenceWriteCondition.sol";
import {FixedFeeCondition} from "../src/FixedFeeCondition.sol";
import {WhitelistCondition} from "../src/WhitelistCondition.sol";
import {TimeBasedCondition} from "../src/TimeBasedCondition.sol";
import {DeadManSwitchCondition} from "../src/DeadManSwitchCondition.sol";

/// @notice Deploys all demo contracts and wires them together.
///         Run with: forge script script/DeployAll.s.sol --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY
contract DeployAll is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);

        // ============================================================
        // 1. Data Marketplace
        // ============================================================
        MarketplaceWriteCondition mktWriteCond = new MarketplaceWriteCondition();
        console.log("MarketplaceWriteCondition:", address(mktWriteCond));

        DataMarketplace marketplace = new DataMarketplace(address(mktWriteCond));
        console.log("DataMarketplace:", address(marketplace));

        mktWriteCond.initialize(address(marketplace));
        console.log("  -> MarketplaceWriteCondition initialized");

        // ============================================================
        // 2. DePIN / Bounty Board
        // ============================================================
        DepinWriteCondition depinWriteCond = new DepinWriteCondition();
        console.log("DepinWriteCondition:", address(depinWriteCond));

        DepinBackend depinBackend = new DepinBackend(address(depinWriteCond));
        console.log("DepinBackend:", address(depinBackend));

        depinWriteCond.initialize(address(depinBackend));
        console.log("  -> DepinWriteCondition initialized");

        // Authorize deployer as TEE for mock evaluation
        depinBackend.setTEEAuthorization(deployer, true);
        console.log("  -> Deployer authorized as TEE");

        // ============================================================
        // 3. Confidential Inference
        // ============================================================
        InferenceWriteCondition infWriteCond = new InferenceWriteCondition();
        console.log("InferenceWriteCondition:", address(infWriteCond));

        ConfidentialInference inference = new ConfidentialInference(address(infWriteCond));
        console.log("ConfidentialInference:", address(inference));

        infWriteCond.initialize(address(inference));
        console.log("  -> InferenceWriteCondition initialized");

        // Authorize deployer as TEE for mock inference
        inference.setTEEAuthorization(deployer, true);
        console.log("  -> Deployer authorized as TEE");

        // ============================================================
        // 4. Generic Condition Contracts
        // ============================================================
        FixedFeeCondition fixedFeeCond = new FixedFeeCondition();
        console.log("FixedFeeCondition:", address(fixedFeeCond));

        WhitelistCondition whitelistCond = new WhitelistCondition();
        console.log("WhitelistCondition:", address(whitelistCond));

        TimeBasedCondition timeBasedCond = new TimeBasedCondition();
        console.log("TimeBasedCondition:", address(timeBasedCond));

        DeadManSwitchCondition deadManSwitchCond = new DeadManSwitchCondition();
        console.log("DeadManSwitchCondition:", address(deadManSwitchCond));

        vm.stopBroadcast();

        // ============================================================
        // Summary
        // ============================================================
        console.log("");
        console.log("=== Add to .env.local ===");
        console.log("NEXT_PUBLIC_DATA_MARKETPLACE=", address(marketplace));
        console.log("NEXT_PUBLIC_DEPIN_BACKEND=", address(depinBackend));
        console.log("NEXT_PUBLIC_CONFIDENTIAL_INFERENCE=", address(inference));
        console.log("NEXT_PUBLIC_FIXED_FEE_CONDITION=", address(fixedFeeCond));
        console.log("NEXT_PUBLIC_WHITELIST_CONDITION=", address(whitelistCond));
        console.log("NEXT_PUBLIC_TIME_BASED_CONDITION=", address(timeBasedCond));
        console.log("NEXT_PUBLIC_DEADMAN_SWITCH_CONDITION=", address(deadManSwitchCond));
    }
}
