// Test API Gateway - Gemini API
async function testGateway() {
  console.log('Testing API Gateway with Gemini API...\n')
  
  try {
    const response = await fetch('http://localhost:3000/api/gateway/call', {
      method: 'POST',
      headers: {
        'X-BNB-API-Key': 'bnb_78488994d9575d0ca9a22af8752d2c6c4f11f60dd7a5f9aa43902dc3e8a6683f',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'POST',
        path: '',
        body: {
          contents: [{
            parts: [{
              text: 'Write a haiku about APIs'
            }]
          }]
        }
      })
    })

    console.log('Status:', response.status, response.statusText)
    console.log('Headers:', Object.fromEntries(response.headers.entries()))
    
    const data = await response.json()
    console.log('\nResponse:', JSON.stringify(data, null, 2))
    
    if (data.error) {
      console.error('\n❌ Error:', data.error)
      if (data.message) {
        console.error('Message:', data.message)
      }
    } else if (data.success) {
      console.log('\n✅ Success!')
      if (data.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log('\n📝 Gemini Response:')
        console.log(data.data.candidates[0].content.parts[0].text)
      }
      if (data.meta) {
        console.log('\n📊 Usage Stats:')
        console.log('Remaining Quota:', data.meta.remainingQuota)
        console.log('Used Quota:', data.meta.usedQuota)
        console.log('Total Quota:', data.meta.totalQuota)
        console.log('Latency:', data.meta.latencyMs + 'ms')
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Run the test
testGateway()