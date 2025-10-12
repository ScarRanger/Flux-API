// Test script for decentralized proxy network
// Tests routing through keeper nodes

const API_KEY = 'bnb_dc739855131070573e81f52408a7b1170dee7fabf3c8734e1a1cbf32371c5762' // Rhine API key

console.log('🧪 Testing Decentralized Proxy Network')
console.log('=' .repeat(60))

// Test 1: Health check
async function testHealthCheck() {
  console.log('\n📊 Test 1: Gateway Health Check')
  try {
    const response = await fetch('http://localhost:3000/api/gateway/proxy', {
      method: 'GET'
    })
    const data = await response.json()
    console.log('✅ Health check passed')
    console.log('   Active keepers:', data.activeKeepers)
    console.log('   Keepers:', JSON.stringify(data.keepers, null, 2))
    return true
  } catch (error) {
    console.error('❌ Health check failed:', error.message)
    return false
  }
}

// Test 2: API call through decentralized gateway
async function testDecentralizedCall() {
  console.log('\n📡 Test 2: API Call via Decentralized Gateway')
  try {
    const response = await fetch('http://localhost:3000/api/gateway/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BNB-API-Key': API_KEY
      },
      body: JSON.stringify({
        method: 'GET',
        path: '/joke/Any'
      })
    })

    const data = await response.json()
    
    if (data.success) {
      console.log('✅ Decentralized call succeeded!')
      console.log('   Keeper Node ID:', data.keeper.nodeId)
      console.log('   Keeper Wallet:', data.keeper.walletAddress)
      console.log('   Response Time:', data.keeper.responseTime + 'ms')
      console.log('   Quota Remaining:', data.quota.remaining)
      console.log('   API Response:', data.data.type || 'Success')
      return true
    } else {
      console.error('❌ Call failed:', data.error)
      return false
    }
  } catch (error) {
    console.error('❌ Decentralized call failed:', error.message)
    return false
  }
}

// Test 3: Multiple calls to test load balancing
async function testLoadBalancing() {
  console.log('\n⚖️  Test 3: Load Balancing (5 calls)')
  const keeperCounts = {}
  let successCount = 0

  for (let i = 1; i <= 5; i++) {
    try {
      const response = await fetch('http://localhost:3000/api/gateway/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BNB-API-Key': API_KEY
        },
        body: JSON.stringify({
          method: 'GET',
          path: '/joke/Programming'
        })
      })

      const data = await response.json()
      
      if (data.success && data.keeper) {
        const keeperNode = data.keeper.nodeId
        keeperCounts[keeperNode] = (keeperCounts[keeperNode] || 0) + 1
        console.log(`   Call ${i}: ✅ ${keeperNode} (${data.keeper.responseTime}ms)`)
        successCount++
      } else {
        console.log(`   Call ${i}: ❌ Failed`)
      }

      // Small delay between calls
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      console.log(`   Call ${i}: ❌ Error - ${error.message}`)
    }
  }

  console.log(`\n   Success Rate: ${successCount}/5`)
  console.log('   Keeper Distribution:', keeperCounts)
  return successCount === 5
}

// Test 4: Compare centralized vs decentralized
async function testComparison() {
  console.log('\n🔄 Test 4: Centralized vs Decentralized Comparison')
  
  // Test centralized
  console.log('   Testing CENTRALIZED gateway...')
  const startCentralized = Date.now()
  try {
    const response = await fetch('http://localhost:3000/api/gateway/call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BNB-API-Key': API_KEY
      },
      body: JSON.stringify({
        method: 'GET',
        path: '/joke/Any'
      })
    })
    const centralizedTime = Date.now() - startCentralized
    const data = await response.json()
    console.log(`   ✅ Centralized: ${centralizedTime}ms`)
  } catch (error) {
    console.log(`   ❌ Centralized failed: ${error.message}`)
  }

  // Test decentralized
  console.log('   Testing DECENTRALIZED gateway...')
  const startDecentralized = Date.now()
  try {
    const response = await fetch('http://localhost:3000/api/gateway/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BNB-API-Key': API_KEY
      },
      body: JSON.stringify({
        method: 'GET',
        path: '/joke/Any'
      })
    })
    const decentralizedTime = Date.now() - startDecentralized
    const data = await response.json()
    console.log(`   ✅ Decentralized: ${decentralizedTime}ms`)
  } catch (error) {
    console.log(`   ❌ Decentralized failed: ${error.message}`)
  }
}

// Run all tests
async function runTests() {
  console.log('\n⏳ Starting tests...\n')
  
  const healthPass = await testHealthCheck()
  if (!healthPass) {
    console.log('\n❌ Health check failed. Make sure:')
    console.log('   1. Next.js app is running (npm run dev)')
    console.log('   2. Keeper node is running (cd keeper-node && npm start)')
    console.log('   3. Database migration is applied')
    return
  }

  await new Promise(resolve => setTimeout(resolve, 1000))
  await testDecentralizedCall()
  
  await new Promise(resolve => setTimeout(resolve, 1000))
  await testLoadBalancing()
  
  await new Promise(resolve => setTimeout(resolve, 1000))
  await testComparison()

  console.log('\n' + '='.repeat(60))
  console.log('🎉 All tests completed!')
  console.log('='.repeat(60))
}

runTests().catch(console.error)
