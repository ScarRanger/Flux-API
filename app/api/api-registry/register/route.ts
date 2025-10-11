import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('API Registration request received:', { 
      apiName: body.apiName,
      seller: body.sellerUID 
    });

    const {
      sellerUID,
      apiName,
      baseEndpoint,
      apiDescription,
      documentationUrl,
      categories,
      pricingPerCall,
      quotaToSell,
      authType,
      authParamName,
      encryptedApiKey,
      encryptionSalt,
      region,
      metadataUri
    } = body;

    // Validation
    if (!sellerUID || !apiName || !baseEndpoint || !encryptedApiKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert into database
    const result = await pool.query(
      `INSERT INTO api_listings (
        seller_uid,
        api_name,
        base_endpoint,
        description,
        documentation_url,
        categories,
        price_per_call,
        quota_available,
        auth_type,
        auth_param_name,
        encrypted_api_key,
        encryption_salt,
        region,
        metadata_uri,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      RETURNING id, api_name, created_at`,
      [
        sellerUID,
        apiName,
        baseEndpoint,
        apiDescription,
        documentationUrl || null,
        JSON.stringify(categories || []),
        parseFloat(pricingPerCall),
        parseInt(quotaToSell),
        authType,
        authParamName,
        encryptedApiKey,
        encryptionSalt,
        region || null,
        metadataUri || null,
        'active' // Auto-approve - set to active immediately
      ]
    );

    const apiListing = result.rows[0];
    
    console.log('API registered in database:', apiListing);

    return NextResponse.json({
      success: true,
      data: {
        id: apiListing.id,
        apiName: apiListing.api_name,
        createdAt: apiListing.created_at,
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Error registering API:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to register API',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
