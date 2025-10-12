const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Read .env.local file manually
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const envVars = {}

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const equalsIndex = trimmed.indexOf('=')
    if (equalsIndex > 0) {
      const key = trimmed.substring(0, equalsIndex).trim()
      let value = trimmed.substring(equalsIndex + 1).trim()
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1)
      }
      envVars[key] = value
    }
  }
})

const pool = new Pool({
  connectionString: envVars.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

/**
 * Script to check if all required tables exist for the Buyer Dashboard
 * and display their schemas
 */

// Tables required by the Buyer Dashboard
const REQUIRED_TABLES = {
  'users': {
    purpose: 'User authentication and wallet information',
    requiredColumns: ['firebase_uid', 'wallet_address', 'email', 'display_name', 'role']
  },
  'api_access': {
    purpose: 'Track buyer API access credentials and quotas',
    requiredColumns: ['buyer_uid', 'listing_id', 'purchase_id', 'access_key', 'total_quota', 'remaining_quota', 'used_quota', 'status']
  },
  'purchases': {
    purpose: 'Record of all API purchases',
    requiredColumns: ['buyer_uid', 'listing_id', 'package_size', 'total_amount', 'status', 'transaction_hash', 'created_at']
  },
  'api_calls': {
    purpose: 'Log of every API call made through the gateway',
    requiredColumns: ['buyer_user_id', 'listing_id', 'method', 'path', 'is_successful', 'response_code', 'latency_ms', 'total_cost', 'blockchain_tx_hash', 'created_at']
  },
  'api_listings': {
    purpose: 'Available APIs in the marketplace',
    requiredColumns: ['id', 'seller_uid', 'api_name', 'price_per_call', 'quota_available', 'status']
  }
}

async function checkDatabaseTables() {
  console.log('\n🔍 Checking Database Tables for Buyer Dashboard\n')
  console.log('=' .repeat(80))
  
  try {
    // Get all existing tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    const existingTables = tablesResult.rows.map(row => row.table_name)
    
    console.log('\n📋 Existing Tables in Database:')
    console.log('-'.repeat(80))
    existingTables.forEach(table => {
      const isRequired = REQUIRED_TABLES[table] ? '✓ REQUIRED' : '  (not used by dashboard)'
      console.log(`  ${table.padEnd(30)} ${isRequired}`)
    })
    
    // Check each required table
    console.log('\n\n📊 Required Tables Analysis:')
    console.log('='.repeat(80))
    
    const missingTables = []
    const existingRequiredTables = []
    
    for (const [tableName, tableInfo] of Object.entries(REQUIRED_TABLES)) {
      console.log(`\n${tableName.toUpperCase()}`)
      console.log(`Purpose: ${tableInfo.purpose}`)
      console.log('-'.repeat(80))
      
      if (existingTables.includes(tableName)) {
        existingRequiredTables.push(tableName)
        console.log(`✅ Table EXISTS`)
        
        // Get table schema
        const columnsResult = await pool.query(`
          SELECT 
            column_name, 
            data_type, 
            character_maximum_length,
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position
        `, [tableName])
        
        const columns = columnsResult.rows
        const columnNames = columns.map(col => col.column_name)
        
        console.log('\nColumns:')
        columns.forEach(col => {
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'
          const type = col.character_maximum_length 
            ? `${col.data_type}(${col.character_maximum_length})`
            : col.data_type
          const def = col.column_default ? ` DEFAULT ${col.column_default}` : ''
          console.log(`  - ${col.column_name.padEnd(30)} ${type.padEnd(20)} ${nullable}${def}`)
        })
        
        // Check required columns
        console.log('\nRequired Columns Check:')
        const missingColumns = []
        tableInfo.requiredColumns.forEach(reqCol => {
          if (columnNames.includes(reqCol)) {
            console.log(`  ✓ ${reqCol}`)
          } else {
            console.log(`  ✗ ${reqCol} - MISSING!`)
            missingColumns.push(reqCol)
          }
        })
        
        if (missingColumns.length > 0) {
          console.log(`\n⚠️  WARNING: Missing ${missingColumns.length} required column(s)`)
        }
        
        // Get row count
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`)
        const rowCount = countResult.rows[0].count
        console.log(`\n📈 Row Count: ${rowCount}`)
        
        // Get sample data (first row)
        if (parseInt(rowCount) > 0) {
          const sampleResult = await pool.query(`SELECT * FROM ${tableName} LIMIT 1`)
          console.log(`\n📝 Sample Row (first entry):`)
          const sampleRow = sampleResult.rows[0]
          Object.entries(sampleRow).forEach(([key, value]) => {
            let displayValue = value
            if (value && typeof value === 'string' && value.length > 50) {
              displayValue = value.substring(0, 47) + '...'
            }
            console.log(`  ${key.padEnd(30)}: ${displayValue}`)
          })
        } else {
          console.log(`\n⚠️  Table is EMPTY (no data)`)
        }
        
      } else {
        missingTables.push(tableName)
        console.log(`❌ Table DOES NOT EXIST`)
        console.log(`\nRequired columns:`)
        tableInfo.requiredColumns.forEach(col => {
          console.log(`  - ${col}`)
        })
      }
    }
    
    // Summary
    console.log('\n\n' + '='.repeat(80))
    console.log('📊 SUMMARY')
    console.log('='.repeat(80))
    console.log(`\nTotal tables in database: ${existingTables.length}`)
    console.log(`Required tables for dashboard: ${Object.keys(REQUIRED_TABLES).length}`)
    console.log(`Required tables found: ${existingRequiredTables.length}`)
    console.log(`Required tables missing: ${missingTables.length}`)
    
    if (missingTables.length > 0) {
      console.log('\n❌ MISSING TABLES:')
      missingTables.forEach(table => {
        console.log(`  - ${table}`)
      })
      console.log('\n⚠️  Dashboard will NOT work properly without these tables!')
    } else {
      console.log('\n✅ All required tables exist!')
    }
    
    // Check for data readiness
    console.log('\n\n' + '='.repeat(80))
    console.log('📈 DATA READINESS CHECK')
    console.log('='.repeat(80))
    
    for (const tableName of existingRequiredTables) {
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`)
      const rowCount = parseInt(countResult.rows[0].count)
      const status = rowCount > 0 ? `✅ ${rowCount} rows` : '⚠️  EMPTY'
      console.log(`${tableName.padEnd(30)}: ${status}`)
    }
    
    // SQL statements to create missing tables
    if (missingTables.length > 0) {
      console.log('\n\n' + '='.repeat(80))
      console.log('🛠️  SQL TO CREATE MISSING TABLES')
      console.log('='.repeat(80))
      console.log('\nCopy and run these SQL statements to create missing tables:\n')
      
      const createStatements = {
        'api_access': `
CREATE TABLE api_access (
  id SERIAL PRIMARY KEY,
  buyer_uid VARCHAR(255) NOT NULL,
  listing_id INTEGER NOT NULL,
  purchase_id INTEGER NOT NULL,
  access_key VARCHAR(255) UNIQUE NOT NULL,
  total_quota INTEGER NOT NULL,
  remaining_quota INTEGER NOT NULL,
  used_quota INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES api_listings(id) ON DELETE CASCADE,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_access_buyer ON api_access(buyer_uid);
CREATE INDEX idx_api_access_key ON api_access(access_key);`,
        
        'api_calls': `
CREATE TABLE api_calls (
  id SERIAL PRIMARY KEY,
  buyer_user_id VARCHAR(255) NOT NULL,
  listing_id INTEGER NOT NULL,
  method VARCHAR(10) NOT NULL,
  path TEXT NOT NULL,
  is_successful BOOLEAN DEFAULT false,
  response_code INTEGER,
  latency_ms INTEGER NOT NULL,
  total_cost DECIMAL(20, 18) NOT NULL,
  blockchain_tx_hash VARCHAR(255),
  blockchain_block VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES api_listings(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_calls_buyer ON api_calls(buyer_user_id, created_at);
CREATE INDEX idx_api_calls_listing ON api_calls(listing_id);
CREATE INDEX idx_api_calls_blockchain ON api_calls(blockchain_tx_hash);`,
        
        'purchases': `
CREATE TABLE purchases (
  id SERIAL PRIMARY KEY,
  buyer_uid VARCHAR(255) NOT NULL,
  listing_id INTEGER NOT NULL,
  package_size INTEGER NOT NULL,
  price_per_call DECIMAL(20, 18) NOT NULL,
  total_amount DECIMAL(20, 18) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  transaction_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES api_listings(id) ON DELETE CASCADE
);

CREATE INDEX idx_purchases_buyer ON purchases(buyer_uid, created_at);
CREATE INDEX idx_purchases_listing ON purchases(listing_id);`,
        
        'api_listings': `
CREATE TABLE api_listings (
  id SERIAL PRIMARY KEY,
  seller_uid VARCHAR(255) NOT NULL,
  api_name VARCHAR(255) NOT NULL,
  api_endpoint TEXT NOT NULL,
  description TEXT,
  category VARCHAR(100),
  price_per_call DECIMAL(20, 18) NOT NULL,
  quota_available INTEGER NOT NULL,
  quota_sold INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  auth_type VARCHAR(50) DEFAULT 'bearer',
  encrypted_api_key TEXT,
  encryption_salt VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_listings_seller ON api_listings(seller_uid);
CREATE INDEX idx_api_listings_status ON api_listings(status);`
      }
      
      missingTables.forEach(table => {
        if (createStatements[table]) {
          console.log(`-- ${table.toUpperCase()}`)
          console.log(createStatements[table])
          console.log('\n')
        }
      })
    }
    
  } catch (error) {
    console.error('\n❌ Error checking database:', error.message)
    console.error(error)
  } finally {
    await pool.end()
    console.log('\n' + '='.repeat(80))
    console.log('✓ Database connection closed')
  }
}

// Run the check
checkDatabaseTables()
