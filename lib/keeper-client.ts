import { ethers } from 'ethers'

// Import the ABI (you'll need to generate this after compiling the contract)
const KEEPER_STAKING_ABI = [
  "function registerNode(string memory metadata) external payable",
  "function increaseStake() external payable",
  "function requestUnstake() external",
  "function completeUnstake() external",
  "function slashNode(address nodeAddress, uint8 reason, string memory evidence) external",
  "function recordTaskCompletion(address nodeAddress, bool success) external",
  "function disputeSlash(uint256 slashId, string memory reason) external payable",
  "function suspendNode(address nodeAddress) external",
  "function reactivateNode(address nodeAddress) external",
  "function resolveDispute(uint256 slashId, bool approved, uint256 amountToRestore) external",
  "function getNodeInfo(address nodeAddress) external view returns (tuple(address nodeAddress, address owner, uint256 stakedAmount, uint256 reputationScore, bool isActive, bool isSuspended, uint256 totalTasksCompleted, uint256 totalTasksFailed, uint256 slashCount, uint256 registrationTime, uint256 lastActivityTime, uint256 unstakeRequestTime))",
  "function getActiveNodes() external view returns (address[] memory)",
  "function getNodeSlashHistory(address nodeAddress) external view returns (tuple(uint256 slashId, address nodeAddress, uint8 reason, uint8 severity, uint256 slashAmount, string evidence, uint256 timestamp, address slashedBy, bool isDisputed)[] memory)",
  "function isNodeEligible(address nodeAddress) external view returns (bool)",
  "function calculateReputation(address nodeAddress) external view returns (uint256)",
  "event NodeRegistered(address indexed nodeAddress, address indexed owner, uint256 stakedAmount)",
  "event StakeIncreased(address indexed nodeAddress, uint256 amount, uint256 newStake)",
  "event UnstakeRequested(address indexed nodeAddress, uint256 unlockTime)",
  "event UnstakeCompleted(address indexed nodeAddress, uint256 amount)",
  "event NodeSlashed(address indexed nodeAddress, uint8 reason, uint256 slashAmount, uint256 newStake)",
  "event ReputationUpdated(address indexed nodeAddress, uint256 oldScore, uint256 newScore)",
  "event TaskCompleted(address indexed nodeAddress, bool success, uint256 newReputation)",
  "event NodeSuspended(address indexed nodeAddress, string reason)",
  "event NodeReactivated(address indexed nodeAddress)",
  "event SlashDisputed(uint256 indexed slashId, address indexed nodeAddress, uint256 challengeDeadline)",
  "event DisputeResolved(uint256 indexed slashId, bool approved, uint256 amountRestored)"
]

export interface KeeperNode {
  nodeAddress: string
  owner: string
  stakedAmount: string
  reputationScore: number
  isActive: boolean
  isSuspended: boolean
  totalTasksCompleted: number
  totalTasksFailed: number
  slashCount: number
  registrationTime: number
  lastActivityTime: number
  unstakeRequestTime: number
}

export interface SlashEvent {
  slashId: number
  nodeAddress: string
  reason: number
  severity: number
  slashAmount: string
  evidence: string
  timestamp: number
  slashedBy: string
  isDisputed: boolean
}

export enum SlashReason {
  API_KEY_THEFT = 0,
  DATA_TAMPERING = 1,
  DOWNTIME_VIOLATION = 2,
  MALICIOUS_BEHAVIOR = 3,
  RESPONSE_MANIPULATION = 4,
  UNAUTHORIZED_ACCESS = 5
}

export enum SlashSeverity {
  MINOR = 0,
  MODERATE = 1,
  SEVERE = 2
}

export class KeeperStakingClient {
  private contract: ethers.Contract
  private provider: ethers.Provider
  private signer?: ethers.Signer

  constructor(
    contractAddress: string,
    providerOrSigner: ethers.Provider | ethers.Signer
  ) {
    if ('signMessage' in providerOrSigner) {
      // It's a Signer
      this.signer = providerOrSigner as ethers.Signer
      this.provider = providerOrSigner.provider!
    } else {
      // It's a Provider
      this.provider = providerOrSigner as ethers.Provider
    }

    this.contract = new ethers.Contract(
      contractAddress,
      KEEPER_STAKING_ABI,
      this.signer || this.provider
    )
  }

  // ========== Registration ==========

  async registerNode(metadata: string, stakeAmount: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) {
      throw new Error('Signer required for this operation')
    }

    const stakeWei = ethers.parseEther(stakeAmount)
    
    if (parseFloat(stakeAmount) < 0.1) {
      throw new Error('Minimum stake is 0.1 ETH')
    }

    return await this.contract.registerNode(metadata, { value: stakeWei })
  }

  async increaseStake(amount: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) {
      throw new Error('Signer required for this operation')
    }

    const amountWei = ethers.parseEther(amount)
    return await this.contract.increaseStake({ value: amountWei })
  }

  // ========== Unstaking ==========

  async requestUnstake(): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) {
      throw new Error('Signer required for this operation')
    }

    return await this.contract.requestUnstake()
  }

  async completeUnstake(): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) {
      throw new Error('Signer required for this operation')
    }

    return await this.contract.completeUnstake()
  }

  // ========== Slashing ==========

  async slashNode(
    nodeAddress: string,
    reason: SlashReason,
    evidence: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) {
      throw new Error('Signer required for this operation')
    }

    return await this.contract.slashNode(nodeAddress, reason, evidence)
  }

  async disputeSlash(slashId: number, reason: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) {
      throw new Error('Signer required for this operation')
    }

    // 0.01 ETH dispute fee
    const disputeFee = ethers.parseEther('0.01')
    return await this.contract.disputeSlash(slashId, reason, { value: disputeFee })
  }

  async resolveDispute(
    slashId: number,
    approved: boolean,
    amountToRestore: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) {
      throw new Error('Signer required for this operation')
    }

    const amountWei = ethers.parseEther(amountToRestore)
    return await this.contract.resolveDispute(slashId, approved, amountWei)
  }

  // ========== Task Management ==========

  async recordTaskCompletion(
    nodeAddress: string,
    success: boolean
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) {
      throw new Error('Signer required for this operation')
    }

    return await this.contract.recordTaskCompletion(nodeAddress, success)
  }

  // ========== Node Management ==========

  async suspendNode(nodeAddress: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) {
      throw new Error('Signer required for this operation')
    }

    return await this.contract.suspendNode(nodeAddress)
  }

  async reactivateNode(nodeAddress: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) {
      throw new Error('Signer required for this operation')
    }

    return await this.contract.reactivateNode(nodeAddress)
  }

  // ========== View Functions ==========

  async getNodeInfo(nodeAddress: string): Promise<KeeperNode> {
    const nodeInfo = await this.contract.getNodeInfo(nodeAddress)
    
    return {
      nodeAddress: nodeInfo.nodeAddress,
      owner: nodeInfo.owner,
      stakedAmount: ethers.formatEther(nodeInfo.stakedAmount),
      reputationScore: Number(nodeInfo.reputationScore),
      isActive: nodeInfo.isActive,
      isSuspended: nodeInfo.isSuspended,
      totalTasksCompleted: Number(nodeInfo.totalTasksCompleted),
      totalTasksFailed: Number(nodeInfo.totalTasksFailed),
      slashCount: Number(nodeInfo.slashCount),
      registrationTime: Number(nodeInfo.registrationTime),
      lastActivityTime: Number(nodeInfo.lastActivityTime),
      unstakeRequestTime: Number(nodeInfo.unstakeRequestTime)
    }
  }

  async getActiveNodes(): Promise<string[]> {
    return await this.contract.getActiveNodes()
  }

  async getNodeSlashHistory(nodeAddress: string): Promise<SlashEvent[]> {
    const slashes = await this.contract.getNodeSlashHistory(nodeAddress)
    
    return slashes.map((slash: any) => ({
      slashId: Number(slash.slashId),
      nodeAddress: slash.nodeAddress,
      reason: Number(slash.reason),
      severity: Number(slash.severity),
      slashAmount: ethers.formatEther(slash.slashAmount),
      evidence: slash.evidence,
      timestamp: Number(slash.timestamp),
      slashedBy: slash.slashedBy,
      isDisputed: slash.isDisputed
    }))
  }

  async isNodeEligible(nodeAddress: string): Promise<boolean> {
    return await this.contract.isNodeEligible(nodeAddress)
  }

  async calculateReputation(nodeAddress: string): Promise<number> {
    const reputation = await this.contract.calculateReputation(nodeAddress)
    return Number(reputation)
  }

  // ========== Event Listeners ==========

  onNodeRegistered(callback: (nodeAddress: string, owner: string, stakedAmount: string) => void) {
    this.contract.on('NodeRegistered', (nodeAddress, owner, stakedAmount) => {
      callback(nodeAddress, owner, ethers.formatEther(stakedAmount))
    })
  }

  onNodeSlashed(callback: (nodeAddress: string, reason: number, slashAmount: string, newStake: string) => void) {
    this.contract.on('NodeSlashed', (nodeAddress, reason, slashAmount, newStake) => {
      callback(nodeAddress, reason, ethers.formatEther(slashAmount), ethers.formatEther(newStake))
    })
  }

  onReputationUpdated(callback: (nodeAddress: string, oldScore: number, newScore: number) => void) {
    this.contract.on('ReputationUpdated', (nodeAddress, oldScore, newScore) => {
      callback(nodeAddress, Number(oldScore), Number(newScore))
    })
  }

  onTaskCompleted(callback: (nodeAddress: string, success: boolean, newReputation: number) => void) {
    this.contract.on('TaskCompleted', (nodeAddress, success, newReputation) => {
      callback(nodeAddress, success, Number(newReputation))
    })
  }

  onSlashDisputed(callback: (slashId: number, nodeAddress: string, challengeDeadline: number) => void) {
    this.contract.on('SlashDisputed', (slashId, nodeAddress, challengeDeadline) => {
      callback(Number(slashId), nodeAddress, Number(challengeDeadline))
    })
  }

  removeAllListeners() {
    this.contract.removeAllListeners()
  }
}

// ========== API Client ==========

export class KeeperAPIClient {
  private baseUrl: string

  constructor(baseUrl: string = '/api/keeper') {
    this.baseUrl = baseUrl
  }

  // Nodes
  async getNodes(params?: {
    status?: 'active' | 'suspended' | 'all'
    minReputation?: number
    orderBy?: 'reputation_score' | 'stake' | 'tasks' | 'recent'
  }) {
    const query = new URLSearchParams(params as any).toString()
    const res = await fetch(`${this.baseUrl}/nodes?${query}`)
    return await res.json()
  }

  async registerNode(data: {
    ownerUid: string
    nodeAddress: string
    stakedAmount: string
    metadata?: any
    blockchainTxHash?: string
  }) {
    const res = await fetch(`${this.baseUrl}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return await res.json()
  }

  async updateNode(data: {
    nodeAddress: string
    action: 'increase_stake' | 'request_unstake' | 'complete_unstake' | 'suspend' | 'reactivate'
    amount?: string
    reason?: string
    blockchainTxHash?: string
  }) {
    const res = await fetch(`${this.baseUrl}/nodes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return await res.json()
  }

  // Slashing
  async slashNode(data: {
    nodeAddress: string
    reason: string
    severity: 'MINOR' | 'MODERATE' | 'SEVERE'
    slashAmount: string
    evidence?: any
    reporterUid?: string
    blockchainTxHash?: string
  }) {
    const res = await fetch(`${this.baseUrl}/slash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return await res.json()
  }

  async getSlashEvents(params?: {
    nodeAddress?: string
    limit?: number
    offset?: number
  }) {
    const query = new URLSearchParams(params as any).toString()
    const res = await fetch(`${this.baseUrl}/slash?${query}`)
    return await res.json()
  }

  // Tasks
  async recordTask(data: {
    nodeAddress: string
    taskType: string
    success: boolean
    metadata?: any
    executionTimeMs?: number
    errorMessage?: string
  }) {
    const res = await fetch(`${this.baseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return await res.json()
  }

  async getTasks(params: {
    nodeAddress: string
    status?: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
    limit?: number
    offset?: number
  }) {
    const query = new URLSearchParams(params as any).toString()
    const res = await fetch(`${this.baseUrl}/tasks?${query}`)
    return await res.json()
  }

  // Disputes
  async fileDispute(data: {
    slashId: number
    nodeAddress: string
    disputeReason: string
    evidence?: any
    disputedByUid?: string
  }) {
    const res = await fetch(`${this.baseUrl}/dispute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return await res.json()
  }

  async resolveDispute(data: {
    disputeId: number
    outcome: 'UPHELD' | 'OVERTURNED' | 'PARTIAL'
    reason: string
    resolvedByUid: string
    restoreStake?: number
    restoreReputation?: number
  }) {
    const res = await fetch(`${this.baseUrl}/dispute`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return await res.json()
  }

  async getDisputes(params?: {
    nodeAddress?: string
    status?: 'pending' | 'resolved' | 'all'
    limit?: number
    offset?: number
  }) {
    const query = new URLSearchParams(params as any).toString()
    const res = await fetch(`${this.baseUrl}/dispute?${query}`)
    return await res.json()
  }

  // Leaderboard & Stats
  async getLeaderboard(params?: {
    limit?: number
    offset?: number
    minStake?: string
  }) {
    const query = new URLSearchParams(params as any).toString()
    const res = await fetch(`${this.baseUrl}/leaderboard?${query}`)
    return await res.json()
  }

  async getStats() {
    const res = await fetch(`${this.baseUrl}/stats`)
    return await res.json()
  }
}
