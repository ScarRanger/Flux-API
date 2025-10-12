import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userAddress = searchParams.get('address')

    if (!userAddress) {
      return NextResponse.json({ error: 'Address parameter required' }, { status: 400 })
    }

    // First get the user's firebase_uid from their wallet address
    const userQuery = `
      SELECT firebase_uid 
      FROM users 
      WHERE wallet_address = $1
    `
    
    const userResult = await pool.query(userQuery, [userAddress.toLowerCase()])
    
    if (userResult.rows.length === 0) {
      // User not found, return empty data
      return NextResponse.json({
        success: true,
        data: {
          totalStaked: '0',
          activeStakes: 0,
          totalPurchases: 0,
          stakeAmount: '0.1'
        }
      })
    }

    const firebaseUid = userResult.rows[0].firebase_uid

    // Query escrow_stakes table for user's stake information
    const stakesQuery = `
      SELECT 
        COUNT(*) as total_stakes,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_stakes,
        SUM(CASE WHEN status = 'active' THEN stake_amount ELSE 0 END) as total_staked_eth
      FROM escrow_stakes 
      WHERE buyer_uid = $1
    `
    
    const result = await pool.query(stakesQuery, [firebaseUid])
    const data = result.rows[0]

    return NextResponse.json({
      success: true,
      data: {
        totalStaked: (parseFloat(data.total_staked_eth) || 0).toString(),
        activeStakes: parseInt(data.active_stakes) || 0,
        totalPurchases: parseInt(data.total_stakes) || 0,
        stakeAmount: '0.1' // ETH per stake
      }
    })
  } catch (error) {
    console.error('Error fetching user stakes:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch stake information',
      data: {
        totalStaked: '0',
        activeStakes: 0,
        totalPurchases: 0,
        stakeAmount: '0.1'
      }
    }, { status: 500 })
  }
}