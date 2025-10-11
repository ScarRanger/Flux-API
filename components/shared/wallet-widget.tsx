"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export function WalletWidget() {
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [network, setNetwork] = useState<string>("Ethereum")

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" aria-label="Wallet">
          {connected ? (
            <span className="flex items-center gap-2">
              <Badge variant="secondary">{network}</Badge>
              <span className="font-mono text-xs">
                {address?.slice(0, 6)}…{address?.slice(-4)}
              </span>
            </span>
          ) : (
            "Connect Wallet"
          )}
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Connect your wallet</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={network} onValueChange={setNetwork}>
            <SelectTrigger aria-label="Network">
              <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Ethereum">Ethereum</SelectItem>
              <SelectItem value="Polygon">Polygon</SelectItem>
              <SelectItem value="Arbitrum">Arbitrum</SelectItem>
              <SelectItem value="Base">Base</SelectItem>
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setConnected(true)
                setAddress("0xA1b2c3d4E5f6A7b8C9d0E1f2a3b4c5d6E7f8A9b0")
              }}
              aria-label="Connect MetaMask"
            >
              MetaMask
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setConnected(true)
                setAddress("0xF3e2d1c0B9a8f7e6D5c4B3a2f1E0d9c8B7a6F5e4")
              }}
              aria-label="Connect WalletConnect"
            >
              WalletConnect
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Wrong network? Use the network switcher above. Transactions include gas estimates before approval.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
