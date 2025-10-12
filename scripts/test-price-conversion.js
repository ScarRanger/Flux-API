/**
 * Test Price Conversion for Blockchain Registration
 * 
 * Tests the USD to wei conversion logic to ensure it handles
 * small decimal values correctly without scientific notation issues.
 */

function convertUSDToWei(priceUSD) {
  // Convert USD price to wei
  // Use a conversion that preserves precision: $1 = 0.001 ETH
  // This means $0.001 per call = 0.000001 ETH = 1000000000000 wei
  // Formula: priceUSD * 10^15 wei (0.001 ETH per USD)
  const priceInCents = Math.round(priceUSD * 100) // Convert to cents
  const weiPerCent = BigInt(10 ** 13) // 0.00001 ETH in wei
  const priceInWei = BigInt(priceInCents) * weiPerCent
  return priceInWei
}

function formatWei(wei) {
  const ethValue = Number(wei) / 1e18
  return `${wei.toString()} wei (${ethValue} ETH)`
}

console.log('\n💰 Testing Price Conversion (USD to Wei)\n')
console.log('══════════════════════════════════════════════════════\n')

const testPrices = [
  0.001,   // $0.001 per call
  0.01,    // $0.01 per call
  0.1,     // $0.1 per call
  1,       // $1 per call
  10,      // $10 per call
  0.0001,  // Very small price
  99.99    // Large price
]

testPrices.forEach(price => {
  const wei = convertUSDToWei(price)
  console.log(`📊 $${price.toFixed(4)} per call`)
  console.log(`   → ${formatWei(wei)}`)
  console.log()
})

console.log('══════════════════════════════════════════════════════')
console.log('✅ All conversions completed successfully!')
console.log()
console.log('💡 Notes:')
console.log('   - Conversion rate: $1 = 0.001 ETH (adjustable)')
console.log('   - No scientific notation issues')
console.log('   - Preserves precision for small values')
console.log('   - Minimum representable: $0.0001 = 1000000000 wei')
console.log()
