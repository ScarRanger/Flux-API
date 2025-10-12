import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/database'

/**
 * POST /api/keeper/dispute
 * File a dispute against a slash event
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      slashId,
      nodeAddress,
      disputeReason,
      evidence,
      disputedByUid
    } = body
    
    // Validate inputs
    if (!slashId || !nodeAddress || !disputeReason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Check if slash event exists and is not already resolved
      const slashResult = await client.query(`
        SELECT se.*, dr.dispute_id
        FROM keeper_slash_events se
        LEFT JOIN keeper_dispute_resolutions dr ON se.slash_id = dr.slash_id
        WHERE se.slash_id = $1 AND se.node_address = $2
      `, [slashId, nodeAddress])
      
      if (slashResult.rows.length === 0) {
        throw new Error('Slash event not found')
      }
      
      const slash = slashResult.rows[0]
      
      if (slash.dispute_id) {
        throw new Error('Dispute already filed for this slash event')
      }
      
      // Check if challenge period is still valid (24 hours)
      const slashTime = new Date(slash.slashed_at)
      const now = new Date()
      const hoursPassed = (now.getTime() - slashTime.getTime()) / (1000 * 60 * 60)
      
      if (hoursPassed > 24) {
        throw new Error('Challenge period has expired (24 hours)')
      }
      
      // Update slash event to mark as disputed
      await client.query(`
        UPDATE keeper_slash_events
        SET is_disputed = true
        WHERE slash_id = $1
      `, [slashId])
      
      // Create dispute resolution record
      const disputeResult = await client.query(`
        INSERT INTO keeper_dispute_resolutions (
          slash_id,
          node_address,
          dispute_reason,
          evidence,
          disputed_by_uid
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        slashId,
        nodeAddress,
        disputeReason,
        evidence ? JSON.stringify(evidence) : null,
        disputedByUid
      ])
      
      await client.query('COMMIT')
      
      return NextResponse.json({
        success: true,
        dispute: disputeResult.rows[0]
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error: any) {
    console.error('Error filing dispute:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to file dispute' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/keeper/dispute
 * Resolve a dispute (admin only)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      disputeId,
      outcome,
      reason,
      resolvedByUid,
      restoreStake,
      restoreReputation
    } = body
    
    // Validate inputs
    if (!disputeId || !outcome || !resolvedByUid) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const validOutcomes = ['UPHELD', 'OVERTURNED', 'PARTIAL']
    if (!validOutcomes.includes(outcome)) {
      return NextResponse.json(
        { error: `Invalid outcome. Must be one of: ${validOutcomes.join(', ')}` },
        { status: 400 }
      )
    }
    
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Get dispute details
      const disputeResult = await client.query(`
        SELECT dr.*, se.node_address, se.slash_amount, se.slash_reason
        FROM keeper_dispute_resolutions dr
        JOIN keeper_slash_events se ON dr.slash_id = se.slash_id
        WHERE dr.dispute_id = $1
      `, [disputeId])
      
      if (disputeResult.rows.length === 0) {
        throw new Error('Dispute not found')
      }
      
      const dispute = disputeResult.rows[0]
      
      if (dispute.resolved_at) {
        throw new Error('Dispute already resolved')
      }
      
      // Update dispute resolution
      await client.query(`
        UPDATE keeper_dispute_resolutions
        SET 
          resolution_outcome = $1,
          resolution_reason = $2,
          resolved_by_uid = $3,
          resolved_at = CURRENT_TIMESTAMP
        WHERE dispute_id = $4
      `, [outcome, reason, resolvedByUid, disputeId])
      
      // If dispute is overturned or partial, restore stake/reputation
      if (outcome === 'OVERTURNED' || outcome === 'PARTIAL') {
        const stakeToRestore = outcome === 'OVERTURNED' 
          ? parseFloat(dispute.slash_amount)
          : restoreStake || 0
          
        if (stakeToRestore > 0) {
          // Get current node state
          const nodeResult = await client.query(
            'SELECT staked_amount FROM keeper_nodes WHERE node_address = $1',
            [dispute.node_address]
          )
          
          const currentStake = parseFloat(nodeResult.rows[0].staked_amount)
          const newStake = currentStake + stakeToRestore
          
          await client.query(`
            UPDATE keeper_nodes
            SET 
              staked_amount = $1,
              is_suspended = CASE WHEN $1 >= 0.1 THEN false ELSE is_suspended END,
              updated_at = CURRENT_TIMESTAMP
            WHERE node_address = $2
          `, [newStake, dispute.node_address])
          
          // Record stake history
          await client.query(`
            INSERT INTO keeper_stake_history (
              node_address,
              action,
              amount,
              previous_stake,
              new_stake,
              reason
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            dispute.node_address,
            'DISPUTE_RESOLVED',
            stakeToRestore,
            currentStake,
            newStake,
            `Stake restored after dispute ${outcome}`
          ])
        }
        
        if (restoreReputation) {
          const nodeResult = await client.query(
            'SELECT reputation_score FROM keeper_nodes WHERE node_address = $1',
            [dispute.node_address]
          )
          
          const currentReputation = nodeResult.rows[0].reputation_score
          const newReputation = Math.min(100, currentReputation + restoreReputation)
          
          await client.query(`
            UPDATE keeper_nodes
            SET reputation_score = $1
            WHERE node_address = $2
          `, [newReputation, dispute.node_address])
          
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
            dispute.node_address,
            currentReputation,
            newReputation,
            `Reputation restored after dispute ${outcome}`,
            resolvedByUid
          ])
        }
      }
      
      await client.query('COMMIT')
      
      return NextResponse.json({
        success: true,
        outcome,
        stakeRestored: restoreStake || 0,
        reputationRestored: restoreReputation || 0
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error: any) {
    console.error('Error resolving dispute:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to resolve dispute' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/keeper/dispute
 * Get disputes by node or all pending disputes
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const nodeAddress = searchParams.get('nodeAddress')
    const status = searchParams.get('status') // 'pending', 'resolved', 'all'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    let query = `
      SELECT 
        dr.*,
        se.slash_reason,
        se.severity,
        se.slash_amount,
        se.slashed_at,
        kn.owner_uid,
        kn.reputation_score,
        u1.display_name as disputed_by_name,
        u2.display_name as resolved_by_name
      FROM keeper_dispute_resolutions dr
      JOIN keeper_slash_events se ON dr.slash_id = se.slash_id
      JOIN keeper_nodes kn ON dr.node_address = kn.node_address
      LEFT JOIN users u1 ON dr.disputed_by_uid = u1.firebase_uid
      LEFT JOIN users u2 ON dr.resolved_by_uid = u2.firebase_uid
      WHERE 1=1
    `
    
    const params: any[] = []
    
    if (nodeAddress) {
      params.push(nodeAddress)
      query += ` AND dr.node_address = $${params.length}`
    }
    
    if (status === 'pending') {
      query += ` AND dr.resolved_at IS NULL`
    } else if (status === 'resolved') {
      query += ` AND dr.resolved_at IS NOT NULL`
    }
    
    query += ` ORDER BY dr.disputed_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)
    
    const result = await pool.query(query, params)
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM keeper_dispute_resolutions dr
      WHERE 1=1
    `
    
    const countParams: any[] = []
    let paramIdx = 1
    
    if (nodeAddress) {
      countParams.push(nodeAddress)
      countQuery += ` AND dr.node_address = $${paramIdx++}`
    }
    
    if (status === 'pending') {
      countQuery += ` AND dr.resolved_at IS NULL`
    } else if (status === 'resolved') {
      countQuery += ` AND dr.resolved_at IS NOT NULL`
    }
    
    const countResult = await pool.query(countQuery, countParams)
    
    return NextResponse.json({
      disputes: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset
    })
    
  } catch (error: any) {
    console.error('Error fetching disputes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch disputes' },
      { status: 500 }
    )
  }
}
