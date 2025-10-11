"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"

function Timeline({ steps }: { steps: { t: string; d: string }[] }) {
  return (
    <ol className="mt-4 grid gap-4 md:grid-cols-3">
      {steps.map((s, idx) => (
        <li key={idx} className="rounded-md border p-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              {idx + 1}
            </span>
            <h4 className="font-medium">{s.t}</h4>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
        </li>
      ))}
    </ol>
  )
}

export function HowItWorks() {
  return (
    <Tabs defaultValue="seller" className="mt-4">
      <TabsList aria-label="Select journey">
        <TabsTrigger value="seller">Seller</TabsTrigger>
        <TabsTrigger value="buyer">Buyer</TabsTrigger>
        <TabsTrigger value="node">Node</TabsTrigger>
      </TabsList>
      <TabsContent value="seller" className="mt-4">
        <Card className="p-6">
          <Timeline
            steps={[
              { t: "Connect & Verify", d: "Connect wallet, verify API key ownership via signed challenge." },
              { t: "Configure & Price", d: "Quota, rate limits, geo rules, bulk discounts with market comparison." },
              { t: "List & Earn", d: "Proxy routes calls; earnings settle on-chain with gas estimates upfront." },
            ]}
          />
        </Card>
      </TabsContent>
      <TabsContent value="buyer" className="mt-4">
        <Card className="p-6">
          <Timeline
            steps={[
              { t: "Browse & Compare", d: "Filter by price, reputation, response time, and location." },
              { t: "Purchase & Configure", d: "Select package, pay with token, get proxy key & webhooks." },
              { t: "Monitor & Optimize", d: "Track usage, set alerts, enable auto-renew based on targets." },
            ]}
          />
        </Card>
      </TabsContent>
      <TabsContent value="node" className="mt-4">
        <Card className="p-6">
          <Timeline
            steps={[
              { t: "Stake & Register", d: "Add stake, advertise supported APIs and region." },
              { t: "Route & Prove", d: "Handle requests with SLAs; health checks and proofs boost reputation." },
              { t: "Claim Rewards", d: "Fees and bonuses accrue; auto-claim options with cooldown awareness." },
            ]}
          />
        </Card>
      </TabsContent>
    </Tabs>
  )
}
