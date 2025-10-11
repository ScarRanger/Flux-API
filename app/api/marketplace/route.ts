import { NextResponse } from "next/server"
import { MarketplaceDB } from "@/lib/db-helpers"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    const filters = {
      category: searchParams.get('category') || undefined,
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
      location: searchParams.get('location') || undefined,
      minRating: searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : undefined,
      search: searchParams.get('search') || undefined,
    }

    const listings = await MarketplaceDB.getApiListings(filters)

    return NextResponse.json({
      success: true,
      items: listings.map(item => ({
        id: item.id,
        name: item.api,
        category: item.category || 'General',
        description: item.description,
        pricePerCall: parseFloat(item.price_usd),
        quota: item.quota,
        quotaAvailable: item.quota,
        discount: Math.round(Math.random() * 40), // Calculate based on your logic
        location: item.location || 'Global',
        latencyMs: Math.round(Math.random() * 200 + 50), // Get from metrics
        sellerName: item.seller_name,
        sellerWallet: item.seller_wallet,
        sellerRating: parseFloat(item.seller_rating).toFixed(1),
        reputation: parseFloat(item.seller_rating).toFixed(1),
        totalReviews: parseInt(item.total_reviews),
        createdAt: item.created_at,
      }))
    })
  } catch (error) {
    console.error("Marketplace API error:", error)
    return NextResponse.json({ error: "Failed to fetch listings" }, { status: 500 })
  }
}
