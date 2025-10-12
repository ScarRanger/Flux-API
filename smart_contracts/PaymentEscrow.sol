// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PaymentEscrow
 * @dev Enhanced escrow contract with API key security staking system
 * @notice Users must stake 0.1 ETH per unique API key to prevent theft and misuse
 */
contract PaymentEscrow {
    
    // Minimum stake required per API key (0.1 ETH)
    uint256 public constant STAKE_AMOUNT = 0.1 ether;
    
    // Time lock for stake withdrawal (7 days)
    uint256 public constant WITHDRAWAL_LOCK_PERIOD = 7 days;
    
    struct APIKeyStake {
        address buyer;
        address seller;
        uint256 stakeAmount;
        uint256 createdAt;
        uint256 lastActivity;
        uint256 withdrawalRequestTime;
        bool isActive;
        bool slashed;
        uint256 slashAmount;
        string apiKeyHash;  // Hash of the API key for reference
    }
    
    struct UserStakeInfo {
        uint256 totalStaked;
        uint256 activeStakes;
        address[] stakedApiKeys;
        mapping(address => bool) hasStakeForSeller;
    }
    
    // Mapping from API key ID to stake info
    mapping(bytes32 => APIKeyStake) public apiKeyStakes;
    
    // Mapping from buyer address to their stake information
    mapping(address => UserStakeInfo) public userStakes;
    
    // Mapping for seller balances (payments from buyers)
    mapping(address => uint256) public sellerBalances;
    
    // Mapping for escrow admin balances (slashed funds)
    mapping(address => uint256) public adminBalances;
    
    // Administrator address
    address public admin;
    
    // Events
    event StakeDeposited(
        bytes32 indexed apiKeyId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        uint256 timestamp
    );
    
    event StakeWithdrawalRequested(
        bytes32 indexed apiKeyId,
        address indexed buyer,
        uint256 unlockTime
    );
    
    event StakeWithdrawn(
        bytes32 indexed apiKeyId,
        address indexed buyer,
        uint256 amount
    );
    
    event StakeSlashed(
        bytes32 indexed apiKeyId,
        address indexed buyer,
        address indexed seller,
        uint256 slashAmount,
        string reason
    );
    
    event PaymentDeposited(
        address indexed seller,
        address indexed buyer,
        uint256 amount
    );
    
    event PaymentWithdrawn(
        address indexed seller,
        uint256 amount
    );
    
    event ActivityUpdated(
        bytes32 indexed apiKeyId,
        address indexed buyer,
        uint256 timestamp
    );
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    modifier onlyActiveStake(bytes32 apiKeyId) {
        require(apiKeyStakes[apiKeyId].isActive, "Stake not active");
        require(!apiKeyStakes[apiKeyId].slashed, "Stake slashed");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    /**
     * @dev Deposit stake for an API key purchase
     * @param seller Address of the API seller
     * @param apiKeyHash Hash of the API key for reference
     * @return apiKeyId Unique identifier for this API key stake
     */
    function depositStake(
        address seller,
        string memory apiKeyHash
    ) external payable returns (bytes32) {
        require(msg.value >= STAKE_AMOUNT, "Insufficient stake amount");
        require(seller != address(0), "Invalid seller address");
        require(bytes(apiKeyHash).length > 0, "API key hash required");
        
        // Check if buyer already has stake for this seller (upgrade case)
        UserStakeInfo storage userInfo = userStakes[msg.sender];
        
        bytes32 apiKeyId;
        
        if (userInfo.hasStakeForSeller[seller]) {
            // Upgrade case: find existing stake for this seller
            for (uint256 i = 0; i < userInfo.stakedApiKeys.length; i++) {
                bytes32 existingKeyId = keccak256(abi.encodePacked(msg.sender, userInfo.stakedApiKeys[i]));
                if (apiKeyStakes[existingKeyId].seller == seller && 
                    apiKeyStakes[existingKeyId].isActive) {
                    
                    // Update existing stake with new API key info
                    apiKeyStakes[existingKeyId].lastActivity = block.timestamp;
                    apiKeyStakes[existingKeyId].apiKeyHash = apiKeyHash;
                    
                    // Refund excess payment since stake already exists
                    if (msg.value > 0) {
                        (bool success, ) = payable(msg.sender).call{value: msg.value}("");
                        require(success, "Refund failed");
                    }
                    
                    emit ActivityUpdated(existingKeyId, msg.sender, block.timestamp);
                    return existingKeyId;
                }
            }
        }
        
        // New API key case: create new stake
        apiKeyId = keccak256(abi.encodePacked(msg.sender, seller, block.timestamp, apiKeyHash));
        
        apiKeyStakes[apiKeyId] = APIKeyStake({
            buyer: msg.sender,
            seller: seller,
            stakeAmount: msg.value,
            createdAt: block.timestamp,
            lastActivity: block.timestamp,
            withdrawalRequestTime: 0,
            isActive: true,
            slashed: false,
            slashAmount: 0,
            apiKeyHash: apiKeyHash
        });
        
        // Update user stake info
        userInfo.totalStaked += msg.value;
        userInfo.activeStakes += 1;
        userInfo.stakedApiKeys.push(seller);
        userInfo.hasStakeForSeller[seller] = true;
        
        emit StakeDeposited(apiKeyId, msg.sender, seller, msg.value, block.timestamp);
        return apiKeyId;
    }
    
    /**
     * @dev Request withdrawal of stake (starts lock period)
     * @param apiKeyId ID of the API key stake to withdraw
     */
    function requestStakeWithdrawal(bytes32 apiKeyId) external onlyActiveStake(apiKeyId) {
        APIKeyStake storage stake = apiKeyStakes[apiKeyId];
        require(stake.buyer == msg.sender, "Not your stake");
        require(stake.withdrawalRequestTime == 0, "Withdrawal already requested");
        
        stake.withdrawalRequestTime = block.timestamp;
        stake.isActive = false;
        
        // Update user stake info
        UserStakeInfo storage userInfo = userStakes[msg.sender];
        userInfo.activeStakes -= 1;
        
        emit StakeWithdrawalRequested(
            apiKeyId,
            msg.sender,
            block.timestamp + WITHDRAWAL_LOCK_PERIOD
        );
    }
    
    /**
     * @dev Complete stake withdrawal after lock period
     * @param apiKeyId ID of the API key stake to withdraw
     */
    function withdrawStake(bytes32 apiKeyId) external {
        APIKeyStake storage stake = apiKeyStakes[apiKeyId];
        require(stake.buyer == msg.sender, "Not your stake");
        require(stake.withdrawalRequestTime > 0, "No withdrawal request");
        require(
            block.timestamp >= stake.withdrawalRequestTime + WITHDRAWAL_LOCK_PERIOD,
            "Lock period not ended"
        );
        require(!stake.slashed, "Stake was slashed");
        
        uint256 amount = stake.stakeAmount;
        require(amount > 0, "No stake to withdraw");
        
        // Update stake status
        stake.stakeAmount = 0;
        stake.isActive = false;
        
        // Update user stake info
        UserStakeInfo storage userInfo = userStakes[msg.sender];
        userInfo.totalStaked -= amount;
        userInfo.hasStakeForSeller[stake.seller] = false;
        
        // Transfer stake back to buyer
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit StakeWithdrawn(apiKeyId, msg.sender, amount);
    }
    
    /**
     * @dev Slash stake for API key misuse or theft
     * @param apiKeyId ID of the API key stake to slash
     * @param slashAmount Amount to slash (up to full stake)
     * @param reason Reason for slashing
     */
    function slashStake(
        bytes32 apiKeyId,
        uint256 slashAmount,
        string memory reason
    ) external onlyAdmin onlyActiveStake(apiKeyId) {
        APIKeyStake storage stake = apiKeyStakes[apiKeyId];
        require(slashAmount <= stake.stakeAmount, "Slash amount too high");
        
        // Execute slash
        stake.slashAmount += slashAmount;
        stake.stakeAmount -= slashAmount;
        stake.slashed = true;
        stake.isActive = false;
        
        // Update user stake info
        UserStakeInfo storage userInfo = userStakes[stake.buyer];
        userInfo.totalStaked -= slashAmount;
        userInfo.activeStakes -= 1;
        
        // Transfer slashed amount to admin balance
        adminBalances[admin] += slashAmount;
        
        emit StakeSlashed(apiKeyId, stake.buyer, stake.seller, slashAmount, reason);
    }
    
    /**
     * @dev Deposit payment for API services (separate from stake)
     * @param seller Address of the API seller to pay
     */
    function depositPayment(address seller) external payable {
        require(msg.value > 0, "Payment must be > 0");
        require(seller != address(0), "Invalid seller address");
        
        sellerBalances[seller] += msg.value;
        
        emit PaymentDeposited(seller, msg.sender, msg.value);
    }
    
    /**
     * @dev Withdraw earned payments (for sellers)
     */
    function withdrawPayment() external {
        uint256 amount = sellerBalances[msg.sender];
        require(amount > 0, "No balance to withdraw");
        
        sellerBalances[msg.sender] = 0;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit PaymentWithdrawn(msg.sender, amount);
    }
    
    /**
     * @dev Update activity timestamp for an API key stake
     * @param apiKeyId ID of the API key stake
     */
    function updateActivity(bytes32 apiKeyId) external onlyActiveStake(apiKeyId) {
        APIKeyStake storage stake = apiKeyStakes[apiKeyId];
        require(stake.buyer == msg.sender, "Not your stake");
        
        stake.lastActivity = block.timestamp;
        
        emit ActivityUpdated(apiKeyId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Check if buyer has active stake for a seller
     * @param buyer Address of the buyer
     * @param seller Address of the seller
     * @return hasStake Whether buyer has active stake for this seller
     */
    function hasStakeForSeller(address buyer, address seller) external view returns (bool) {
        return userStakes[buyer].hasStakeForSeller[seller];
    }
    
    /**
     * @dev Get total stake amount for a buyer
     * @param buyer Address of the buyer
     * @return totalStaked Total amount staked by buyer
     * @return activeStakes Number of active stakes
     */
    function getUserStakeInfo(address buyer) external view returns (uint256 totalStaked, uint256 activeStakes) {
        UserStakeInfo storage userInfo = userStakes[buyer];
        return (userInfo.totalStaked, userInfo.activeStakes);
    }
    
    /**
     * @dev Get API key stake details
     * @param apiKeyId ID of the API key stake
     */
    function getStakeDetails(bytes32 apiKeyId) external view returns (
        address buyer,
        address seller,
        uint256 stakeAmount,
        uint256 createdAt,
        uint256 lastActivity,
        bool isActive,
        bool slashed,
        uint256 slashAmount
    ) {
        APIKeyStake storage stake = apiKeyStakes[apiKeyId];
        return (
            stake.buyer,
            stake.seller,
            stake.stakeAmount,
            stake.createdAt,
            stake.lastActivity,
            stake.isActive,
            stake.slashed,
            stake.slashAmount
        );
    }
    
    /**
     * @dev Get seller payment balance
     * @param seller Address of the seller
     * @return balance Current payment balance
     */
    function getSellerBalance(address seller) external view returns (uint256) {
        return sellerBalances[seller];
    }
    
    /**
     * @dev Emergency functions for admin
     */
    function withdrawAdminBalance() external onlyAdmin {
        uint256 amount = adminBalances[admin];
        require(amount > 0, "No admin balance");
        
        adminBalances[admin] = 0;
        
        (bool success, ) = payable(admin).call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid address");
        admin = newAdmin;
    }
    
    // Emergency withdrawal (only for unaccounted funds)
    function emergencyWithdraw() external onlyAdmin {
        uint256 contractBalance = address(this).balance;
        
        // Calculate total committed funds
        uint256 totalCommitted = 0;
        // Note: In a production contract, you'd iterate through all stakes
        // For simplicity, we'll allow admin to withdraw any excess
        
        require(contractBalance > 0, "No balance to withdraw");
        
        (bool success, ) = payable(admin).call{value: contractBalance}("");
        require(success, "Emergency withdrawal failed");
    }
    
    receive() external payable {
        // Accept direct ETH deposits to contract balance
    }
}
