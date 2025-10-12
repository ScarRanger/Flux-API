/**
 * Test Script: Make calls to non-existent endpoint
 * 
 * This script tests the API gateway by calling a blank/non-existent endpoint
 * to verify error handling, usage tracking, and response behavior.
 */

const API_KEY = 'bnb_6bb55fa10a2b3d8047d41c5b2530a2f8db0fbcbe926b5e0e5d2e3280c776166b'
const GATEWAY_URL = 'http://localhost:3000/api/gateway/call'

// Test different scenarios
const testCases = [
    {
        name: 'GET to non-existent endpoint',
        method: 'GET',
        path: '/api/v1/nonexistent'
    },
    {
        name: 'POST to blank endpoint',
        method: 'POST',
        path: '/blank',
        data: { test: 'data' }
    },
    {
        name: 'GET with query params',
        method: 'GET',
        path: '/fake/endpoint?param=value'
    },
    {
        name: 'Invalid path',
        method: 'GET',
        path: ''
    },
    {
        name: 'Deep nested path',
        method: 'GET',
        path: '/api/v2/users/123/posts/456/comments'
    }
]

async function makeTestCall(testCase, index) {
    console.log(`\n[${index + 1}/${testCases.length}] 🧪 Testing: ${testCase.name}`)
    console.log(`   Method: ${testCase.method}`)
    console.log(`   Path: ${testCase.path || '(empty)'}`)

    try {
        const requestBody = {
            method: testCase.method,
            path: testCase.path
        }

        if (testCase.data) {
            requestBody.data = testCase.data
        }

        const startTime = Date.now()

        const response = await fetch(GATEWAY_URL, {
            method: 'POST',
            headers: {
                'X-BNB-API-Key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })

        const endTime = Date.now()
        const duration = endTime - startTime

        const responseData = await response.json()

        console.log(`   Status: ${response.status} ${response.statusText}`)
        console.log(`   Duration: ${duration}ms`)
        console.log(`   Response:`, JSON.stringify(responseData, null, 2))

        if (response.ok) {
            console.log('   ✅ Request completed')
        } else {
            console.log('   ⚠️  Request failed (expected for non-existent endpoints)')
        }

    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`)
    }
}

async function runTests() {
    console.log('\n' + '='.repeat(60))
    console.log('🚀 API Gateway Test - Non-Existent Endpoint Calls')
    console.log('='.repeat(60))
    console.log(`\n📍 Gateway URL: ${GATEWAY_URL}`)
    console.log(`🔑 API Key: ${API_KEY.substring(0, 20)}...`)
    console.log(`\n📊 Running ${testCases.length} test cases...`)

    for (let i = 0; i < testCases.length; i++) {
        await makeTestCall(testCases[i], i)

        // Small delay between requests
        if (i < testCases.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500))
        }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ All tests completed!')
    console.log('='.repeat(60))
    console.log('\n💡 Note: These endpoints don\'t exist, so errors are expected.')
    console.log('   Check that usage is still tracked and responses are properly formatted.\n')
}

// Run the tests
runTests().catch(error => {
    console.error('\n❌ Test suite failed:', error)
    process.exit(1)
})