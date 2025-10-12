import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

/**
 * API Verification Endpoint
 * POST /api/api-registry/verify-api
 * 
 * Verifies that the provided API credentials are valid by making a test call
 */
export async function POST(req: NextRequest) {
    console.log('\n🔍 [API VERIFICATION] New verification request')

    try {
        const body = await req.json()
        const {
            baseEndpoint,
            authType,
            authParamName,
            apiKey,
            testPath = '/' // Optional: specific test endpoint
        } = body

        // Validate inputs
        if (!baseEndpoint || !authType || !authParamName || !apiKey) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Missing required fields for verification"
                },
                { status: 400 }
            )
        }

        console.log(`   Testing API: ${baseEndpoint}${testPath}`)
        console.log(`   Auth Type: ${authType}`)
        console.log(`   Auth Param: ${authParamName}`)

        // Construct the test request based on auth type
        let testUrl = baseEndpoint
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'BnB-Marketplace-Verifier/1.0'
        }
        const params: Record<string, string> = {}

        // Configure auth based on type
        switch (authType) {
            case 'header-key':
                headers[authParamName] = apiKey
                break

            case 'query-param':
                params[authParamName] = apiKey
                break

            case 'oauth2':
                // For OAuth2, assume Bearer token
                headers[authParamName] = `Bearer ${apiKey}`
                break

            default:
                return NextResponse.json(
                    {
                        success: false,
                        error: `Unsupported auth type: ${authType}`
                    },
                    { status: 400 }
                )
        }

        // Append test path if provided
        if (testPath && testPath !== '/') {
            testUrl = testUrl.endsWith('/') ? testUrl + testPath.slice(1) : testUrl + testPath
        }

        // Determine HTTP method based on endpoint
        let method = 'GET'
        let requestBody = null
        
        // Special handling for known APIs that require POST
        if (testUrl.includes('generativelanguage.googleapis.com') && testUrl.includes('generateContent')) {
            method = 'POST'
            requestBody = {
                contents: [{
                    parts: [{
                        text: "Test verification call"
                    }]
                }]
            }
            console.log(`   🔧 Detected Gemini API - using POST with test prompt`)
        } else if (testUrl.includes('openai.com/v1/chat/completions')) {
            method = 'POST'
            requestBody = {
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: "test" }],
                max_tokens: 5
            }
            console.log(`   🔧 Detected OpenAI API - using POST with test message`)
        }

        console.log(`   🌐 Making ${method} request to: ${testUrl}`)

        // Make the test API call
        const startTime = Date.now()
        let response
        let responseData
        let statusCode
        let errorDetails = null

        try {
            response = await axios({
                method: method,
                url: testUrl,
                headers: headers,
                params: params,
                data: requestBody,
                timeout: 30000, // 30 second timeout (increased for AI APIs)
                validateStatus: () => true // Don't throw on any status
            })

            statusCode = response.status
            responseData = response.data
            const responseTime = Date.now() - startTime

            console.log(`   📊 Response Status: ${statusCode}`)
            console.log(`   ⏱️  Response Time: ${responseTime}ms`)

            // Check if response indicates success
            const isSuccess = statusCode >= 200 && statusCode < 300
            const isUnauthorized = statusCode === 401 || statusCode === 403
            const isNotFound = statusCode === 404

            // Determine verification result
            if (isSuccess) {
                console.log(`   ✅ API verification SUCCESSFUL`)

                return NextResponse.json({
                    success: true,
                    verified: true,
                    message: "API credentials are valid and working",
                    details: {
                        statusCode,
                        responseTime,
                        endpoint: testUrl,
                        authType,
                        responsePreview: JSON.stringify(responseData).substring(0, 200)
                    }
                })
            } else if (isUnauthorized) {
                console.log(`   ❌ API verification FAILED - Invalid credentials`)

                return NextResponse.json({
                    success: false,
                    verified: false,
                    error: "Authentication failed - Invalid API key or credentials",
                    details: {
                        statusCode,
                        responseTime,
                        endpoint: testUrl,
                        hint: "Please check that your API key is correct and has the necessary permissions"
                    }
                }, { status: 401 })
            } else if (isNotFound) {
                console.log(`   ⚠️  API verification - Endpoint not found`)
                
                // Provide specific hints
                let hint = "Please verify the base endpoint URL is correct."
                
                if (testUrl.includes('generativelanguage.googleapis.com')) {
                    hint = "For Google Gemini API: Use 'query-param' auth type with parameter name 'key'. The full endpoint should be like: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
                } else if (testUrl.includes('openai.com')) {
                    hint = "For OpenAI API: Use 'header-key' auth with 'Authorization' and value 'Bearer YOUR_API_KEY'"
                }

                return NextResponse.json({
                    success: false,
                    verified: false,
                    error: "API endpoint not found (404)",
                    details: {
                        statusCode,
                        responseTime,
                        endpoint: testUrl,
                        hint: hint
                    }
                }, { status: 404 })
            } else {
                console.log(`   ⚠️  API verification - Unexpected status: ${statusCode}`)
                
                // For some APIs, certain status codes are expected (e.g., 400 with error message but valid auth)
                let hint = "The API responded but with an unexpected status. This might still be valid depending on your API's behavior."
                
                if (statusCode === 400 && responseData) {
                    // Check if it's a valid error response (means auth worked)
                    const responseText = JSON.stringify(responseData)
                    if (responseText.includes('error') || responseText.includes('message')) {
                        console.log(`   ℹ️  Got structured error response - API is reachable and auth may be valid`)
                        hint = "API returned 400 but with a structured error response. This often means authentication worked but the test request was invalid. You can proceed with registration."
                    }
                }

                return NextResponse.json({
                    success: false,
                    verified: false,
                    error: `API returned status code ${statusCode}`,
                    details: {
                        statusCode,
                        responseTime,
                        endpoint: testUrl,
                        responsePreview: JSON.stringify(responseData).substring(0, 200),
                        hint: hint
                    }
                }, { status: 400 })
            }

        } catch (error: any) {
            const responseTime = Date.now() - startTime

            console.error(`   ❌ API verification ERROR:`, error.message)

            // Network or timeout errors
            if (error.code === 'ECONNREFUSED') {
                return NextResponse.json({
                    success: false,
                    verified: false,
                    error: "Connection refused - API endpoint is not reachable",
                    details: {
                        endpoint: testUrl,
                        responseTime,
                        hint: "Please verify the endpoint URL is correct and the API server is running"
                    }
                }, { status: 503 })
            } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
                return NextResponse.json({
                    success: false,
                    verified: false,
                    error: "Request timeout - API took too long to respond",
                    details: {
                        endpoint: testUrl,
                        responseTime,
                        hint: "The API might be slow or unresponsive. Try again later."
                    }
                }, { status: 504 })
            } else if (error.code === 'ENOTFOUND') {
                return NextResponse.json({
                    success: false,
                    verified: false,
                    error: "Domain not found - Invalid endpoint URL",
                    details: {
                        endpoint: testUrl,
                        hint: "Please check that the endpoint URL is correct and the domain exists"
                    }
                }, { status: 400 })
            } else {
                return NextResponse.json({
                    success: false,
                    verified: false,
                    error: `Verification failed: ${error.message}`,
                    details: {
                        endpoint: testUrl,
                        responseTime,
                        errorCode: error.code
                    }
                }, { status: 500 })
            }
        }

    } catch (error: any) {
        console.error("\n❌ [API VERIFICATION] Error:", error.message)
        return NextResponse.json(
            {
                success: false,
                verified: false,
                error: error.message || "Failed to verify API"
            },
            { status: 500 }
        )
    }
}
