// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./APIRegistry.sol";

contract PaymentEscrow {
    mapping(address => uint256) public balances;

    function deposit(address seller) external payable {
        balances[seller] += msg.value;
    }

    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        balances[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }
}
