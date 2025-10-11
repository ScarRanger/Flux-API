"use client"

import useSWR from "swr"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, TrendingUp, Shield } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function FeaturedAPIs() {
  const { data } = useSWR("/api/featured-apis", fetcher)
  const apis = data?.items ?? []

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {apis.map((a: any) => (
        <Card key={a.id} className="p-6 hover:shadow-xl transition-all hover:border-primary/50 group">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <div className="size-6 rounded bg-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                  {a.name}
                </h3>
                <p className="text-sm text-muted-foreground">{a.category}</p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Star className="size-3 fill-current" />
              {a.rating}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Price per call</p>
              <p className="text-lg font-bold">{a.price}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Discount</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-500">
                {a.discount}% off
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Available quota</p>
              <p className="text-sm font-medium">{a.quota}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Uptime</p>
              <p className="text-sm font-medium">99.9%</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
            <Shield className="size-3" />
            <span>Verified seller</span>
            <TrendingUp className="size-3 ml-auto" />
            <span>High demand</span>
          </div>

          <Button className="w-full" variant="outline">
            View Details
          </Button>
        </Card>
      ))}
    </div>
  )
}
