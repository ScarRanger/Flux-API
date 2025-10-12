// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title KeeperNodeStaking
 * @dev Enhanced keeper node registry with staking, reputation, and slashing mechanisms
 * @notice Keeper nodes must stake collateral to participate in the network
 */
contract KeeperNodeStaking {
    
    // Minimum stake required to register as a keeper node (0.1 ETH)
    uint256 public constant MIN_STAKE = 0.1 ether;
    
    // Slash amounts for different violation types
    uint256 public constant SLASH_MINOR = 0.01 ether;      // 10% of min stake
    uint256 public constant SLASH_MODERATE = 0.05 ether;   // 50% of min stake
    uint256 public constant SLASH_SEVERE = 0.1 ether;      // 100% of min stake
    
    // Reputation thresholds
    uint256 public constant REPUTATION_EXCELLENT = 95;
    uint256 public constant REPUTATION_GOOD = 80;
    uint256 public constant REPUTATION_FAIR = 60;
    uint256 public constant REPUTATION_POOR = 40;
    
    // Time locks
    uint256 public constant UNSTAKE_LOCK_PERIOD = 7 days;
    uint256 public constant CHALLENGE_PERIOD = 1 days;
    
    struct KeeperNode {
        address nodeAddress;
        address owner;
        uint256 stakedAmount;
        uint256 reputationScore;        // 0-100 score
        uint256 totalTasksCompleted;
        uint256 totalTasksFailed;
        uint256 totalSlashCount;
        uint256 registrationTime;
        uint256 lastActivityTime;
        uint256 unstakeRequestTime;     // 0 if no unstake request
        bool isActive;
        bool isSuspended;
        string nodeMetadata;            // IPFS hash or JSON metadata
    }
    
    struct SlashEvent {
        address node;
        address reporter;
        uint256 amount;
        uint256 timestamp;
        SlashReason reason;
        string evidence;                // IPFS hash of evidence
        bool disputed;
        bool resolved;
    }
    
    enum SlashReason {
        API_KEY_THEFT,
        DATA_TAMPERING,
        DOWNTIME_VIOLATION,
        MALICIOUS_BEHAVIOR,
        RESPONSE_MANIPULATION,
        UNAUTHORIZED_ACCESS
    }
    
    // Storage
    mapping(address => KeeperNode) public keeperNodes;
    mapping(uint256 => SlashEvent) public slashEvents;
    mapping(address => uint256[]) public nodeSlashHistory;
    
    address[] public activeNodes;
    uint256 public totalStaked;
    uint256 public slashEventCounter;
    
    address public admin;
    address public slashingContract;    // Contract authorized to slash
    
    // Events
    event NodeRegistered(
        address indexed nodeAddress,
        address indexed owner,
        uint256 stakedAmount,
        uint256 timestamp
    );
    
    event StakeIncreased(
        address indexed nodeAddress,
        uint256 additionalStake,
        uint256 newTotal
    );
    
    event UnstakeRequested(
        address indexed nodeAddress,
        uint256 amount,
        uint256 unlockTime
    );
    
    event UnstakeCompleted(
        address indexed nodeAddress,
        uint256 amount
    );
    
    event NodeSlashed(
        address indexed nodeAddress,
        uint256 slashId,
        uint256 amount,
        SlashReason reason,
        address reporter
    );
    
    event ReputationUpdated(
        address indexed nodeAddress,
        uint256 oldScore,
        uint256 newScore
    );
    
    event NodeSuspended(
        address indexed nodeAddress,
        string reason
    );
    
    event NodeReactivated(
        address indexed nodeAddress
    );
    
    event TaskCompleted(
        address indexed nodeAddress,
        bool success
    );
    
    event SlashDisputed(
        uint256 indexed slashId,
        address indexed node,
        string disputeReason
    );
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    modifier onlySlashingContract() {
        require(msg.sender == slashingContract || msg.sender == admin, "Not authorized");
        _;
    }
    
    modifier onlyActiveNode() {
        require(keeperNodes[msg.sender].isActive, "Node not active");
        require(!keeperNodes[msg.sender].isSuspended, "Node suspended");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    /**
     * @dev Register a new keeper node with staking
     * @param metadata IPFS hash or JSON with node info (location, capacity, etc.)
     */
    function registerNode(string memory metadata) external payable {
        require(msg.value >= MIN_STAKE, "Insufficient stake");
        require(!keeperNodes[msg.sender].isActive, "Already registered");
        require(bytes(metadata).length > 0, "Metadata required");
        
        keeperNodes[msg.sender] = KeeperNode({
            nodeAddress: msg.sender,
            owner: msg.sender,
            stakedAmount: msg.value,
            reputationScore: 100,           // Start with perfect score
            totalTasksCompleted: 0,
            totalTasksFailed: 0,
            totalSlashCount: 0,
            registrationTime: block.timestamp,
            lastActivityTime: block.timestamp,
            unstakeRequestTime: 0,
            isActive: true,
            isSuspended: false,
            nodeMetadata: metadata
        });
        
        activeNodes.push(msg.sender);
        totalStaked += msg.value;
        
        emit NodeRegistered(msg.sender, msg.sender, msg.value, block.timestamp);
    }
    
    /**
     * @dev Increase stake to improve standing
     */
    function increaseStake() external payable onlyActiveNode {
        require(msg.value > 0, "Amount must be > 0");
        
        keeperNodes[msg.sender].stakedAmount += msg.value;
        totalStaked += msg.value;
        
        emit StakeIncreased(msg.sender, msg.value, keeperNodes[msg.sender].stakedAmount);
    }
    
    /**
     * @dev Request to unstake (starts lock period)
     */
    function requestUnstake() external onlyActiveNode {
        require(keeperNodes[msg.sender].unstakeRequestTime == 0, "Already requested");
        
        keeperNodes[msg.sender].unstakeRequestTime = block.timestamp;
        keeperNodes[msg.sender].isActive = false;
        
        emit UnstakeRequested(
            msg.sender,
            keeperNodes[msg.sender].stakedAmount,
            block.timestamp + UNSTAKE_LOCK_PERIOD
        );
    }
    
    /**
     * @dev Complete unstake after lock period
     */
    function completeUnstake() external {
        KeeperNode storage node = keeperNodes[msg.sender];
        
        require(node.unstakeRequestTime > 0, "No unstake request");
        require(
            block.timestamp >= node.unstakeRequestTime + UNSTAKE_LOCK_PERIOD,
            "Lock period not ended"
        );
        
        uint256 amount = node.stakedAmount;
        require(amount > 0, "No stake to withdraw");
        
        // Reset node
        node.stakedAmount = 0;
        node.isActive = false;
        totalStaked -= amount;
        
        // Transfer stake back
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit UnstakeCompleted(msg.sender, amount);
    }
    
    /**
     * @dev Slash a keeper node for violations
     * @param nodeAddress Address of the node to slash
     * @param reason Reason for slashing
     * @param evidence IPFS hash of evidence
     */
    function slashNode(
        address nodeAddress,
        SlashReason reason,
        string memory evidence
    ) external onlySlashingContract returns (uint256) {
        KeeperNode storage node = keeperNodes[nodeAddress];
        require(node.isActive || node.stakedAmount > 0, "Node not found");
        
        // Determine slash amount based on reason
        uint256 slashAmount = getSlashAmount(reason);
        
        if (node.stakedAmount < slashAmount) {
            slashAmount = node.stakedAmount;
        }
        
        // Execute slash
        node.stakedAmount -= slashAmount;
        node.totalSlashCount += 1;
        totalStaked -= slashAmount;
        
        // Record slash event
        uint256 slashId = slashEventCounter++;
        slashEvents[slashId] = SlashEvent({
            node: nodeAddress,
            reporter: msg.sender,
            amount: slashAmount,
            timestamp: block.timestamp,
            reason: reason,
            evidence: evidence,
            disputed: false,
            resolved: false
        });
        
        nodeSlashHistory[nodeAddress].push(slashId);
        
        // Update reputation (separate call)
        _decreaseReputation(nodeAddress, reason);
        
        // Suspend if stake too low
        if (node.stakedAmount < MIN_STAKE) {
            node.isSuspended = true;
            emit NodeSuspended(nodeAddress, "Stake below minimum");
        }
        
        emit NodeSlashed(nodeAddress, slashId, slashAmount, reason, msg.sender);
        
        return slashId;
    }
    
    /**
     * @dev Record task completion (success or failure)
     */
    function recordTaskCompletion(address nodeAddress, bool success) 
        external 
        onlySlashingContract 
    {
        KeeperNode storage node = keeperNodes[nodeAddress];
        require(node.isActive, "Node not active");
        
        if (success) {
            node.totalTasksCompleted += 1;
            _increaseReputation(nodeAddress);
        } else {
            node.totalTasksFailed += 1;
            _decreaseReputation(nodeAddress, SlashReason.DOWNTIME_VIOLATION);
        }
        
        node.lastActivityTime = block.timestamp;
        
        emit TaskCompleted(nodeAddress, success);
    }
    
    /**
     * @dev Dispute a slash event
     */
    function disputeSlash(uint256 slashId, string memory disputeReason) external {
        SlashEvent storage slashEvt = slashEvents[slashId];
        require(slashEvt.node == msg.sender, "Not your slash");
        require(!slashEvt.resolved, "Already resolved");
        require(!slashEvt.disputed, "Already disputed");
        require(
            block.timestamp <= slashEvt.timestamp + CHALLENGE_PERIOD,
            "Challenge period ended"
        );
        
        slashEvt.disputed = true;
        
        emit SlashDisputed(slashId, msg.sender, disputeReason);
    }
    
    /**
     * @dev Get slash amount based on violation severity
     */
    function getSlashAmount(SlashReason reason) public pure returns (uint256) {
        if (reason == SlashReason.API_KEY_THEFT || 
            reason == SlashReason.MALICIOUS_BEHAVIOR) {
            return SLASH_SEVERE;
        } else if (reason == SlashReason.DATA_TAMPERING || 
                   reason == SlashReason.UNAUTHORIZED_ACCESS) {
            return SLASH_MODERATE;
        } else {
            return SLASH_MINOR;
        }
    }
    
    /**
     * @dev Calculate reputation based on task history
     */
    function calculateReputation(address nodeAddress) public view returns (uint256) {
        KeeperNode storage node = keeperNodes[nodeAddress];
        
        if (node.totalTasksCompleted + node.totalTasksFailed == 0) {
            return 100;
        }
        
        uint256 successRate = (node.totalTasksCompleted * 100) / 
            (node.totalTasksCompleted + node.totalTasksFailed);
        
        // Penalize for slashes
        uint256 slashPenalty = node.totalSlashCount * 10;
        if (slashPenalty > successRate) {
            return 0;
        }
        
        return successRate - slashPenalty;
    }
    
    /**
     * @dev Get node reputation tier
     */
    function getReputationTier(address nodeAddress) public view returns (string memory) {
        uint256 score = keeperNodes[nodeAddress].reputationScore;
        
        if (score >= REPUTATION_EXCELLENT) return "EXCELLENT";
        if (score >= REPUTATION_GOOD) return "GOOD";
        if (score >= REPUTATION_FAIR) return "FAIR";
        if (score >= REPUTATION_POOR) return "POOR";
        return "CRITICAL";
    }
    
    /**
     * @dev Get all active keeper nodes
     */
    function getActiveNodes() external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < activeNodes.length; i++) {
            if (keeperNodes[activeNodes[i]].isActive && 
                !keeperNodes[activeNodes[i]].isSuspended) {
                count++;
            }
        }
        
        address[] memory active = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < activeNodes.length; i++) {
            if (keeperNodes[activeNodes[i]].isActive && 
                !keeperNodes[activeNodes[i]].isSuspended) {
                active[index] = activeNodes[i];
                index++;
            }
        }
        
        return active;
    }
    
    /**
     * @dev Get node slash history
     */
    function getNodeSlashHistory(address nodeAddress) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return nodeSlashHistory[nodeAddress];
    }
    
    /**
     * @dev Check if node is eligible for task assignment
     */
    function isNodeEligible(address nodeAddress) external view returns (bool) {
        KeeperNode storage node = keeperNodes[nodeAddress];
        
        return node.isActive &&
               !node.isSuspended &&
               node.stakedAmount >= MIN_STAKE &&
               node.reputationScore >= REPUTATION_POOR;
    }
    
    // Internal functions
    
    function _increaseReputation(address nodeAddress) internal {
        KeeperNode storage node = keeperNodes[nodeAddress];
        uint256 oldScore = node.reputationScore;
        
        if (node.reputationScore < 100) {
            node.reputationScore += 1;
        }
        
        emit ReputationUpdated(nodeAddress, oldScore, node.reputationScore);
    }
    
    function _decreaseReputation(address nodeAddress, SlashReason reason) internal {
        KeeperNode storage node = keeperNodes[nodeAddress];
        uint256 oldScore = node.reputationScore;
        uint256 penalty;
        
        if (reason == SlashReason.API_KEY_THEFT || 
            reason == SlashReason.MALICIOUS_BEHAVIOR) {
            penalty = 20;
        } else if (reason == SlashReason.DATA_TAMPERING || 
                   reason == SlashReason.UNAUTHORIZED_ACCESS) {
            penalty = 10;
        } else {
            penalty = 5;
        }
        
        if (node.reputationScore >= penalty) {
            node.reputationScore -= penalty;
        } else {
            node.reputationScore = 0;
        }
        
        emit ReputationUpdated(nodeAddress, oldScore, node.reputationScore);
    }
    
    // Admin functions
    
    function setSlashingContract(address _slashingContract) external onlyAdmin {
        slashingContract = _slashingContract;
    }
    
    function suspendNode(address nodeAddress, string memory reason) external onlyAdmin {
        keeperNodes[nodeAddress].isSuspended = true;
        emit NodeSuspended(nodeAddress, reason);
    }
    
    function reactivateNode(address nodeAddress) external onlyAdmin {
        require(keeperNodes[nodeAddress].stakedAmount >= MIN_STAKE, "Insufficient stake");
        keeperNodes[nodeAddress].isSuspended = false;
        emit NodeReactivated(nodeAddress);
    }
    
    function resolveDispute(uint256 slashId, bool refundSlash) external onlyAdmin {
        SlashEvent storage slashEvt = slashEvents[slashId];
        require(slashEvt.disputed, "Not disputed");
        require(!slashEvt.resolved, "Already resolved");
        
        slashEvt.resolved = true;
        
        if (refundSlash) {
            KeeperNode storage node = keeperNodes[slashEvt.node];
            node.stakedAmount += slashEvt.amount;
            node.totalSlashCount -= 1;
            totalStaked += slashEvt.amount;
        }
    }
    
    // Emergency functions
    
    function emergencyWithdraw() external onlyAdmin {
        (bool success, ) = payable(admin).call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }
    
    receive() external payable {}
}
