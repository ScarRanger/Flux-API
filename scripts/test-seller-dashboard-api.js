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

async function testSellerDashboard() {
  console.log('\n🧪 Testing Seller Dashboard Queries')
  console.log('=' .repeat(80))
  
  try {
    // First, find seller users
    console.log('\n1️⃣  Finding seller users...')
    const sellersResult = await pool.query(`
      SELECT firebase_uid, email, display_name, wallet_address, role
      FROM users
      WHERE role = 'seller'
      LIMIT 5
    `)
    
    if (sellersResult.rows.length === 0) {
      console.log('⚠️  No sellers found in database')
      return
    }
    
    console.log(`✅ Found ${sellersResult.rows.length} seller(s):`)
    sellersResult.rows.forEach(seller => {
      console.log(`   - ${seller.display_name || seller.email} (${seller.firebase_uid})`)
    })
    
    const userId = sellersResult.rows[0].firebase_uid
    console.log(`\n📊 Testing dashboard for: ${userId}`)
    console.log('=' .repeat(80))
    
    // Test 1: Earnings
    console.log('\n2️⃣  Testing Earnings Query...')
    const earningsResult = await pool.query(`
      SELECT 
        COALESCE(ub.earnings_balance, 0) as earnings,
        COALESCE(ub.total_earned, 0) as total_earned
      FROM users u
      LEFT JOIN user_balances ub ON u.id = ub.user_id
      WHERE u.firebase_uid = $1
    `, [userId])
    
    if (earningsResult.rows.length > 0) {
      console.log('✅ Earnings:', earningsResult.rows[0])
    } else {
      console.log('⚠️  No earnings data found (user_balances may not have this user)')
    }
    
    // Test 2: Listings Stats
    console.log('\n3️⃣  Testing Listings Stats Query...')
    const listingsResult = await pool.query(`
      SELECT 
        COUNT(*) as active_listings,
        COALESCE(SUM(quota_sold), 0) as total_calls_served,
        COALESCE(AVG(price_per_call), 0) as avg_price,
        COALESCE(SUM(quota_available), 0) as quota_available
      FROM api_listings
      WHERE seller_uid = $1 AND status = 'active'
    `, [userId])
    console.log('✅ Listings Stats:', listingsResult.rows[0])
    
    // Test 3: Earnings Over Time
    console.log('\n4️⃣  Testing Earnings Over Time Query...')
    const earningsOverTimeResult = await pool.query(`
      SELECT 
        DATE(ac.created_at) as date,
        SUM(ac.total_cost) as earnings_wei,
        COUNT(*) as calls
      FROM api_calls ac
      JOIN api_listings al ON ac.listing_id = al.id
      WHERE al.seller_uid = $1 
        AND ac.created_at >= NOW() - INTERVAL '14 days'
        AND ac.is_successful = true
      GROUP BY DATE(ac.created_at)
      ORDER BY date ASC
    `, [userId])
    console.log(`✅ Earnings Over Time: ${earningsOverTimeResult.rows.length} days`)
    earningsOverTimeResult.rows.forEach(row => {
      console.log(`   ${row.date}: ${row.calls} calls, ${parseFloat(row.earnings_wei).toFixed(6)} ETH`)
    })
    
    // Test 4: Active Listings Details
    console.log('\n5️⃣  Testing Active Listings Details Query...')
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
    console.log(`✅ Active Listings: ${listingsDataResult.rows.length} listings`)
    listingsDataResult.rows.forEach(row => {
      console.log(`   ${row.api}: ${row.quota} sold, ${parseFloat(row.earnings_wei).toFixed(6)} ETH earned`)
    })
    
    // Test 5: Top Buyers
    console.log('\n6️⃣  Testing Top Buyers Query...')
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
    console.log(`✅ Top Buyers: ${topBuyersResult.rows.length} buyers`)
    topBuyersResult.rows.forEach(row => {
      console.log(`   ${row.buyer}: ${row.calls} calls, ${parseFloat(row.spend_wei).toFixed(6)} ETH`)
    })
    
    // Summary
    console.log('\n' + '='.repeat(80))
    console.log('📊 SELLER DASHBOARD SUMMARY')
    console.log('='.repeat(80))
    
    const summary = {
      hasEarningsData: earningsResult.rows.length > 0,
      activeListings: parseInt(listingsResult.rows[0].active_listings),
      callsServed: parseInt(listingsResult.rows[0].total_calls_served),
      hasEarningsHistory: earningsOverTimeResult.rows.length > 0,
      hasListingsData: listingsDataResult.rows.length > 0,
      hasTopBuyers: topBuyersResult.rows.length > 0
    }
    
    console.log(`\n✅ Active Listings: ${summary.activeListings}`)
    console.log(`✅ Total Calls Served: ${summary.callsServed}`)
    console.log(`${summary.hasEarningsData ? '✅' : '⚠️ '} Earnings Balance Data: ${summary.hasEarningsData ? 'YES' : 'NO (may need user_balances entry)'}`)
    console.log(`${summary.hasEarningsHistory ? '✅' : '⚠️ '} Earnings History: ${summary.hasEarningsHistory ? 'YES' : 'NO'}`)
    console.log(`${summary.hasListingsData ? '✅' : '⚠️ '} Listings Data: ${summary.hasListingsData ? 'YES' : 'NO'}`)
    console.log(`${summary.hasTopBuyers ? '✅' : '⚠️ '} Top Buyers: ${summary.hasTopBuyers ? 'YES' : 'NO'}`)
    
    if (!summary.hasEarningsData) {
      console.log('\n⚠️  WARNING: No user_balances entry for this seller!')
      console.log('   The dashboard may show errors. Consider creating an entry.')
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error)
  } finally {
    await pool.end()
  }
}

testSellerDashboard()
