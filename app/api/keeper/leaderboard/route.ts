import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/database'

/**
 * GET /api/keeper/leaderboard
 * Get keeper nodes ranked by reputation and performance
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const minStake = searchParams.get('minStake') || '0.1'
    
    // Use the keeper_node_leaderboard view
    const result = await pool.query(`
      SELECT *
      FROM keeper_node_leaderboard
      WHERE staked_amount >= $1
      ORDER BY rank
      LIMIT $2 OFFSET $3
    `, [minStake, limit, offset])
    
    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM keeper_node_leaderboard
      WHERE staked_amount >= $1
    `, [minStake])
    
    return NextResponse.json({
      leaderboard: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset
    })
    
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
