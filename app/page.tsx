import { Hero } from "@/components/landing/hero"
import { ValueProps } from "@/components/landing/value-props"
import { HowItWorks } from "@/components/landing/how-it-works"
import { LiveStats } from "@/components/landing/live-stats"
import { FeaturedAPIs } from "@/components/landing/featured-apis"
import { Card } from "@/components/ui/card"

export default function Page() {
  return (
    <>
      <Hero />
      <section aria-labelledby="value-props" className="container mx-auto px-4 py-12 sm:py-16">
        <h2 id="value-props" className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          Built for Sellers, Buyers, and Node Operators
        </h2>
        <ValueProps />
      </section>

      <section aria-labelledby="how-it-works" className="container mx-auto px-4 py-12 sm:py-16">
        <h2 id="how-it-works" className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          How It Works
        </h2>
        <HowItWorks />
      </section>

      <section aria-labelledby="live-stats" className="container mx-auto px-4 py-12 sm:py-16">
        <div className="flex items-center justify-between gap-4">
          <h2 id="live-stats" className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            Live Network Stats
          </h2>
        </div>
        <LiveStats />
      </section>

      <section aria-labelledby="featured" className="container mx-auto px-4 py-12 sm:py-16">
        <div className="flex items-center justify-between gap-4">
          <h2 id="featured" className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            Featured APIs
          </h2>
        </div>
        <FeaturedAPIs />
      </section>

      <section aria-labelledby="trust" className="bg-secondary/60">
        <div className="container mx-auto px-4 py-12 sm:py-16">
          <h2 id="trust" className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            Trust & Security
          </h2>
          <div className="grid gap-6 md:grid-cols-2 mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-medium">Architecture Overview</h3>
              <img
                src="/placeholder.svg?height=360&width=640"
                alt="Architecture diagram of secure proxy network and settlement"
                className="mt-4 rounded-md border"
              />
            </Card>
            <Card className="p-6">
              <h3 className="text-lg font-medium">Audits & Security</h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                <li className="rounded-md border p-4">Smart Contract Audit: Trail of Bits</li>
                <li className="rounded-md border p-4">Proxy Network Audit: NCC Group</li>
                <li className="rounded-md border p-4">SOC 2 Type II</li>
                <li className="rounded-md border p-4">Bug Bounty: HackerOne</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>
    </>
  )
}
