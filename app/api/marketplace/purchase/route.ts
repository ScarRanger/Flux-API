import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/database"
import { decryptPrivateKey } from "@/lib/database"
import { ethers } from "ethers"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { buyerId, listingId, packageSize, totalAmount } = body

    // Validate input
    if (!buyerId || !listingId || !packageSize || !totalAmount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Start a transaction
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // 1. Get buyer's wallet info
      const buyerResult = await client.query(
        `SELECT 
          wallet_address, 
          encrypted_private_key, 
          encryption_salt 
        FROM users 
        WHERE firebase_uid = $1`,
        [buyerId]
      )

      if (buyerResult.rows.length === 0) {
        throw new Error('Buyer not found')
      }

      const buyer = buyerResult.rows[0]

      // 2. Get listing details and seller info
      const listingResult = await client.query(`
        SELECT 
          al.id,
          al.seller_uid,
          al.api_name,
          al.price_per_call,
          al.quota_available,
          al.quota_sold,
          u.wallet_address as seller_wallet
        FROM api_listings al
        JOIN users u ON al.seller_uid = u.firebase_uid
        WHERE al.id = $1 AND al.status = 'active'
      `, [listingId])

      if (listingResult.rows.length === 0) {
        throw new Error('API listing not found or inactive')
      }

      const listing = listingResult.rows[0]

      // 3. Check if enough quota is available
      if (listing.quota_available < packageSize) {
        throw new Error('Insufficient quota available')
      }

      // 4. Verify the total amount
      const expectedTotal = parseFloat(listing.price_per_call) * packageSize
      if (Math.abs(expectedTotal - totalAmount) > 0.000001) { // Allow small floating point differences
        throw new Error('Price mismatch')
      }

      // 5. Perform blockchain transfer
      let transactionHash = null
      try {
        // Get RPC provider
        const rpcUrl = process.env.RPC_URL
        if (!rpcUrl) {
          throw new Error('RPC_URL not configured')
        }

        const provider = new ethers.JsonRpcProvider(rpcUrl)
        
        // Decrypt buyer's private key using the proper decryption function
        const privateKey = decryptPrivateKey(
          buyer.encrypted_private_key,
          buyer.encryption_salt
        )

        // Create wallet instance
        const wallet = new ethers.Wallet(privateKey, provider)

        // Check wallet balance
        const balance = await provider.getBalance(wallet.address)
        
        // Round to 18 decimal places (wei precision) to avoid underflow
        const roundedAmount = parseFloat(totalAmount.toFixed(18))
        const requiredAmount = ethers.parseEther(roundedAmount.toString())

        if (balance < requiredAmount) {
          throw new Error(
            `Insufficient wallet balance. Required: ${ethers.formatEther(requiredAmount)} ETH, Available: ${ethers.formatEther(balance)} ETH`
          )
        }

        // Send transaction
        const tx = await wallet.sendTransaction({
          to: listing.seller_wallet,
          value: requiredAmount
        })

        // Wait for confirmation (1 block)
        const receipt = await tx.wait(1)
        transactionHash = receipt?.hash || tx.hash

        // Log transaction details
        try {
          // Get user's database id from firebase_uid for the transactions table
          const userResult = await client.query(
            'SELECT id FROM users WHERE firebase_uid = $1',
            [buyerId]
          )
          
          const userId = userResult.rows[0]?.id

          if (userId) {
            await client.query(`
              INSERT INTO transactions (
                user_id,
                transaction_hash,
                transaction_type,
                contract_address,
                function_name,
                gas_used,
                gas_price,
                transaction_fee,
                block_number,
                status,
                created_at,
                confirmed_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            `, [
              userId,
              transactionHash,
              'purchase',
              listing.seller_wallet, // destination address
              'transfer', // ETH transfer
              receipt?.gasUsed ? receipt.gasUsed.toString() : '21000',
              receipt?.gasPrice ? receipt.gasPrice.toString() : tx.gasPrice?.toString() || '0',
              receipt?.fee ? receipt.fee.toString() : '0',
              receipt?.blockNumber ? receipt.blockNumber.toString() : '0',
              'confirmed'
            ])
          } else {
            console.warn('Could not find user_id for firebase_uid:', buyerId)
          }
        } catch (txLogError) {
          // Don't fail the purchase if transaction logging fails
          console.error('Failed to log transaction:', txLogError)
        }

      } catch (blockchainError: any) {
        console.error('Blockchain transaction failed:', blockchainError)
        throw new Error(`Payment failed: ${blockchainError.message}`)
      }

      // 6. Create purchase record
      const purchaseResult = await client.query(`
        INSERT INTO purchases (
          buyer_uid,
          listing_id,
          package_size,
          price_per_call,
          total_amount,
          status,
          transaction_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, created_at
      `, [
        buyerId,
        listingId,
        packageSize,
        listing.price_per_call,
        totalAmount,
        'completed',
        transactionHash
      ])

      const purchase = purchaseResult.rows[0]

      // 7. Update listing quota
      await client.query(`
        UPDATE api_listings
        SET 
          quota_available = quota_available - $1,
          quota_sold = quota_sold + $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [packageSize, listingId])

      // 8. Update buyer's api_quotas (if using the token-based system)
      // Note: The existing api_quotas table uses a different schema (owner_user_id as UUID)
      // We'll record this in api_calls for now
      
      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        purchase: {
          id: purchase.id,
          listingId: listingId,
          packageSize: packageSize,
          totalAmount: totalAmount,
          apiName: listing.api_name,
          transactionHash: transactionHash,
          sellerWallet: listing.seller_wallet,
          createdAt: purchase.created_at
        }
      })

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error: any) {
    console.error("Error processing purchase:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process purchase" },
      { status: 500 }
    )
  }
}
