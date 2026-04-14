// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {DeadManSwitchCondition} from "../src/DeadManSwitchCondition.sol";

/// @notice Deploys only the DeadManSwitchCondition contract.
///         Run with: forge script script/DeployDeadManSwitch.s.sol --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY
contract DeployDeadManSwitch is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        DeadManSwitchCondition deadManSwitchCond = new DeadManSwitchCondition();
        console.log("DeadManSwitchCondition:", address(deadManSwitchCond));

        vm.stopBroadcast();

        console.log("");
        console.log("=== Add to .env.local ===");
        console.log("NEXT_PUBLIC_DEADMAN_SWITCH_CONDITION=", address(deadManSwitchCond));
    }
}
