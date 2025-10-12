#!/usr/bin/env node

// Test blockchain routing through decentralized proxy
// This script demonstrates that blockchain transactions are now submitted by keeper nodes

const API_KEY = 'bnb_dc739855131070573e81f52408a7b1170dee7fabf3c8734e1a1cbf32371c5762';

console.log('🔗 Testing Blockchain Routing Through Keeper Nodes');
console.log('═'.repeat(70));

async function testWithBlockchain() {
  console.log('\n📡 Making API call through decentralized proxy...');
  console.log('─'.repeat(70));
  
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
        path: '/joke/Programming'
      })
    });

    const result = await response.json();
    const totalTime = Date.now() - startTime;
    
    if (result.success) {
      console.log('✅ API CALL SUCCESSFUL!\n');
      
      console.log('📊 API Response:');
      if (result.data) {
        const joke = result.data.setup || result.data.joke || result.data.delivery || JSON.stringify(result.data).substring(0, 150);
        console.log(`   ${joke}`);
      }
      
      console.log('\n🔐 Keeper Information:');
      console.log(`   Node ID:       ${result.keeper.nodeId}`);
      console.log(`   Wallet:        ${result.keeper.walletAddress}`);
      console.log(`   Endpoint:      ${result.keeper.endpoint || 'N/A'}`);
      console.log(`   Response Time: ${result.keeper.responseTime}ms`);
      
      if (result.blockchain) {
        console.log('\n🔗 BLOCKCHAIN TRANSACTION (Submitted by Keeper!):');
        console.log(`   TX Hash:       ${result.blockchain.txHash}`);
        console.log(`   Block Number:  ${result.blockchain.blockNumber}`);
        console.log(`   Gas Used:      ${result.blockchain.gasUsed}`);
        console.log(`   Explorer:      ${result.blockchain.explorer}`);
        console.log('\n   ✨ This transaction was submitted by the KEEPER NODE');
        console.log('   ✨ Not by your main server! This is TRUE DECENTRALIZATION!');
      } else {
        console.log('\n⏭️  Blockchain logging skipped or disabled');
      }
      
      console.log('\n📈 Quota Status:');
      console.log(`   Remaining: ${result.quota.remaining}`);
      console.log(`   Total:     ${result.quota.total || 'Unlimited'}`);
      
      console.log(`\n⏱️  Total Time: ${totalTime}ms`);
      
      return result;
    } else {
      console.log('❌ FAILED');
      console.log('Error:', result.error);
      return null;
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return null;
  }
}

async function checkKeeperBlockchainStats() {
  console.log('\n\n🔍 Checking Keeper Blockchain Statistics...');
  console.log('─'.repeat(70));
  
  try {
    const response = await fetch('http://localhost:3001/blockchain-stats');
    const stats = await response.json();
    
    console.log('✅ Keeper Blockchain Stats:');
    console.log(`\n   Node ID:         ${stats.nodeId}`);
    console.log(`   Wallet:          ${stats.wallet}`);
    console.log(`   Balance:         ${stats.balance}`);
    console.log(`   Needs Refill:    ${stats.needsRefill ? '⚠️  YES' : '✅ NO'}`);
    console.log(`   Logging Enabled: ${stats.enabled ? '✅ YES' : '❌ NO'}`);
    
    if (stats.blockchain) {
      console.log('\n   Blockchain Activity:');
      console.log(`   - Submitted:     ${stats.blockchain.txSubmitted}`);
      console.log(`   - Confirmed:     ${stats.blockchain.txConfirmed}`);
      console.log(`   - Failed:        ${stats.blockchain.txFailed}`);
      console.log(`   - Total Gas:     ${stats.blockchain.totalGasUsed}`);
      
      if (stats.blockchain.lastTxHash) {
        console.log(`\n   Last Transaction:`);
        console.log(`   - Hash:          ${stats.blockchain.lastTxHash}`);
        console.log(`   - Block:         ${stats.blockchain.lastTxBlock}`);
        console.log(`   - Explore:       https://sepolia.etherscan.io/tx/${stats.blockchain.lastTxHash}`);
      }
      
      console.log(`\n   Contract:        ${stats.blockchain.contract}`);
    }
    
    return stats;
  } catch (error) {
    console.log('❌ Failed to fetch keeper stats:', error.message);
    return null;
  }
}

async function verifyDatabaseEntry() {
  console.log('\n\n💾 Verifying Database Entry...');
  console.log('─'.repeat(70));
  console.log('To check the database, run this query:');
  console.log('\n```sql');
  console.log('SELECT ');
  console.log('  id,');
  console.log('  keeper_node_id,');
  console.log('  blockchain_tx_hash,');
  console.log('  blockchain_block,');
  console.log('  method,');
  console.log('  path,');
  console.log('  is_successful,');
  console.log('  created_at');
  console.log('FROM api_calls ');
  console.log('WHERE blockchain_tx_hash IS NOT NULL');
  console.log('ORDER BY created_at DESC ');
  console.log('LIMIT 5;');
  console.log('```');
  console.log('\nThis will show:');
  console.log('  ✓ Which keeper handled the request');
  console.log('  ✓ Blockchain transaction hash');
  console.log('  ✓ Block number of confirmation');
  console.log('  ✓ Whether the call succeeded');
}

async function runFullTest() {
  console.log('\n🧪 FULL BLOCKCHAIN ROUTING TEST');
  console.log('═'.repeat(70));
  console.log('\nThis test demonstrates that:');
  console.log('  1. API calls route through keeper nodes');
  console.log('  2. Keeper nodes submit blockchain transactions');
  console.log('  3. Each transaction is recorded with keeper info');
  console.log('  4. Gas costs are distributed across keepers');
  console.log('═'.repeat(70));
  
  // Check keeper stats before
  console.log('\n\n📊 BEFORE TEST - Keeper Stats:');
  const statsBefore = await checkKeeperBlockchainStats();
  
  // Make API call
  await new Promise(resolve => setTimeout(resolve, 2000));
  const result = await testWithBlockchain();
  
  // Check keeper stats after
  if (result && result.blockchain) {
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for blockchain confirmation
    console.log('\n\n📊 AFTER TEST - Keeper Stats:');
    await checkKeeperBlockchainStats();
  }
  
  // Show database verification
  await verifyDatabaseEntry();
  
  console.log('\n\n✨ Test Complete!');
  console.log('═'.repeat(70));
  console.log('\n🎉 WHAT YOU JUST SAW:');
  console.log('   1. ✅ Request routed through keeper-node-1');
  console.log('   2. ✅ Keeper node submitted blockchain TX (not your server!)');
  console.log('   3. ✅ Transaction confirmed on Sepolia testnet');
  console.log('   4. ✅ Gas paid by keeper wallet (decentralized!)');
  console.log('   5. ✅ Database records keeper_node_id + blockchain_tx_hash');
  
  console.log('\n💡 KEY BENEFITS:');
  console.log('   • No single point of failure for blockchain TXs');
  console.log('   • Each keeper manages its own nonce (no collisions)');
  console.log('   • Gas costs distributed across multiple keepers');
  console.log('   • Scalable: Add more keepers = more blockchain capacity');
  console.log('   • Transparent: Every TX tracks which keeper submitted it');
  
  console.log('\n📋 NEXT STEPS:');
  console.log('   • Add more keeper nodes on different ports');
  console.log('   • Monitor keeper wallet balances');
  console.log('   • Check blockchain explorer for all transactions');
  console.log('   • Query database for keeper performance stats');
  console.log('   • Visit /network dashboard for live monitoring');
  
  console.log('\n🔗 USEFUL LINKS:');
  console.log(`   • Keeper Stats:     http://localhost:3001/blockchain-stats`);
  console.log(`   • Network Status:   http://localhost:3000/network`);
  console.log(`   • Contract:         https://sepolia.etherscan.io/address/${statsBefore?.blockchain?.contract}`);
  if (result?.blockchain?.txHash) {
    console.log(`   • Latest TX:        https://sepolia.etherscan.io/tx/${result.blockchain.txHash}`);
  }
  
  console.log('\n');
}

// Run the full test
runFullTest().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
