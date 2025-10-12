import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/database"
import { decryptPrivateKey } from "@/lib/database"
import { ethers } from "ethers"
import { 
  calculateGasFeeForCalls, 
  getEscrowWalletAddress, 
  recordGasFeeDeposit 
} from "@/lib/escrow-wallet"

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

      // 4. Calculate gas fee for blockchain logging
      const gasFeeAmount = calculateGasFeeForCalls(packageSize)
      const gasFeeInEth = parseFloat(gasFeeAmount)
      console.log(`Gas fee for ${packageSize} calls: ${gasFeeAmount} ETH`)

      // 5. Verify the total amount matches expected (API cost + platform fee + gas fee)
      const apiCost = parseFloat(listing.price_per_call) * packageSize
      const platformFee = apiCost * 0.005 // 0.5% platform fee
      const expectedTotal = apiCost + platformFee + gasFeeInEth
      
      console.log(`Price breakdown:`)
      console.log(`  API Cost: ${apiCost} ETH`)
      console.log(`  Platform Fee (0.5%): ${platformFee} ETH`)
      console.log(`  Gas Fee: ${gasFeeInEth} ETH`)
      console.log(`  Expected Total: ${expectedTotal} ETH`)
      console.log(`  Received Total: ${totalAmount} ETH`)
      
      if (Math.abs(expectedTotal - totalAmount) > 0.00000001) { // Allow small floating point differences
        throw new Error(`Price mismatch: expected ${expectedTotal.toFixed(10)} ETH but got ${totalAmount.toFixed(10)} ETH`)
      }

      // 6. Get escrow wallet address for gas fee deposit
      const escrowWalletAddress = getEscrowWalletAddress()
      console.log(`Escrow wallet address: ${escrowWalletAddress}`)

      // 7. Perform blockchain transfers (API payment + gas fee deposit)
      let transactionHash = null
      let gasFeeTransactionHash = null
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

        // Check wallet balance (needs to cover API cost + gas fee + platform fee)
        const balance = await provider.getBalance(wallet.address)
        
        // Calculate amounts for each transaction
        const apiPaymentAmount = ethers.parseEther(apiCost.toFixed(18))
        const platformFeeAmount = ethers.parseEther(platformFee.toFixed(18))
        const gasFeeDepositAmount = ethers.parseEther(gasFeeAmount)
        
        // Total required = all payments combined
        const totalRequired = apiPaymentAmount + platformFeeAmount + gasFeeDepositAmount

        if (balance < totalRequired) {
          throw new Error(
            `Insufficient wallet balance. Required: ${ethers.formatEther(totalRequired)} ETH, Available: ${ethers.formatEther(balance)} ETH`
          )
        }

        console.log(`Payment breakdown:`)
        console.log(`  To Seller: ${ethers.formatEther(apiPaymentAmount)} ETH`)
        console.log(`  To Platform: ${ethers.formatEther(platformFeeAmount)} ETH`)
        console.log(`  To Escrow (gas): ${ethers.formatEther(gasFeeDepositAmount)} ETH`)
        console.log(`  Total: ${ethers.formatEther(totalRequired)} ETH`)

        // Send API payment to seller (only API cost, no platform fee)
        console.log(`Sending ${ethers.formatEther(apiPaymentAmount)} ETH to seller...`)
        const apiTx = await wallet.sendTransaction({
          to: listing.seller_wallet,
          value: apiPaymentAmount
        })

        // Wait for confirmation (1 block)
        const apiReceipt = await apiTx.wait(1)
        transactionHash = apiReceipt?.hash || apiTx.hash
        console.log(`✓ API payment confirmed: ${transactionHash}`)

        console.log(`Sending ${gasFeeAmount} ETH gas fee to escrow...`)
        // Send gas fee to escrow wallet
        const gasTx = await wallet.sendTransaction({
          to: escrowWalletAddress,
          value: gasFeeDepositAmount
        })

        const gasReceipt = await gasTx.wait(1)
        gasFeeTransactionHash = gasReceipt?.hash || gasTx.hash
        console.log(`✓ Gas fee deposit confirmed: ${gasFeeTransactionHash}`)

        // Log API payment transaction
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
              apiReceipt?.gasUsed ? apiReceipt.gasUsed.toString() : '21000',
              apiReceipt?.gasPrice ? apiReceipt.gasPrice.toString() : apiTx.gasPrice?.toString() || '0',
              apiReceipt?.fee ? apiReceipt.fee.toString() : '0',
              apiReceipt?.blockNumber ? apiReceipt.blockNumber.toString() : '0',
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

      // 6. Create purchase record (stores only the API cost sent to seller)
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
        apiCost, // Only API cost, not including platform fee or gas fee
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

      // 8. Generate API access credentials for the buyer
      const crypto = await import('crypto')
      const accessKey = `bnb_${crypto.randomBytes(32).toString('hex')}`
      
      const accessResult = await client.query(`
        INSERT INTO api_access (
          buyer_uid,
          listing_id,
          purchase_id,
          access_key,
          total_quota,
          remaining_quota,
          status
        ) VALUES ($1, $2, $3, $4, $5, $5, 'active')
        RETURNING id, access_key, total_quota, remaining_quota
      `, [buyerId, listingId, purchase.id, accessKey, packageSize])

      const apiAccess = accessResult.rows[0]
      
      // 9. Record gas fee deposit in escrow (within same transaction)
      console.log(`Recording gas fee deposit: ${gasFeeAmount} ETH for ${packageSize} calls`)
      await recordGasFeeDeposit(
        purchase.id,
        buyerId,
        listingId,
        packageSize,
        gasFeeAmount,
        gasFeeTransactionHash,
        client // Pass the transaction client
      )
      console.log(`✓ Gas fee deposit recorded`)
      
      // 10. Commit transaction
      await client.query('COMMIT')
      console.log(`✓ Transaction committed`)

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
        },
        apiAccess: {
          accessKey: apiAccess.access_key,
          totalQuota: apiAccess.total_quota,
          remainingQuota: apiAccess.remaining_quota,
          gatewayUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/gateway/call`,
          usage: {
            header: 'X-BNB-API-Key',
            example: `curl -X POST ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/gateway/call -H "X-BNB-API-Key: ${apiAccess.access_key}" -H "Content-Type: application/json" -d '{"method":"GET","path":"/endpoint"}'`
          }
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
