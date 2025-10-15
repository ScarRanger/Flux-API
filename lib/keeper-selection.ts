import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

export interface KeeperNode {
  id: number
  nodeId: string
  walletAddress: string
  endpointUrl: string
  isActive: boolean
  reputationScore: number
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  lastHeartbeat: Date | null
}

/**
 * Get all active keeper nodes from database
 */
export async function getActiveKeeperNodes(): Promise<KeeperNode[]> {
  try {
    // Try to get from database with actual schema
    const result = await pool.query(
      `SELECT 
        id, node_address, owner_uid, reputation_score, 
        total_tasks_completed, total_tasks_failed, is_active, node_metadata
       FROM keeper_nodes 
       WHERE is_active = true
       ORDER BY reputation_score DESC, total_tasks_completed ASC`
    )
    
    const dbNodes = result.rows.map(row => {
      const metadata = row.node_metadata || {}
      return {
        id: row.id,
        nodeId: metadata.node_id || `keeper-${row.id}`,
        walletAddress: row.node_address,
        endpointUrl: metadata.endpoint || process.env.KEEPER_NODE_URL || 'http://localhost:3001',
        isActive: row.is_active,
        reputationScore: row.reputation_score || 0,
        totalRequests: row.total_tasks_completed || 0,
        successfulRequests: row.total_tasks_completed || 0,
        failedRequests: row.total_tasks_failed || 0,
        lastHeartbeat: null
      }
    })
    
    // If no nodes in DB, return hardcoded keeper that's running
    if (dbNodes.length === 0) {
      console.log('📌 No keepers in database, using default keeper node')
      return [{
        id: 1,
        nodeId: 'keeper-node-1',
        walletAddress: '0x447e555CA6664bbDF5f7cd6FF4878F7c1a54f44e',
        endpointUrl: process.env.KEEPER_NODE_URL || 'http://localhost:3001',
        isActive: true,
        reputationScore: 100,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        lastHeartbeat: new Date()
      }]
    }
    
    return dbNodes
  } catch (error) {
    console.error('Failed to get keeper nodes from DB, using fallback:', error)
    // Fallback to hardcoded keeper
    return [{
      id: 1,
      nodeId: 'keeper-node-1',
      walletAddress: '0x447e555CA6664bbDF5f7cd6FF4878F7c1a54f44e',
      endpointUrl: process.env.KEEPER_NODE_URL || 'http://localhost:3001',
      isActive: true,
      reputationScore: 100,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      lastHeartbeat: new Date()
    }]
  }
}

/**
 * Select the best keeper node using round-robin with reputation weighting
 */
export async function selectKeeperNode(): Promise<KeeperNode | null> {
  const nodes = await getActiveKeeperNodes()
  
  if (nodes.length === 0) {
    console.warn('⚠️  No active keeper nodes available!')
    return null
  }

  if (nodes.length === 1) {
    return nodes[0]
  }

  // Simple round-robin: select node with least total requests
  // In production, you'd want more sophisticated load balancing
  const selected = nodes.reduce((min, node) => 
    node.totalRequests < min.totalRequests ? node : min
  )

  console.log(`🎯 Selected keeper node: ${selected.nodeId} (${selected.totalRequests} requests)`)
  return selected
}

/**
 * Register a new keeper node
 */
export async function registerKeeperNode(
  nodeId: string, 
  walletAddress: string, 
  endpointUrl: string
): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO keeper_nodes (node_id, wallet_address, endpoint_url, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (node_id) 
       DO UPDATE SET 
         wallet_address = $2,
         endpoint_url = $3,
         is_active = true,
         last_heartbeat = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
      [nodeId, walletAddress, endpointUrl]
    )
    
    console.log(`✅ Keeper node registered: ${nodeId}`)
    return true
  } catch (error) {
    console.error('Failed to register keeper node:', error)
    return false
  }
}

/**
 * Update keeper node statistics after a request
 */
export async function updateKeeperStats(nodeId: string, success: boolean): Promise<void> {
  try {
    if (success) {
      await pool.query(
        `UPDATE keeper_nodes 
         SET total_requests = total_requests + 1,
             successful_requests = successful_requests + 1,
             reputation_score = reputation_score + 1,
             last_heartbeat = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE node_id = $1`,
        [nodeId]
      )
    } else {
      await pool.query(
        `UPDATE keeper_nodes 
         SET total_requests = total_requests + 1,
             failed_requests = failed_requests + 1,
             reputation_score = GREATEST(0, reputation_score - 5),
             last_heartbeat = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE node_id = $1`,
        [nodeId]
      )
    }
  } catch (error) {
    console.error('Failed to update keeper stats:', error)
  }
}

/**
 * Check if a keeper node is healthy (recent heartbeat)
 */
export async function checkKeeperHealth(nodeId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT last_heartbeat, is_active
       FROM keeper_nodes 
       WHERE node_id = $1`,
      [nodeId]
    )
    
    if (result.rows.length === 0) {
      return false
    }

    const node = result.rows[0]
    if (!node.is_active) {
      return false
    }

    // Consider healthy if heartbeat within last 5 minutes
    if (node.last_heartbeat) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      return new Date(node.last_heartbeat) > fiveMinutesAgo
    }

    return true
  } catch (error) {
    console.error('Failed to check keeper health:', error)
    return false
  }
}

/**
 * Deactivate unhealthy keeper nodes
 */
export async function deactivateStaleKeepers(): Promise<number> {
  try {
    // Deactivate nodes with no heartbeat in last 5 minutes
    const result = await pool.query(
      `UPDATE keeper_nodes 
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE is_active = true 
         AND (last_heartbeat IS NULL OR last_heartbeat < NOW() - INTERVAL '5 minutes')
       RETURNING node_id`
    )
    
    if (result.rows.length > 0) {
      console.log(`⚠️  Deactivated ${result.rows.length} stale keeper nodes:`, 
        result.rows.map(r => r.node_id))
    }

    return result.rows.length
  } catch (error) {
    console.error('Failed to deactivate stale keepers:', error)
    return 0
  }
}
