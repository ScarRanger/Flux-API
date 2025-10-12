import express from 'express'
import cors from 'cors'
import axios from 'axios'
import { ethers } from 'ethers'
import pg from 'pg'
import crypto from 'crypto'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env.local file
dotenv.config({ path: path.join(__dirname, '.env.local') })
console.log('Loaded .env.local from:', path.join(__dirname, '.env.local'))

const { Pool } = pg
const app = express()
const PORT = process.env.KEEPER_NODE_PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

// Keeper node state
const keeperState = {
  nodeId: process.env.KEEPER_NODE_ID || 'keeper-node-1',
  walletAddress: null,
  isActive: false,
  tasksProcessed: 0,
  tasksSucceeded: 0,
  tasksFailed: 0,
  startTime: Date.now(),
  apiKeys: new Map(), // In-memory encrypted vault
  blockchain: {
    txSubmitted: 0,
    txConfirmed: 0,
    txFailed: 0,
    totalGasUsed: BigInt(0),
    lastTxHash: null,
    lastTxBlock: null
  }
}

// Blockchain configuration
const USAGE_TRACKING_ADDRESS = process.env.USAGE_TRACKING_ADDRESS || '0x8385870fc0d4be14809e9e7f9e15f724426730fd'
const ENABLE_BLOCKCHAIN = process.env.ENABLE_BLOCKCHAIN_LOGGING !== 'false' // Default true

// Load UsageTracking ABI
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const UsageTrackingABI = require('../smart_contracts/usagetracking.json')

// Blockchain transaction queue to prevent nonce collisions
const blockchainQueue = []
let isProcessingQueue = false

// Initialize keeper wallet
let keeperWallet
try {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
  const privateKey = process.env.KEEPER_WALLET_PRIVATE_KEY
  
  console.log('Debug - Private key exists:', !!privateKey)
  console.log('Debug - Private key length:', privateKey?.length)
  console.log('Debug - Private key starts with:', privateKey?.substring(0, 4))
  
  // Ensure private key has 0x prefix
  const formattedKey = privateKey?.startsWith('0x') ? privateKey : `0x${privateKey}`
  
  keeperWallet = new ethers.Wallet(formattedKey, provider)
  keeperState.walletAddress = keeperWallet.address
  keeperState.isActive = true
  console.log(`✅ Keeper Node Initialized`)
  console.log(`   Node ID: ${keeperState.nodeId}`)
  console.log(`   Wallet: ${keeperState.walletAddress}`)
  console.log(`   Port: ${PORT}`)
} catch (error) {
  console.error('❌ Failed to initialize keeper wallet:', error.message)
  process.exit(1)
}

// =============================================================================
// ENCRYPTION/DECRYPTION UTILITIES
// =============================================================================

function encryptData(data, key) {
  const algorithm = 'aes-256-cbc'
  const encryptionKey = crypto.scryptSync(key, 'salt', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv)
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return `${iv.toString('hex')}:${encrypted}`
}

function decryptData(encryptedData, key) {
  const algorithm = 'aes-256-cbc'
  const [ivHex, encrypted] = encryptedData.split(':')
  const encryptionKey = crypto.scryptSync(key, 'salt', 32)
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv(algorithm, encryptionKey, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// Simple base64 decryption (matching the current app encryption)
function decryptApiKey(encryptedKey, salt) {
  try {
    // Current app uses base64 encoding with XOR salt
    const decoded = Buffer.from(encryptedKey, 'base64').toString('utf-8')
    // XOR with salt to get original key
    let decrypted = ''
    for (let i = 0; i < decoded.length; i++) {
      decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ salt.charCodeAt(i % salt.length))
    }
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error.message)
    return null
  }
}

// =============================================================================
// BLOCKCHAIN TRANSACTION UTILITIES
// =============================================================================

/**
 * Add blockchain transaction to queue
 */
async function queueBlockchainTx(txFunction, txId) {
  return new Promise((resolve, reject) => {
    blockchainQueue.push({
      id: txId,
      execute: txFunction,
      resolve,
      reject
    })

    if (!isProcessingQueue) {
      processBlockchainQueue()
    }
  })
}

/**
 * Process blockchain queue sequentially to prevent nonce collisions
 */
async function processBlockchainQueue() {
  if (isProcessingQueue || blockchainQueue.length === 0) {
    return
  }

  isProcessingQueue = true

  while (blockchainQueue.length > 0) {
    const tx = blockchainQueue.shift()

    try {
      console.log(`   🔗 [Blockchain] Processing TX: ${tx.id}`)
      const result = await tx.execute()
      tx.resolve(result)
      console.log(`   ✅ [Blockchain] TX ${tx.id} confirmed`)
      
      // Small delay between TXs
      if (blockchainQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } catch (error) {
      console.error(`   ❌ [Blockchain] TX ${tx.id} failed:`, error.message)
      tx.reject(error)
    }
  }

  isProcessingQueue = false
}

/**
 * Log API usage on blockchain via UsageTracking contract
 */
async function logUsageOnBlockchain(buyerAddress, listingId, calls = 1) {
  if (!ENABLE_BLOCKCHAIN) {
    console.log(`   ⏭️  Blockchain logging disabled`)
    return null
  }

  try {
    const txId = `usage-${Date.now()}`
    
    const result = await queueBlockchainTx(async () => {
      const contract = new ethers.Contract(
        USAGE_TRACKING_ADDRESS,
        UsageTrackingABI,
        keeperWallet
      )

      console.log(`   📝 Calling logUsage(${buyerAddress}, ${listingId}, ${calls})`)

      const tx = await contract.logUsage(buyerAddress, listingId, calls)
      console.log(`   ⏳ TX submitted: ${tx.hash}`)
      
      keeperState.blockchain.txSubmitted++
      keeperState.blockchain.lastTxHash = tx.hash

      const receipt = await tx.wait(1)
      console.log(`   ✅ TX confirmed at block ${receipt.blockNumber}`)

      keeperState.blockchain.txConfirmed++
      keeperState.blockchain.totalGasUsed += receipt.gasUsed
      keeperState.blockchain.lastTxBlock = receipt.blockNumber

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      }
    }, txId)

    return result
  } catch (error) {
    keeperState.blockchain.txFailed++
    console.error(`   ❌ Blockchain logging failed:`, error.message)
    return null // Don't fail the whole request if blockchain fails
  }
}

// =============================================================================
// API KEY VAULT MANAGEMENT
// =============================================================================

/**
 * Load API key from database and store in keeper vault
 */
async function loadApiKeyToVault(listingId) {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        api_name,
        base_endpoint,
        auth_type,
        auth_param_name,
        encrypted_api_key,
        encryption_salt
      FROM api_listings
      WHERE id = $1`,
      [listingId]
    )

    if (result.rows.length === 0) {
      throw new Error('API listing not found')
    }

    const listing = result.rows[0]
    
    // Store encrypted in keeper's vault
    const vaultEntry = {
      listingId: listing.id,
      apiName: listing.api_name,
      baseEndpoint: listing.base_endpoint,
      authType: listing.auth_type,
      authParamName: listing.auth_param_name,
      encryptedKey: listing.encrypted_api_key,
      encryptionSalt: listing.encryption_salt,
      loadedAt: Date.now()
    }

    keeperState.apiKeys.set(listingId, vaultEntry)
    console.log(`🔐 Loaded API key to vault: ${listing.api_name} (ID: ${listingId})`)
    
    return vaultEntry
  } catch (error) {
    console.error('Failed to load API key:', error.message)
    throw error
  }
}

/**
 * Get decrypted API key from vault
 */
function getApiKeyFromVault(listingId) {
  const vaultEntry = keeperState.apiKeys.get(listingId)
  if (!vaultEntry) {
    return null
  }

  // Decrypt on-demand
  if (vaultEntry.authType === 'none') {
    return null
  }

  try {
    const decrypted = decryptApiKey(vaultEntry.encryptedKey, vaultEntry.encryptionSalt)
    return {
      apiKey: decrypted,
      authType: vaultEntry.authType,
      authParamName: vaultEntry.authParamName
    }
  } catch (error) {
    console.error('Failed to decrypt API key:', error.message)
    return null
  }
}

// =============================================================================
// PROXY REQUEST HANDLER
// =============================================================================

/**
 * Main proxy endpoint - handles API calls from buyers
 */
app.post('/proxy', async (req, res) => {
  const startTime = Date.now()
  keeperState.tasksProcessed++

  try {
    const { accessKey, method, path, headers, body, listingId, buyerUid } = req.body

    console.log(`\n📡 [PROXY] New request received`)
    console.log(`   Access Key: ${accessKey?.substring(0, 20)}...`)
    console.log(`   Method: ${method}`)
    console.log(`   Path: ${path}`)
    console.log(`   Listing ID: ${listingId}`)

    // Validate request
    if (!accessKey || !method || !listingId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: accessKey, method, listingId' 
      })
    }

    // Load API key to vault if not already loaded
    if (!keeperState.apiKeys.has(listingId)) {
      console.log(`   Loading API key to vault...`)
      await loadApiKeyToVault(listingId)
    }

    const vaultEntry = keeperState.apiKeys.get(listingId)
    if (!vaultEntry) {
      throw new Error('Failed to load API configuration')
    }

    // Construct target URL
    const targetUrl = `${vaultEntry.baseEndpoint}${path || ''}`
    console.log(`   Target URL: ${targetUrl}`)

    // Prepare headers
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...(headers || {})
    }

    // Add authentication if required
    if (vaultEntry.authType !== 'none') {
      const authData = getApiKeyFromVault(listingId)
      if (authData && authData.apiKey) {
        if (vaultEntry.authType === 'header-key') {
          requestHeaders[vaultEntry.authParamName] = authData.apiKey
          console.log(`   ✓ Added auth header: ${vaultEntry.authParamName}`)
        } else if (vaultEntry.authType === 'query') {
          // Query params would be added to URL
          console.log(`   ✓ Auth via query param: ${vaultEntry.authParamName}`)
        }
      }
    }

    // Make the proxied request
    console.log(`   🚀 Calling target API...`)
    const apiResponse = await axios({
      method: method.toUpperCase(),
      url: targetUrl,
      headers: requestHeaders,
      data: body || undefined,
      timeout: 30000,
      validateStatus: () => true // Accept all status codes
    })

    const responseTime = Date.now() - startTime

    console.log(`   ✅ Target API responded: ${apiResponse.status}`)
    console.log(`   Response time: ${responseTime}ms`)

    // Determine if call was successful
    const isSuccessful = apiResponse.status >= 200 && apiResponse.status < 500

    // Log to blockchain (async, non-blocking)
    let blockchainResult = null
    if (isSuccessful && buyerUid && listingId) {
      console.log(`   🔗 Logging to blockchain...`)
      blockchainResult = await logUsageOnBlockchain(buyerUid, listingId, 1)
        .catch(err => {
          console.error('   ⚠️  Blockchain logging failed (non-critical):', err.message)
          return null
        })
    }

    // Log the call to database (with blockchain info)
    const callLogId = await logApiCall(
      accessKey, 
      listingId, 
      buyerUid, 
      method, 
      path, 
      apiResponse.status, 
      responseTime,
      isSuccessful,
      blockchainResult?.txHash,
      blockchainResult?.blockNumber
    )

    keeperState.tasksSucceeded++

    // Prepare response
    const response = {
      success: true,
      data: apiResponse.data,
      headers: apiResponse.headers,
      status: apiResponse.status,
      callLogId,
      keeper: {
        nodeId: keeperState.nodeId,
        walletAddress: keeperState.walletAddress,
        responseTime
      }
    }

    // Add blockchain info if available
    if (blockchainResult) {
      response.blockchain = {
        txHash: blockchainResult.txHash,
        blockNumber: blockchainResult.blockNumber,
        gasUsed: blockchainResult.gasUsed,
        explorer: `https://sepolia.etherscan.io/tx/${blockchainResult.txHash}`
      }
    }

    res.status(apiResponse.status).json(response)

  } catch (error) {
    const responseTime = Date.now() - startTime
    keeperState.tasksFailed++

    console.error(`   ❌ Proxy error:`, error.message)

    // Still log the failed call
    const { accessKey, listingId, buyerUid, method, path } = req.body
    if (accessKey && listingId) {
      logApiCall(accessKey, listingId, buyerUid, method, path, 500, responseTime)
        .catch(err => console.error('Failed to log API call:', err.message))
    }

    res.status(500).json({
      success: false,
      error: error.message,
      keeper: {
        nodeId: keeperState.nodeId,
        walletAddress: keeperState.walletAddress,
        responseTime
      }
    })
  }
})

/**
 * Log API call to database
 */
async function logApiCall(accessKey, listingId, buyerUid, method, path, statusCode, responseTime, isSuccessful, blockchainTxHash, blockchainBlock) {
  try {
    const result = await pool.query(
      `INSERT INTO api_calls 
        (buyer_user_id, listing_id, method, path, response_code, latency_ms, is_successful, keeper_node_id, blockchain_tx_hash, blockchain_block) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [buyerUid, listingId, method, path, statusCode, responseTime, isSuccessful, keeperState.nodeId, blockchainTxHash, blockchainBlock]
    )
    
    const callId = result.rows[0].id
    console.log(`   💾 Logged to database (Call ID: ${callId})`)
    if (blockchainTxHash) {
      console.log(`   🔗 Blockchain TX: ${blockchainTxHash}`)
    }
    return callId
  } catch (error) {
    console.error('Database logging error:', error.message)
    throw error
  }
}

// =============================================================================
// MARKETPLACE PURCHASE HANDLER
// =============================================================================

/**
 * Handle marketplace purchase - generate access key and initialize blockchain tracking
 * This allows the keeper to manage the entire purchase flow in a decentralized way
 */
app.post('/purchase', async (req, res) => {
  console.log(`\n💰 [PURCHASE] New purchase request`)
  
  try {
    const { 
      buyerId, 
      listingId, 
      packageSize, 
      paymentTxHash,
      sellerWallet,
      totalAmount 
    } = req.body

    console.log(`   Buyer: ${buyerId}`)
    console.log(`   Listing: ${listingId}`)
    console.log(`   Package: ${packageSize} calls`)
    console.log(`   Payment TX: ${paymentTxHash}`)

    // Validate inputs
    if (!buyerId || !listingId || !packageSize || !paymentTxHash) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      })
    }

    // 1. Verify payment transaction on blockchain
    console.log(`   🔍 Verifying payment transaction...`)
    try {
      const receipt = await keeperWallet.provider.getTransactionReceipt(paymentTxHash)
      
      if (!receipt) {
        throw new Error('Transaction not found on blockchain')
      }
      
      if (receipt.status !== 1) {
        throw new Error('Transaction failed')
      }

      console.log(`   ✅ Payment verified on block ${receipt.blockNumber}`)
    } catch (error) {
      console.error(`   ❌ Payment verification failed:`, error.message)
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed',
        details: error.message
      })
    }

    // 2. Generate unique access key
    console.log(`   🔑 Generating access key...`)
    const randomHex = crypto.randomBytes(32).toString('hex')
    const accessKey = `bnb_${randomHex}`
    console.log(`   Generated: ${accessKey.substring(0, 25)}...`)

    // 3. Create purchase record in database
    console.log(`   💾 Creating purchase record...`)
    const purchaseResult = await pool.query(`
      INSERT INTO purchases (
        buyer_uid,
        listing_id,
        package_size,
        price_per_call,
        total_amount,
        transaction_hash,
        status,
        processed_by_keeper
      ) VALUES ($1, $2, $3, $4, $5, $6, 'completed', $7)
      RETURNING id
    `, [
      buyerId,
      listingId,
      packageSize,
      (totalAmount / packageSize).toFixed(18), // Calculate price per call
      totalAmount || 0,
      paymentTxHash,
      keeperState.nodeId
    ])

    const purchaseId = purchaseResult.rows[0].id
    console.log(`   Purchase ID: ${purchaseId}`)

    // 4. Create API access entry
    console.log(`   🎫 Creating API access...`)
    const accessResult = await pool.query(`
      INSERT INTO api_access (
        buyer_uid,
        listing_id,
        purchase_id,
        access_key,
        total_quota,
        remaining_quota,
        status,
        created_by_keeper
      ) VALUES ($1, $2, $3, $4, $5, $5, 'active', $6)
      RETURNING id
    `, [
      buyerId,
      listingId,
      purchaseId,
      accessKey,
      packageSize,
      keeperState.nodeId
    ])

    const accessId = accessResult.rows[0].id
    console.log(`   Access ID: ${accessId}`)

    // 5. Update listing quota
    console.log(`   📊 Updating listing quota...`)
    await pool.query(`
      UPDATE api_listings 
      SET 
        quota_sold = quota_sold + $1,
        quota_available = quota_available - $1
      WHERE id = $2
    `, [packageSize, listingId])

    // 6. Initialize blockchain usage tracking (optional, async)
    console.log(`   🔗 Initializing blockchain tracking...`)
    const blockchainResult = await logUsageOnBlockchain(buyerId, listingId, 0)
      .catch(err => {
        console.error(`   ⚠️  Blockchain init failed (non-critical):`, err.message)
        return null
      })

    console.log(`   ✅ Purchase completed successfully!`)
    console.log(`\n   📝 ACCESS DETAILS:`)
    console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`   🔑 Access Key: ${accessKey}`)
    console.log(`   📊 Quota: ${packageSize} calls`)
    console.log(`   🌐 Gateway URL: http://localhost:3000/api/gateway/proxy`)
    console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`   📖 Usage Example:`)
    console.log(`   curl -X POST http://localhost:3000/api/gateway/proxy \\`)
    console.log(`        -H "X-BNB-API-Key: ${accessKey}" \\`)
    console.log(`        -H "Content-Type: application/json" \\`)
    console.log(`        -d '{"method":"GET","path":"/your-endpoint"}'`)
    console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

    // Return success response
    res.json({
      success: true,
      purchase: {
        id: purchaseId,
        transactionHash: paymentTxHash,
        keeper: {
          nodeId: keeperState.nodeId,
          walletAddress: keeperState.walletAddress
        }
      },
      access: {
        id: accessId,
        accessKey,
        quota: packageSize,
        generatedByKeeper: keeperState.nodeId
      },
      blockchain: blockchainResult || null
    })

  } catch (error) {
    console.error(`   ❌ Purchase error:`, error.message)
    res.status(500).json({
      success: false,
      error: error.message,
      keeper: {
        nodeId: keeperState.nodeId,
        walletAddress: keeperState.walletAddress
      }
    })
  }
})

// Purchase statistics endpoint
app.get('/purchase-stats', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_purchases,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
        SUM(quantity_purchased) as total_quota_sold,
        SUM(total_amount) as total_value
      FROM purchases
      WHERE processed_by_keeper = $1
    `, [keeperState.nodeId])

    const accessStats = await pool.query(`
      SELECT 
        COUNT(*) as total_keys,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_keys
      FROM api_access
      WHERE created_by_keeper = $1
    `, [keeperState.nodeId])

    res.json({
      nodeId: keeperState.nodeId,
      wallet: keeperState.walletAddress,
      purchases: {
        processed: parseInt(stats.rows[0].total_purchases) || 0,
        succeeded: parseInt(stats.rows[0].successful) || 0,
        totalQuota: parseInt(stats.rows[0].total_quota_sold) || 0,
        totalValue: stats.rows[0].total_value || '0'
      },
      accessKeys: {
        generated: parseInt(accessStats.rows[0].total_keys) || 0,
        active: parseInt(accessStats.rows[0].active_keys) || 0
      }
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch purchase stats',
      message: error.message
    })
  }
})

// =============================================================================
// KEEPER NODE STATUS & HEALTH
// =============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    nodeId: keeperState.nodeId,
    walletAddress: keeperState.walletAddress,
    isActive: keeperState.isActive,
    uptime: Date.now() - keeperState.startTime,
    stats: {
      tasksProcessed: keeperState.tasksProcessed,
      tasksSucceeded: keeperState.tasksSucceeded,
      tasksFailed: keeperState.tasksFailed,
      successRate: keeperState.tasksProcessed > 0 
        ? ((keeperState.tasksSucceeded / keeperState.tasksProcessed) * 100).toFixed(2) + '%'
        : '0%',
      apiKeysInVault: keeperState.apiKeys.size
    }
  })
})

app.get('/stats', (req, res) => {
  const uptime = Date.now() - keeperState.startTime
  const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(2)

  res.json({
    nodeId: keeperState.nodeId,
    walletAddress: keeperState.walletAddress,
    uptime: `${uptimeHours} hours`,
    uptimeMs: uptime,
    tasksProcessed: keeperState.tasksProcessed,
    tasksSucceeded: keeperState.tasksSucceeded,
    tasksFailed: keeperState.tasksFailed,
    successRate: keeperState.tasksProcessed > 0 
      ? ((keeperState.tasksSucceeded / keeperState.tasksProcessed) * 100).toFixed(2)
      : 0,
    apiKeysLoaded: keeperState.apiKeys.size,
    blockchain: {
      enabled: ENABLE_BLOCKCHAIN,
      txSubmitted: keeperState.blockchain.txSubmitted,
      txConfirmed: keeperState.blockchain.txConfirmed,
      txFailed: keeperState.blockchain.txFailed,
      totalGasUsed: keeperState.blockchain.totalGasUsed.toString(),
      lastTxHash: keeperState.blockchain.lastTxHash,
      lastTxBlock: keeperState.blockchain.lastTxBlock
    },
    vaultEntries: Array.from(keeperState.apiKeys.entries()).map(([id, entry]) => ({
      listingId: id,
      apiName: entry.apiName,
      loadedAt: new Date(entry.loadedAt).toISOString()
    }))
  })
})

// New blockchain stats endpoint
app.get('/blockchain-stats', async (req, res) => {
  try {
    const balance = await keeperWallet.provider.getBalance(keeperWallet.address)
    const balanceEth = ethers.formatEther(balance)
    const needsRefill = parseFloat(balanceEth) < 0.01 // Less than 0.01 ETH

    res.json({
      nodeId: keeperState.nodeId,
      wallet: keeperState.walletAddress,
      blockchain: {
        txSubmitted: keeperState.blockchain.txSubmitted,
        txConfirmed: keeperState.blockchain.txConfirmed,
        txFailed: keeperState.blockchain.txFailed,
        totalGasUsed: keeperState.blockchain.totalGasUsed.toString(),
        lastTxHash: keeperState.blockchain.lastTxHash,
        lastTxBlock: keeperState.blockchain.lastTxBlock,
        contract: USAGE_TRACKING_ADDRESS
      },
      balance: `${balanceEth} ETH`,
      needsRefill,
      enabled: ENABLE_BLOCKCHAIN
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch blockchain stats',
      message: error.message
    })
  }
})

app.get('/vault', (req, res) => {
  res.json({
    totalKeys: keeperState.apiKeys.size,
    keys: Array.from(keeperState.apiKeys.entries()).map(([id, entry]) => ({
      listingId: id,
      apiName: entry.apiName,
      baseEndpoint: entry.baseEndpoint,
      authType: entry.authType,
      loadedAt: new Date(entry.loadedAt).toISOString(),
      hasEncryptedKey: !!entry.encryptedKey
    }))
  })
})

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
  console.log(`\n🚀 Keeper Node Server Started`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`   Node ID: ${keeperState.nodeId}`)
  console.log(`   Wallet: ${keeperState.walletAddress}`)
  console.log(`   Port: ${PORT}`)
  console.log(`   Status: ${keeperState.isActive ? '✅ ACTIVE' : '❌ INACTIVE'}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`\n📡 Endpoints:`)
  console.log(`   POST http://localhost:${PORT}/proxy - Proxy API requests`)
  console.log(`   GET  http://localhost:${PORT}/health - Health check`)
  console.log(`   GET  http://localhost:${PORT}/stats - Node statistics`)
  console.log(`   GET  http://localhost:${PORT}/vault - Vault contents\n`)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down keeper node...')
  keeperState.isActive = false
  await pool.end()
  process.exit(0)
})
