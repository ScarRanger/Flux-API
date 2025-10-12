/**
 * Verify Keeper Staking Contract Deployment
 * 
 * This script verifies that the deployed contract is working correctly
 * and saves deployment information.
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
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    envVars[key] = value
  }
})

const KEEPER_STAKING_ABI = [
  "function MIN_STAKE() external view returns (uint256)",
  "function UNSTAKE_LOCK_PERIOD() external view returns (uint256)",
  "function CHALLENGE_PERIOD() external view returns (uint256)",
  "function owner() external view returns (address)",
  "function getActiveNodes() external view returns (address[] memory)",
  "function getNodeInfo(address nodeAddress) external view returns (tuple(address nodeAddress, address owner, uint256 stakedAmount, uint256 reputationScore, bool isActive, bool isSuspended, uint256 totalTasksCompleted, uint256 totalTasksFailed, uint256 slashCount, uint256 registrationTime, uint256 lastActivityTime, uint256 unstakeRequestTime))"
]

async function verifyContract() {
  console.log('🔍 Verifying Keeper Staking Contract Deployment\n')
  console.log('═════════════════════════════════════════════════════\n')

  const contractAddress = envVars.KEEPER_STAKING_CONTRACT_ADDRESS

  if (!contractAddress) {
    console.error('❌ KEEPER_STAKING_CONTRACT_ADDRESS not found in .env.local')
    process.exit(1)
  }

  console.log('📝 Contract Address:', contractAddress)
  console.log('🌐 Network: Sepolia Testnet')
  console.log('🔗 Etherscan:', `https://sepolia.etherscan.io/address/${contractAddress}\n`)

  try {
    // Connect to provider
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
      console.log('Make sure the contract is deployed to Sepolia.')
      process.exit(1)
    }

    console.log('✅ Contract code found\n')

    // Create contract instance
    const contract = new ethers.Contract(contractAddress, KEEPER_STAKING_ABI, provider)

    // Verify contract constants
    console.log('📊 Contract Configuration:')
    console.log('─────────────────────────────────────────────────────')
    
    const minStake = await contract.MIN_STAKE()
    console.log('Minimum Stake:', ethers.formatEther(minStake), 'ETH')

    const unstakePeriod = await contract.UNSTAKE_LOCK_PERIOD()
    console.log('Unstake Lock Period:', (Number(unstakePeriod) / 86400).toFixed(0), 'days')

    const challengePeriod = await contract.CHALLENGE_PERIOD()
    console.log('Challenge Period:', (Number(challengePeriod) / 3600).toFixed(0), 'hours')

    const owner = await contract.owner()
    console.log('Contract Owner:', owner)

    console.log()

    // Check active nodes
    console.log('📋 Active Keeper Nodes:')
    console.log('─────────────────────────────────────────────────────')
    
    const activeNodes = await contract.getActiveNodes()
    console.log('Total Active Nodes:', activeNodes.length)

    if (activeNodes.length > 0) {
      console.log('\nNode Details:')
      for (let i = 0; i < activeNodes.length; i++) {
        const nodeAddress = activeNodes[i]
        const nodeInfo = await contract.getNodeInfo(nodeAddress)
        
        console.log(`\n${i + 1}. ${nodeAddress}`)
        console.log('   Owner:', nodeInfo.owner)
        console.log('   Stake:', ethers.formatEther(nodeInfo.stakedAmount), 'ETH')
        console.log('   Reputation:', nodeInfo.reputationScore.toString())
        console.log('   Active:', nodeInfo.isActive)
        console.log('   Suspended:', nodeInfo.isSuspended)
        console.log('   Tasks Completed:', nodeInfo.totalTasksCompleted.toString())
        console.log('   Tasks Failed:', nodeInfo.totalTasksFailed.toString())
        console.log('   Slash Count:', nodeInfo.slashCount.toString())
        console.log('   Registered:', new Date(Number(nodeInfo.registrationTime) * 1000).toLocaleString())
      }
    } else {
      console.log('No keeper nodes registered yet.')
      console.log('\nTo register a node, use:')
      console.log('  node scripts/register-keeper-node.js <nodeAddress> <ownerUid> <stakeAmount>')
    }

    console.log()

    // Save deployment info
    const deploymentInfo = {
      network: 'sepolia',
      contractAddress,
      verifiedAt: new Date().toISOString(),
      minStake: ethers.formatEther(minStake),
      unstakeLockPeriod: Number(unstakePeriod),
      challengePeriod: Number(challengePeriod),
      contractOwner: owner,
      activeNodesCount: activeNodes.length,
      etherscanUrl: `https://sepolia.etherscan.io/address/${contractAddress}`
    }

    const deploymentPath = path.join(__dirname, '..', 'smart_contracts', 'keeper-deployment.json')
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2))
    console.log('✅ Saved deployment info to smart_contracts/keeper-deployment.json\n')

    console.log('═════════════════════════════════════════════════════')
    console.log('✅ Contract verification complete!\n')

    console.log('📋 Next Steps:')
    console.log('─────────────────────────────────────────────────────')
    console.log('1. ✅ Contract deployed and verified')
    console.log('2. ✅ .env.local updated with contract address')
    console.log('3. 🔄 Initialize database tables (if not done):')
    console.log('     node scripts/create-keeper-staking-tables.js')
    console.log('4. 📝 Register keeper nodes:')
    console.log('     node scripts/register-keeper-node.js <address> <uid> <stake>')
    console.log('5. 📊 Monitor keeper nodes:')
    console.log('     node scripts/monitor-keeper-nodes.js')
    console.log('6. 🌐 Access keeper dashboard:')
    console.log('     http://localhost:3000/keeper/dashboard')
    console.log()

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message)
    
    if (error.code === 'NETWORK_ERROR') {
      console.log('\n💡 Check your RPC_URL in .env.local')
    } else if (error.code === 'INVALID_ARGUMENT') {
      console.log('\n💡 The contract address may be invalid')
    }
    
    process.exit(1)
  }
}

verifyContract()
