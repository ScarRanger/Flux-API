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
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Bar,
} from "recharts"
import { cn } from "@/lib/utils"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function SellerAnalytics() {
  const { data } = useSWR("/api/dashboard/seller", fetcher, { revalidateOnFocus: false })
  if (!data) {
    return (
      <div className="grid gap-4 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="h-24 animate-pulse bg-muted/40" aria-busy="true" aria-live="polite" />
        ))}
      </div>
    )
  }

  const colors = {
    primary: "hsl(var(--chart-1))",
    secondary: "hsl(var(--chart-2))",
    accent: "hsl(var(--chart-3))",
    quaternary: "hsl(var(--chart-4))",
    neutral: "hsl(var(--muted-foreground))",
  }

  const listingsChartData = Array.isArray(data.listings)
    ? data.listings.map((l: any) => ({
        api: l.api,
        quota: l.quota,
        earnings: l.earningsUsd,
        price: l.priceUsd,
      }))
    : []

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <section aria-label="Seller KPIs">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi title="Earnings" value={`$${data.kpis.earningsUsd.toFixed(2)}`} helper="last 14 days" />
          <Kpi title="Active Listings" value={String(data.kpis.activeListings)} />
          <Kpi title="Calls Served" value={formatNumber(data.kpis.callsServed)} />
          <Kpi title="Avg Price/Call" value={`$${data.kpis.avgPricePerCallUsd.toFixed(3)}`} />
          <Kpi title="Quota Available" value={formatNumber(data.kpis.quotaAvailable)} />
        </div>
      </section>

      {/* Earnings Trend */}
      <section aria-label="Earnings trend">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Earnings Over Time</CardTitle>
            <CardDescription>Daily totals</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ earnings: { label: "Earnings", color: "hsl(var(--chart-1))" } }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.earningsOverTime} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line type="monotone" dataKey="earnings" name="Earnings" stroke="var(--color-earnings)" />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <section aria-label="Listings overview">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Listings Overview</CardTitle>
            <CardDescription>Quota and earnings per API with price overlay</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                quota: { label: "Quota", color: "hsl(var(--chart-2))" },
                earnings: { label: "Earnings", color: "hsl(var(--chart-4))" },
                price: { label: "Price", color: "hsl(var(--chart-1))" },
              }}
              className="h-[320px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={listingsChartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="api" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="quota" name="Quota" fill="var(--color-quota)" />
                  <Bar yAxisId="left" dataKey="earnings" name="Earnings" fill="var(--color-earnings)" />
                  <Line yAxisId="right" type="monotone" dataKey="price" name="Price" stroke="var(--color-price)" />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      {/* Revenue pie + Peak time heatmap */}
      <section className="grid gap-4 lg:grid-cols-2" aria-label="Revenue by API and peak times">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Revenue by API</CardTitle>
            <CardDescription>Share of total</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <PieChart width={360} height={240} role="img" aria-label="Revenue by API pie chart">
              <Pie
                data={data.revenueByApi}
                dataKey="value"
                nameKey="api"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
              >
                {data.revenueByApi.map((_: any, i: number) => (
                  <Cell
                    key={i}
                    fill={[colors.primary, colors.secondary, colors.accent, colors.quaternary, colors.neutral][i % 5]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Peak Times</CardTitle>
            <CardDescription>Seven-day heatmap by hour</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-24 gap-1">
              {data.peakTimes.map((day: any, dIdx: number) => (
                <div key={dIdx} className="grid grid-cols-24 gap-1">
                  {day.hours.map((h: any) => {
                    const intensity = Math.min(1, h.value / 24)
                    return (
                      <div
                        key={h.hour}
                        aria-label={`Day ${dIdx + 1}, hour ${h.hour}, value ${h.value}`}
                        className="h-4 rounded-sm"
                        style={{
                          backgroundColor: `color-mix(in oklab, hsl(var(--chart-3)) ${Math.round(intensity * 80)}%, transparent)`,
                        }}
                        title={`h${h.hour}: ${h.value}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">D1–D7 rows, 0–23 columns</p>
          </CardContent>
        </Card>
      </section>

      {/* Top buyers + Listings table */}
      <section className="grid gap-4 lg:grid-cols-2" aria-label="Top buyers and listings">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Top Buyers</CardTitle>
            <CardDescription>Calls and spend</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="[&>th]:py-2 [&>th]:text-left">
                  <th>Buyer</th>
                  <th>Calls</th>
                  <th>Spend</th>
                  <th>Returning</th>
                </tr>
              </thead>
              <tbody>
                {data.topBuyers.map((b: any) => (
                  <tr key={b.buyer} className="border-t">
                    <td className="py-2 font-medium">{b.buyer}</td>
                    <td>{formatNumber(b.calls)}</td>
                    <td>${b.spendUsd.toFixed(2)}</td>
                    <td>{b.returning ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Listings</CardTitle>
            <CardDescription>Status, price and quota</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="[&>th]:py-2 [&>th]:text-left">
                  <th>API</th>
                  <th>Status</th>
                  <th>Price/Call</th>
                  <th>Quota</th>
                  <th>Earnings</th>
                </tr>
              </thead>
              <tbody>
                {data.listings.map((l: any) => (
                  <tr key={l.api} className="border-t">
                    <td className="py-2 font-medium">{l.api}</td>
                    <td>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs",
                          l.status === "active"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                        )}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td>${l.priceUsd.toFixed(3)}</td>
                    <td>{formatNumber(l.quota)}</td>
                    <td>${l.earningsUsd.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

function formatNumber(n: number) {
  return new Intl.NumberFormat().format(n)
}
