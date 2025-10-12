import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

/**
 * GET /api/my-apis/blockchain-logs?accessKey=<key>&limit=<number>
 * Get blockchain logs for a specific API access
 */
export async function GET(req: NextRequest) {
  try {
    const accessKey = req.nextUrl.searchParams.get('accessKey')
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50')

    if (!accessKey) {
      return NextResponse.json(
        { error: 'accessKey parameter is required' },
        { status: 400 }
      )
    }

    // First, get the access details to find buyer_uid and listing_id
    const accessResult = await pool.query(`
      SELECT buyer_uid, listing_id
      FROM api_access
      WHERE access_key = $1
    `, [accessKey])

    if (accessResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Access key not found' },
        { status: 404 }
      )
    }

    const { buyer_uid, listing_id } = accessResult.rows[0]

    // Fetch blockchain logs for this buyer and listing
    const result = await pool.query(`
      SELECT 
        ac.id,
        ac.created_at as timestamp,
        ac.path,
        ac.method,
        ac.response_code as status_code,
        ac.latency_ms as response_time_ms,
        ac.blockchain_tx_hash,
        ac.blockchain_block,
        ac.buyer_user_id,
        al.api_name,
        al.id as listing_id
      FROM api_calls ac
      JOIN api_listings al ON ac.listing_id = al.id
      WHERE ac.buyer_user_id = $1
        AND ac.listing_id = $2
        AND ac.blockchain_tx_hash IS NOT NULL
      ORDER BY ac.created_at DESC
      LIMIT $3
    `, [buyer_uid, listing_id, limit])

    // Get summary statistics
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_blockchain_logs,
        COUNT(DISTINCT blockchain_block) as unique_blocks,
        MIN(created_at) as first_logged,
        MAX(created_at) as last_logged,
        AVG(latency_ms) as avg_response_time
      FROM api_calls
      WHERE buyer_user_id = $1
        AND listing_id = $2
        AND blockchain_tx_hash IS NOT NULL
    `, [buyer_uid, listing_id])

    const stats = statsResult.rows[0]

    const logs = result.rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      request: {
        method: row.method,
        path: row.path,
        statusCode: row.status_code,
        responseTime: row.response_time_ms
      },
      blockchain: {
        txHash: row.blockchain_tx_hash,
        blockNumber: row.blockchain_block,
        explorerUrl: `https://sepolia.etherscan.io/tx/${row.blockchain_tx_hash}`,
        blockExplorerUrl: `https://sepolia.etherscan.io/block/${row.blockchain_block}`
      },
      apiInfo: {
        name: row.api_name,
        listingId: row.listing_id
      }
    }))

    return NextResponse.json({
      logs,
      stats: {
        totalLogged: parseInt(stats.total_blockchain_logs),
        uniqueBlocks: parseInt(stats.unique_blocks),
        firstLogged: stats.first_logged,
        lastLogged: stats.last_logged,
        avgResponseTime: parseFloat(stats.avg_response_time || 0).toFixed(2)
      },
      contract: {
        address: process.env.NEXT_PUBLIC_USAGE_TRACKING_ADDRESS || '',
        explorerUrl: process.env.NEXT_PUBLIC_USAGE_TRACKING_ADDRESS
          ? `https://sepolia.etherscan.io/address/${process.env.NEXT_PUBLIC_USAGE_TRACKING_ADDRESS}`
          : null
      }
    })

  } catch (error: any) {
    console.error('Error fetching blockchain logs:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch blockchain logs' },
      { status: 500 }
    )
  }
}
