fetch('http://localhost:3000/api/gateway/call', {
  method: 'POST',
  headers: {
    'X-BNB-API-Key': 'bnb_dc739855131070573e81f52408a7b1170dee7fabf3c8734e1a1cbf32371c5762',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    method: 'GET',
    path: '/joke/Any'
  })
})
.then(res => res.json())
.then(data => {
  console.log('Response:', JSON.stringify(data, null, 2))
  if (data.success && data.data) {
    console.log('\n🎭 Joke:')
    if (data.data.type === 'single') {
      console.log(data.data.joke)
    } else {
      console.log(`${data.data.setup}\n${data.data.delivery}`)
    }
  }
})
.catch(err => {
  console.error('Error:', err.message)
})