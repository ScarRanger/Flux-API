import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/database"
import { decryptPrivateKey } from "@/lib/database"
import { ethers } from "ethers"
import { EscrowClient } from "@/lib/escrow-client"

/**
 * ESCROW STAKE MANAGEMENT
 * POST /api/escrow/manage
 * 
 * Handles:
 * - Stake withdrawals for completed API usage
 * - Emergency slashing for malicious behavior
 * - Stake status queries and updates
 */

export async function POST(req: NextRequest) {
  console.log('\n🔐 [ESCROW STAKE MANAGEMENT] New request')
  
  try {
    const body = await req.json()
    const { action, depositId, buyerUid, adminUid, slashReason } = body

    // Validate input
    if (!action || !depositId) {
      return NextResponse.json(
        { error: "Missing required fields: action, depositId" },
        { status: 400 }
      )
    }

    console.log(`   Action: ${action}`)
    console.log(`   Deposit ID: ${depositId}`)

    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Get stake information
      const stakeResult = await client.query(`
        SELECT es.*, u.wallet_address, u.encrypted_private_key, u.encryption_salt
        FROM escrow_stakes es
        JOIN users u ON es.buyer_uid = u.firebase_uid
        WHERE es.deposit_id = $1
      `, [depositId])

      if (stakeResult.rows.length === 0) {
        throw new Error('Escrow stake not found')
      }

      const stake = stakeResult.rows[0]

      // Initialize escrow client
      const rpcUrl = process.env.RPC_URL
      const escrowContractAddress = process.env.NEXT_PUBLIC_PAYMENT_ESCROW_CONTRACT
      
      if (!rpcUrl || !escrowContractAddress) {
        throw new Error('RPC_URL or PaymentEscrow contract not configured')
      }

      const provider = new ethers.JsonRpcProvider(rpcUrl)
      let txHash = null

      switch (action) {
        case 'withdraw':
          // User withdraws their stake after API usage completion
          if (stake.buyer_uid !== buyerUid) {
            throw new Error('Only stake owner can withdraw')
          }

          if (stake.status !== 'active') {
            throw new Error(`Cannot withdraw stake with status: ${stake.status}`)
          }

          console.log(`   💸 Processing withdrawal for user ${buyerUid}...`)
          
          // Create user's wallet to withdraw
          const privateKey = decryptPrivateKey(stake.encrypted_private_key, stake.encryption_salt)
          const userWallet = new ethers.Wallet(privateKey, provider)
          const userEscrowClient = new EscrowClient(provider, userWallet)

          try {
            // Generate API key ID for withdrawal (this should match the ID used during deposit)
            const apiKeyId = ethers.keccak256(ethers.toUtf8Bytes(`${stake.api_listing_id}-${buyerUid}`))
            const withdrawTx = await userEscrowClient.withdrawStake(apiKeyId)
            txHash = withdrawTx
            console.log(`   ✅ Withdrawal transaction: ${txHash}`)

            // Update stake status
            await client.query(`
              UPDATE escrow_stakes 
              SET status = 'withdrawn', updated_at = NOW()
              WHERE deposit_id = $1
            `, [depositId])

          } catch (withdrawError: any) {
            throw new Error(`Withdrawal failed: ${withdrawError.message}`)
          }
          break

        case 'slash':
          // Admin slashes stake for malicious behavior (simplified version)
          if (!adminUid || !slashReason) {
            throw new Error('Admin UID and slash reason required for slashing')
          }

          // Verify admin permissions
          const adminResult = await client.query(`
            SELECT role FROM users WHERE firebase_uid = $1
          `, [adminUid])

          if (adminResult.rows.length === 0 || adminResult.rows[0].role !== 'admin') {
            throw new Error('Insufficient permissions for slashing')
          }

          if (stake.status !== 'active') {
            throw new Error(`Cannot slash stake with status: ${stake.status}`)
          }

          console.log(`   ⚡ Processing administrative slash by admin ${adminUid}...`)
          console.log(`   Reason: ${slashReason}`)

          // For now, just mark as slashed in database (manual process)
          // TODO: Implement on-chain slashing when contract supports it
          
          try {
            // Update stake status without blockchain transaction for now
            await client.query(`
              UPDATE escrow_stakes 
              SET 
                status = 'slashed',
                slashed_amount = stake_amount,
                slashed_at = NOW(),
                slash_reason = $1,
                updated_at = NOW()
              WHERE deposit_id = $2
            `, [slashReason, depositId])

            // Log admin action
            await client.query(`
              INSERT INTO audit_logs (
                user_id, action, resource_type, resource_id,
                old_values, new_values, created_at
              ) VALUES (
                (SELECT id FROM users WHERE firebase_uid = $1),
                'slash_stake', 'escrow_stake', $2,
                $3, $4, NOW()
              )
            `, [
              adminUid,
              depositId,
              JSON.stringify({ status: 'active', slashed_amount: 0 }),
              JSON.stringify({ status: 'slashed', slashed_amount: stake.stake_amount, reason: slashReason })
            ])

            txHash = 'admin_slash_' + Date.now() // Admin action identifier
            console.log(`   ⚡ Administrative slash completed: ${txHash}`)

          } catch (slashError: any) {
            throw new Error(`Administrative slashing failed: ${slashError.message}`)
          }
          break

        default:
          throw new Error(`Unknown action: ${action}`)
      }

      await client.query('COMMIT')
      console.log(`   ✅ Escrow ${action} completed successfully`)

      return NextResponse.json({
        success: true,
        action: action,
        depositId: depositId,
        transactionHash: txHash,
        stakeAmount: stake.stake_amount,
        message: `Stake ${action} completed successfully`
      })

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error: any) {
    console.error(`\n❌ [ESCROW STAKE MANAGEMENT] Error:`, error.message)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || "Failed to manage escrow stake"
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/escrow/manage
 * 
 * Query stake information
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const buyerUid = searchParams.get('buyerUid')
    const listingId = searchParams.get('listingId')
    const depositId = searchParams.get('depositId')

    if (!buyerUid && !depositId) {
      return NextResponse.json(
        { error: "Either buyerUid or depositId required" },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    
    try {
      let query
      let params

      if (depositId) {
        // Get specific stake by deposit ID
        query = `
          SELECT 
            deposit_id, buyer_uid, api_listing_id, stake_amount,
            quota_purchased, transaction_hash, status, is_upgraded,
            upgraded_at, upgrade_tx_hash, slashed_amount, slashed_at,
            slash_reason, created_at, updated_at
          FROM escrow_stakes 
          WHERE deposit_id = $1
        `
        params = [depositId]
      } else {
        // Get stakes by buyer and optionally listing
        if (listingId) {
          query = `
            SELECT 
              deposit_id, buyer_uid, api_listing_id, stake_amount,
              quota_purchased, transaction_hash, status, is_upgraded,
              upgraded_at, upgrade_tx_hash, slashed_amount, slashed_at,
              slash_reason, created_at, updated_at
            FROM escrow_stakes 
            WHERE buyer_uid = $1 AND api_listing_id = $2
            ORDER BY created_at DESC
          `
          params = [buyerUid, listingId]
        } else {
          query = `
            SELECT 
              deposit_id, buyer_uid, api_listing_id, stake_amount,
              quota_purchased, transaction_hash, status, is_upgraded,
              upgraded_at, upgrade_tx_hash, slashed_amount, slashed_at,
              slash_reason, created_at, updated_at
            FROM escrow_stakes 
            WHERE buyer_uid = $1
            ORDER BY created_at DESC
          `
          params = [buyerUid]
        }
      }

      const result = await client.query(query, params)

      return NextResponse.json({
        success: true,
        stakes: result.rows,
        count: result.rows.length
      })

    } finally {
      client.release()
    }

  } catch (error: any) {
    console.error(`\n❌ [ESCROW STAKE QUERY] Error:`, error.message)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || "Failed to query escrow stakes"
      },
      { status: 500 }
    )
  }
}