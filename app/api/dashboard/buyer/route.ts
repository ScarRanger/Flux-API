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
    const quotasResult = await pool.query(`
      SELECT 
        COALESCE(SUM(total_calls), 0) as quota_purchased,
        COALESCE(SUM(total_calls - remaining_calls), 0) as quota_used
      FROM api_quotas
      WHERE owner_user_id = $1 AND is_active = true
    `, [userId])

    const balanceResult = await pool.query(`
      SELECT 
        COALESCE(total_spent, 0) as total_spent
      FROM user_balances
      WHERE user_id = $1
    `, [userId])

    const subscriptionsResult = await pool.query(`
      SELECT COUNT(DISTINCT api_provider) as active_subscriptions
      FROM api_quotas
      WHERE owner_user_id = $1 AND is_active = true
    `, [userId])

    // Calculate cost saved (assuming 20% savings vs on-demand)
    const totalSpent = parseFloat(balanceResult.rows[0]?.total_spent || "0")
    const costSavedUsd = (totalSpent / 1e18) * 0.20

    const kpis = {
      quotaPurchased: parseInt(quotasResult.rows[0]?.quota_purchased || "0"),
      quotaUsed: parseInt(quotasResult.rows[0]?.quota_used || "0"),
      costSavedUsd: costSavedUsd,
      activeSubscriptions: parseInt(subscriptionsResult.rows[0]?.active_subscriptions || "0")
    }

    // Fetch Quick Stats metrics
    const quickStatsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_requests,
        AVG(CASE WHEN is_successful = true THEN 1.0 ELSE 0.0 END) as success_rate,
        SUM(total_cost) as total_cost_wei
      FROM api_calls
      WHERE buyer_user_id = $1
    `, [userId])

    const totalRequests = parseInt(quickStatsResult.rows[0]?.total_requests || "0")
    const successRate = parseFloat(quickStatsResult.rows[0]?.success_rate || "0.95")
    const totalCostWei = parseFloat(quickStatsResult.rows[0]?.total_cost_wei || "0")
    const avgCostPerCall = totalRequests > 0 ? totalCostWei / totalRequests / 1e18 : 0

    const quickStats = {
      avgResponseTimeMs: 150, // Static for now - can add latency tracking to api_calls table
      successRate: successRate,
      totalRequests: totalRequests,
      costPerCall: avgCostPerCall
    }

    // Fetch calls over time (last 14 days)
    const callsOverTimeResult = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as calls,
        AVG(CASE WHEN is_successful = true THEN 1.0 ELSE 0.0 END) as success_rate
      FROM api_calls
      WHERE buyer_user_id = $1 
        AND created_at >= NOW() - INTERVAL '14 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [userId])

    const callsOverTime = callsOverTimeResult.rows.map((row: any) => ({
      date: new Date(row.date).toISOString().slice(0, 10),
      calls: parseInt(row.calls),
      successRate: parseFloat(row.success_rate || "0.95")
    }))

    // Fetch hourly pattern (last 24 hours)
    const hourlyPatternResult = await pool.query(`
      SELECT 
        EXTRACT(HOUR FROM created_at)::integer as hour,
        COUNT(*) as calls
      FROM api_calls
      WHERE buyer_user_id = $1 
        AND created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour ASC
    `, [userId])

    const hourlyPattern = Array.from({ length: 24 }, (_, i) => {
      const found = hourlyPatternResult.rows.find((row: any) => parseInt(row.hour) === i)
      return {
        hour: i,
        calls: parseInt(found?.calls || "0")
      }
    })

    // Fetch cost breakdown by provider
    const costBreakdownResult = await pool.query(`
      SELECT 
        api_provider as label,
        SUM(price_per_call * (total_calls - remaining_calls)) as value
      FROM api_quotas
      WHERE owner_user_id = $1 AND is_active = true
      GROUP BY api_provider
      ORDER BY value DESC
      LIMIT 4
    `, [userId])

    const costBreakdown = costBreakdownResult.rows.map((row: any) => ({
      label: row.label,
      value: parseFloat((parseFloat(row.value || "0") / 1e18).toFixed(2))
    }))

    // Fetch usage by API
    const usageByApiResult = await pool.query(`
      SELECT 
        al.api_name as api,
        COUNT(ac.id) as calls,
        AVG(CASE WHEN ac.is_successful = true THEN 1.0 ELSE 0.0 END) as success,
        SUM(ac.total_cost) as cost_wei
      FROM api_calls ac
      JOIN api_listings al ON ac.listing_id = al.id
      WHERE ac.buyer_user_id = $1
      GROUP BY al.api_name
      ORDER BY calls DESC
      LIMIT 5
    `, [userId])

    const usageByApi = usageByApiResult.rows.map((row: any) => ({
      api: row.api,
      calls: parseInt(row.calls || "0"),
      success: parseFloat(row.success || "0.95"),
      avgLatencyMs: 150, // Static for now, can add latency tracking
      costUsd: parseFloat((parseFloat(row.cost_wei || "0") / 1e18).toFixed(2))
    }))

    // Fetch recent logs
    const recentLogsResult = await pool.query(`
      SELECT 
        ac.id,
        al.api_name as api,
        CASE WHEN ac.is_successful = true THEN 'ok' ELSE 'error' END as status,
        ac.created_at as time,
        ac.total_cost as cost_wei
      FROM api_calls ac
      JOIN api_listings al ON ac.listing_id = al.id
      WHERE ac.buyer_user_id = $1
      ORDER BY ac.created_at DESC
      LIMIT 12
    `, [userId])

    const recentLogs = recentLogsResult.rows.map((row: any) => ({
      id: row.id.toString(),
      api: row.api,
      status: row.status,
      time: row.time,
      cost: parseFloat((parseFloat(row.cost_wei || "0") / 1e18).toFixed(6)),
      latencyMs: 150,
      method: 'GET',
      path: '/api'
    }))

    return NextResponse.json({
      kpis,
      quickStats,
      callsOverTime,
      hourlyPattern,
      costBreakdown,
      usageByApi,
      recentLogs
    })

  } catch (error) {
    console.error("Error fetching buyer dashboard data:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    )
  }
}
