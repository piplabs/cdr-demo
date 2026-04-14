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

        (
            address creator,
            uint256 unlockBlock,
            uint256 duration,
            bool creatorCanRead,
            bool registered,
            bool publicAfterUnlock
        ) = dms.getVaultInfo(42);
        assertEq(creator, address(this), "creator");
        assertEq(unlockBlock, 1100, "unlockBlock");
        assertEq(duration, 100, "duration");
        assertTrue(creatorCanRead, "creatorCanRead");
        assertTrue(registered, "registered");
        assertFalse(publicAfterUnlock, "not public when recipients provided");

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

    function test_extend_resetsUnlockBlockFromCurrentBlock() public {
        _setupVault(10, 100, true);
        vm.roll(1050); // halfway through
        dms.extend(10);
        (, uint256 unlockBlock,,,,) = dms.getVaultInfo(10);
        assertEq(unlockBlock, 1150, "reset to current block + duration");
    }

    function test_extend_revertsAfterExpiry() public {
        _setupVault(10, 100, true);
        vm.roll(1100); // exactly at unlockBlock — already unlocked
        vm.expectRevert(DeadManSwitchCondition.AlreadyUnlocked.selector);
        dms.extend(10);
    }

    function test_extend_revertsLongAfterExpiry() public {
        _setupVault(10, 100, true);
        vm.roll(2000);
        vm.expectRevert(DeadManSwitchCondition.AlreadyUnlocked.selector);
        dms.extend(10);
    }

    function test_extend_revertsForNonCreator() public {
        _setupVault(10, 100, true);
        vm.prank(alice);
        vm.expectRevert(DeadManSwitchCondition.NotCreator.selector);
        dms.extend(10);
    }

    function test_extend_revertsForUnregistered() public {
        vm.expectRevert(DeadManSwitchCondition.NotRegistered.selector);
        dms.extend(999);
    }

    function test_addToWhitelist_byCreator_succeeds() public {
        _setupVault(10, 100, true);
        dms.addToWhitelist(10, carol);
        assertTrue(dms.isWhitelisted(10, carol));
    }

    function test_addToWhitelist_byNonCreator_reverts() public {
        _setupVault(10, 100, true);
        vm.prank(alice);
        vm.expectRevert(DeadManSwitchCondition.NotCreator.selector);
        dms.addToWhitelist(10, carol);
    }

    function test_removeFromWhitelist_byCreator_succeeds() public {
        _setupVault(10, 100, true);
        dms.removeFromWhitelist(10, alice);
        assertFalse(dms.isWhitelisted(10, alice));
    }

    function test_removeFromWhitelist_deniesAccessAfterUnlock() public {
        _setupVault(10, 100, true);
        dms.removeFromWhitelist(10, alice);
        vm.roll(2000);
        assertFalse(dms.checkReadCondition(10, "", "", alice), "alice denied post-unlock");
    }

    function test_removeFromWhitelist_byNonCreator_reverts() public {
        _setupVault(10, 100, true);
        vm.prank(alice);
        vm.expectRevert(DeadManSwitchCondition.NotCreator.selector);
        dms.removeFromWhitelist(10, alice);
    }

    function test_checkWrite_onlyCreatorTrue() public {
        _setupVault(10, 100, true);
        assertTrue(dms.checkWriteCondition(10, "", "", address(this)), "creator can write");
        assertFalse(dms.checkWriteCondition(10, "", "", alice), "alice cannot write");
    }

    function test_getRemainingBlocks_beforeExpiry() public {
        _setupVault(10, 100, true);
        vm.roll(1030);
        assertEq(dms.getRemainingBlocks(10), 70, "70 blocks left");
    }

    function test_getRemainingBlocks_afterExpiryReturnsZero() public {
        _setupVault(10, 100, true);
        vm.roll(2000);
        assertEq(dms.getRemainingBlocks(10), 0, "zero after expiry");
    }

    function test_getRemainingBlocks_unregisteredReturnsZero() public {
        assertEq(dms.getRemainingBlocks(999), 0);
    }

    function test_emptyRecipients_marksPublicAfterUnlock() public {
        address[] memory recipients = new address[](0);
        vm.roll(1000);
        dms.register(77, 100, recipients, true);
        (,,,,, bool publicAfterUnlock) = dms.getVaultInfo(77);
        assertTrue(publicAfterUnlock, "public when no recipients");
    }

    function test_publicVault_allowsAnyCallerAfterUnlock() public {
        address[] memory recipients = new address[](0);
        vm.roll(1000);
        dms.register(77, 100, recipients, true);
        // Locked: non-creator cannot read even if public-after-unlock.
        assertFalse(dms.checkReadCondition(77, "", "", bob), "bob locked before expiry");
        vm.roll(1100);
        assertTrue(dms.checkReadCondition(77, "", "", bob), "bob can read after expiry");
        assertTrue(dms.checkReadCondition(77, "", "", carol), "carol can read after expiry");
    }

    function test_publicVault_doesNotLeakBeforeUnlock() public {
        address[] memory recipients = new address[](0);
        vm.roll(1000);
        dms.register(77, 100, recipients, false);
        vm.roll(1050);
        assertFalse(dms.checkReadCondition(77, "", "", bob), "bob cannot read while locked");
        assertFalse(
            dms.checkReadCondition(77, "", "", address(this)),
            "creator locked out when creatorCanRead=false"
        );
    }
}
