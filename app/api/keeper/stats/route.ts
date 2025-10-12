import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/database'

/**
 * GET /api/keeper/stats
 * Get overall keeper network statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Get active nodes count and total stake
    const activeNodesResult = await pool.query(`
      SELECT 
        COUNT(*) as active_nodes,
        SUM(staked_amount) as total_staked,
        AVG(reputation_score) as avg_reputation,
        COUNT(CASE WHEN is_suspended = true THEN 1 END) as suspended_nodes
      FROM keeper_nodes
      WHERE is_active = true
    `)
    
    // Get reputation distribution
    const reputationDistResult = await pool.query(`
      SELECT 
        reputation_tier,
        COUNT(*) as count,
        AVG(reputation_score) as avg_score,
        AVG(staked_amount) as avg_stake
      FROM keeper_nodes
      WHERE is_active = true
      GROUP BY reputation_tier
      ORDER BY 
        CASE reputation_tier
          WHEN 'EXCELLENT' THEN 1
          WHEN 'GOOD' THEN 2
          WHEN 'FAIR' THEN 3
          WHEN 'POOR' THEN 4
          WHEN 'CRITICAL' THEN 5
        END
    `)
    
    // Get slash statistics
    const slashStatsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_slashes,
        COUNT(CASE WHEN severity = 'MINOR' THEN 1 END) as minor_slashes,
        COUNT(CASE WHEN severity = 'MODERATE' THEN 1 END) as moderate_slashes,
        COUNT(CASE WHEN severity = 'SEVERE' THEN 1 END) as severe_slashes,
        SUM(slash_amount) as total_slashed_amount,
        COUNT(CASE WHEN is_disputed = true THEN 1 END) as disputed_slashes
      FROM keeper_slash_events
      WHERE slashed_at >= NOW() - INTERVAL '30 days'
    `)
    
    // Get task completion statistics
    const taskStatsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_tasks,
        AVG(execution_time_ms) as avg_execution_time
      FROM keeper_task_assignments
      WHERE assigned_at >= NOW() - INTERVAL '30 days'
    `)
    
    // Get recent activity (last 7 days)
    const recentActivityResult = await pool.query(`
      SELECT 
        DATE(assigned_at) as date,
        COUNT(*) as tasks,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed
      FROM keeper_task_assignments
      WHERE assigned_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(assigned_at)
      ORDER BY date DESC
    `)
    
    // Get top performing nodes
    const topNodesResult = await pool.query(`
      SELECT 
        node_address,
        reputation_score,
        staked_amount,
        total_tasks_completed,
        total_tasks_failed,
        slash_count,
        CASE 
          WHEN total_tasks_completed + total_tasks_failed > 0 
          THEN ROUND((total_tasks_completed::DECIMAL / (total_tasks_completed + total_tasks_failed) * 100), 2)
          ELSE 100
        END as success_rate
      FROM keeper_nodes
      WHERE is_active = true AND is_suspended = false
      ORDER BY reputation_score DESC, total_tasks_completed DESC
      LIMIT 10
    `)
    
    // Get pending disputes
    const pendingDisputesResult = await pool.query(`
      SELECT COUNT(*) as pending_disputes
      FROM keeper_dispute_resolutions
      WHERE resolved_at IS NULL
    `)
    
    return NextResponse.json({
      overview: {
        activeNodes: parseInt(activeNodesResult.rows[0].active_nodes),
        totalStaked: parseFloat(activeNodesResult.rows[0].total_staked || 0),
        avgReputation: parseFloat(activeNodesResult.rows[0].avg_reputation || 0),
        suspendedNodes: parseInt(activeNodesResult.rows[0].suspended_nodes)
      },
      reputationDistribution: reputationDistResult.rows,
      slashStatistics: {
        total: parseInt(slashStatsResult.rows[0].total_slashes),
        minor: parseInt(slashStatsResult.rows[0].minor_slashes),
        moderate: parseInt(slashStatsResult.rows[0].moderate_slashes),
        severe: parseInt(slashStatsResult.rows[0].severe_slashes),
        totalAmount: parseFloat(slashStatsResult.rows[0].total_slashed_amount || 0),
        disputed: parseInt(slashStatsResult.rows[0].disputed_slashes)
      },
      taskStatistics: {
        total: parseInt(taskStatsResult.rows[0].total_tasks),
        completed: parseInt(taskStatsResult.rows[0].completed_tasks),
        failed: parseInt(taskStatsResult.rows[0].failed_tasks),
        avgExecutionTime: parseFloat(taskStatsResult.rows[0].avg_execution_time || 0),
        successRate: taskStatsResult.rows[0].total_tasks > 0 
          ? ((taskStatsResult.rows[0].completed_tasks / taskStatsResult.rows[0].total_tasks) * 100).toFixed(2)
          : 100
      },
      recentActivity: recentActivityResult.rows,
      topNodes: topNodesResult.rows,
      pendingDisputes: parseInt(pendingDisputesResult.rows[0].pending_disputes)
    })
    
  } catch (error: any) {
    console.error('Error fetching keeper stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch keeper statistics' },
      { status: 500 }
    )
  }
}
