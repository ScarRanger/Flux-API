// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AccessTokenManager {
    struct Token {
        address user;
        uint256 apiId;
        uint256 expiry;
        uint256 quota;
        bool valid;
    }

    mapping(bytes32 => Token) public tokens;

    event TokenIssued(bytes32 tokenId, address user, uint256 apiId, uint256 expiry);

    function issueToken(address user, uint256 apiId, uint256 quota, uint256 durationSec) external returns(bytes32) {
        bytes32 tokenId = keccak256(abi.encodePacked(user, apiId, block.timestamp));
        tokens[tokenId] = Token(user, apiId, block.timestamp + durationSec, quota, true);
        emit TokenIssued(tokenId, user, apiId, block.timestamp + durationSec);
        return tokenId;
    }

    function invalidateToken(bytes32 tokenId) external {
        tokens[tokenId].valid = false;
    }

    function isValid(bytes32 tokenId) external view returns(bool) {
        Token memory t = tokens[tokenId];
        return t.valid && t.expiry >= block.timestamp && t.quota > 0;
    }
}
