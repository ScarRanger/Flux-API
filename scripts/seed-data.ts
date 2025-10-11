import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function seed() {
  try {
    console.log('🌱 Seeding database...')

    // Sample buyer data
    const buyerId = 'buyer-demo-001'
    
    await pool.query(`
      INSERT INTO buyer_stats (user_id, quota_purchased, quota_used, cost_saved_usd, active_subscriptions)
      VALUES ($1, 100000, 75000, 250.50, 3)
      ON CONFLICT (user_id) DO UPDATE SET
        quota_purchased = EXCLUDED.quota_purchased,
        quota_used = EXCLUDED.quota_used,
        cost_saved_usd = EXCLUDED.cost_saved_usd,
        active_subscriptions = EXCLUDED.active_subscriptions
    `, [buyerId])

    // API Usage data (last 7 days)
    const apis = ['OpenAI GPT-4', 'Anthropic Claude', 'Google Gemini', 'Stable Diffusion']
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      for (const api of apis) {
        await pool.query(`
          INSERT INTO api_usage (user_id, api, calls, success_rate, avg_latency_ms, cost_usd, date)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT DO NOTHING
        `, [
          buyerId,
          api,
          Math.floor(Math.random() * 10000) + 5000,
          0.95 + Math.random() * 0.04,
          Math.floor(Math.random() * 100) + 100,
          Math.random() * 50 + 20,
          date
        ])
      }
    }

    // API Call Logs (recent)
    for (let i = 0; i < 20; i++) {
      const timestamp = new Date(Date.now() - Math.random() * 3600000)
      await pool.query(`
        INSERT INTO api_call_logs (user_id, api, method, path, status, latency_ms, cost)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        buyerId,
        apis[Math.floor(Math.random() * apis.length)],
        'POST',
        '/v1/chat/completions',
        Math.random() > 0.1 ? 'success' : 'error',
        Math.floor(Math.random() * 200) + 50,
        Math.random() * 0.01
      ])
    }

    // Sample seller data
    const sellerId = 'seller-demo-001'
    
    await pool.query(`
      INSERT INTO seller_stats (user_id, earnings_usd, active_listings, calls_served, avg_price_per_call_usd, quota_available)
      VALUES ($1, 1250.75, 5, 125000, 0.0085, 500000)
      ON CONFLICT (user_id) DO UPDATE SET
        earnings_usd = EXCLUDED.earnings_usd,
        active_listings = EXCLUDED.active_listings,
        calls_served = EXCLUDED.calls_served
    `, [sellerId])

    // API Listings
    const listings = [
      { api: 'OpenAI GPT-4', category: 'AI/ML', price: 0.0095, quota: 100000, earnings: 450.25 },
      { api: 'Anthropic Claude', category: 'AI/ML', price: 0.0082, quota: 75000, earnings: 320.50 },
      { api: 'Google Gemini Pro', category: 'AI/ML', price: 0.0075, quota: 50000, earnings: 180.00 },
      { api: 'Stable Diffusion XL', category: 'AI/ML', price: 0.0120, quota: 25000, earnings: 200.00 },
      { api: 'ElevenLabs TTS', category: 'Audio', price: 0.0065, quota: 30000, earnings: 100.00 },
    ]

    for (const listing of listings) {
      await pool.query(`
        INSERT INTO api_listings (user_id, api, category, status, price_usd, quota, earnings_usd, location, description)
        VALUES ($1, $2, $3, 'active', $4, $5, $6, 'US-East', 'High-quality API access with 99.9% uptime guarantee')
        ON CONFLICT DO NOTHING
      `, [sellerId, listing.api, listing.category, listing.price, listing.quota, listing.earnings])
    }

    // Earnings History
    for (let i = 0; i < 14; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      await pool.query(`
        INSERT INTO earnings_history (user_id, earnings, date)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, date) DO NOTHING
      `, [sellerId, Math.random() * 100 + 50, date.toISOString().split('T')[0]])
    }

    // Top Buyers
    const buyers = [
      { name: 'TechCorp Labs', calls: 15000, spend: 450.50, returning: true },
      { name: 'AI Startup Inc', calls: 12000, spend: 380.25, returning: true },
      { name: 'Research Org', calls: 8000, spend: 250.00, returning: false },
      { name: 'Dev Studio', calls: 6500, spend: 180.75, returning: true },
      { name: 'Analytics Co', calls: 5000, spend: 120.00, returning: false },
    ]

    for (const buyer of buyers) {
      await pool.query(`
        INSERT INTO top_buyers (seller_id, buyer_name, calls, spend_usd, returning)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [sellerId, buyer.name, buyer.calls, buyer.spend, buyer.returning])
    }

    console.log('✅ Database seeded successfully!')
  } catch (error) {
    console.error('❌ Seed error:', error)
  } finally {
    await pool.end()
  }
}

seed()
