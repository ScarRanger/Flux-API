"use client"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { cn } from "@/lib/utils"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function BuyerOverview() {
  const { data } = useSWR("/api/dashboard/buyer", fetcher, { revalidateOnFocus: false })
  if (!data) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-24 animate-pulse bg-muted/40" aria-busy="true" aria-live="polite" />
        ))}
      </div>
    )
  }

  const colors = {
    primary: "hsl(var(--chart-1))",
    secondary: "hsl(var(--chart-2))",
    accent: "hsl(var(--chart-3))",
    neutral: "hsl(var(--muted-foreground))",
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <section aria-label="Buyer KPIs">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi title="Quota Purchased" value={formatNumber(data.kpis.quotaPurchased)} helper="total calls" />
          <Kpi
            title="Quota Used"
            value={formatNumber(data.kpis.quotaUsed)}
            helper={`${percent(data.kpis.quotaUsed, data.kpis.quotaPurchased)} used`}
          />
          <Kpi title="Cost Saved" value={`$${data.kpis.costSavedUsd.toFixed(2)}`} helper="vs on-demand" />
          <Kpi title="Active Subscriptions" value={String(data.kpis.activeSubscriptions)} helper="auto-renew enabled" />
        </div>
      </section>

      {/* Calls over time */}
      <section aria-label="Calls over time">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-balance">API Calls Over Time</CardTitle>
            <CardDescription>Success rate and average latency trends</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                calls: { label: "Calls", color: "hsl(var(--chart-1))" },
                successRate: { label: "Success", color: "hsl(var(--chart-2))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.callsOverTime} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" domain={[0.8, 1]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line type="monotone" dataKey="calls" name="Calls" stroke="var(--color-calls)" yAxisId="left" />
                  <Line
                    type="monotone"
                    dataKey="successRate"
                    name="Success Rate"
                    stroke="var(--color-successRate)"
                    yAxisId="right"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      {/* Hourly patterns + cost breakdown */}
      <section className="grid gap-4 lg:grid-cols-2" aria-label="Usage pattern and cost breakdown">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Hourly Pattern</CardTitle>
            <CardDescription>Calls distribution by hour</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ calls: { label: "Calls", color: "hsl(var(--chart-3))" } }} className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hourlyPattern} margin={{ top: 4, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="calls" name="Calls" fill="var(--color-calls)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Cost Breakdown</CardTitle>
            <CardDescription>Where your spend goes</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <PieChart width={360} height={240} role="img" aria-label="Cost breakdown pie chart">
              <Pie
                data={data.costBreakdown}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
              >
                {data.costBreakdown.map((_: any, i: number) => (
                  <Cell key={i} fill={[colors.primary, colors.secondary, colors.accent, colors.neutral][i % 4]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </CardContent>
        </Card>
      </section>

      {/* Usage table + logs */}
      <section className="grid gap-4 lg:grid-cols-2" aria-label="Usage table and live logs">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>API Usage</CardTitle>
            <CardDescription>Breakdown by provider</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="[&>th]:py-2 [&>th]:text-left">
                  <th>API</th>
                  <th>Calls</th>
                  <th>Success</th>
                  <th>Latency</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.usageByApi.map((row: any) => (
                  <tr key={row.api} className="border-t">
                    <td className="py-2 font-medium">{row.api}</td>
                    <td>{formatNumber(row.calls)}</td>
                    <td>{Math.round(row.success * 100)}%</td>
                    <td>{row.avgLatencyMs} ms</td>
                    <td>${row.costUsd.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Recent Calls</CardTitle>
            <CardDescription>Live request logs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="max-h-[260px] space-y-2 overflow-auto pr-2">
              {data.recentLogs.map((log: any) => (
                <li
                  key={log.id}
                  className={cn(
                    "rounded-md border p-2",
                    log.status === "error" ? "border-destructive/50" : "border-border",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{log.api}</span>
                    <span
                      className={cn("text-xs", log.status === "error" ? "text-destructive" : "text-muted-foreground")}
                    >
                      {new Date(log.time).toLocaleTimeString()} • {log.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {log.method} {log.path} • {log.latencyMs} ms • ${log.cost.toFixed(4)}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function Kpi(props: { title: string; value: string; helper?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-base">{props.title}</CardTitle>
        {props.helper ? <CardDescription>{props.helper}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{props.value}</p>
      </CardContent>
    </Card>
  )
}

function percent(part: number, total: number) {
  if (!total) return "0%"
  return `${Math.round((part / total) * 100)}%`
}
function formatNumber(n: number) {
  return new Intl.NumberFormat().format(n)
}
