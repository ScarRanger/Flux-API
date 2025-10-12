import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/database'

/**
 * POST /api/keeper/tasks
 * Record task completion for a keeper node
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      nodeAddress,
      taskType,
      success,
      metadata,
      executionTimeMs,
      errorMessage
    } = body
    
    // Validate inputs
    if (!nodeAddress || !taskType || success === undefined) {
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
      
      // Insert task assignment
      const taskResult = await client.query(`
        INSERT INTO keeper_task_assignments (
          node_address,
          task_type,
          status,
          assigned_at,
          completed_at,
          task_metadata,
          execution_time_ms,
          error_message
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7)
        RETURNING *
      `, [
        nodeAddress,
        taskType,
        success ? 'COMPLETED' : 'FAILED',
        success ? new Date() : null,
        metadata ? JSON.stringify(metadata) : null,
        executionTimeMs,
        errorMessage
      ])
      
      const task = taskResult.rows[0]
      
      // Update node task counts and last activity
      if (success) {
        await client.query(`
          UPDATE keeper_nodes
          SET 
            total_tasks_completed = total_tasks_completed + 1,
            last_activity_time = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE node_address = $1
        `, [nodeAddress])
      } else {
        await client.query(`
          UPDATE keeper_nodes
          SET 
            total_tasks_failed = total_tasks_failed + 1,
            last_activity_time = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE node_address = $1
        `, [nodeAddress])
      }
      
      // Update or create daily performance metrics
      const today = new Date().toISOString().split('T')[0]
      
      await client.query(`
        INSERT INTO keeper_performance_metrics (
          node_address,
          metric_date,
          tasks_completed,
          tasks_failed,
          total_execution_time_ms,
          avg_execution_time_ms
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (node_address, metric_date)
        DO UPDATE SET
          tasks_completed = keeper_performance_metrics.tasks_completed + $3,
          tasks_failed = keeper_performance_metrics.tasks_failed + $4,
          total_execution_time_ms = keeper_performance_metrics.total_execution_time_ms + $5,
          avg_execution_time_ms = (keeper_performance_metrics.total_execution_time_ms + $5) / 
                                  (keeper_performance_metrics.tasks_completed + keeper_performance_metrics.tasks_failed + $3 + $4),
          updated_at = CURRENT_TIMESTAMP
      `, [
        nodeAddress,
        today,
        success ? 1 : 0,
        success ? 0 : 1,
        executionTimeMs || 0,
        executionTimeMs || 0
      ])
      
      // Calculate reputation adjustment based on success rate
      const totalTasks = node.total_tasks_completed + node.total_tasks_failed + 1
      const successRate = (node.total_tasks_completed + (success ? 1 : 0)) / totalTasks
      
      // Increase reputation for consistent success, decrease for failures
      let reputationChange = 0
      if (success) {
        if (successRate >= 0.95 && node.reputation_score < 100) {
          reputationChange = 1 // Reward high performers
        }
      } else {
        if (successRate < 0.8) {
          reputationChange = -2 // Penalize poor performers
        }
      }
      
      if (reputationChange !== 0) {
        const newReputation = Math.max(0, Math.min(100, node.reputation_score + reputationChange))
        
        await client.query(`
          UPDATE keeper_nodes
          SET reputation_score = $1
          WHERE node_address = $2
        `, [newReputation, nodeAddress])
        
        // Record reputation history
        await client.query(`
          INSERT INTO keeper_reputation_history (
            node_address,
            previous_score,
            new_score,
            change_reason
          ) VALUES ($1, $2, $3, $4)
        `, [
          nodeAddress,
          node.reputation_score,
          newReputation,
          success ? 'Task completed successfully' : 'Task failed'
        ])
      }
      
      await client.query('COMMIT')
      
      return NextResponse.json({
        success: true,
        task: task,
        reputationChange
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error: any) {
    console.error('Error recording task completion:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to record task completion' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/keeper/tasks
 * Get task history for a node
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const nodeAddress = searchParams.get('nodeAddress')
    const status = searchParams.get('status') // 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    if (!nodeAddress) {
      return NextResponse.json(
        { error: 'nodeAddress is required' },
        { status: 400 }
      )
    }
    
    let query = `
      SELECT *
      FROM keeper_task_assignments
      WHERE node_address = $1
    `
    
    const params: any[] = [nodeAddress]
    
    if (status) {
      params.push(status)
      query += ` AND status = $${params.length}`
    }
    
    query += ` ORDER BY assigned_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)
    
    const result = await pool.query(query, params)
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM keeper_task_assignments
      WHERE node_address = $1
    `
    
    const countParams: any[] = [nodeAddress]
    if (status) {
      countParams.push(status)
      countQuery += ` AND status = $2`
    }
    
    const countResult = await pool.query(countQuery, countParams)
    
    return NextResponse.json({
      tasks: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset
    })
    
  } catch (error: any) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}
