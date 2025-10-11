"use client"

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const data = [
  { day: "Mon", earnings: 240 },
  { day: "Tue", earnings: 320 },
  { day: "Wed", earnings: 280 },
  { day: "Thu", earnings: 460 },
  { day: "Fri", earnings: 520 },
  { day: "Sat", earnings: 380 },
  { day: "Sun", earnings: 410 },
]

export function EarningsChart() {
  return (
    <ChartContainer
      config={{
        earnings: { label: "Earnings", color: "hsl(var(--chart-1))" },
      }}
      className="h-[280px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="earnings"
            stroke="var(--color-earnings)"
            strokeWidth={2}
            dot={false}
            name="Earnings"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
