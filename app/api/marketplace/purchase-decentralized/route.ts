import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/database"
import { decryptPrivateKey } from "@/lib/database"
import { ethers } from "ethers"
import { 
  calculateGasFeeForCalls, 
  getEscrowWalletAddress, 
  recordGasFeeDeposit 
} from "@/lib/escrow-wallet"
import { selectKeeperNode } from "@/lib/keeper-selection"

/**
 * DECENTRALIZED PURCHASE FLOW
 * POST /api/marketplace/purchase-decentralized
 * 
 * Routes purchase processing through keeper nodes for:
 * - Access key generation
 * - Database record creation
 * - Blockchain transaction verification
 * - Usage tracking initialization
 */
export async function POST(req: NextRequest) {
  console.log('\n🛒 [DECENTRALIZED PURCHASE] New purchase request')
  
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

    console.log(`   Buyer: ${buyerId}`)
    console.log(`   Listing: ${listingId}`)
    console.log(`   Package: ${packageSize} calls`)
    console.log(`   Amount: ${totalAmount} ETH`)

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
      console.log(`   Gas fee for ${packageSize} calls: ${gasFeeAmount} ETH`)

      // 5. Verify the total amount matches expected (API cost + platform fee + gas fee)
      const apiCost = parseFloat(listing.price_per_call) * packageSize
      const platformFee = apiCost * 0.005 // 0.5% platform fee
      const expectedTotal = apiCost + platformFee + gasFeeInEth
      
      console.log(`   Price breakdown:`)
      console.log(`     API Cost: ${apiCost} ETH`)
      console.log(`     Platform Fee (0.5%): ${platformFee} ETH`)
      console.log(`     Gas Fee: ${gasFeeInEth} ETH`)
      console.log(`     Expected Total: ${expectedTotal} ETH`)
      
      if (Math.abs(expectedTotal - totalAmount) > 0.00000001) {
        throw new Error(`Price mismatch: expected ${expectedTotal.toFixed(10)} ETH but got ${totalAmount.toFixed(10)} ETH`)
      }

      // 6. Get escrow wallet address for gas fee deposit
      const escrowWalletAddress = getEscrowWalletAddress()

      // 7. Perform blockchain payment (buyer pays seller directly)
      console.log(`   💳 Processing blockchain payment...`)
      let transactionHash = null
      let gasFeeTransactionHash = null

      try {
        const rpcUrl = process.env.RPC_URL
        if (!rpcUrl) {
          throw new Error('RPC_URL not configured')
        }

        const provider = new ethers.JsonRpcProvider(rpcUrl)
        const privateKey = decryptPrivateKey(
          buyer.encrypted_private_key,
          buyer.encryption_salt
        )
        const wallet = new ethers.Wallet(privateKey, provider)

        // Check wallet balance
        const balance = await provider.getBalance(wallet.address)
        const apiPaymentAmount = ethers.parseEther(apiCost.toFixed(18))
        const platformFeeAmount = ethers.parseEther(platformFee.toFixed(18))
        const gasFeeDepositAmount = ethers.parseEther(gasFeeAmount)
        const totalRequired = apiPaymentAmount + platformFeeAmount + gasFeeDepositAmount

        if (balance < totalRequired) {
          throw new Error(
            `Insufficient wallet balance. Required: ${ethers.formatEther(totalRequired)} ETH`
          )
        }

        // Send API payment to seller
        console.log(`   💸 Sending ${ethers.formatEther(apiPaymentAmount)} ETH to seller...`)
        const apiTx = await wallet.sendTransaction({
          to: listing.seller_wallet,
          value: apiPaymentAmount
        })

        const apiReceipt = await apiTx.wait(1)
        transactionHash = apiReceipt?.hash || apiTx.hash
        console.log(`   ✅ Payment confirmed: ${transactionHash}`)

        // Send gas fee to escrow
        console.log(`   ⛽ Sending ${gasFeeAmount} ETH gas fee to escrow...`)
        const gasTx = await wallet.sendTransaction({
          to: escrowWalletAddress,
          value: gasFeeDepositAmount
        })

        const gasReceipt = await gasTx.wait(1)
        gasFeeTransactionHash = gasReceipt?.hash || gasTx.hash
        console.log(`   ✅ Gas fee deposited: ${gasFeeTransactionHash}`)

      } catch (blockchainError: any) {
        console.error('   ❌ Blockchain transaction failed:', blockchainError)
        throw new Error(`Payment failed: ${blockchainError.message}`)
      }

      // 8. SELECT KEEPER NODE (Decentralized processing!)
      console.log(`   🔍 Selecting keeper node...`)
      const keeper = await selectKeeperNode()

      if (!keeper) {
        console.error(`   ❌ No keeper nodes available!`)
        // Fallback to centralized processing
        throw new Error('Keeper network unavailable. Please try again.')
      }

      console.log(`   ✅ Selected keeper: ${keeper.nodeId}`)
      console.log(`   Keeper endpoint: ${keeper.endpointUrl}`)

      // 9. ROUTE TO KEEPER NODE FOR PROCESSING
      console.log(`   📡 Routing purchase to keeper node...`)

      const keeperResponse = await fetch(
        `${keeper.endpointUrl}/purchase`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            buyerId,
            listingId,
            packageSize,
            paymentTxHash: transactionHash,
            sellerWallet: listing.seller_wallet,
            totalAmount: apiCost
          })
        }
      )

      if (!keeperResponse.ok) {
        const errorData = await keeperResponse.json()
        throw new Error(`Keeper processing failed: ${errorData.error || keeperResponse.statusText}`)
      }

      const keeperData = await keeperResponse.json()
      console.log(`   ✅ Keeper processed purchase successfully!`)
      console.log(`   Access Key: ${keeperData.access.accessKey.substring(0, 25)}...`)

      // 10. Record gas fee deposit (keeper already created purchase & access)
      const purchaseId = keeperData.purchase.id
      console.log(`   📝 Recording gas fee deposit...`)
      await recordGasFeeDeposit(
        purchaseId,
        buyerId,
        listingId,
        packageSize,
        gasFeeAmount,
        gasFeeTransactionHash,
        client
      )

      // 11. Commit transaction
      await client.query('COMMIT')
      console.log(`   ✅ Transaction committed`)

      // 12. Return success response with keeper info
      return NextResponse.json({
        success: true,
        decentralized: true,
        purchase: {
          id: keeperData.purchase.id,
          listingId: listingId,
          packageSize: packageSize,
          totalAmount: totalAmount,
          apiName: listing.api_name,
          transactionHash: transactionHash,
          sellerWallet: listing.seller_wallet,
          processedBy: {
            keeper: keeper.nodeId,
            keeperWallet: keeper.walletAddress
          }
        },
        apiAccess: {
          accessKey: keeperData.access.accessKey,
          totalQuota: keeperData.access.quota,
          remainingQuota: keeperData.access.quota,
          generatedByKeeper: keeper.nodeId,
          gatewayUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/gateway/proxy`,
          usage: {
            header: 'X-BNB-API-Key',
            example: `curl -X POST ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/gateway/proxy -H "X-BNB-API-Key: ${keeperData.access.accessKey}" -H "Content-Type: application/json" -d '{"method":"GET","path":"/endpoint"}'`
          }
        },
        blockchain: keeperData.blockchain || null,
        keeper: {
          nodeId: keeper.nodeId,
          walletAddress: keeper.walletAddress,
          endpoint: keeper.endpointUrl
        }
      })

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error: any) {
    console.error("\n❌ [DECENTRALIZED PURCHASE] Error:", error.message)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || "Failed to process purchase",
        decentralized: true
      },
      { status: 500 }
    )
  }
}
