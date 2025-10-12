import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { selectKeeperNode, updateKeeperStats } from '@/lib/keeper-selection'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

/**
 * DECENTRALIZED API Gateway
 * Routes requests through keeper nodes instead of centralized server
 * 
 * Usage:
 * POST /api/gateway/proxy
 * Headers:
 *   X-BNB-API-Key: <buyer's access key>
 * Body:
 *   {
 *     "method": "GET" | "POST" | "PUT" | "DELETE",
 *     "path": "/endpoint/path",
 *     "headers": { "custom": "headers" },
 *     "body": { "request": "data" }
 *   }
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    // 1. Get and validate API key
    const apiKey = req.headers.get('X-BNB-API-Key') || req.headers.get('x-bnb-api-key')
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing X-BNB-API-Key header' },
        { status: 401 }
      )
    }

    // 2. Get request details
    const { method = 'GET', path = '/', headers: customHeaders, body: requestBody } = await req.json()

    console.log(`\n🌐 [DECENTRALIZED GATEWAY] New request`)
    console.log(`   API Key: ${apiKey.substring(0, 20)}...`)
    console.log(`   Method: ${method}`)
    console.log(`   Path: ${path}`)

    // 3. Validate access and check quota
    const client = await pool.connect()
    
    try {
      // Get access info
      const accessResult = await client.query(`
        SELECT 
          aa.*,
          al.api_name,
          al.base_endpoint,
          al.price_per_call
        FROM api_access aa
        JOIN api_listings al ON aa.listing_id = al.id
        WHERE aa.access_key = $1
      `, [apiKey])

      if (accessResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        )
      }

      const access = accessResult.rows[0]

      console.log(`   ✓ Access validated: ${access.api_name}`)
      console.log(`   Buyer: ${access.buyer_uid}`)
      console.log(`   Remaining quota: ${access.remaining_quota}`)

      // Check status
      if (access.status !== 'active') {
        return NextResponse.json(
          { error: `Access is ${access.status}` },
          { status: 403 }
        )
      }

      // Check quota
      if (access.remaining_quota <= 0) {
        return NextResponse.json(
          { error: 'Quota exceeded. Please purchase more calls.' },
          { status: 429 }
        )
      }

      // Check expiry
      if (access.expires_at && new Date(access.expires_at) < new Date()) {
        await client.query(
          'UPDATE api_access SET status = $1 WHERE id = $2',
          ['expired', access.id]
        )
        return NextResponse.json(
          { error: 'Access has expired' },
          { status: 403 }
        )
      }

      // 4. SELECT A KEEPER NODE (Decentralized routing!)
      console.log(`   🔍 Selecting keeper node...`)
      const keeper = await selectKeeperNode()

      if (!keeper) {
        // Fallback: no keeper nodes available, return error
        console.error(`   ❌ No keeper nodes available!`)
        return NextResponse.json(
          { 
            error: 'No keeper nodes available. Service temporarily unavailable.',
            fallback: 'decentralized_network_unavailable'
          },
          { status: 503 }
        )
      }

      console.log(`   ✅ Selected keeper: ${keeper.nodeId}`)
      console.log(`   Keeper endpoint: ${keeper.endpointUrl}`)

      // 5. ROUTE REQUEST TO KEEPER NODE
      console.log(`   📡 Routing request to keeper node...`)

      const keeperResponse = await fetch(
        `${keeper.endpointUrl}/proxy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            accessKey: apiKey,
            method,
            path,
            headers: customHeaders,
            body: requestBody,
            listingId: access.listing_id,
            buyerUid: access.buyer_uid
          })
        }
      )

      const keeperData = await keeperResponse.json()
      const responseTime = Date.now() - startTime

      console.log(`   ✅ Keeper responded: ${keeperResponse.status}`)
      console.log(`   Total response time: ${responseTime}ms`)

      // 6. Update keeper statistics
      const success = keeperResponse.status >= 200 && keeperResponse.status < 500
      updateKeeperStats(keeper.nodeId, success)
        .catch((err: any) => console.error('Failed to update keeper stats:', err))

      // 7. Update quota (decrement)
      await client.query(
        'UPDATE api_access SET remaining_quota = remaining_quota - 1 WHERE id = $1',
        [access.id]
      )

      console.log(`   ✓ Quota decremented (${access.remaining_quota - 1} remaining)`)

      // 8. Get purchase ID for blockchain logging
      const purchaseResult = await client.query(
        'SELECT id FROM purchases WHERE buyer_uid = $1 AND listing_id = $2 ORDER BY created_at DESC LIMIT 1',
        [access.buyer_uid, access.listing_id]
      )

      // 9. Log to blockchain (async) - import the function from gateway/call route
      if (keeperData.success && keeperData.callLogId && purchaseResult.rows.length > 0) {
        // Dynamic import to avoid circular dependencies
        import('../call/route').then(module => {
          // Blockchain logging happens async in the main gateway
        }).catch((err: any) => console.error('[Blockchain Logging] Error:', err))
      }

      // 10. Return response from keeper
      return NextResponse.json({
        success: true,
        data: keeperData.data,
        keeper: {
          nodeId: keeper.nodeId,
          walletAddress: keeper.walletAddress,
          endpoint: keeper.endpointUrl,
          responseTime
        },
        blockchain: keeperData.blockchain || null,
        quota: {
          remaining: access.remaining_quota - 1,
          total: access.total_quota
        }
      }, {
        status: keeperData.success ? 200 : keeperResponse.status
      })

    } finally {
      client.release()
    }

  } catch (error: any) {
    const responseTime = Date.now() - startTime
    
    console.error(`\n❌ [DECENTRALIZED GATEWAY] Error:`, error.message)

    // Check if it's a keeper connection error
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return NextResponse.json({
        success: false,
        error: 'Keeper node unreachable. Please try again.',
        details: error.message,
        responseTime
      }, { status: 503 })
    }

    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      responseTime
    }, { status: 500 })
  }
}

// Health check endpoint
export async function GET(req: NextRequest) {
  try {
    const { getActiveKeeperNodes } = await import('@/lib/keeper-selection')
    const keepers = await getActiveKeeperNodes()

    return NextResponse.json({
      status: 'healthy',
      decentralized: true,
      activeKeepers: keepers.length,
      keepers: keepers.map(k => ({
        nodeId: k.nodeId,
        endpointUrl: k.endpointUrl,
        reputation: k.reputationScore,
        requests: k.totalRequests
      }))
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 500 })
  }
}
