import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import crypto from 'crypto'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

/**
 * POST /api/access/generate
 * Generate API access credentials after a successful purchase
 * Called internally after purchase completion
 */
export async function POST(req: NextRequest) {
    try {
        const { buyerUid, listingId, purchaseId, totalQuota } = await req.json()

        if (!buyerUid || !listingId || !purchaseId || !totalQuota) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const pool = getPool()

        // Generate a unique access key
        const accessKey = `bnb_${crypto.randomBytes(32).toString('hex')}`

        // Insert access record
        const result = await pool.query(`
            INSERT INTO api_access (
                buyer_uid,
                listing_id,
                purchase_id,
                access_key,
                total_quota,
                remaining_quota,
                status
            ) VALUES ($1, $2, $3, $4, $5, $5, 'active')
            RETURNING *
        `, [buyerUid, listingId, purchaseId, accessKey, totalQuota])

        const access = result.rows[0]

        return NextResponse.json({
            success: true,
            access: {
                id: access.id,
                accessKey: access.access_key,
                totalQuota: access.total_quota,
                remainingQuota: access.remaining_quota,
                status: access.status,
                createdAt: access.created_at
            }
        })

    } catch (error: any) {
        console.error('Error generating API access:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to generate access credentials' },
            { status: 500 }
        )
    }
}

function getPool() {
    return pool
}

