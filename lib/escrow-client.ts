import { ethers } from 'ethers'
import escrowABI from '@/smart_contracts/paymentescrow.json'

// Contract address - will need to be deployed to Sepolia
export const ESCROW_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PAYMENT_ESCROW_CONTRACT || ''

// Minimum stake amount (0.1 ETH) - must match contract STAKE_AMOUNT
export const STAKE_AMOUNT = ethers.parseEther('0.1')

// Withdrawal lock period (7 days)
export const WITHDRAWAL_LOCK_PERIOD = 7 * 24 * 60 * 60 // 7 days in seconds

export interface APIKeyStake {
  buyer: string
  seller: string
  stakeAmount: bigint
  createdAt: bigint
  lastActivity: bigint
  withdrawalRequestTime: bigint
  isActive: boolean
  slashed: boolean
  slashAmount: bigint
  apiKeyHash: string
}

export interface UserStakeInfo {
  totalStaked: bigint
  activeStakes: bigint
}

/**
 * Escrow contract client for managing API key stakes
 */
export class EscrowClient {
  private contract: ethers.Contract
  private provider: ethers.Provider
  private signer?: ethers.Signer

  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    this.provider = provider
    this.signer = signer
    this.contract = new ethers.Contract(
      ESCROW_CONTRACT_ADDRESS,
      escrowABI,
      signer || provider
    )
  }

  /**
   * Check if contract address is configured
   */
  static isConfigured(): boolean {
    return !!ESCROW_CONTRACT_ADDRESS && ESCROW_CONTRACT_ADDRESS !== ''
  }

  /**
   * Deposit stake for API key purchase (now using correct contract function)
   */
  async depositStake(
    sellerAddress: string, 
    apiKeyHash: string,
    apiListingId?: number
  ): Promise<{ apiKeyId: string; transactionHash: string }> {
    if (!this.signer) {
      throw new Error('Signer required for stake deposit')
    }

    try {
      console.log(`Calling depositStake with seller: ${sellerAddress}, apiKeyHash: ${apiKeyHash}`)

      // Use the correct depositStake function from the updated contract
      const tx = await this.contract.depositStake(sellerAddress, apiKeyHash, {
        value: STAKE_AMOUNT
      })

      const receipt = await tx.wait()
      
      // Find the StakeDeposited event to get the API key ID
      const stakeDepositedEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log)
          return parsed?.name === 'StakeDeposited'
        } catch {
          return false
        }
      })

      if (!stakeDepositedEvent) {
        console.log('StakeDeposited event not found, but transaction succeeded')
      }

      const parsedEvent = stakeDepositedEvent ? this.contract.interface.parseLog(stakeDepositedEvent) : null
      const apiKeyId = parsedEvent?.args.apiKeyId || ethers.keccak256(ethers.toUtf8Bytes(apiKeyHash))

      return {
        apiKeyId: apiKeyId.toString(),
        transactionHash: receipt.hash
      }
    } catch (error: any) {
      console.error('Error depositing stake:', error)
      
      // Provide more specific error messages
      if (error.code === 'CALL_EXCEPTION') {
        throw new Error(`Contract call failed: ${error.message}`)
      }
      
      throw new Error(`Failed to deposit stake: ${error.message}`)
    }
  }

  /**
   * Check if buyer already has stake for a seller (for upgrades)
   */
  async hasStakeForSeller(buyerAddress: string, sellerAddress: string): Promise<boolean> {
    try {
      return await this.contract.hasStakeForSeller(buyerAddress, sellerAddress)
    } catch (error: any) {
      console.error('Error checking stake for seller:', error)
      return false
    }
  }

  /**
   * Get user's stake information (using correct contract function)
   */
  async getUserStakeInfo(userAddress: string): Promise<UserStakeInfo> {
    try {
      console.log('Getting user stake info for:', userAddress)
      
      // Now we can use the real getUserStakeInfo function from the updated contract
      const stakeInfo = await this.contract.getUserStakeInfo(userAddress)
      
      return {
        totalStaked: stakeInfo[0],
        activeStakes: stakeInfo[2] // activeStakes count
      }
    } catch (error: any) {
      console.error('Error getting user stake info:', error)
      return {
        totalStaked: BigInt(0),
        activeStakes: BigInt(0)
      }
    }
  }

  /**
   * Get stake details for an API key (using correct contract function)
   */
  async getStakeDetails(apiKeyId: string): Promise<APIKeyStake> {
    try {
      console.log('Getting stake details for:', apiKeyId)
      
      // Use the real getStakeDetails function from the updated contract
      const stakeDetails = await this.contract.getStakeDetails(apiKeyId)
      
      return {
        buyer: stakeDetails[0],
        seller: stakeDetails[1],
        stakeAmount: stakeDetails[2],
        createdAt: stakeDetails[3],
        lastActivity: stakeDetails[4],
        withdrawalRequestTime: stakeDetails[5],
        isActive: stakeDetails[6],
        slashed: stakeDetails[7] || false,
        slashAmount: stakeDetails[8] || BigInt(0),
        apiKeyHash: stakeDetails[9] || ''
      }
    } catch (error: any) {
      console.error('Error getting stake details:', error)
      throw new Error(`Failed to get stake details: ${error.message}`)
    }
  }

  /**
   * Request stake withdrawal (mock for deployed contract compatibility)
   */
  async requestStakeWithdrawal(apiKeyId: string): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer required for stake withdrawal request')
    }

    try {
      console.log('Requesting withdrawal for:', apiKeyId)
      // The deployed contract uses withdrawStake directly, not a two-step process
      // Return a mock transaction hash for now
      return '0x0000000000000000000000000000000000000000000000000000000000000000'
    } catch (error: any) {
      console.error('Error requesting stake withdrawal:', error)
      throw new Error(`Failed to request withdrawal: ${error.message}`)
    }
  }

  /**
   * Complete stake withdrawal after lock period
   */
  async withdrawStake(apiKeyId: string): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer required for stake withdrawal')
    }

    try {
      const tx = await this.contract.withdrawStake(apiKeyId)
      const receipt = await tx.wait()
      return receipt.hash
    } catch (error: any) {
      console.error('Error withdrawing stake:', error)
      throw new Error(`Failed to withdraw stake: ${error.message}`)
    }
  }

  /**
   * Update activity for an API key stake
   */
  async updateActivity(apiKeyId: string): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer required for activity update')
    }

    try {
      const tx = await this.contract.updateActivity(apiKeyId)
      const receipt = await tx.wait()
      return receipt.hash
    } catch (error: any) {
      console.error('Error updating activity:', error)
      throw new Error(`Failed to update activity: ${error.message}`)
    }
  }

  /**
   * Deposit payment for API services (separate from stake)
   */
  async depositPayment(sellerAddress: string, amount: bigint): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer required for payment deposit')
    }

    try {
      const tx = await this.contract.depositPayment(sellerAddress, {
        value: amount
      })
      const receipt = await tx.wait()
      return receipt.hash
    } catch (error: any) {
      console.error('Error depositing payment:', error)
      throw new Error(`Failed to deposit payment: ${error.message}`)
    }
  }

  /**
   * Get seller's payment balance
   */
  async getSellerBalance(sellerAddress: string): Promise<bigint> {
    try {
      const balance = await this.contract.getSellerBalance(sellerAddress)
      return BigInt(balance.toString())
    } catch (error: any) {
      console.error('Error getting seller balance:', error)
      throw new Error(`Failed to get seller balance: ${error.message}`)
    }
  }

  /**
   * Withdraw earned payments (for sellers)
   */
  async withdrawPayment(): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer required for payment withdrawal')
    }

    try {
      const tx = await this.contract.withdrawPayment()
      const receipt = await tx.wait()
      return receipt.hash
    } catch (error: any) {
      console.error('Error withdrawing payment:', error)
      throw new Error(`Failed to withdraw payment: ${error.message}`)
    }
  }

  /**
   * Format stake amount for display
   */
  static formatStakeAmount(amount: bigint): string {
    return ethers.formatEther(amount)
  }

  /**
   * Parse stake amount from string
   */
  static parseStakeAmount(amount: string): bigint {
    return ethers.parseEther(amount)
  }

  /**
   * Check if withdrawal lock period has passed
   */
  static isWithdrawalUnlocked(withdrawalRequestTime: bigint): boolean {
    const now = BigInt(Math.floor(Date.now() / 1000))
    const unlockTime = withdrawalRequestTime + BigInt(WITHDRAWAL_LOCK_PERIOD)
    return now >= unlockTime
  }

  /**
   * Get time remaining for withdrawal unlock
   */
  static getWithdrawalTimeRemaining(withdrawalRequestTime: bigint): number {
    const now = Math.floor(Date.now() / 1000)
    const unlockTime = Number(withdrawalRequestTime) + WITHDRAWAL_LOCK_PERIOD
    return Math.max(0, unlockTime - now)
  }

  /**
   * Generate API key hash for the contract
   */
  static generateApiKeyHash(apiKey: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(apiKey))
  }
}

/**
 * Server-side utility functions for the escrow system
 */
export class EscrowServerUtils {
  /**
   * Calculate required stake amount for API purchase
   */
  static calculateStakeAmount(isNewApiKey: boolean): string {
    return isNewApiKey ? ethers.formatEther(STAKE_AMOUNT) : '0'
  }

  /**
   * Check if stake is required for this purchase
   */
  static isStakeRequired(
    buyerAddress: string,
    sellerAddress: string,
    existingStakes: any[]
  ): boolean {
    // Check if buyer already has an active stake for this seller
    return !existingStakes.some(stake => 
      stake.buyer.toLowerCase() === buyerAddress.toLowerCase() &&
      stake.seller.toLowerCase() === sellerAddress.toLowerCase() &&
      stake.isActive
    )
  }

  /**
   * Generate unique API key ID for stake tracking
   */
  static generateApiKeyId(
    buyerAddress: string,
    sellerAddress: string,
    apiKeyHash: string
  ): string {
    return ethers.keccak256(
      ethers.solidityPacked(
        ['address', 'address', 'string'],
        [buyerAddress, sellerAddress, apiKeyHash]
      )
    )
  }
}

export default EscrowClient