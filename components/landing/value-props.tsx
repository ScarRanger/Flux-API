import { Card } from "@/components/ui/card"

export function ValueProps() {
  const items = [
    {
      title: "Sellers",
      desc: "List unused quota with granular rate limits, automate withdrawals, and earn on idle capacity.",
    },
    {
      title: "Buyers",
      desc: "Discover discounted capacity with SLA-backed routes, detailed metrics, and easy proxy setup.",
    },
    {
      title: "Node Operators",
      desc: "Stake, route, and earn fees with performance-based reputation and automated health checks.",
    },
  ]
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {items.map((i) => (
        <Card key={i.title} className="p-6">
          <h3 className="text-lg font-semibold">{i.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{i.desc}</p>
        </Card>
      ))}
    </div>
  )
}
