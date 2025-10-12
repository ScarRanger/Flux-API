import { ethers } from 'ethers'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

// Escrow wallet for holding gas fees
const ESCROW_PRIVATE_KEY = process.env.ESCROW_WALLET_PRIVATE_KEY || ''

/**
 * Get the escrow wallet instance
 */
export function getEscrowWallet(provider: ethers.Provider): ethers.Wallet {
  if (!ESCROW_PRIVATE_KEY) {
    throw new Error('ESCROW_WALLET_PRIVATE_KEY not configured')
  }
  return new ethers.Wallet(ESCROW_PRIVATE_KEY, provider)
}

/**
 * Get escrow wallet address
 */
export function getEscrowWalletAddress(): string {
  if (!ESCROW_PRIVATE_KEY) {
    throw new Error('ESCROW_WALLET_PRIVATE_KEY not configured')
  }
  const wallet = new ethers.Wallet(ESCROW_PRIVATE_KEY)
  return wallet.address
}

/**
 * Calculate gas fee estimate for blockchain logging
 * Based on Sepolia gas prices
 * 
 * @param numberOfCalls - Number of API calls that will be logged
 * @returns Estimated cost in ETH
 */
export function calculateGasFeeForCalls(numberOfCalls: number): string {
  // Realistic Sepolia testnet values:
  // - Gas per logUsage call: ~50,000 gas
  // - Sepolia gas price: ~0.01-0.1 gwei (testnet prices are very low)
  // - Cost per call = 50,000 * 0.05 gwei = 2,500 gwei = 0.0000000025 ETH
  
  const gasPerCall = 50000
  const gasPriceGwei = 0.05 // Very low testnet price (0.05 gwei)
  const costPerCallInGwei = gasPerCall * gasPriceGwei
  const costPerCallInEth = costPerCallInGwei / 1_000_000_000 // Convert gwei to ETH
  
  const totalCost = costPerCallInEth * numberOfCalls
  
  // Add 50% buffer for price fluctuations (more conservative for testnet)
  const totalWithBuffer = totalCost * 1.5
  
  return totalWithBuffer.toFixed(10) // More decimal places for very small amounts
}


/**
 * Record gas fee deposit to escrow
 * @param client - Database client with active transaction (optional)
 */
export async function recordGasFeeDeposit(
  purchaseId: number,
  buyerUid: string,
  listingId: number,
  numberOfCalls: number,
  gasFeeAmount: string,
  transactionHash: string,
  client?: any // Optional: use provided client for transaction
): Promise<void> {
  const useExistingClient = !!client
  const dbClient = client || await pool.connect()
  
  try {
    await dbClient.query(`
      INSERT INTO escrow_gas_deposits (
        purchase_id,
        buyer_uid,
        listing_id,
        allocated_calls,
        gas_fee_amount,
        remaining_balance,
        transaction_hash,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    `, [
      purchaseId,
      buyerUid,
      listingId,
      numberOfCalls,
      gasFeeAmount,
      gasFeeAmount, // Initially, remaining = total
      transactionHash
    ])
  } finally {
    if (!useExistingClient) {
      dbClient.release()
    }
  }
}

/**
 * Deduct gas fee from escrow after blockchain logging
 */
export async function deductGasFeeFromEscrow(
  purchaseId: number,
  actualGasCost: string,
  blockchainTxHash: string
): Promise<boolean> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    
    // Get current escrow balance
    const result = await client.query(`
      SELECT id, remaining_balance, used_gas_fee
      FROM escrow_gas_deposits
      WHERE purchase_id = $1
      FOR UPDATE
    `, [purchaseId])
    
    if (result.rows.length === 0) {
      console.warn(`No escrow deposit found for purchase ${purchaseId}`)
      await client.query('ROLLBACK')
      return false
    }
    
    const deposit = result.rows[0]
    const remainingBalance = parseFloat(deposit.remaining_balance)
    const usedGasFee = parseFloat(deposit.used_gas_fee || '0')
    const gasCost = parseFloat(actualGasCost)
    
    if (remainingBalance < gasCost) {
      console.error(`Insufficient escrow balance for purchase ${purchaseId}`)
      await client.query('ROLLBACK')
      return false
    }
    
    // Deduct gas fee
    await client.query(`
      UPDATE escrow_gas_deposits
      SET 
        remaining_balance = remaining_balance - $1,
        used_gas_fee = used_gas_fee + $2,
        used_calls = used_calls + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [gasCost, gasCost, deposit.id])
    
    // Log the gas usage
    await client.query(`
      INSERT INTO escrow_gas_usage (
        escrow_deposit_id,
        blockchain_tx_hash,
        gas_cost,
        created_at
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    `, [deposit.id, blockchainTxHash, gasCost])
    
    await client.query('COMMIT')
    console.log(`✓ Deducted ${gasCost} ETH from escrow for purchase ${purchaseId}`)
    return true
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error deducting gas fee from escrow:', error)
    return false
  } finally {
    client.release()
  }
}

/**
 * Get escrow balance for a purchase
 */
export async function getEscrowBalance(purchaseId: number): Promise<{
  totalDeposit: string
  remainingBalance: string
  usedGasFee: string
  allocatedCalls: number
  usedCalls: number
} | null> {
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT 
        gas_fee_amount as total_deposit,
        remaining_balance,
        used_gas_fee,
        allocated_calls,
        used_calls
      FROM escrow_gas_deposits
      WHERE purchase_id = $1
    `, [purchaseId])
    
    if (result.rows.length === 0) {
      return null
    }
    
    return {
      totalDeposit: result.rows[0].total_deposit,
      remainingBalance: result.rows[0].remaining_balance,
      usedGasFee: result.rows[0].used_gas_fee || '0',
      allocatedCalls: result.rows[0].allocated_calls,
      usedCalls: result.rows[0].used_calls || 0
    }
  } finally {
    client.release()
  }
}
