"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EscrowManager } from "@/components/shared/escrow-manager"
import { Wallet, Shield } from "lucide-react"

// Extend window type for ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}

export function WalletWidget() {
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [network, setNetwork] = useState<string>("Sepolia")
  const [balance, setBalance] = useState<string>("0")
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)

  useEffect(() => {
    if (connected && address && provider) {
      loadBalance()
    }
  }, [connected, address, provider])

  const loadBalance = async () => {
    if (!provider || !address) return
    
    try {
      const balanceWei = await provider.getBalance(address)
      const balanceEth = ethers.formatEther(balanceWei)
      setBalance(parseFloat(balanceEth).toFixed(4))
    } catch (error) {
      console.error('Error loading balance:', error)
    }
  }

  const connectWallet = async (walletType: string) => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const browserProvider = new ethers.BrowserProvider(window.ethereum)
        await browserProvider.send("eth_requestAccounts", [])
        
        const walletSigner = await browserProvider.getSigner()
        const walletAddress = await walletSigner.getAddress()
        
        setProvider(browserProvider)
        setSigner(walletSigner)
        setConnected(true)
        setAddress(walletAddress)
        
        // Switch to Sepolia network
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // Sepolia testnet
          })
        } catch (switchError: any) {
          // If network doesn't exist, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xaa36a7',
                chainName: 'Sepolia Test Network',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io/'],
              }],
            })
          }
        }
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
    }
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" aria-label="Wallet">
          {connected ? (
            <span className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <Badge variant="secondary">{network}</Badge>
              <span className="font-mono text-xs">
                {address?.slice(0, 6)}…{address?.slice(-4)}
              </span>
              <span className="text-xs">{balance} ETH</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Wallet & Escrow Manager</DialogTitle>
        </DialogHeader>
        
        {!connected ? (
          <div className="space-y-4">
            <Select value={network} onValueChange={setNetwork}>
              <SelectTrigger aria-label="Network">
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sepolia">Sepolia Testnet</SelectItem>
                <SelectItem value="Ethereum">Ethereum Mainnet</SelectItem>
                <SelectItem value="Polygon">Polygon</SelectItem>
                <SelectItem value="Arbitrum">Arbitrum</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                onClick={() => connectWallet("MetaMask")}
                aria-label="Connect MetaMask"
              >
                MetaMask
              </Button>
              <Button
                variant="secondary"
                onClick={() => connectWallet("WalletConnect")}
                aria-label="Connect WalletConnect"
              >
                WalletConnect
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This application uses Sepolia testnet. Make sure you have Sepolia ETH for transactions.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Wallet Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Wallet Overview
                </CardTitle>
                <CardDescription>
                  Connected to {network} • {address?.slice(0, 6)}...{address?.slice(-4)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Wallet className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Wallet Balance</span>
                    </div>
                    <p className="text-2xl font-bold">{balance} ETH</p>
                    <p className="text-xs text-muted-foreground">Available for transactions</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Network</span>
                    </div>
                    <p className="text-2xl font-bold">{network}</p>
                    <p className="text-xs text-muted-foreground">Current network</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs for Wallet and Escrow */}
            <Tabs defaultValue="escrow" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="escrow" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Escrow Stakes
                </TabsTrigger>
                <TabsTrigger value="transactions" className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Transactions
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="escrow">
                <EscrowManager 
                  userAddress={address || undefined}
                  provider={provider || undefined}
                  signer={signer || undefined}
                />
              </TabsContent>
              
              <TabsContent value="transactions">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>
                      Your recent blockchain transactions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Transaction history coming soon</p>
                      <p className="text-sm">View your transactions on Etherscan</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setConnected(false)
                setAddress(null)
                setProvider(null)
                setSigner(null)
                setBalance("0")
              }}>
                Disconnect
              </Button>
              <Button variant="outline" onClick={loadBalance}>
                Refresh Balance
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
