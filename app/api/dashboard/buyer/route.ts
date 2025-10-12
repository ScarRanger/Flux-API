import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    // Get user ID from query params
    const userId = request.nextUrl.searchParams.get("userId")
    
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Fetch KPIs from real tables
    const quotasResult = await pool.query(`
      SELECT 
        COALESCE(SUM(total_quota), 0) as quota_purchased,
        COALESCE(SUM(used_quota), 0) as quota_used
      FROM api_access
      WHERE buyer_uid = $1 AND status = 'active'
    `, [userId])

    const purchasesResult = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_spent
      FROM purchases
      WHERE buyer_uid = $1
    `, [userId])

    const subscriptionsResult = await pool.query(`
      SELECT COUNT(DISTINCT listing_id) as active_subscriptions
      FROM api_access
      WHERE buyer_uid = $1 AND status = 'active'
    `, [userId])

    // Calculate cost saved (assuming 20% savings vs on-demand)
    const totalSpent = parseFloat(purchasesResult.rows[0]?.total_spent || "0")
    const costSavedUsd = totalSpent * 0.20

    const kpis = {
      quotaPurchased: parseInt(quotasResult.rows[0]?.quota_purchased || "0"),
      quotaUsed: parseInt(quotasResult.rows[0]?.quota_used || "0"),
      costSavedUsd: costSavedUsd,
      activeSubscriptions: parseInt(subscriptionsResult.rows[0]?.active_subscriptions || "0")
    }

    // Fetch Quick Stats metrics from api_calls table
    const quickStatsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_requests,
        AVG(CASE WHEN is_successful = true THEN 1.0 ELSE 0.0 END) as success_rate,
        AVG(latency_ms) as avg_latency_ms,
        SUM(total_cost) as total_cost_eth
      FROM api_calls
      WHERE buyer_user_id = $1
    `, [userId])

    const totalRequests = parseInt(quickStatsResult.rows[0]?.total_requests || "0")
    const successRate = parseFloat(quickStatsResult.rows[0]?.success_rate || "0.95")
    const avgLatencyMs = Math.round(parseFloat(quickStatsResult.rows[0]?.avg_latency_ms || "150"))
    const totalCostEth = parseFloat(quickStatsResult.rows[0]?.total_cost_eth || "0")
    const avgCostPerCall = totalRequests > 0 ? totalCostEth / totalRequests : 0

    const quickStats = {
      avgResponseTimeMs: avgLatencyMs,
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

    // Fetch cost breakdown by provider from purchases
    const costBreakdownResult = await pool.query(`
      SELECT 
        al.api_name as label,
        SUM(p.total_amount) as value
      FROM purchases p
      JOIN api_listings al ON p.listing_id = al.id
      WHERE p.buyer_uid = $1
      GROUP BY al.api_name
      ORDER BY value DESC
      LIMIT 4
    `, [userId])

    const costBreakdown = costBreakdownResult.rows.map((row: any) => ({
      label: row.label,
      value: parseFloat((parseFloat(row.value || "0")).toFixed(2))
    }))

    // Fetch usage by API with actual latency
    const usageByApiResult = await pool.query(`
      SELECT 
        al.api_name as api,
        COUNT(ac.id) as calls,
        AVG(CASE WHEN ac.is_successful = true THEN 1.0 ELSE 0.0 END) as success,
        AVG(ac.latency_ms) as avg_latency_ms,
        SUM(ac.total_cost) as cost_eth
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
      avgLatencyMs: Math.round(parseFloat(row.avg_latency_ms || "150")),
      costUsd: parseFloat((parseFloat(row.cost_eth || "0")).toFixed(4))
    }))

    // Fetch recent logs with actual request details
    const recentLogsResult = await pool.query(`
      SELECT 
        ac.id,
        al.api_name as api,
        ac.method,
        ac.path,
        CASE WHEN ac.is_successful = true THEN 'ok' ELSE 'error' END as status,
        ac.latency_ms,
        ac.created_at as time,
        ac.total_cost as cost_eth
      FROM api_calls ac
      JOIN api_listings al ON ac.listing_id = al.id
      WHERE ac.buyer_user_id = $1
      ORDER BY ac.created_at DESC
      LIMIT 12
    `, [userId])

    const recentLogs = recentLogsResult.rows.map((row: any) => ({
      id: row.id.toString(),
      api: row.api,
      method: row.method,
      path: row.path,
      status: row.status,
      time: row.time,
      latencyMs: row.latency_ms,
      cost: parseFloat((parseFloat(row.cost_eth || "0")).toFixed(6))
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
