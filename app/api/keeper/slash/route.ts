import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/database'

/**
 * POST /api/keeper/slash
 * Record a slash event for a keeper node
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      nodeAddress,
      reason,
      severity,
      slashAmount,
      evidence,
      reporterUid,
      blockchainTxHash
    } = body
    
    // Validate inputs
    if (!nodeAddress || !reason || !severity || !slashAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Validate severity
    const validSeverities = ['MINOR', 'MODERATE', 'SEVERE']
    if (!validSeverities.includes(severity)) {
      return NextResponse.json(
        { error: 'Invalid severity. Must be MINOR, MODERATE, or SEVERE' },
        { status: 400 }
      )
    }
    
    // Validate reason
    const validReasons = [
      'API_KEY_THEFT',
      'DATA_TAMPERING',
      'DOWNTIME_VIOLATION',
      'MALICIOUS_BEHAVIOR',
      'RESPONSE_MANIPULATION',
      'UNAUTHORIZED_ACCESS'
    ]
    
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: `Invalid reason. Must be one of: ${validReasons.join(', ')}` },
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
      const currentStake = parseFloat(node.staked_amount)
      const slashValue = parseFloat(slashAmount)
      
      // Check if node has enough stake
      if (currentStake < slashValue) {
        throw new Error('Node does not have enough stake to slash')
      }
      
      // Insert slash event
      const slashResult = await client.query(`
        INSERT INTO keeper_slash_events (
          node_address,
          slash_reason,
          severity,
          slash_amount,
          evidence,
          slashed_by_uid,
          blockchain_tx_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        nodeAddress,
        reason,
        severity,
        slashAmount,
        evidence ? JSON.stringify(evidence) : null,
        reporterUid,
        blockchainTxHash
      ])
      
      const slashEvent = slashResult.rows[0]
      
      // Calculate reputation penalty
      const reputationPenalty = severity === 'SEVERE' ? 20 : severity === 'MODERATE' ? 10 : 5
      const newReputation = Math.max(0, node.reputation_score - reputationPenalty)
      const newStake = currentStake - slashValue
      
      // Update node: reduce stake, update reputation, increment slash count
      await client.query(`
        UPDATE keeper_nodes
        SET 
          staked_amount = $1,
          reputation_score = $2,
          slash_count = slash_count + 1,
          is_suspended = CASE WHEN $1 < 0.1 THEN true ELSE is_suspended END,
          last_slash_time = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE node_address = $3
      `, [newStake, newReputation, nodeAddress])
      
      // Record stake history
      await client.query(`
        INSERT INTO keeper_stake_history (
          node_address,
          action,
          amount,
          previous_stake,
          new_stake,
          reason,
          blockchain_tx_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        nodeAddress,
        'SLASH',
        slashValue,
        currentStake,
        newStake,
        `Slashed for ${reason} (${severity})`,
        blockchainTxHash
      ])
      
      // Record reputation history
      await client.query(`
        INSERT INTO keeper_reputation_history (
          node_address,
          previous_score,
          new_score,
          change_reason,
          changed_by_uid
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        nodeAddress,
        node.reputation_score,
        newReputation,
        `Slashed for ${reason}`,
        reporterUid
      ])
      
      // Check if node should be auto-suspended
      if (newStake < 0.1 || newReputation < 40) {
        await client.query(`
          UPDATE keeper_nodes
          SET 
            is_suspended = true,
            suspension_reason = $1
          WHERE node_address = $2
        `, [
          newStake < 0.1 ? 'Stake below minimum' : 'Reputation too low',
          nodeAddress
        ])
      }
      
      await client.query('COMMIT')
      
      return NextResponse.json({
        success: true,
        slashEvent: slashEvent,
        newStake,
        newReputation,
        suspended: newStake < 0.1 || newReputation < 40
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error: any) {
    console.error('Error slashing keeper node:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to slash keeper node' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/keeper/slash
 * Get slash history for a node or all nodes
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const nodeAddress = searchParams.get('nodeAddress')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    let query = `
      SELECT 
        se.*,
        kn.owner_uid,
        kn.reputation_score,
        kn.staked_amount,
        u.display_name as slashed_by_name,
        dr.resolution_outcome,
        dr.resolution_reason,
        dr.resolved_at
      FROM keeper_slash_events se
      JOIN keeper_nodes kn ON se.node_address = kn.node_address
      LEFT JOIN users u ON se.slashed_by_uid = u.firebase_uid
      LEFT JOIN keeper_dispute_resolutions dr ON se.slash_id = dr.slash_id
      WHERE 1=1
    `
    
    const params: any[] = []
    
    if (nodeAddress) {
      params.push(nodeAddress)
      query += ` AND se.node_address = $${params.length}`
    }
    
    query += ` ORDER BY se.slashed_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)
    
    const result = await pool.query(query, params)
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM keeper_slash_events se
      WHERE 1=1
    `
    
    const countParams: any[] = []
    if (nodeAddress) {
      countParams.push(nodeAddress)
      countQuery += ` AND se.node_address = $1`
    }
    
    const countResult = await pool.query(countQuery, countParams)
    
    return NextResponse.json({
      slashEvents: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset
    })
    
  } catch (error: any) {
    console.error('Error fetching slash events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch slash events' },
      { status: 500 }
    )
  }
}
