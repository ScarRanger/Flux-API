"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import {
  getAPIRegistryContract,
  registerAPIOnChain,
  getAPIFromChain,
  getAPICount,
  isContractDeployed,
  getContractInfo
} from "@/lib/api-registry-contract"
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FileCode,
  Network,
  Wallet,
  Package,
  ExternalLink
} from "lucide-react"

interface TestResult {
  name: string;
  status: "success" | "error" | "pending";
  message: string;
  details?: any;
}

export default function ContractTestPage() {
  const { user } = useAuth()
  
  const [contractInfo, setContractInfo] = useState<any>(null)
  const [isDeployed, setIsDeployed] = useState<boolean | null>(null)
  const [apiCount, setApiCount] = useState<number | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Test registration form
  const [testAPI, setTestAPI] = useState({
    name: "Test Weather API",
    description: "A test API for weather forecasting",
    pricePerCall: "0.0001",
    monthlyQuota: "1000"
  })
  
  const [registeredAPIId, setRegisteredAPIId] = useState<number | null>(null)
  const [registeredAPIData, setRegisteredAPIData] = useState<any>(null)

  useEffect(() => {
    loadContractInfo()
  }, [])

  const loadContractInfo = async () => {
    try {
      const info = getContractInfo()
      setContractInfo(info)
      
      const deployed = await isContractDeployed()
      setIsDeployed(deployed)
      
      if (deployed) {
        const count = await getAPICount()
        setApiCount(count)
      }
    } catch (error) {
      console.error('Error loading contract info:', error)
    }
  }

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result])
  }

  const clearTestResults = () => {
    setTestResults([])
  }

  // Test 1: Check contract deployment
  const testContractDeployment = async () => {
    addTestResult({
      name: "Contract Deployment Check",
      status: "pending",
      message: "Checking if contract is deployed..."
    })

    try {
      const deployed = await isContractDeployed()
      
      if (deployed) {
        addTestResult({
          name: "Contract Deployment Check",
          status: "success",
          message: "✅ Contract is deployed and accessible",
          details: { address: contractInfo?.address }
        })
      } else {
        addTestResult({
          name: "Contract Deployment Check",
          status: "error",
          message: "❌ Contract not deployed or address incorrect",
          details: { address: contractInfo?.address }
        })
      }
      
      setIsDeployed(deployed)
    } catch (error) {
      addTestResult({
        name: "Contract Deployment Check",
        status: "error",
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  }

  // Test 2: Read API count
  const testReadAPICount = async () => {
    addTestResult({
      name: "Read API Count",
      status: "pending",
      message: "Reading API count from contract..."
    })

    try {
      const count = await getAPICount()
      setApiCount(count)
      
      addTestResult({
        name: "Read API Count",
        status: "success",
        message: `✅ Successfully read API count: ${count}`,
        details: { count }
      })
    } catch (error) {
      addTestResult({
        name: "Read API Count",
        status: "error",
        message: `❌ Error: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  }

  // Test 3: Register API (requires wallet)
  const testRegisterAPI = async () => {
    if (!user) {
      addTestResult({
        name: "Register API",
        status: "error",
        message: "❌ User not authenticated. Please login first."
      })
      return
    }

    addTestResult({
      name: "Register API",
      status: "pending",
      message: "Registering API on blockchain..."
    })

    try {
      // Get user's wallet via API
      console.log('Fetching wallet for user:', user.uid)
      
      const walletResponse = await fetch('/api/wallet/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseUID: user.uid })
      })

      console.log('Wallet response status:', walletResponse.status)

      if (!walletResponse.ok) {
        const errorText = await walletResponse.text()
        console.error('Wallet fetch error:', errorText)
        let error
        try {
          error = JSON.parse(errorText)
        } catch {
          error = { error: errorText }
        }
        throw new Error(error.error || 'Failed to get wallet')
      }

      const walletData = await walletResponse.json()
      console.log('Wallet data received:', { address: walletData.address })
      
      const { privateKey, address } = walletData
      
      if (!privateKey) {
        throw new Error('No private key received from API')
      }
      
      // Create wallet instance from private key
      console.log('Creating wallet from private key...')
      const wallet = new ethers.Wallet(privateKey)
      console.log('Wallet created:', wallet.address)

      // Connect wallet to provider
      console.log('Connecting to provider...')
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL)
      const signer = wallet.connect(provider)
      console.log('Connected to provider')
      
      // Check balance
      console.log('Checking balance...')
      const balance = await provider.getBalance(wallet.address)
      const balanceEth = ethers.formatEther(balance)
      console.log('Balance:', balanceEth, 'ETH')
      
      if (Number(balanceEth) < 0.001) {
        addTestResult({
          name: "Register API",
          status: "error",
          message: `❌ Insufficient balance. You have ${balanceEth} ETH. Need at least 0.001 ETH for gas.`,
          details: { balance: balanceEth, address: wallet.address }
        })
        return
      }

      // Register API
      console.log('Registering API on blockchain...')
      const result = await registerAPIOnChain(
        signer,
        testAPI.name,
        testAPI.description,
        testAPI.pricePerCall,
        Number(testAPI.monthlyQuota)
      )
      
      console.log('Registration result:', result)
      setRegisteredAPIId(result.apiId)
      
      addTestResult({
        name: "Register API",
        status: "success",
        message: `✅ API registered successfully! API ID: ${result.apiId}`,
        details: {
          apiId: result.apiId,
          txHash: result.txHash,
          explorerUrl: `https://sepolia.etherscan.io/tx/${result.txHash}`
        }
      })
      
      // Refresh count
      await testReadAPICount()
      
    } catch (error: any) {
      console.error('Full error:', error)
      addTestResult({
        name: "Register API",
        status: "error",
        message: `❌ Error: ${error.message || String(error)}`,
        details: { 
          error: error.toString(),
          stack: error.stack 
        }
      })
    }
  }

  // Test 4: Read registered API
  const testReadAPI = async () => {
    if (!registeredAPIId) {
      addTestResult({
        name: "Read API",
        status: "error",
        message: "❌ No API registered yet. Register an API first."
      })
      return
    }

    addTestResult({
      name: "Read API",
      status: "pending",
      message: `Reading API #${registeredAPIId} from blockchain...`
    })

    try {
      const apiData = await getAPIFromChain(registeredAPIId)
      setRegisteredAPIData(apiData)
      
      addTestResult({
        name: "Read API",
        status: "success",
        message: `✅ Successfully read API #${registeredAPIId}`,
        details: {
          ...apiData,
          pricePerCall: ethers.formatEther(apiData.pricePerCall) + " ETH",
          monthlyQuota: apiData.monthlyQuota.toString()
        }
      })
    } catch (error) {
      addTestResult({
        name: "Read API",
        status: "error",
        message: `❌ Error: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  }

  // Run all tests
  const runAllTests = async () => {
    clearTestResults()
    setIsLoading(true)
    
    await testContractDeployment()
    await new Promise(resolve => setTimeout(resolve, 500))
    
    await testReadAPICount()
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3">Smart Contract Testing</h1>
          <p className="text-muted-foreground text-lg">
            Test APIRegistry smart contract functionality
          </p>
          <Badge variant="outline" className="mt-4">
            <Network className="w-3 h-3 mr-1" />
            Sepolia Testnet
          </Badge>
        </div>

        {/* Contract Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="w-5 h-5" />
              Contract Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Contract Address</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm bg-secondary px-2 py-1 rounded flex-1 truncate">
                    {contractInfo?.address || "Not configured"}
                  </code>
                  {contractInfo?.address && (
                    <a
                      href={`https://sepolia.etherscan.io/address/${contractInfo.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </a>
                  )}
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground">Deployment Status</Label>
                <div className="mt-1">
                  {isDeployed === null ? (
                    <Badge variant="outline">Unknown</Badge>
                  ) : isDeployed ? (
                    <Badge className="bg-green-500">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Deployed
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="w-3 h-3 mr-1" />
                      Not Deployed
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Total APIs Registered</Label>
                <p className="text-2xl font-bold mt-1">{apiCount !== null ? apiCount : "—"}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Available Functions</Label>
                <p className="text-sm mt-1">
                  {contractInfo?.functions?.length || 0} functions loaded
                </p>
              </div>
            </div>

            {!contractInfo?.address && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Setup Required</AlertTitle>
                <AlertDescription>
                  Add <code className="text-sm">NEXT_PUBLIC_API_REGISTRY_ADDRESS</code> to your .env.local file with your deployed contract address.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Test Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Quick Tests */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Tests (Read Only)</CardTitle>
              <CardDescription>These don't require transactions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={runAllTests}
                disabled={isLoading || !contractInfo?.address}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  "Run All Quick Tests"
                )}
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={testContractDeployment}
                  disabled={!contractInfo?.address}
                >
                  Check Deployment
                </Button>
                <Button
                  variant="outline"
                  onClick={testReadAPICount}
                  disabled={!isDeployed}
                >
                  Read Count
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Tests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Transaction Tests
              </CardTitle>
              <CardDescription>
                Requires wallet and ETH for gas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!user ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please <a href="/login" className="underline">login</a> to test transactions
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="apiName">Test API Name</Label>
                    <Input
                      id="apiName"
                      value={testAPI.name}
                      onChange={(e) => setTestAPI({ ...testAPI, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pricePerCall">Price Per Call (ETH)</Label>
                    <Input
                      id="pricePerCall"
                      type="number"
                      step="0.0001"
                      value={testAPI.pricePerCall}
                      onChange={(e) => setTestAPI({ ...testAPI, pricePerCall: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={testRegisterAPI}
                      disabled={!isDeployed}
                      variant="default"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Register API
                    </Button>
                    <Button
                      onClick={testReadAPI}
                      disabled={!registeredAPIId}
                      variant="outline"
                    >
                      Read API #{registeredAPIId || "?"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                {testResults.length} test{testResults.length !== 1 ? 's' : ''} executed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index}>
                  <div className="flex items-start gap-3">
                    {result.status === "success" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                    ) : result.status === "error" ? (
                      <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    ) : (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin mt-0.5" />
                    )}
                    
                    <div className="flex-1">
                      <p className="font-medium">{result.name}</p>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                      
                      {result.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            View Details
                          </summary>
                          <pre className="text-xs bg-secondary p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                  {index < testResults.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
              
              <Button
                variant="outline"
                onClick={clearTestResults}
                className="w-full mt-4"
              >
                Clear Results
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Registered API Details */}
        {registeredAPIData && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Last Registered API Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Name</dt>
                  <dd className="font-medium">{registeredAPIData.name}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Owner</dt>
                  <dd className="font-mono text-sm truncate">{registeredAPIData.owner}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Price Per Call</dt>
                  <dd className="font-medium">{ethers.formatEther(registeredAPIData.pricePerCall)} ETH</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Monthly Quota</dt>
                  <dd className="font-medium">{registeredAPIData.monthlyQuota.toString()}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-sm text-muted-foreground">Description</dt>
                  <dd className="text-sm">{registeredAPIData.description}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Status</dt>
                  <dd>
                    <Badge variant={registeredAPIData.active ? "default" : "secondary"}>
                      {registeredAPIData.active ? "Active" : "Inactive"}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
