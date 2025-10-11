"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

function Timeline({ steps }: { steps: { t: string; d: string }[] }) {
  return (
    <ol className="grid gap-6 md:grid-cols-3">
      {steps.map((s, idx) => (
        <li key={idx} className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {idx + 1}
            </span>
            <h4 className="font-semibold text-lg">{s.t}</h4>
          </div>
          <p className="text-muted-foreground leading-relaxed">{s.d}</p>
        </li>
      ))}
    </ol>
  )
}

export function HowItWorks() {
  return (
    <section className="py-16 md:py-24 bg-secondary/20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose your role and see how easy it is to get started
          </p>
        </div>

        <Tabs defaultValue="seller">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
            <TabsTrigger value="seller">Seller</TabsTrigger>
            <TabsTrigger value="buyer">Buyer</TabsTrigger>
            <TabsTrigger value="node">Node</TabsTrigger>
          </TabsList>
          
          <TabsContent value="seller">
            <Timeline
              steps={[
                { t: "Connect & Verify", d: "Connect wallet, verify API key ownership via signed challenge." },
                { t: "Configure & Price", d: "Quota, rate limits, geo rules, bulk discounts with market comparison." },
                { t: "List & Earn", d: "Proxy routes calls; earnings settle on-chain with gas estimates upfront." },
              ]}
            />
          </TabsContent>
          
          <TabsContent value="buyer">
            <Timeline
              steps={[
                { t: "Browse & Compare", d: "Filter by price, reputation, response time, and location." },
                { t: "Purchase & Configure", d: "Select package, pay with token, get proxy key & webhooks." },
                { t: "Monitor & Optimize", d: "Track usage, set alerts, enable auto-renew based on targets." },
              ]}
            />
          </TabsContent>
          
          <TabsContent value="node">
            <Timeline
              steps={[
                { t: "Stake & Register", d: "Add stake, advertise supported APIs and region." },
                { t: "Route & Prove", d: "Handle requests with SLAs; health checks and proofs boost reputation." },
                { t: "Claim Rewards", d: "Fees and bonuses accrue; auto-claim options with cooldown awareness." },
              ]}
            />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
