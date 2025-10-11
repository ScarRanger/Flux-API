import { NextResponse } from "next/server"
import { MarketplaceDB } from "@/lib/db-helpers"

export async function GET() {
  try {
    const featured = await MarketplaceDB.getFeaturedApis(6)

    return NextResponse.json({
      success: true,
      items: featured.map(item => ({
        id: item.id,
        name: item.api,
        category: item.category || 'General',
        price: `$${parseFloat(item.price_usd).toFixed(4)}`,
        quota: item.quota.toLocaleString(),
        discount: Math.round(Math.random() * 40),
        rating: parseFloat(item.seller_rating).toFixed(1),
      }))
    })
  } catch (error) {
    console.error("Featured APIs error:", error)
    return NextResponse.json({ error: "Failed to fetch featured APIs" }, { status: 500 })
  }
}
