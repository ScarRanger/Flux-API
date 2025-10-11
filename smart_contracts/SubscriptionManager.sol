// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./APIRegistry.sol";

contract SubscriptionManager {
    struct Subscription {
        uint256 apiId;
        uint256 remainingQuota;
        uint256 expiry; // timestamp
    }

    APIRegistry public registry;

    // Mapping of user address to their subscriptions
    mapping(address => Subscription[]) public subscriptions;

    event Subscribed(address indexed user, uint256 indexed apiId, uint256 expiry);

    constructor(address _registry) {
        registry = APIRegistry(_registry);
    }

    /**
     * @notice Subscribe to an API
     * @param apiId ID of the API to subscribe
     * @param durationDays Subscription duration in days
     */
    function subscribe(uint256 apiId, uint256 durationDays) external payable {
        // Fetch API details from registry
        APIRegistry.API memory api = registry.getAPI(apiId);
        require(api.active, "API is inactive");

        // Calculate total price for subscription
        // For MVP: pricePerCall * monthlyQuota * durationDays / 30
        uint256 totalPrice = api.pricePerCall * api.monthlyQuota * durationDays / 30;
        require(msg.value >= totalPrice, "Insufficient payment");

        // Create new subscription
        subscriptions[msg.sender].push(Subscription({
            apiId: apiId,
            remainingQuota: api.monthlyQuota,
            expiry: block.timestamp + (durationDays * 1 days)
        }));

        // Emit event
        emit Subscribed(msg.sender, apiId, block.timestamp + (durationDays * 1 days));
    }

    /**
     * @notice Consume API quota
     * @param user Address of the subscriber
     * @param apiId ID of the API
     * @param calls Number of API calls to deduct
     */
    function useQuota(address user, uint256 apiId, uint256 calls) external {
        Subscription[] storage subs = subscriptions[user];
        for (uint i = 0; i < subs.length; i++) {
            if (subs[i].apiId == apiId && subs[i].expiry >= block.timestamp) {
                require(subs[i].remainingQuota >= calls, "Quota exceeded");
                subs[i].remainingQuota -= calls;
                return;
            }
        }
        revert("No active subscription found");
    }

    /**
     * @notice Get number of subscriptions a user has
     */
    function getUserSubscriptionCount(address user) external view returns(uint256) {
        return subscriptions[user].length;
    }

    /**
     * @notice Get subscription details by index
     */
    function getUserSubscription(address user, uint256 index) external view returns(Subscription memory) {
        require(index < subscriptions[user].length, "Invalid index");
        return subscriptions[user][index];
    }
}
