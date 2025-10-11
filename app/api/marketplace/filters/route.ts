import { NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET() {
  try {
    // Fetch unique categories from listings
    const categoriesResult = await pool.query(`
      SELECT DISTINCT jsonb_array_elements_text(categories) as category
      FROM api_listings
      WHERE status = 'active' AND categories IS NOT NULL
      ORDER BY category
    `)

    // Fetch unique regions/locations
    const regionsResult = await pool.query(`
      SELECT DISTINCT region
      FROM api_listings
      WHERE status = 'active' AND region IS NOT NULL AND region != ''
      ORDER BY region
    `)

    // Get price range
    const priceRangeResult = await pool.query(`
      SELECT 
        MIN(price_per_call) as min_price,
        MAX(price_per_call) as max_price
      FROM api_listings
      WHERE status = 'active'
    `)

    const categories = categoriesResult.rows.map((row: any) => row.category)
    const regions = regionsResult.rows.map((row: any) => row.region)
    const minPrice = parseFloat(priceRangeResult.rows[0]?.min_price || "0") / 1e18
    const maxPrice = parseFloat(priceRangeResult.rows[0]?.max_price || "5000000000000000") / 1e18 // 0.005 ETH default

    return NextResponse.json({
      categories: ["All", ...categories],
      regions: ["All", ...regions],
      priceRange: {
        min: minPrice,
        max: Math.max(maxPrice, 0.005) // Ensure at least 0.005 as max
      }
    })

  } catch (error) {
    console.error("Error fetching marketplace filters:", error)
    return NextResponse.json(
      { 
        categories: ["All", "Weather", "Maps", "News"],
        regions: ["All", "US", "EU", "APAC"],
        priceRange: { min: 0, max: 0.005 }
      },
      { status: 200 } // Return defaults instead of error
    )
  }
}
