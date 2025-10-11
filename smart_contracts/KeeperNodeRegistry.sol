// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract KeeperNodeRegistry {
    struct Node {
        address owner;
        uint256 stake;
        uint256 reputation;
        bool active;
    }

    mapping(address => Node) public nodes;

    event NodeRegistered(address node, uint256 stake);
    event NodeSlashed(address node, uint256 amount);

    function registerNode() external payable {
        require(msg.value > 0, "Stake required");
        nodes[msg.sender] = Node(msg.sender, msg.value, 0, true);
        emit NodeRegistered(msg.sender, msg.value);
    }

    function slashNode(address node, uint256 amount) external {
        require(nodes[node].stake >= amount, "Insufficient stake");
        nodes[node].stake -= amount;
        nodes[node].reputation -= 1;
        emit NodeSlashed(node, amount);
    }
}
