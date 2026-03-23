// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {CDRVaultNFT} from "../src/CDRVaultNFT.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        CDRVaultNFT vaultNFT = new CDRVaultNFT();

        console.log("CDRVaultNFT deployed to:", address(vaultNFT));
        console.log("VaultWriteCondition deployed to:", address(vaultNFT.WRITE_CONDITION()));
        console.log("Default license terms ID:", vaultNFT.defaultLicenseTermsId());

        vm.stopBroadcast();
    }
}
