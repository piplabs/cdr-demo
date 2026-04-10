// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {WhitelistCondition} from "../src/WhitelistCondition.sol";

contract WhitelistConditionTest is Test {
    WhitelistCondition internal wl;
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    address internal carol = address(0xCA401);

    function setUp() public {
        wl = new WhitelistCondition();
    }

    function test_registerWithInitial_seedsWhitelist() public {
        address[] memory initial = new address[](3);
        initial[0] = alice;
        initial[1] = bob;
        initial[2] = carol;

        vm.prank(address(this));
        wl.registerWithInitial(42, initial);

        assertEq(wl.vaultCreator(42), address(this), "creator");
        assertTrue(wl.isWhitelisted(42, address(this)), "self");
        assertTrue(wl.isWhitelisted(42, alice), "alice");
        assertTrue(wl.isWhitelisted(42, bob), "bob");
        assertTrue(wl.isWhitelisted(42, carol), "carol");
    }

    function test_registerWithInitial_duplicatesHarmless() public {
        address[] memory initial = new address[](3);
        initial[0] = alice;
        initial[1] = alice;
        initial[2] = alice;

        wl.registerWithInitial(7, initial);

        assertTrue(wl.isWhitelisted(7, alice));
        assertTrue(wl.isWhitelisted(7, address(this)));
    }

    function test_registerWithInitial_emptyInitial() public {
        address[] memory initial = new address[](0);
        wl.registerWithInitial(1, initial);
        assertEq(wl.vaultCreator(1), address(this));
        assertTrue(wl.isWhitelisted(1, address(this)));
    }

    function test_registerWithInitial_revertsIfAlreadyRegistered() public {
        address[] memory initial = new address[](0);
        wl.registerWithInitial(100, initial);

        vm.prank(alice);
        vm.expectRevert(WhitelistCondition.AlreadyRegistered.selector);
        wl.registerWithInitial(100, initial);
    }

    function test_registerWithInitial_blockedAfterOldRegister() public {
        wl.register(200);

        address[] memory initial = new address[](1);
        initial[0] = alice;
        vm.expectRevert(WhitelistCondition.AlreadyRegistered.selector);
        wl.registerWithInitial(200, initial);
    }
}
