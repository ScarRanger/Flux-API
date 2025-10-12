import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/database'
import { ethers } from 'ethers'

/**
 * GET /api/keeper/nodes
 * Get all keeper nodes or filter by status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') // 'active', 'suspended', 'all'
    const minReputation = searchParams.get('minReputation')
    const orderBy = searchParams.get('orderBy') || 'reputation_score' // 'reputation_score', 'stake', 'tasks'
    
    let query = `
      SELECT 
        kn.*,
        u.display_name as owner_name,
        u.email as owner_email,
        u.wallet_address as owner_wallet,
        CASE 
          WHEN kn.total_tasks_completed + kn.total_tasks_failed > 0 
          THEN ROUND((kn.total_tasks_completed::DECIMAL / (kn.total_tasks_completed + kn.total_tasks_failed) * 100), 2)
          ELSE 100
        END as success_rate,
        (SELECT COUNT(*) FROM keeper_slash_events WHERE node_address = kn.node_address) as total_slashes,
        (SELECT COUNT(*) FROM keeper_api_key_assignments WHERE node_address = kn.node_address AND is_active = true) as active_assignments
      FROM keeper_nodes kn
      JOIN users u ON kn.owner_uid = u.firebase_uid
      WHERE 1=1
    `
    
    const params: any[] = []
    let paramIndex = 1
    
    // Filter by status
    if (status === 'active') {
      query += ` AND kn.is_active = true AND kn.is_suspended = false`
    } else if (status === 'suspended') {
      query += ` AND kn.is_suspended = true`
    }
    
    // Filter by minimum reputation
    if (minReputation) {
      query += ` AND kn.reputation_score >= $${paramIndex}`
      params.push(parseInt(minReputation))
      paramIndex++
    }
    
    // Order by
    const validOrderColumns = {
      'reputation_score': 'kn.reputation_score DESC',
      'stake': 'kn.staked_amount DESC',
      'tasks': 'kn.total_tasks_completed DESC',
      'recent': 'kn.last_activity_time DESC'
    }
    
    query += ` ORDER BY ${validOrderColumns[orderBy as keyof typeof validOrderColumns] || validOrderColumns.reputation_score}`
    
    const result = await pool.query(query, params)
    
    return NextResponse.json({
      nodes: result.rows,
      count: result.rows.length
    })
    
  } catch (error: any) {
    console.error('Error fetching keeper nodes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch keeper nodes' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/keeper/nodes
 * Register a new keeper node
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      ownerUid,
      nodeAddress,
      stakedAmount,
      metadata,
      blockchainTxHash
    } = body
    
    // Validate inputs
    if (!ownerUid || !nodeAddress || !stakedAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Validate node address format
    if (!ethers.isAddress(nodeAddress)) {
      return NextResponse.json(
        { error: 'Invalid node address' },
        { status: 400 }
      )
    }
    
    // Check minimum stake (0.1 ETH)
    if (parseFloat(stakedAmount) < 0.1) {
      return NextResponse.json(
        { error: 'Minimum stake is 0.1 ETH' },
        { status: 400 }
      )
    }
    
    // Check if node already registered
    const existingNode = await pool.query(
      'SELECT node_address FROM keeper_nodes WHERE node_address = $1',
      [nodeAddress]
    )
    
    if (existingNode.rows.length > 0) {
      return NextResponse.json(
        { error: 'Node already registered' },
        { status: 409 }
      )
    }
    
    // Insert new keeper node
    const result = await pool.query(`
      INSERT INTO keeper_nodes (
        node_address,
        owner_uid,
        staked_amount,
        node_metadata,
        blockchain_tx_hash
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      nodeAddress,
      ownerUid,
      stakedAmount,
      metadata ? JSON.stringify(metadata) : null,
      blockchainTxHash
    ])
    
    // Record initial stake in history
    await pool.query(`
      INSERT INTO keeper_stake_history (
        node_address,
        action,
        amount,
        previous_stake,
        new_stake,
        blockchain_tx_hash
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      nodeAddress,
      'INITIAL_STAKE',
      stakedAmount,
      0,
      stakedAmount,
      blockchainTxHash
    ])
    
    return NextResponse.json({
      success: true,
      node: result.rows[0]
    }, { status: 201 })
    
  } catch (error: any) {
    console.error('Error registering keeper node:', error)
    return NextResponse.json(
      { error: 'Failed to register keeper node' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/keeper/nodes
 * Update keeper node (increase stake, suspend, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      nodeAddress,
      action, // 'increase_stake', 'request_unstake', 'suspend', 'reactivate'
      amount,
      reason,
      blockchainTxHash
    } = body
    
    if (!nodeAddress || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Get current node state
      const nodeResult = await client.query(
        'SELECT * FROM keeper_nodes WHERE node_address = $1',
        [nodeAddress]
      )
      
      if (nodeResult.rows.length === 0) {
        throw new Error('Node not found')
      }
      
      const node = nodeResult.rows[0]
      let updateResult
      
      switch (action) {
        case 'increase_stake':
          if (!amount || parseFloat(amount) <= 0) {
            throw new Error('Invalid stake amount')
          }
          
          updateResult = await client.query(`
            UPDATE keeper_nodes
            SET staked_amount = staked_amount + $1,
                is_suspended = CASE 
                  WHEN staked_amount + $1 >= 0.1 THEN false 
                  ELSE is_suspended 
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE node_address = $2
            RETURNING *
          `, [amount, nodeAddress])
          
          // Record stake increase
          await client.query(`
            INSERT INTO keeper_stake_history (
              node_address,
              action,
              amount,
              previous_stake,
              new_stake,
              blockchain_tx_hash
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            nodeAddress,
            'INCREASE_STAKE',
            amount,
            node.staked_amount,
            parseFloat(node.staked_amount) + parseFloat(amount),
            blockchainTxHash
          ])
          break
          
        case 'request_unstake':
          updateResult = await client.query(`
            UPDATE keeper_nodes
            SET unstake_request_time = CURRENT_TIMESTAMP,
                is_active = false,
                updated_at = CURRENT_TIMESTAMP
            WHERE node_address = $1
            RETURNING *
          `, [nodeAddress])
          break
          
        case 'complete_unstake':
          // Check if unstake period has passed (7 days)
          if (!node.unstake_request_time) {
            throw new Error('No unstake request found')
          }
          
          const unstakeTime = new Date(node.unstake_request_time)
          const now = new Date()
          const daysPassed = (now.getTime() - unstakeTime.getTime()) / (1000 * 60 * 60 * 24)
          
          if (daysPassed < 7) {
            throw new Error(`Unstake lock period not ended. ${(7 - daysPassed).toFixed(1)} days remaining`)
          }
          
          updateResult = await client.query(`
            UPDATE keeper_nodes
            SET staked_amount = 0,
                is_active = false,
                updated_at = CURRENT_TIMESTAMP
            WHERE node_address = $1
            RETURNING *
          `, [nodeAddress])
          
          // Record unstake
          await client.query(`
            INSERT INTO keeper_stake_history (
              node_address,
              action,
              amount,
              previous_stake,
              new_stake,
              blockchain_tx_hash
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            nodeAddress,
            'COMPLETE_UNSTAKE',
            node.staked_amount,
            node.staked_amount,
            0,
            blockchainTxHash
          ])
          break
          
        case 'suspend':
          updateResult = await client.query(`
            UPDATE keeper_nodes
            SET is_suspended = true,
                suspension_reason = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE node_address = $2
            RETURNING *
          `, [reason || 'Manual suspension', nodeAddress])
          break
          
        case 'reactivate':
          if (parseFloat(node.staked_amount) < 0.1) {
            throw new Error('Cannot reactivate: stake below minimum')
          }
          
          updateResult = await client.query(`
            UPDATE keeper_nodes
            SET is_suspended = false,
                suspension_reason = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE node_address = $1
            RETURNING *
          `, [nodeAddress])
          break
          
        default:
          throw new Error('Invalid action')
      }
      
      await client.query('COMMIT')
      
      return NextResponse.json({
        success: true,
        node: updateResult.rows[0]
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error: any) {
    console.error('Error updating keeper node:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update keeper node' },
      { status: 500 }
    )
  }
}
