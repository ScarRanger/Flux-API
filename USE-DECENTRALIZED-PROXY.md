# 🚀 Using the Decentralized Proxy Network

## Overview
Your API requests are now routed through **keeper nodes** instead of directly from your server. This provides:
- ✅ **Decentralization**: No single point of failure
- ✅ **Load Balancing**: Requests distributed across multiple keepers
- ✅ **Privacy**: API keys encrypted in keeper vaults
- ✅ **Transparency**: Every call tracked with keeper info

---

## How It Works

```
Buyer Request → Gateway → Keeper Selection → Keeper Node → Third-party API
                  ↓           ↓                  ↓
              Validate    Load Balance      Decrypt Key
              API Key     Pick Keeper       Make Call
```

---

## Making Transactions

### Method 1: Using the Gateway API (Recommended)

**Endpoint**: `POST http://localhost:3000/api/gateway/proxy`

**Headers**:
```
Content-Type: application/json
X-BNB-API-Key: your_bnb_api_key_here
```

**Body**:
```json
{
  "method": "GET",
  "path": "/joke/Any"
}
```

**Example with curl**:
```bash
curl -X POST http://localhost:3000/api/gateway/proxy \
  -H "Content-Type: application/json" \
  -H "X-BNB-API-Key: bnb_dc739855131070573e81f52408a7b1170dee7fabf3c8734e1a1cbf32371c5762" \
  -d '{
    "method": "GET",
    "path": "/joke/Any"
  }'
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "joke": "Why do programmers prefer dark mode? Because light attracts bugs!",
    "type": "programming"
  },
  "keeper": {
    "nodeId": "keeper-node-1",
    "walletAddress": "0x447e555CA6664bbDF5f7cd6FF4878F7c1a54f44e",
    "endpoint": "http://localhost:3001",
    "responseTime": 234
  },
  "quota": {
    "used": 1,
    "remaining": 999
  }
}
```

---

### Method 2: Using JavaScript/Fetch

```javascript
async function callApiThroughProxy() {
  const response = await fetch('http://localhost:3000/api/gateway/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-BNB-API-Key': 'your_bnb_api_key_here'
    },
    body: JSON.stringify({
      method: 'GET',
      path: '/joke/Any'
    })
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('API Response:', result.data);
    console.log('Routed through keeper:', result.keeper.nodeId);
    console.log('Quota remaining:', result.quota.remaining);
  }
}
```

---

### Method 3: Using the Test Script

We've created a comprehensive test script:

```bash
# Run all tests
node test-decentralized-proxy.js
```

This will:
1. Check gateway health
2. Make a single API call through proxy
3. Make 5 calls to test load balancing
4. Compare centralized vs decentralized routing

---

## Key Features

### 1. **Automatic Keeper Selection**
The gateway automatically selects the best keeper based on:
- Active status
- Reputation score
- Current load (least busy)

### 2. **Quota Tracking**
Every request tracks your API key quota:
```json
"quota": {
  "used": 5,
  "remaining": 995,
  "limit": 1000
}
```

### 3. **Keeper Statistics**
Each response includes keeper performance:
```json
"keeper": {
  "nodeId": "keeper-node-1",
  "walletAddress": "0x447e555CA6664bbDF5f7cd6FF4878F7c1a54f44e",
  "responseTime": 234
}
```

### 4. **Database Tracking**
Every call is logged in `api_calls` table with:
- `keeper_node_id` - Which keeper handled it
- `blockchain_tx_hash` - Blockchain verification (if enabled)
- `latency_ms` - Response time
- `is_successful` - Success/failure status

---

## Testing Your Setup

### Quick Health Check
```bash
# Check keeper node
curl http://localhost:3001/health

# Check gateway
curl http://localhost:3000/api/gateway/proxy
```

### View Keeper Statistics
```bash
curl http://localhost:3001/stats
```

Expected response:
```json
{
  "nodeId": "keeper-node-1",
  "tasksProcessed": 5,
  "tasksSucceeded": 5,
  "tasksFailed": 0,
  "successRate": 100,
  "vaultSize": 1
}
```

### View Encrypted Vault
```bash
curl http://localhost:3001/vault
```

Shows API keys stored in keeper's encrypted vault:
```json
{
  "totalKeys": 1,
  "keys": [
    {
      "listingId": "1",
      "isEncrypted": true,
      "keyPreview": "ENCRYPTED..."
    }
  ]
}
```

---

## Comparison: Centralized vs Decentralized

### Centralized (Old Way)
```
POST /api/gateway/call
→ Server decrypts API key
→ Server makes API call
→ Returns response

❌ Single point of failure
❌ Server holds all keys
❌ Not scalable
```

### Decentralized (New Way)
```
POST /api/gateway/proxy
→ Gateway selects keeper
→ Keeper decrypts key from vault
→ Keeper makes API call
→ Returns response with keeper info

✅ Distributed across keepers
✅ Keys encrypted in keeper vaults
✅ Scalable with multiple keepers
✅ Load balancing
✅ Tracked on blockchain
```

---

## Adding More Keeper Nodes

To scale your network, start additional keeper nodes on different ports:

```bash
# Keeper Node 2
cd keeper-node
PORT=3002 NODE_ID=keeper-node-2 node server.js

# Keeper Node 3
PORT=3003 NODE_ID=keeper-node-3 node server.js
```

The gateway will automatically distribute requests across all active keepers.

---

## Monitoring

### Check Network Status
Visit: `http://localhost:3000/network`

Shows:
- ✅ Active keeper nodes
- 📊 Statistics per keeper
- 💎 Reputation scores
- 🔐 Wallet addresses

### Database Queries

**Check recent calls with keeper info**:
```sql
SELECT 
  id,
  keeper_node_id,
  method,
  path,
  is_successful,
  latency_ms,
  created_at
FROM api_calls 
WHERE keeper_node_id IS NOT NULL
ORDER BY created_at DESC 
LIMIT 10;
```

**Keeper performance**:
```sql
SELECT 
  keeper_node_id,
  COUNT(*) as total_calls,
  SUM(CASE WHEN is_successful THEN 1 ELSE 0 END) as successful,
  AVG(latency_ms) as avg_latency
FROM api_calls 
WHERE keeper_node_id IS NOT NULL
GROUP BY keeper_node_id;
```

---

## Troubleshooting

### "No active keepers available"
```bash
# Check if keeper node is running
curl http://localhost:3001/health

# Restart keeper node
cd keeper-node
node server.js
```

### "Invalid API key"
Make sure you're using a valid BNB marketplace API key in the header:
```
X-BNB-API-Key: bnb_your_key_here
```

### "API key not found in keeper vault"
The keeper needs to load the API key first. This happens automatically on first use, but you can manually load keys:
```bash
# The keeper will load keys when it receives a request
# Or restart the keeper to reload from database
```

---

## Security Notes

1. **Encryption**: API keys are encrypted in the database and in keeper vaults
2. **HTTPS**: In production, use HTTPS for all endpoints
3. **Authentication**: Only valid BNB API keys can access the proxy
4. **Rate Limiting**: Quota enforcement prevents abuse
5. **Monitoring**: All requests logged for audit trail

---

## Next Steps

1. ✅ Test the proxy with your API key
2. ✅ Monitor requests in the `/network` dashboard
3. ✅ Check database for keeper_node_id in api_calls
4. ✅ Add more keeper nodes for scaling
5. ✅ Integrate blockchain verification (optional)

---

**Need Help?** Check the logs in the keeper node terminal for detailed information about each request.
