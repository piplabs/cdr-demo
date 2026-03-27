// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title TimeBasedCondition
/// @notice Generic CDR condition that gates vault access to a specific time window.
///         The time window is immutable once set. endTime of 0 means open-ended (no expiry).
contract TimeBasedCondition {
    struct TimeWindow {
        uint256 startTime;
        uint256 endTime;
        bool registered;
    }

    mapping(uint32 uuid => TimeWindow) public vaultTimeWindow;

    error AlreadyRegistered();
    error InvalidTimeWindow();

    /// @notice Register a vault UUID with an immutable time window.
    /// @param uuid The CDR vault UUID (from CDR.allocate)
    /// @param startTime Unix timestamp when access begins
    /// @param endTime Unix timestamp when access ends (0 = no end)
    function register(uint32 uuid, uint256 startTime, uint256 endTime) external {
        if (vaultTimeWindow[uuid].registered) revert AlreadyRegistered();
        if (endTime != 0 && endTime <= startTime) revert InvalidTimeWindow();

        vaultTimeWindow[uuid] = TimeWindow({
            startTime: startTime,
            endTime: endTime,
            registered: true
        });
    }

    /// @notice CDR write condition check. Returns true if current time is within the window.
    function checkWriteCondition(
        uint32 uuid,
        bytes calldata,
        bytes calldata,
        address
    ) external view returns (bool) {
        return _isWithinWindow(uuid);
    }

    /// @notice CDR read condition check. Same logic as write.
    function checkReadCondition(
        uint32 uuid,
        bytes calldata,
        bytes calldata,
        address
    ) external view returns (bool) {
        return _isWithinWindow(uuid);
    }

    function _isWithinWindow(uint32 uuid) internal view returns (bool) {
        TimeWindow storage tw = vaultTimeWindow[uuid];
        if (!tw.registered) return false;
        if (block.timestamp < tw.startTime) return false;
        if (tw.endTime != 0 && block.timestamp > tw.endTime) return false;
        return true;
    }
}
