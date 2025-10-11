// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract APIRegistry {
    struct API {
        address owner;
        string name;
        string description;
        uint256 pricePerCall; // in wei
        uint256 monthlyQuota;
        bool active;
    }

    mapping(uint256 => API) public apis;
    uint256 public apiCount;

    event APIRegistered(uint256 apiId, address owner, string name);
    event APIStatusChanged(uint256 apiId, bool active);

    function registerAPI(
        string memory name,
        string memory description,
        uint256 pricePerCall,
        uint256 monthlyQuota
    ) external returns(uint256) {
        apiCount++;
        apis[apiCount] = API(msg.sender, name, description, pricePerCall, monthlyQuota, true);
        emit APIRegistered(apiCount, msg.sender, name);
        return apiCount;
    }

    function setAPIStatus(uint256 apiId, bool active) external {
        require(msg.sender == apis[apiId].owner, "Not owner");
        apis[apiId].active = active;
        emit APIStatusChanged(apiId, active);
    }

    function getAPI(uint256 apiId) external view returns (API memory) {
    return apis[apiId];
}
}
