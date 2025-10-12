const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const envVars = {}

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const equalsIndex = trimmed.indexOf('=')
    if (equalsIndex > 0) {
      const key = trimmed.substring(0, equalsIndex).trim()
      let value = trimmed.substring(equalsIndex + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1)
      }
      envVars[key] = value
    }
  }
})

const pool = new Pool({
  connectionString: envVars.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const userId = 'ZB7hHL1HaYfnW0I2hINP0uiRAJF2'

async function testDirectQuery() {
  console.log('\n🧪 Testing Direct Database Queries for Buyer Dashboard')
  console.log('=' .repeat(80))
  console.log(`User ID: ${userId}\n`)
  
  try {
    // Test 1: KPIs - Quotas
    console.log('1️⃣  Testing Quotas Query...')
    const quotasResult = await pool.query(`
      SELECT 
        COALESCE(SUM(total_quota), 0) as quota_purchased,
        COALESCE(SUM(used_quota), 0) as quota_used
      FROM api_access
      WHERE buyer_uid = $1 AND status = 'active'
    `, [userId])
    console.log('✅ Quotas:', quotasResult.rows[0])
    
    // Test 2: KPIs - Purchases
    console.log('\n2️⃣  Testing Purchases Query...')
    const purchasesResult = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_spent
      FROM purchases
      WHERE buyer_uid = $1
    `, [userId])
    console.log('✅ Purchases:', purchasesResult.rows[0])
    
    // Test 3: KPIs - Subscriptions
    console.log('\n3️⃣  Testing Subscriptions Query...')
    const subscriptionsResult = await pool.query(`
      SELECT COUNT(DISTINCT listing_id) as active_subscriptions
      FROM api_access
      WHERE buyer_uid = $1 AND status = 'active'
    `, [userId])
    console.log('✅ Subscriptions:', subscriptionsResult.rows[0])
    
    // Test 4: Quick Stats
    console.log('\n4️⃣  Testing Quick Stats Query...')
    const quickStatsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_requests,
        AVG(CASE WHEN is_successful = true THEN 1.0 ELSE 0.0 END) as success_rate,
        AVG(latency_ms) as avg_latency_ms,
        SUM(total_cost) as total_cost_eth
      FROM api_calls
      WHERE buyer_user_id = $1
    `, [userId])
    console.log('✅ Quick Stats:', quickStatsResult.rows[0])
    
    // Test 5: Calls Over Time
    console.log('\n5️⃣  Testing Calls Over Time Query...')
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
    console.log(`✅ Calls Over Time: ${callsOverTimeResult.rows.length} days`)
    callsOverTimeResult.rows.slice(0, 3).forEach(row => {
      console.log(`   ${row.date}: ${row.calls} calls`)
    })
    
    // Test 6: Hourly Pattern
    console.log('\n6️⃣  Testing Hourly Pattern Query...')
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
    console.log(`✅ Hourly Pattern: ${hourlyPatternResult.rows.length} hours with data`)
    
    // Test 7: Cost Breakdown
    console.log('\n7️⃣  Testing Cost Breakdown Query...')
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
    console.log(`✅ Cost Breakdown: ${costBreakdownResult.rows.length} APIs`)
    costBreakdownResult.rows.forEach(row => {
      console.log(`   ${row.label}: $${parseFloat(row.value).toFixed(6)}`)
    })
    
    // Test 8: Usage By API
    console.log('\n8️⃣  Testing Usage By API Query...')
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
    console.log(`✅ Usage By API: ${usageByApiResult.rows.length} APIs`)
    usageByApiResult.rows.forEach(row => {
      console.log(`   ${row.api}: ${row.calls} calls, ${(parseFloat(row.success) * 100).toFixed(1)}% success`)
    })
    
    // Test 9: Recent Logs
    console.log('\n9️⃣  Testing Recent Logs Query...')
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
    console.log(`✅ Recent Logs: ${recentLogsResult.rows.length} logs`)
    recentLogsResult.rows.slice(0, 3).forEach(row => {
      console.log(`   [${row.status}] ${row.api} ${row.method} - ${row.latency_ms}ms`)
    })
    
    console.log('\n' + '='.repeat(80))
    console.log('✅ All queries executed successfully!')
    console.log('=' .repeat(80))
    console.log('\n💡 The dashboard API should work correctly with this data.\n')
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error)
  } finally {
    await pool.end()
  }
}

testDirectQuery()
