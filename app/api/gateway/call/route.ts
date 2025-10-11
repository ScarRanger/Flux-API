import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { ethers } from 'ethers'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

/**
 * Log API usage to blockchain (async, non-blocking)
 */
async function logUsageToBlockchain(access: any, callLogId: number) {
  console.log(`\n🔗 [Blockchain Logging] Starting for call ID: ${callLogId}`)
  try {
    const USAGE_TRACKING_ADDRESS = process.env.NEXT_PUBLIC_USAGE_TRACKING_ADDRESS
    
    if (!USAGE_TRACKING_ADDRESS) {
      console.log('⚠️  Usage tracking contract not configured, skipping blockchain logging')
      return
    }
    console.log(`✓ Contract address: ${USAGE_TRACKING_ADDRESS}`)

    const rpcUrl = process.env.RPC_URL
    if (!rpcUrl) {
      throw new Error('RPC_URL not configured')
    }
    console.log(`✓ RPC URL configured: ${rpcUrl.substring(0, 30)}...`)

    // Get a system wallet for logging (you could use the buyer's wallet too)
    const systemPrivateKey = process.env.SYSTEM_WALLET_PRIVATE_KEY
    if (!systemPrivateKey) {
      throw new Error('SYSTEM_WALLET_PRIVATE_KEY not configured for blockchain logging')
    }
    console.log(`✓ System wallet configured`)

    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(systemPrivateKey, provider)
    console.log(`✓ Wallet address: ${wallet.address}`)

    // Import ABI
    const UsageTrackingABI = await import('@/smart_contracts/usagetracking.json')
    console.log(`✓ ABI imported`)
    
    const contract = new ethers.Contract(
      USAGE_TRACKING_ADDRESS,
      UsageTrackingABI.default,
      wallet
    )
    console.log(`✓ Contract instance created`)

    // Get buyer's wallet address from database
    const client = await pool.connect()
    try {
      const buyerResult = await client.query(
        'SELECT wallet_address FROM users WHERE firebase_uid = $1',
        [access.buyer_uid]
      )
      
      if (buyerResult.rows.length === 0) {
        throw new Error('Buyer wallet not found')
      }

      const buyerAddress = buyerResult.rows[0].wallet_address
      console.log(`✓ Buyer address: ${buyerAddress}`)

      // Log usage on blockchain: logUsage(address user, uint256 apiId, uint256 calls)
      console.log(`📤 Sending transaction to blockchain...`)
      console.log(`   - Buyer: ${buyerAddress}`)
      console.log(`   - API ID: ${access.listing_id}`)
      console.log(`   - Calls: 1`)
      
      const tx = await contract.logUsage(
        buyerAddress,
        access.listing_id,
        1 // 1 call
      )

      console.log('📝 Transaction sent:', tx.hash)
      console.log('⏳ Waiting for confirmation...')

      // Wait for confirmation (don't block the API response)
      const receipt = await tx.wait(1)
      
      console.log('✅ Transaction confirmed:', {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        callLogId: callLogId
      })

      // Update the api_calls table with the blockchain tx hash
      console.log(`💾 Updating database record ${callLogId} with tx: ${receipt.hash}`)
      const updateResult = await client.query(
        'UPDATE api_calls SET blockchain_tx_hash = $1, blockchain_block = $2 WHERE id = $3 RETURNING id, created_at, buyer_user_id',
        [receipt.hash, receipt.blockNumber, callLogId]
      )
      
      if (updateResult.rows.length > 0) {
        const updated = updateResult.rows[0]
        console.log(`✅ Database updated successfully!`)
        console.log(`   - Call ID: ${updated.id}`)
        console.log(`   - Created: ${updated.created_at}`)
        console.log(`   - Buyer: ${updated.buyer_user_id}`)
        console.log(`   - TX Hash: ${receipt.hash}`)
        console.log(`   - Block: ${receipt.blockNumber}`)
      } else {
        console.error(`⚠️  No rows updated for call ID: ${callLogId} - Record may not exist!`)
      }

    } finally {
      client.release()
    }

  } catch (error: any) {
    console.error('❌ [Blockchain Logging] Error:', error.message)
    console.error('Stack:', error.stack)
    console.error('Full error:', error)
    // Don't throw - we don't want blockchain issues to fail the API call
  }
}

/**
 * API Gateway - Proxy endpoint for buyers to use purchased APIs
 * 
 * Usage:
 * POST /api/gateway/call
 * Headers:
 *   X-BNB-API-Key: <buyer's access key from purchase>
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
    // 1. Get and validate API key from header
    const apiKey = req.headers.get('X-BNB-API-Key') || req.headers.get('x-bnb-api-key')
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing X-BNB-API-Key header' },
        { status: 401 }
      )
    }

    // 2. Get request details
    const { method = 'GET', path = '/', headers: customHeaders, body: requestBody } = await req.json()

    // 3. Lookup access record and validate
    const client = await pool.connect()
    
    try {
      // Get access info with listing details
      const accessResult = await client.query(`
        SELECT 
          aa.*,
          al.api_name,
          al.base_endpoint,
          al.auth_type,
          al.auth_param_name,
          al.encrypted_api_key,
          al.encryption_salt,
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

      // Debug: Check what we got from the database
      console.log('Access record found:', {
        id: access.id,
        buyer_uid: access.buyer_uid,
        listing_id: access.listing_id,
        api_name: access.api_name,
        base_endpoint: access.base_endpoint,
        auth_type: access.auth_type,
        auth_param_name: access.auth_param_name,
        has_encrypted_key: !!access.encrypted_api_key,
        has_encryption_salt: !!access.encryption_salt,
        encrypted_key_length: access.encrypted_api_key?.length,
        encryption_salt_length: access.encryption_salt?.length
      })

      // Check if access is active
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

      // Check expiry if set
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

      // 4. Decrypt seller's API key
      if (!access.encrypted_api_key || !access.encryption_salt) {
        return NextResponse.json(
          { 
            error: 'API authentication not configured',
            details: 'The seller has not properly configured API authentication for this listing'
          },
          { status: 500 }
        )
      }

      // Decrypt the API key (using base64 decoding - matching the encryption in sell-api page)
      let sellerApiKey: string
      try {
        const decoded = Buffer.from(access.encrypted_api_key, 'base64').toString('utf-8')
        const [salt, apiKey] = decoded.split(':')
        if (salt !== access.encryption_salt) {
          throw new Error('Salt mismatch')
        }
        sellerApiKey = apiKey
      } catch (decryptError) {
        console.error('Failed to decrypt API key:', decryptError)
        return NextResponse.json(
          { error: 'Failed to decrypt API credentials' },
          { status: 500 }
        )
      }

      // 5. Build the actual API request
      const targetUrl = `${access.base_endpoint}${path}`
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...customHeaders
      }

      // Add authentication based on auth type
      if (access.auth_type === 'header-key') {
        requestHeaders[access.auth_param_name] = sellerApiKey
      } else if (access.auth_type === 'oauth2') {
        requestHeaders['Authorization'] = `Bearer ${sellerApiKey}`
      }

      // 6. Make the request to the actual API
      const fetchOptions: RequestInit = {
        method: method,
        headers: requestHeaders
      }

      if (method !== 'GET' && requestBody) {
        fetchOptions.body = JSON.stringify(requestBody)
      }

      let apiResponse: Response
      let apiSuccess = true
      let apiError: string | null = null
      let responseData: any = null
      let latencyMs = 0

      try {
        console.log('Calling target API:', targetUrl)
        console.log('Request headers:', requestHeaders)
        console.log('Request body:', requestBody ? JSON.stringify(requestBody, null, 2) : 'none')
        
        apiResponse = await fetch(targetUrl, fetchOptions)
        
        console.log('API response status:', apiResponse.status, apiResponse.statusText)
        console.log('API response headers:', Object.fromEntries(apiResponse.headers.entries()))
        
        // Get response text first
        const responseText = await apiResponse.text()
        console.log('API response text:', responseText.substring(0, 500))
        
        // Try to parse as JSON
        try {
          responseData = responseText ? JSON.parse(responseText) : {}
        } catch (parseError) {
          console.error('Failed to parse response as JSON:', parseError)
          responseData = { rawResponse: responseText }
        }
        
        if (!apiResponse.ok) {
          apiSuccess = false
          apiError = `API returned ${apiResponse.status}: ${apiResponse.statusText}`
        }

      } catch (fetchError: any) {
        console.error('Error calling API:', fetchError)
        apiSuccess = false
        apiError = fetchError.message
        
        // Create a fake response for logging purposes
        apiResponse = {
          status: 500,
          statusText: 'Gateway Error'
        } as Response
        
        responseData = {
          error: 'Failed to call API',
          message: fetchError.message
        }
      }

      // Always calculate latency and log the call
      latencyMs = Date.now() - startTime

      // 7. Update quota and log the call (happens regardless of success/failure)
      try {
        await client.query('BEGIN')

        // Deduct quota - buyer used the call even if it failed
        await client.query(`
          UPDATE api_access 
          SET 
            used_quota = used_quota + 1,
            remaining_quota = remaining_quota - 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [access.id])

        // Log the API call in database - ALWAYS log it
        const callLogResult = await client.query(`
          INSERT INTO api_calls (
            buyer_user_id,
            listing_id,
            method,
            path,
            is_successful,
            response_code,
            latency_ms,
            total_cost,
            blockchain_tx_hash,
            blockchain_block,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
          RETURNING id
        `, [
          access.buyer_uid,
          access.listing_id,
          method,
          path,
          apiSuccess,
          apiResponse?.status || 500,
          latencyMs,
          access.price_per_call,
          null, // blockchain_tx_hash - will be updated later
          null  // blockchain_block - will be updated later
        ])

        const callLogId = callLogResult.rows[0].id

        await client.query('COMMIT')
        console.log('✓ Logged API call to database (ID:', callLogId, ')')

        // Log to blockchain (async, don't wait for it)
        logUsageToBlockchain(access, callLogId).catch(err => {
          console.error('Failed to log to blockchain (non-fatal):', err)
        })

      } catch (dbError: any) {
        await client.query('ROLLBACK')
        console.error('Failed to log API call:', dbError)
        // Continue anyway - don't fail the response
      }

      // 8. Return the API response to the buyer
      if (!apiSuccess) {
        return NextResponse.json({
          error: apiError || 'Failed to call API',
          data: responseData,
          meta: {
            latencyMs,
            remainingQuota: access.remaining_quota - 1,
            usedQuota: access.used_quota + 1,
            totalQuota: access.total_quota
          }
        }, { status: apiResponse?.status || 502 })
      }

      return NextResponse.json({
        success: true,
        data: responseData,
        meta: {
          latencyMs,
          remainingQuota: access.remaining_quota - 1,
          usedQuota: access.used_quota + 1,
          totalQuota: access.total_quota
        }
      }, { status: apiResponse.status })

    } finally {
      client.release()
    }

  } catch (error: any) {
    console.error('Gateway error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal gateway error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/gateway/call
 * Get buyer's quota info for their API key
 */
export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get('X-BNB-API-Key') || req.headers.get('x-bnb-api-key')
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing X-BNB-API-Key header' },
        { status: 401 }
      )
    }

    const result = await pool.query(`
      SELECT 
        aa.id,
        aa.total_quota,
        aa.used_quota,
        aa.remaining_quota,
        aa.status,
        aa.expires_at,
        aa.created_at,
        al.api_name,
        al.base_endpoint,
        al.price_per_call
      FROM api_access aa
      JOIN api_listings al ON aa.listing_id = al.id
      WHERE aa.access_key = $1
    `, [apiKey])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    const access = result.rows[0]

    return NextResponse.json({
      apiName: access.api_name,
      endpoint: access.base_endpoint,
      pricePerCall: parseFloat(access.price_per_call),
      totalQuota: access.total_quota,
      usedQuota: access.used_quota,
      remainingQuota: access.remaining_quota,
      status: access.status,
      expiresAt: access.expires_at,
      createdAt: access.created_at
    })

  } catch (error: any) {
    console.error('Error fetching quota info:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch quota info' },
      { status: 500 }
    )
  }
}
