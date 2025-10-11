import { NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET() {
  try {
    // Fetch all active API listings from database
    const result = await pool.query(`
      SELECT 
        al.id,
        al.api_name as name,
        al.description,
        al.categories,
        al.price_per_call,
        al.quota_available,
        al.quota_sold,
        al.base_endpoint,
        al.documentation_url,
        al.region as location,
        al.status,
        u.display_name as seller_name,
        u.wallet_address as seller_wallet,
        COALESCE(
          (SELECT COUNT(*) FROM api_calls ac WHERE ac.listing_id = al.id AND ac.is_successful = true),
          0
        ) as total_sales
      FROM api_listings al
      JOIN users u ON al.seller_uid = u.firebase_uid
      WHERE al.status = 'active' AND al.quota_available > 0
      ORDER BY al.created_at DESC
    `)

    // Transform database records to match frontend format
    const listings = result.rows.map((row: any) => {
      // price_per_call is already stored in ETH in the database, no conversion needed
      const pricePerCall = parseFloat(row.price_per_call)
      const categories = row.categories ? (Array.isArray(row.categories) ? row.categories : [row.categories]) : []
      const category = categories[0] || "General"
      
      // Calculate discount based on quota (mock calculation - can be customized)
      const discount = Math.min(Math.floor((row.quota_available / 10000) * 2), 25)
      
      // Mock seller rating (can be calculated from reviews/feedback table if exists)
      const sellerRating = (4.2 + Math.random() * 0.8).toFixed(1)
      
      // Mock latency (can be tracked in api_calls table)
      const latencyMs = Math.floor(80 + Math.random() * 100)
      
      // Mock reputation score (can be calculated from seller metrics)
      const reputation = Math.floor(500 + Math.random() * 500)

      return {
        id: row.id.toString(),
        name: row.name,
        category: category,
        pricePerCall: pricePerCall,
        discount: discount,
        quotaAvailable: parseInt(row.quota_available),
        quotaSold: parseInt(row.quota_sold),
        sellerRating: parseFloat(sellerRating),
        latencyMs: latencyMs,
        location: row.location || "Global",
        logo: "/placeholder-logo.png",
        reputation: reputation,
        description: row.description || "No description available",
        endpoints: [
          `GET ${row.base_endpoint}`,
          `POST ${row.base_endpoint}`,
        ],
        rateLimit: "100 req/s", // Can be added as a column in api_listings
        seller: {
          name: row.seller_name || `Seller ${row.seller_wallet?.substring(0, 6)}`,
          sales: parseInt(row.total_sales),
          wallet: row.seller_wallet
        },
        terms: {
          refund: "Pro-rated refunds within 72 hours",
          sla: "99.9% uptime guarantee",
          restrictions: "Commercial use allowed"
        },
        documentationUrl: row.documentation_url,
        baseEndpoint: row.base_endpoint
      }
    })

    return NextResponse.json({ items: listings })

  } catch (error) {
    console.error("Error fetching marketplace listings:", error)
    return NextResponse.json(
      { error: "Failed to fetch marketplace listings", items: [] },
      { status: 500 }
    )
  }
}
