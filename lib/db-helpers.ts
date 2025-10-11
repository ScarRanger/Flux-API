import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

export class MarketplaceDB {
  // Get all active API listings with filters
  static async getApiListings(filters?: {
    category?: string
    minPrice?: number
    maxPrice?: number
    location?: string
    minRating?: number
    search?: string
  }) {
    let query = `
      SELECT 
        al.*,
        u.display_name as seller_name,
        u.wallet_address as seller_wallet,
        COALESCE(AVG(r.rating), 0) as seller_rating,
        COUNT(DISTINCT r.id) as total_reviews
      FROM api_listings al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN reviews r ON u.id = r.seller_id
      WHERE al.status = 'active'
    `
    
    const params: any[] = []
    let paramIndex = 1

    if (filters?.category) {
      query += ` AND al.category = $${paramIndex}`
      params.push(filters.category)
      paramIndex++
    }

    if (filters?.minPrice) {
      query += ` AND al.price_usd >= $${paramIndex}`
      params.push(filters.minPrice)
      paramIndex++
    }

    if (filters?.maxPrice) {
      query += ` AND al.price_usd <= $${paramIndex}`
      params.push(filters.maxPrice)
      paramIndex++
    }

    if (filters?.location) {
      query += ` AND al.location = $${paramIndex}`
      params.push(filters.location)
      paramIndex++
    }

    if (filters?.search) {
      query += ` AND (al.api ILIKE $${paramIndex} OR al.description ILIKE $${paramIndex})`
      params.push(`%${filters.search}%`)
      paramIndex++
    }

    query += ` GROUP BY al.id, u.display_name, u.wallet_address`

    if (filters?.minRating) {
      query += ` HAVING AVG(r.rating) >= ${filters.minRating}`
    }

    query += ` ORDER BY al.created_at DESC`

    const result = await pool.query(query, params)
    return result.rows
  }

  // Get single API listing by ID
  static async getApiListingById(id: string) {
    const query = `
      SELECT 
        al.*,
        u.display_name as seller_name,
        u.wallet_address as seller_wallet,
        u.photo_url as seller_photo,
        COALESCE(AVG(r.rating), 0) as seller_rating,
        COUNT(DISTINCT r.id) as total_reviews
      FROM api_listings al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN reviews r ON u.id = r.seller_id
      WHERE al.id = $1 AND al.status = 'active'
      GROUP BY al.id, u.display_name, u.wallet_address, u.photo_url
    `
    
    const result = await pool.query(query, [id])
    return result.rows[0] || null
  }

  // Get featured APIs (top rated, high volume)
  static async getFeaturedApis(limit = 6) {
    const query = `
      SELECT 
        al.*,
        u.display_name as seller_name,
        COALESCE(AVG(r.rating), 0) as seller_rating,
        COUNT(DISTINCT p.id) as total_purchases
      FROM api_listings al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN reviews r ON u.id = r.seller_id
      LEFT JOIN purchases p ON al.id = p.api_listing_id
      WHERE al.status = 'active'
      GROUP BY al.id, u.display_name
      ORDER BY total_purchases DESC, seller_rating DESC
      LIMIT $1
    `
    
    const result = await pool.query(query, [limit])
    return result.rows
  }

  // Get API categories
  static async getCategories() {
    const query = `
      SELECT DISTINCT category, COUNT(*) as count
      FROM api_listings
      WHERE status = 'active'
      GROUP BY category
      ORDER BY count DESC
    `
    
    const result = await pool.query(query)
    return result.rows
  }

  // Get locations
  static async getLocations() {
    const query = `
      SELECT DISTINCT location, COUNT(*) as count
      FROM api_listings
      WHERE status = 'active' AND location IS NOT NULL
      GROUP BY location
      ORDER BY count DESC
    `
    
    const result = await pool.query(query)
    return result.rows
  }
}

export default MarketplaceDB
