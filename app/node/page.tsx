"use client"

import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export default function NodeDashboard() {
  return (
    <section className="container mx-auto px-4 py-8 sm:py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Node Operator</h1>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "Status", v: "Healthy" },
          { k: "Uptime", v: "99.99%" },
          { k: "Stake", v: "12,000 USDC" },
          { k: "Reputation", v: "823 / 1000" },
        ].map((c) => (
          <Card key={c.k} className="p-4">
            <p className="text-sm text-muted-foreground">{c.k}</p>
            <p className="mt-1 text-2xl font-semibold">{c.v}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="status" className="mt-6">
        <TabsList>
          <TabsTrigger value="status">Node Status</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="reputation">Reputation</TabsTrigger>
          <TabsTrigger value="staking">Staking</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h3 className="font-medium">Node Info</h3>
              <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                <li>ID: node-8f2a</li>
                <li>Version: 1.3.2</li>
                <li>Location: FRA</li>
                <li>Supported APIs: WeatherPro, MapsXYZ</li>
              </ul>
            </Card>
            <Card className="p-4">
              <h3 className="font-medium">Health & Resources</h3>
              <img
                src="/placeholder.svg?height=220&width=640"
                alt="CPU memory network graphs"
                className="mt-3 rounded-md border"
              />
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="earnings" className="mt-4">
          <Card className="p-4">
            <h3 className="font-medium">Earnings Breakdown</h3>
            <img
              src="/placeholder.svg?height=220&width=640"
              alt="Earnings stacked chart"
              className="mt-3 rounded-md border"
            />
          </Card>
        </TabsContent>

        <TabsContent value="reputation" className="mt-4">
          <Card className="p-4">
            <h3 className="font-medium">Reputation Score</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Factors: uptime, response time, success rate, stake, time active
            </p>
            <img
              src="/placeholder.svg?height=220&width=640"
              alt="Reputation history graph"
              className="mt-3 rounded-md border"
            />
          </Card>
        </TabsContent>

        <TabsContent value="staking" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <h3 className="font-medium">Add Stake</h3>
              <img src="/placeholder.svg?height=180&width=480" alt="Stake form" className="mt-3 rounded-md border" />
            </Card>
            <Card className="p-4">
              <h3 className="font-medium">Withdraw Stake</h3>
              <img
                src="/placeholder.svg?height=180&width=480"
                alt="Withdraw stake form"
                className="mt-3 rounded-md border"
              />
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  )
}
