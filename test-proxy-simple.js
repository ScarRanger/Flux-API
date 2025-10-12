#!/usr/bin/env node

// Simple test script to make transactions through the decentralized proxy
// Usage: node test-proxy-simple.js

const API_KEY = 'bnb_dc739855131070573e81f52408a7b1170dee7fabf3c8734e1a1cbf32371c5762'; // Rhine's API key

console.log('🚀 Testing Decentralized Proxy');
console.log('═'.repeat(60));

async function makeProxyCall(testNumber, path = '/joke/Any') {
  console.log(`\n📡 Test ${testNumber}: Calling ${path}`);
  console.log('─'.repeat(60));
  
  try {
    const startTime = Date.now();
    
    const response = await fetch('http://localhost:3000/api/gateway/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BNB-API-Key': API_KEY
      },
      body: JSON.stringify({
        method: 'GET',
        path: path
      })
    });

    const totalTime = Date.now() - startTime;
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ SUCCESS!');
      console.log('\n📊 Response Data:');
      console.log(JSON.stringify(result.data, null, 2));
      
      console.log('\n🔐 Keeper Information:');
      console.log(`   Node ID:      ${result.keeper.nodeId}`);
      console.log(`   Wallet:       ${result.keeper.walletAddress}`);
      console.log(`   Endpoint:     ${result.keeper.endpoint || 'N/A'}`);
      console.log(`   Response Time: ${result.keeper.responseTime}ms`);
      
      console.log('\n📈 Quota Status:');
      console.log(`   Used:      ${result.quota.used}`);
      console.log(`   Remaining: ${result.quota.remaining}`);
      console.log(`   Limit:     ${result.quota.limit || 'Unlimited'}`);
      
      console.log(`\n⏱️  Total Time: ${totalTime}ms`);
      
      return true;
    } else {
      console.log('❌ FAILED');
      console.log('Error:', result.error || result.message);
      return false;
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return false;
  }
}

async function checkKeeperHealth() {
  console.log('\n🏥 Checking Keeper Node Health...');
  console.log('─'.repeat(60));
  
  try {
    const response = await fetch('http://localhost:3001/health');
    const health = await response.json();
    
    console.log('✅ Keeper node is healthy');
    console.log(`   Node ID:  ${health.nodeId}`);
    console.log(`   Wallet:   ${health.walletAddress}`);
    console.log(`   Active:   ${health.isActive ? '✅' : '❌'}`);
    console.log(`   Uptime:   ${Math.floor(health.uptime / 60)} minutes`);
    
    if (health.stats) {
      console.log('\n📊 Keeper Statistics:');
      console.log(`   Processed: ${health.stats.tasksProcessed}`);
      console.log(`   Succeeded: ${health.stats.tasksSucceeded}`);
      console.log(`   Failed:    ${health.stats.tasksFailed}`);
      console.log(`   Success Rate: ${health.stats.successRate}%`);
    }
    
    return true;
  } catch (error) {
    console.log('❌ Keeper node is not responding');
    console.log('   Make sure keeper node is running: cd keeper-node && node server.js');
    return false;
  }
}

async function checkGateway() {
  console.log('\n🌐 Checking Gateway Status...');
  console.log('─'.repeat(60));
  
  try {
    const response = await fetch('http://localhost:3000/api/gateway/proxy');
    const data = await response.json();
    
    console.log('✅ Gateway is ready');
    console.log(`   Active Keepers: ${data.activeKeepers}`);
    
    if (data.keepers && data.keepers.length > 0) {
      console.log('\n🔗 Available Keeper Nodes:');
      data.keepers.forEach((keeper, idx) => {
        console.log(`   ${idx + 1}. ${keeper.node_id || keeper.nodeId}`);
        console.log(`      Wallet: ${keeper.wallet_address || keeper.walletAddress}`);
        console.log(`      Endpoint: ${keeper.endpoint_url || keeper.endpoint}`);
        console.log(`      Reputation: ${keeper.reputation_score || keeper.reputationScore || 0}`);
      });
    }
    
    return true;
  } catch (error) {
    console.log('❌ Gateway is not responding');
    console.log('   Make sure main app is running: npm run dev');
    return false;
  }
}

async function runTests() {
  console.log('\n🧪 DECENTRALIZED PROXY TEST SUITE');
  console.log('═'.repeat(60));
  
  // Step 1: Check keeper health
  const keeperHealthy = await checkKeeperHealth();
  if (!keeperHealthy) {
    console.log('\n❌ Keeper node must be running first!');
    console.log('   Run: cd keeper-node && node server.js');
    process.exit(1);
  }
  
  // Step 2: Check gateway
  const gatewayReady = await checkGateway();
  if (!gatewayReady) {
    console.log('\n❌ Gateway must be running!');
    console.log('   Run: npm run dev');
    process.exit(1);
  }
  
  console.log('\n\n🎯 Running API Tests...');
  console.log('═'.repeat(60));
  
  // Test 1: Simple joke API call
  await makeProxyCall(1, '/joke/Any');
  
  // Wait a bit between calls
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Programming joke
  await makeProxyCall(2, '/joke/Programming');
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 3: Another call to see load balancing (if multiple keepers)
  await makeProxyCall(3, '/joke/Any');
  
  console.log('\n\n✨ All tests completed!');
  console.log('═'.repeat(60));
  console.log('\n📝 What just happened:');
  console.log('   1. Your request went to the gateway (/api/gateway/proxy)');
  console.log('   2. Gateway selected the best keeper node');
  console.log('   3. Keeper decrypted the API key from its vault');
  console.log('   4. Keeper made the actual API call to the third-party service');
  console.log('   5. Response returned with keeper info and quota tracking');
  console.log('\n🎉 Your API calls are now DECENTRALIZED!');
  console.log('\n💡 Next steps:');
  console.log('   • Visit http://localhost:3000/network to see network status');
  console.log('   • Check your database api_calls table for keeper_node_id');
  console.log('   • Start more keeper nodes to scale (on different ports)');
  console.log('   • Monitor keeper stats: curl http://localhost:3001/stats');
}

// Run the tests
runTests().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
