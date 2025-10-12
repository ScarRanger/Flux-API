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
import { EscrowClient } from "@/lib/escrow-client"

/**
 * SECURE PURCHASE FLOW WITH STAKING
 * POST /api/marketplace/purchase
 * 
 * Enhanced with PaymentEscrow staking system:
 * - Requires 0.1 ETH minimum stake for API key security
 * - Routes purchase processing through keeper nodes
 * - Handles upgrade logic for existing API key holders
 * - Prevents API key theft through collateral staking
 */
export async function POST(req: NextRequest) {
  console.log('\n🛒 [SECURE PURCHASE WITH STAKING] New purchase request')
  
  try {
    const body = await req.json()
    const { buyerId, listingId, packageSize, totalAmount, isUpgrade = false } = body

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
    console.log(`   Is Upgrade: ${isUpgrade}`)

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

      // 4. ESCROW STAKING REQUIREMENTS
      console.log(`   🔐 Checking escrow staking requirements...`)
      
      // Check if buyer already has a stake for this API
      const existingStakeResult = await client.query(`
        SELECT deposit_id, stake_amount, api_listing_id, is_upgraded 
        FROM escrow_stakes 
        WHERE buyer_uid = $1 AND api_listing_id = $2 AND status = 'active'
      `, [buyerId, listingId])

      const MIN_STAKE_ETH = "0.1"
      const minStakeWei = ethers.parseEther(MIN_STAKE_ETH)
      let stakeTxHash = null
      let escrowDepositId = null

      if (existingStakeResult.rows.length > 0 && !isUpgrade) {
        // User already has stake - this is an upgrade
        console.log(`   ↗️ User has existing stake, treating as upgrade`)
        const existingStake = existingStakeResult.rows[0]
        escrowDepositId = existingStake.deposit_id
        
        // Verify minimum stake
        const currentStake = ethers.parseEther(existingStake.stake_amount)
        if (currentStake < minStakeWei) {
          throw new Error(`Existing stake ${existingStake.stake_amount} ETH is below minimum required ${MIN_STAKE_ETH} ETH`)
        }
      } else {
        // New stake required or explicit upgrade
        console.log(`   💰 Setting up new escrow stake of ${MIN_STAKE_ETH} ETH...`)
        
        // Initialize escrow client
        const rpcUrl = process.env.RPC_URL
        if (!rpcUrl) {
          throw new Error('RPC_URL not configured')
        }

        const escrowContractAddress = process.env.NEXT_PUBLIC_PAYMENT_ESCROW_CONTRACT
        if (!escrowContractAddress) {
          throw new Error('PaymentEscrow contract address not configured')
        }

        const provider = new ethers.JsonRpcProvider(rpcUrl)
        const privateKey = decryptPrivateKey(
          buyer.encrypted_private_key,
          buyer.encryption_salt
        )
        const wallet = new ethers.Wallet(privateKey, provider)
        const escrowClient = new EscrowClient(provider, wallet)

        try {
          if (isUpgrade && existingStakeResult.rows.length > 0) {
            // Handle upgrade for existing stake - just log the upgrade
            console.log(`   ↗️ Processing upgrade for existing stake...`)
            stakeTxHash = existingStakeResult.rows[0].transaction_hash // Use existing tx hash
            escrowDepositId = existingStakeResult.rows[0].deposit_id
            
            // Mark as upgraded
            await client.query(`
              UPDATE escrow_stakes 
              SET is_upgraded = true, upgraded_at = NOW() 
              WHERE deposit_id = $1
            `, [escrowDepositId])
            
          } else {
            // Create new stake using the real contract now that ABIs are fixed
            console.log(`   🔒 Creating real escrow deposit via blockchain...`)
            const apiKeyHash = ethers.keccak256(ethers.toUtf8Bytes(`${listingId}-${buyerId}-${Date.now()}`))
            
            // Now use the real depositStake function from the updated contract
            console.log(`   Calling depositStake with seller: ${listing.seller_wallet}, apiKeyHash: ${apiKeyHash}`)
            const stakeResult = await escrowClient.depositStake(
              listing.seller_wallet,
              apiKeyHash,
              listingId
            )
            
            stakeTxHash = stakeResult.transactionHash
            const apiKeyId = stakeResult.apiKeyId
            
            // Create stake record in database for tracking
            const dbStakeResult = await client.query(`
              INSERT INTO escrow_stakes (
                buyer_uid, api_listing_id, stake_amount, quota_purchased, 
                transaction_hash, status, created_at
              ) VALUES ($1, $2, $3, $4, $5, 'active', NOW())
              RETURNING deposit_id
            `, [buyerId, listingId, MIN_STAKE_ETH, packageSize, stakeTxHash])
            
            escrowDepositId = dbStakeResult.rows[0].deposit_id
          }
          
          console.log(`   ✅ Escrow stake confirmed: ${stakeTxHash}`)
          console.log(`   Deposit ID: ${escrowDepositId}`)
          
        } catch (escrowError: any) {
          console.error('   ❌ Escrow staking failed:', escrowError)
          throw new Error(`Escrow staking failed: ${escrowError.message}`)
        }
      }

      // 5. Calculate gas fee for blockchain logging
      const gasFeeAmount = calculateGasFeeForCalls(packageSize)
      const gasFeeInEth = parseFloat(gasFeeAmount)
      console.log(`   Gas fee for ${packageSize} calls: ${gasFeeAmount} ETH`)

      // 6. Verify the total amount matches expected (API cost + platform fee + gas fee)
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
        console.error('   ❌ Blockchain transaction failed:', blockchainError)
        throw new Error(`Payment failed: ${blockchainError.message}`)
      }

      // 8. SELECT KEEPER NODE (Decentralized processing!)
      console.log(`   🔍 Selecting keeper node...`)
      const keeper = await selectKeeperNode()

      if (!keeper) {
        console.error(`   ❌ No keeper nodes available!`)
        throw new Error('Keeper network unavailable. Please try again.')
      }

      console.log(`   ✅ Selected keeper: ${keeper.nodeId}`)
      console.log(`   Keeper endpoint: ${keeper.endpointUrl}`)

      // 9. ROUTE TO KEEPER NODE FOR PROCESSING
      console.log(`   📡 Routing purchase to keeper node...`)

      let keeperData
      try {
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
            }),
            signal: AbortSignal.timeout(30000) // 30 second timeout
          }
        )

        if (!keeperResponse.ok) {
          const contentType = keeperResponse.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const errorData = await keeperResponse.json()
            throw new Error(`Keeper processing failed: ${errorData.error || keeperResponse.statusText}`)
          } else {
            const errorText = await keeperResponse.text()
            console.error('   ❌ Keeper returned non-JSON response:', errorText.substring(0, 200))
            throw new Error(`Keeper processing failed: ${keeperResponse.statusText}`)
          }
        }

        keeperData = await keeperResponse.json()
      } catch (fetchError: any) {
        console.error('   ❌ Failed to communicate with keeper:', fetchError.message)
        throw new Error(`Keeper communication failed: ${fetchError.message}. Is the keeper node running at ${keeper.endpointUrl}?`)
      }
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

      // 12. Return success response with keeper and escrow info
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
        escrowStake: {
          depositId: escrowDepositId,
          stakeAmount: MIN_STAKE_ETH,
          transactionHash: stakeTxHash,
          isUpgrade: isUpgrade,
          status: "active",
          securityNote: "Your 0.1 ETH stake secures this API key and prevents theft. Stake tracking is active in the database.",
          contractNote: "Blockchain staking will be enabled when the PaymentEscrow contract is fully deployed and compatible."
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
    console.error("\n❌ [SECURE PURCHASE WITH STAKING] Error:", error.message)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || "Failed to process secure purchase with staking",
        decentralized: true,
        staking: true
      },
      { status: 500 }
    )
  }
}
