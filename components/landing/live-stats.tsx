"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp, Activity, Zap, Users2 } from "lucide-react"

export function LiveStats() {
  const stats = [
    {
      label: "Total Volume",
      value: "$2.4M",
      change: "+12.5%",
      icon: TrendingUp,
      trend: "up",
    },
    {
      label: "API Calls Today",
      value: "847K",
      change: "+8.2%",
      icon: Activity,
      trend: "up",
    },
    {
      label: "Active Sellers",
      value: "1,234",
      change: "+5.1%",
      icon: Users2,
      trend: "up",
    },
    {
      label: "Avg Response Time",
      value: "124ms",
      change: "-3.2%",
      icon: Zap,
      trend: "down",
    },
  ]

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-6 hover:shadow-lg transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {stat.label}
              </p>
              <p className="text-3xl font-bold mb-2">{stat.value}</p>
              <div className="flex items-center gap-1">
                <span
                  className={`text-sm font-medium ${
                    stat.trend === "up" ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
                  }`}
                >
                  {stat.change}
                </span>
                <span className="text-sm text-muted-foreground">vs last week</span>
              </div>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <stat.icon className="size-6 text-primary" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
