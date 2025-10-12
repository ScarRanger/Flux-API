import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/database'

/**
 * GET /api/user/by-address
 * 
 * Get user information by wallet address
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address parameter required' },
        { status: 400 }
      )
    }

    const query = `
      SELECT 
        id,
        firebase_uid,
        email,
        wallet_address,
        role,
        created_at
      FROM users 
      WHERE LOWER(wallet_address) = LOWER($1)
    `
    
    const result = await pool.query(query, [address])
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: result.rows[0]
    })

  } catch (error) {
    console.error('Error fetching user by address:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch user information'
      },
      { status: 500 }
    )
  }
}
