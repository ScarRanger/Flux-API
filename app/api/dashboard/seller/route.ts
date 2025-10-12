import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    // Get user ID from query params
    const userId = request.nextUrl.searchParams.get("userId")
    
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Fetch KPIs
    const earningsResult = await pool.query(`
      SELECT 
        COALESCE(ub.earnings_balance, 0) as earnings,
        COALESCE(ub.total_earned, 0) as total_earned
      FROM users u
      LEFT JOIN user_balances ub ON u.id = ub.user_id
      WHERE u.firebase_uid = $1
    `, [userId])

    const listingsResult = await pool.query(`
      SELECT 
        COUNT(*) as active_listings,
        COALESCE(SUM(quota_sold), 0) as total_calls_served,
        COALESCE(AVG(price_per_call), 0) as avg_price,
        COALESCE(SUM(quota_available), 0) as quota_available
      FROM api_listings
      WHERE seller_uid = $1 AND status = 'active'
    `, [userId])

    const kpis = {
      earningsUsd: parseFloat((parseFloat(earningsResult.rows[0]?.total_earned || "0") / 1e18).toFixed(2)),
      activeListings: parseInt(listingsResult.rows[0]?.active_listings || "0"),
      callsServed: parseInt(listingsResult.rows[0]?.total_calls_served || "0"),
      avgPricePerCallUsd: parseFloat((parseFloat(listingsResult.rows[0]?.avg_price || "0") / 1e18).toFixed(6)),
      quotaAvailable: parseInt(listingsResult.rows[0]?.quota_available || "0")
    }

    // Fetch earnings over time (last 14 days)
    const earningsOverTimeResult = await pool.query(`
      SELECT 
        DATE(ac.created_at) as date,
        SUM(ac.total_cost) as earnings_wei
      FROM api_calls ac
      JOIN api_listings al ON ac.listing_id = al.id
      WHERE al.seller_uid = $1 
        AND ac.created_at >= NOW() - INTERVAL '14 days'
        AND ac.is_successful = true
      GROUP BY DATE(ac.created_at)
      ORDER BY date ASC
    `, [userId])

    // Fill missing days with 0
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (13 - i))
      return date.toISOString().slice(0, 10)
    })

    const earningsMap = new Map(
      earningsOverTimeResult.rows.map((row: any) => [
        new Date(row.date).toISOString().slice(0, 10),
        parseFloat((parseFloat(row.earnings_wei || "0") / 1e18).toFixed(2))
      ])
    )

    const earningsOverTime = last14Days.map(date => ({
      date,
      earnings: earningsMap.get(date) || 0
    }))

    // Fetch active listings
    const listingsDataResult = await pool.query(`
      SELECT 
        al.id,
        al.api_name as api,
        al.status,
        al.price_per_call as price_wei,
        al.quota_sold as quota,
        COALESCE(SUM(ac.total_cost), 0) as earnings_wei
      FROM api_listings al
      LEFT JOIN api_calls ac ON ac.listing_id = al.id AND ac.is_successful = true
      WHERE al.seller_uid = $1
      GROUP BY al.id, al.api_name, al.status, al.price_per_call, al.quota_sold
      ORDER BY earnings_wei DESC
    `, [userId])

    const listings = listingsDataResult.rows.map((row: any) => ({
      api: row.api,
      status: row.status,
      priceUsd: parseFloat((parseFloat(row.price_wei || "0") / 1e18).toFixed(6)),
      quota: parseInt(row.quota || "0"),
      earningsUsd: parseFloat((parseFloat(row.earnings_wei || "0") / 1e18).toFixed(2))
    }))

    // Fetch top buyers
    const topBuyersResult = await pool.query(`
      SELECT 
        COALESCE(u.display_name, 'Anonymous') || ' (' || SUBSTRING(u.wallet_address, 1, 6) || '...' || SUBSTRING(u.wallet_address FROM LENGTH(u.wallet_address) - 3) || ')' as buyer,
        COUNT(ac.id) as calls,
        SUM(ac.total_cost) as spend_wei,
        COUNT(DISTINCT ac.listing_id) > 1 as returning
      FROM api_calls ac
      JOIN api_listings al ON ac.listing_id = al.id
      JOIN users u ON ac.buyer_user_id = u.firebase_uid
      WHERE al.seller_uid = $1 AND ac.is_successful = true
      GROUP BY u.id, u.display_name, u.wallet_address
      ORDER BY spend_wei DESC
      LIMIT 5
    `, [userId])

    const topBuyers = topBuyersResult.rows.map((row: any) => ({
      buyer: row.buyer,
      calls: parseInt(row.calls),
      spendUsd: parseFloat((parseFloat(row.spend_wei || "0") / 1e18).toFixed(2)),
      returning: row.returning
    }))

    return NextResponse.json({
      kpis,
      earningsOverTime,
      listings,
      topBuyers
    })

  } catch (error) {
    console.error("Error fetching seller dashboard data:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    )
  }
}
