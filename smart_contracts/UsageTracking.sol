// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract UsageTracking {
    struct Usage {
        uint256 timestamp;
        uint256 calls;
    }

    mapping(address => mapping(uint256 => Usage[])) public usageLog;

    event UsageLogged(address user, uint256 apiId, uint256 calls);

    function logUsage(address user, uint256 apiId, uint256 calls) external {
        usageLog[user][apiId].push(Usage(block.timestamp, calls));
        emit UsageLogged(user, apiId, calls);
    }
}
