import { Card } from "@/components/ui/card"
import { DollarSign, ShoppingCart, Server, Check } from "lucide-react"

export function ValueProps() {
  const items = [
    {
      title: "For Sellers",
      icon: DollarSign,
      desc: "Monetize your unused API capacity and turn idle resources into revenue streams.",
      features: [
        "Granular rate limits",
        "Automated withdrawals",
        "Real-time analytics",
        "Flexible pricing",
      ],
    },
    {
      title: "For Buyers",
      icon: ShoppingCart,
      desc: "Access premium APIs at discounted rates with transparent pricing and SLA guarantees.",
      features: [
        "Up to 36% savings",
        "SLA-backed routes",
        "Detailed metrics",
        "Easy integration",
      ],
    },
    {
      title: "For Node Operators",
      icon: Server,
      desc: "Earn fees by routing traffic while building reputation through reliable performance.",
      features: [
        "Stake to earn",
        "Performance rewards",
        "Automated health checks",
        "Reputation system",
      ],
    },
  ]
  return (
    <section className="py-16 md:py-24 bg-secondary/20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built for Everyone in the API Ecosystem
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you're selling, buying, or operating nodes, FluxAPI has you covered
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {items.map((i) => (
            <Card key={i.title} className="p-8 hover:shadow-xl transition-all hover:border-primary/50 bg-background">
              <div className="rounded-lg bg-primary/10 w-fit p-3 mb-6">
                <i.icon className="size-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">{i.title}</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">{i.desc}</p>
              <ul className="space-y-3">
                {i.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-primary shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
