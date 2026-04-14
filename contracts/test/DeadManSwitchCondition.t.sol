// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {DeadManSwitchCondition} from "../src/DeadManSwitchCondition.sol";

contract DeadManSwitchConditionTest is Test {
    DeadManSwitchCondition internal dms;
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    address internal carol = address(0xCA401);

    function setUp() public {
        dms = new DeadManSwitchCondition();
    }

    function test_register_storesFieldsAndSeedsWhitelist() public {
        address[] memory recipients = new address[](2);
        recipients[0] = alice;
        recipients[1] = bob;

        vm.roll(1000);
        dms.register(42, 100, recipients, true);

        (address creator, uint256 unlockBlock, uint256 duration, bool creatorCanRead, bool registered) =
            dms.getVaultInfo(42);
        assertEq(creator, address(this), "creator");
        assertEq(unlockBlock, 1100, "unlockBlock");
        assertEq(duration, 100, "duration");
        assertTrue(creatorCanRead, "creatorCanRead");
        assertTrue(registered, "registered");

        assertTrue(dms.isWhitelisted(42, address(this)), "creator whitelisted");
        assertTrue(dms.isWhitelisted(42, alice), "alice whitelisted");
        assertTrue(dms.isWhitelisted(42, bob), "bob whitelisted");
        assertFalse(dms.isWhitelisted(42, carol), "carol not whitelisted");
    }

    function test_register_revertsOnZeroDuration() public {
        address[] memory recipients = new address[](0);
        vm.expectRevert(DeadManSwitchCondition.ZeroDuration.selector);
        dms.register(1, 0, recipients, true);
    }

    function test_register_revertsWhenAlreadyRegistered() public {
        address[] memory recipients = new address[](0);
        dms.register(7, 10, recipients, true);

        vm.expectRevert(DeadManSwitchCondition.AlreadyRegistered.selector);
        dms.register(7, 10, recipients, true);
    }

    function _setupVault(uint32 uuid, uint256 duration, bool creatorCanRead) internal {
        address[] memory recipients = new address[](1);
        recipients[0] = alice;
        vm.roll(1000);
        dms.register(uuid, duration, recipients, creatorCanRead);
    }

    function test_checkRead_lockedForRecipient() public {
        _setupVault(10, 100, true);
        assertFalse(dms.checkReadCondition(10, "", "", alice), "alice locked out");
    }

    function test_checkRead_unlockedForWhitelistedRecipient() public {
        _setupVault(10, 100, true);
        vm.roll(1100);
        assertTrue(dms.checkReadCondition(10, "", "", alice), "alice unlocked");
    }

    function test_checkRead_notWhitelistedEvenAfterUnlock() public {
        _setupVault(10, 100, true);
        vm.roll(2000);
        assertFalse(dms.checkReadCondition(10, "", "", bob), "bob never whitelisted");
    }

    function test_checkRead_creatorCanReadWhileLocked_true() public {
        _setupVault(10, 100, true);
        assertTrue(dms.checkReadCondition(10, "", "", address(this)), "creator bypasses lock");
    }

    function test_checkRead_creatorCannotReadWhileLocked_false() public {
        _setupVault(10, 100, false);
        assertFalse(dms.checkReadCondition(10, "", "", address(this)), "creator locked out");
    }

    function test_checkRead_creatorUnlocksWithEveryoneElse() public {
        _setupVault(10, 100, false);
        vm.roll(1100);
        assertTrue(dms.checkReadCondition(10, "", "", address(this)), "creator unlocks after timer");
    }

    function test_checkRead_unregisteredReturnsFalse() public {
        assertFalse(dms.checkReadCondition(999, "", "", alice));
    }
}
