import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

/**
 * GET /api/my-apis?buyerId=<firebase_uid>
 * Get all API access credentials for a buyer
 */
export async function GET(req: NextRequest) {
  try {
    const buyerId = req.nextUrl.searchParams.get('buyerId')

    if (!buyerId) {
      return NextResponse.json(
        { error: 'buyerId parameter is required' },
        { status: 400 }
      )
    }

    // Fetch all API access for this buyer
    const result = await pool.query(`
      SELECT 
        aa.id,
        aa.access_key,
        aa.total_quota,
        aa.used_quota,
        aa.remaining_quota,
        aa.status,
        aa.expires_at,
        aa.created_at,
        al.id as listing_id,
        al.api_name,
        al.base_endpoint,
        al.categories,
        al.price_per_call,
        al.description,
        p.total_amount as purchase_amount,
        p.transaction_hash,
        p.created_at as purchased_at
      FROM api_access aa
      JOIN api_listings al ON aa.listing_id = al.id
      JOIN purchases p ON aa.purchase_id = p.id
      WHERE aa.buyer_uid = $1
      ORDER BY aa.created_at DESC
    `, [buyerId])

    const apis = result.rows.map(row => ({
      id: row.id,
      accessKey: row.access_key,
      apiName: row.api_name,
      category: row.categories, // Note: categories is the actual column name
      description: row.description,
      baseEndpoint: row.base_endpoint,
      pricePerCall: parseFloat(row.price_per_call),
      quota: {
        total: row.total_quota,
        used: row.used_quota,
        remaining: row.remaining_quota,
        usagePercentage: ((row.used_quota / row.total_quota) * 100).toFixed(1)
      },
      status: row.status,
      expiresAt: row.expires_at,
      purchasedAt: row.purchased_at,
      purchaseAmount: parseFloat(row.purchase_amount),
      transactionHash: row.transaction_hash,
      gatewayUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/gateway/call`
    }))

    return NextResponse.json({ apis })

  } catch (error: any) {
    console.error('Error fetching my APIs:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch APIs' },
      { status: 500 }
    )
  }
}
