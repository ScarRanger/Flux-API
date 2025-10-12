import { Hero } from "@/components/landing/hero"
import { ValueProps } from "@/components/landing/value-props"
import { HowItWorks } from "@/components/landing/how-it-works"
import { LiveStats } from "@/components/landing/live-stats"
import { FeaturedAPIs } from "@/components/landing/featured-apis"

export default function Page() {
  return (
    <>
      <Hero />
      
      <HowItWorks />
      <ValueProps />
      

      <section aria-labelledby="live-stats" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 id="live-stats" className="text-3xl md:text-4xl font-bold mb-4">
              Live Network Stats
            </h2>
          </div>
          <LiveStats />
        </div>
      </section>

      
    </>
  )
}
