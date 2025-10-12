import { ethers } from 'ethers'

// ABI for APIMarketplaceRegistry contract
export const API_MARKETPLACE_REGISTRY_ABI = [
  "function listAPI(string memory _apiName, string memory _baseEndpoint, string[] memory _categories, uint256 _pricePerCall, uint256 _quotaAvailable, string memory _metadataUri) external returns (uint256)",
  "function updateListing(uint256 _listingId, uint256 _pricePerCall, uint256 _additionalQuota, bool _isActive) external",
  "function delistAPI(uint256 _listingId) external",
  "function purchaseQuota(uint256 _listingId, uint256 _quotaToBuy) external payable",
  "function getListing(uint256 _listingId) external view returns (tuple(uint256 listingId, address seller, string apiName, string baseEndpoint, string[] categories, uint256 pricePerCall, uint256 quotaAvailable, uint256 quotaSold, uint256 totalRevenue, uint256 listedAt, uint256 updatedAt, bool isActive, string metadataUri))",
  "function getSellerListings(address _seller) external view returns (uint256[] memory)",
  "function getBuyerPurchases(address _buyer) external view returns (uint256[] memory)",
  "function getListingPurchases(uint256 _listingId) external view returns (tuple(uint256 purchaseId, uint256 listingId, address buyer, uint256 quotaPurchased, uint256 amountPaid, uint256 purchasedAt)[] memory)",
  "function getPurchase(uint256 _purchaseId) external view returns (tuple(uint256 purchaseId, uint256 listingId, address buyer, uint256 quotaPurchased, uint256 amountPaid, uint256 purchasedAt))",
  "function getActiveListingsCount() external view returns (uint256)",
  "function isListingAvailable(uint256 _listingId) external view returns (bool)",
  "function calculatePurchaseCost(uint256 _listingId, uint256 _quota) external view returns (uint256 totalCost, uint256 platformFee, uint256 sellerAmount)",
  "function listingCounter() external view returns (uint256)",
  "function purchaseCounter() external view returns (uint256)",
  "function platformFeePercent() external view returns (uint256)",
  "function totalPlatformFees() external view returns (uint256)",
  "event APIListed(uint256 indexed listingId, address indexed seller, string apiName, uint256 pricePerCall, uint256 quotaAvailable, uint256 timestamp)",
  "event APIUpdated(uint256 indexed listingId, uint256 newPrice, uint256 newQuota, bool isActive, uint256 timestamp)",
  "event APIPurchased(uint256 indexed purchaseId, uint256 indexed listingId, address indexed buyer, uint256 quotaPurchased, uint256 amountPaid, uint256 timestamp)",
  "event APIDelisted(uint256 indexed listingId, address indexed seller, uint256 timestamp)"
]

export interface BlockchainListing {
  listingId: bigint
  seller: string
  apiName: string
  baseEndpoint: string
  categories: string[]
  pricePerCall: bigint
  quotaAvailable: bigint
  quotaSold: bigint
  totalRevenue: bigint
  listedAt: bigint
  updatedAt: bigint
  isActive: boolean
  metadataUri: string
}

export interface BlockchainPurchase {
  purchaseId: bigint
  listingId: bigint
  buyer: string
  quotaPurchased: bigint
  amountPaid: bigint
  purchasedAt: bigint
}

export class APIMarketplaceRegistryClient {
  private contract: ethers.Contract
  private provider: ethers.Provider
  private signer?: ethers.Signer

  constructor(
    contractAddress: string,
    providerOrSigner: ethers.Provider | ethers.Signer
  ) {
    if ('signMessage' in providerOrSigner) {
      this.signer = providerOrSigner as ethers.Signer
      this.provider = providerOrSigner.provider!
    } else {
      this.provider = providerOrSigner as ethers.Provider
    }

    this.contract = new ethers.Contract(
      contractAddress,
      API_MARKETPLACE_REGISTRY_ABI,
      this.signer || this.provider
    )
  }

  // ==================== LISTING FUNCTIONS ====================

  /**
   * List a new API on the blockchain
   */
  async listAPI(params: {
    apiName: string
    baseEndpoint?: string // Optional for privacy
    categories: string[]
    pricePerCallETH: number // Price in ETH
    quotaAvailable: number
    metadataUri?: string
  }): Promise<{ listingId: bigint; txHash: string }> {
    if (!this.signer) {
      throw new Error('Signer required for this operation')
    }

    // Convert ETH to wei
    const priceInWei = ethers.parseEther(params.pricePerCallETH.toString())

    const tx = await this.contract.listAPI(
      params.apiName,
      params.baseEndpoint || '',
      params.categories,
      priceInWei,
      params.quotaAvailable,
      params.metadataUri || ''
    )

    const receipt = await tx.wait()
    
    // Extract listingId from event
    const listingEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contract.interface.parseLog(log)
        return parsed?.name === 'APIListed'
      } catch {
        return false
      }
    })

    let listingId = BigInt(0)
    if (listingEvent) {
      const parsed = this.contract.interface.parseLog(listingEvent)
      listingId = parsed?.args.listingId
    }

    return {
      listingId,
      txHash: receipt.hash
    }
  }

  /**
   * Update an existing API listing
   */
  async updateListing(params: {
    listingId: number
    newPricePerCallETH?: number // Price in ETH
    additionalQuota?: number
    isActive: boolean
  }): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer required for this operation')
    }

    let newPriceWei = BigInt(0)
    if (params.newPricePerCallETH) {
      newPriceWei = ethers.parseEther(params.newPricePerCallETH.toString())
    }

    const tx = await this.contract.updateListing(
      params.listingId,
      newPriceWei,
      params.additionalQuota || 0,
      params.isActive
    )

    const receipt = await tx.wait()
    return receipt.hash
  }

  /**
   * Delist an API
   */
  async delistAPI(listingId: number): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer required for this operation')
    }

    const tx = await this.contract.delistAPI(listingId)
    const receipt = await tx.wait()
    return receipt.hash
  }

  // ==================== PURCHASE FUNCTIONS ====================

  /**
   * Purchase API quota
   */
  async purchaseQuota(params: {
    listingId: number
    quotaToBuy: number
  }): Promise<{ purchaseId: bigint; txHash: string }> {
    if (!this.signer) {
      throw new Error('Signer required for this operation')
    }

    // Calculate total cost
    const cost = await this.contract.calculatePurchaseCost(
      params.listingId,
      params.quotaToBuy
    )

    const tx = await this.contract.purchaseQuota(
      params.listingId,
      params.quotaToBuy,
      { value: cost.totalCost }
    )

    const receipt = await tx.wait()

    // Extract purchaseId from event
    const purchaseEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contract.interface.parseLog(log)
        return parsed?.name === 'APIPurchased'
      } catch {
        return false
      }
    })

    let purchaseId = BigInt(0)
    if (purchaseEvent) {
      const parsed = this.contract.interface.parseLog(purchaseEvent)
      purchaseId = parsed?.args.purchaseId
    }

    return {
      purchaseId,
      txHash: receipt.hash
    }
  }

  // ==================== VIEW FUNCTIONS ====================

  /**
   * Get listing details from blockchain
   */
  async getListing(listingId: number): Promise<BlockchainListing> {
    const listing = await this.contract.getListing(listingId)
    return listing
  }

  /**
   * Get all listings by a seller
   */
  async getSellerListings(sellerAddress: string): Promise<bigint[]> {
    return await this.contract.getSellerListings(sellerAddress)
  }

  /**
   * Get all purchases by a buyer
   */
  async getBuyerPurchases(buyerAddress: string): Promise<bigint[]> {
    return await this.contract.getBuyerPurchases(buyerAddress)
  }

  /**
   * Get purchase history for a listing
   */
  async getListingPurchases(listingId: number): Promise<BlockchainPurchase[]> {
    return await this.contract.getListingPurchases(listingId)
  }

  /**
   * Check if listing is available for purchase
   */
  async isListingAvailable(listingId: number): Promise<boolean> {
    return await this.contract.isListingAvailable(listingId)
  }

  /**
   * Calculate purchase cost before buying
   */
  async calculatePurchaseCost(listingId: number, quota: number): Promise<{
    totalCost: bigint
    platformFee: bigint
    sellerAmount: bigint
  }> {
    const result = await this.contract.calculatePurchaseCost(listingId, quota)
    return {
      totalCost: result.totalCost,
      platformFee: result.platformFee,
      sellerAmount: result.sellerAmount
    }
  }

  /**
   * Get total number of listings
   */
  async getListingCounter(): Promise<bigint> {
    return await this.contract.listingCounter()
  }

  /**
   * Get platform fee percentage
   */
  async getPlatformFeePercent(): Promise<bigint> {
    return await this.contract.platformFeePercent()
  }

  // ==================== EVENT LISTENERS ====================

  /**
   * Listen for new API listings
   */
  onAPIListed(callback: (
    listingId: bigint,
    seller: string,
    apiName: string,
    pricePerCall: bigint,
    quotaAvailable: bigint,
    timestamp: bigint
  ) => void) {
    this.contract.on('APIListed', callback)
  }

  /**
   * Listen for API purchases
   */
  onAPIPurchased(callback: (
    purchaseId: bigint,
    listingId: bigint,
    buyer: string,
    quotaPurchased: bigint,
    amountPaid: bigint,
    timestamp: bigint
  ) => void) {
    this.contract.on('APIPurchased', callback)
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    this.contract.removeAllListeners()
  }
}

/**
 * Helper function to create a client instance
 */
export function createMarketplaceClient(useSystemWallet = true): APIMarketplaceRegistryClient {
  const contractAddress = process.env.API_MARKETPLACE_REGISTRY_ADDRESS
  
  if (!contractAddress) {
    throw new Error('API_MARKETPLACE_REGISTRY_ADDRESS not set in environment')
  }

  const rpcUrl = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL
  if (!rpcUrl) {
    throw new Error('RPC_URL not set in environment')
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl)

  if (useSystemWallet) {
    const privateKey = process.env.SYSTEM_WALLET_PRIVATE_KEY
    if (!privateKey) {
      throw new Error('SYSTEM_WALLET_PRIVATE_KEY not set in environment')
    }
    const wallet = new ethers.Wallet(privateKey, provider)
    return new APIMarketplaceRegistryClient(contractAddress, wallet)
  }

  return new APIMarketplaceRegistryClient(contractAddress, provider)
}
