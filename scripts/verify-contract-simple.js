/**
 * Simple Contract Verification
 * Verifies the Keeper Staking contract is deployed and accessible
 */

const { ethers } = require('ethers')
const path = require('path')
const fs = require('fs')

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const envVars = {}

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=# ]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    envVars[key] = value
  }
})

async function verifyContract() {
  console.log('\n🔍 Verifying Keeper Staking Contract')
  console.log('═══════════════════════════════════════════════════════\n')

  const contractAddress = envVars.KEEPER_STAKING_CONTRACT_ADDRESS

  if (!contractAddress) {
    console.error('❌ KEEPER_STAKING_CONTRACT_ADDRESS not found in .env.local')
    process.exit(1)
  }

  console.log('📝 Contract Address:', contractAddress)
  console.log('🌐 Network: Sepolia Testnet')
  console.log('🔗 View on Etherscan:')
  console.log(`   https://sepolia.etherscan.io/address/${contractAddress}\n`)

  try {
    const rpcUrl = envVars.RPC_URL || envVars.NEXT_PUBLIC_RPC_URL
    if (!rpcUrl) {
      console.error('❌ RPC_URL not found in .env.local')
      process.exit(1)
    }

    console.log('🔗 Connecting to Sepolia...')
    const provider = new ethers.JsonRpcProvider(rpcUrl)

    // Check if contract exists
    const code = await provider.getCode(contractAddress)
    if (code === '0x') {
      console.error('❌ No contract found at this address!')
      process.exit(1)
    }

    const codeSize = (code.length - 2) / 2 // Remove '0x' and calculate bytes
    console.log('✅ Contract deployed successfully')
    console.log(`   Contract size: ${codeSize} bytes\n`)

    // Save deployment info
    const deploymentInfo = {
      network: 'sepolia',
      contractAddress: contractAddress,
      verifiedAt: new Date().toISOString(),
      contractSize: codeSize,
      etherscanUrl: `https://sepolia.etherscan.io/address/${contractAddress}`,
      status: 'deployed'
    }

    const deploymentPath = path.join(__dirname, '..', 'smart_contracts', 'keeper-deployment.json')
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2))
    console.log('✅ Saved deployment info to:')
    console.log('   smart_contracts/keeper-deployment.json\n')

    console.log('═══════════════════════════════════════════════════════')
    console.log('✅ Contract Verification Complete!\n')

    console.log('📋 Next Steps:')
    console.log('───────────────────────────────────────────────────────')
    console.log('1. ✅ Contract deployed at:', contractAddress.substring(0, 10) + '...')
    console.log('2. ✅ Contract address saved in .env.local')
    console.log()
    console.log('3. Initialize database tables:')
    console.log('   node scripts/create-keeper-staking-tables.js')
    console.log()
    console.log('4. Register keeper nodes (example):')
    console.log('   node scripts/register-keeper-node.js \\')
    console.log('     0x1234567890123456789012345678901234567890 \\')
    console.log('     user_firebase_uid \\')
    console.log('     0.5')
    console.log()
    console.log('5. Monitor keeper nodes:')
    console.log('   node scripts/monitor-keeper-nodes.js')
    console.log()
    console.log('6. View in browser:')
    console.log('   http://localhost:3000/keeper/dashboard')
    console.log()

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message)
    process.exit(1)
  }
}

verifyContract()
