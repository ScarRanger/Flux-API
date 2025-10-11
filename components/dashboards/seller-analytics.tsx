"use client"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
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
  AreaChart,
  Area,
} from "recharts"
import { cn } from "@/lib/utils"
import { DollarSign, Package, TrendingUp, Users, Zap, ArrowUpRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

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

  const palette = {
    primary: "#F59E0B", // amber-500
    secondary: "#EC4899", // pink-500
    accent: "#8B5CF6", // violet-500
    success: "#10B981", // emerald-500
    chart: ["#F59E0B", "#EC4899", "#8B5CF6", "#10B981", "#3B82F6"],
  }

  function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload || !payload.length) return null
    return (
      <div className="rounded-lg border bg-card p-3 text-sm shadow-lg">
        <div className="font-semibold mb-1">{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <div className="size-2.5 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-bold">{p.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced KPIs with List API Button */}
      <section aria-label="Seller KPIs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Performance Overview</h2>
          <Button asChild size="lg" className="gap-2">
            <Link href="/seller/list-api">
              <Plus className="size-4" />
              List New API
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Total Earnings"
            value={`$${data.kpis.earningsUsd.toFixed(2)}`}
            change="+18.2%"
            icon={DollarSign}
            color="from-amber-500 to-orange-600"
            borderColor="#f59e0b"
          />
          <StatCard
            title="Active Listings"
            value={String(data.kpis.activeListings)}
            change="+12"
            icon={Package}
            color="from-pink-500 to-rose-600"
            borderColor="#ec4899"
          />
          <StatCard
            title="Calls Served"
            value={formatNumber(data.kpis.callsServed)}
            change="+24.3%"
            icon={TrendingUp}
            color="from-violet-500 to-purple-600"
            borderColor="#8b5cf6"
          />
          <StatCard
            title="Avg Price/Call"
            value={`$${data.kpis.avgPricePerCallUsd.toFixed(3)}`}
            change="+5.1%"
            icon={Zap}
            color="from-emerald-500 to-teal-600"
            borderColor="#10b981"
          />
          <StatCard
            title="Quota Available"
            value={formatNumber(data.kpis.quotaAvailable)}
            change="+8.9%"
            icon={Users}
            color="from-blue-500 to-cyan-600"
            borderColor="#3b82f6"
          />
        </div>
      </section>

      {/* Earnings trend with area chart */}
      <section aria-label="Earnings trend">
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Revenue Analytics</CardTitle>
                <CardDescription>Track your earnings performance over time</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-amber-600">${data.kpis.earningsUsd.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Last 14 days</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ earnings: { label: "Earnings", color: palette.primary } }}
              className="h-[320px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.earningsOverTime} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <defs>
                    <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={palette.primary} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={palette.primary} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fill: "#94A3B8" }} />
                  <YAxis tick={{ fill: "#94A3B8" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="earnings"
                    stroke={palette.primary}
                    strokeWidth={3}
                    fill="url(#earningsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      {/* API Performance & Revenue Distribution */}
      <section className="grid gap-4 lg:grid-cols-2" aria-label="API performance">
        <Card className="border-l-4 border-l-pink-500">
          <CardHeader className="pb-2">
            <CardTitle>API Performance Overview</CardTitle>
            <CardDescription>Quota, earnings and pricing metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                quota: { label: "Quota", color: palette.secondary },
                earnings: { label: "Earnings", color: palette.accent },
                price: { label: "Price", color: palette.primary },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={data.listings.map((l: any) => ({
                    api: l.api,
                    quota: l.quota,
                    earnings: l.earningsUsd,
                    price: l.priceUsd * 1000,
                  }))}
                  margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
                >
                  <defs>
                    <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={palette.secondary} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={palette.secondary} stopOpacity={0.3} />
                    </linearGradient>
                    <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={palette.accent} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={palette.accent} stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.3} />
                  <XAxis dataKey="api" tick={{ fill: "#94A3B8" }} />
                  <YAxis yAxisId="left" tick={{ fill: "#94A3B8" }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: "#94A3B8" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="quota" name="Quota" fill="url(#barGrad1)" radius={[8, 8, 0, 0]} />
                  <Bar yAxisId="left" dataKey="earnings" name="Earnings" fill="url(#barGrad2)" radius={[8, 8, 0, 0]} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="price"
                    name="Price"
                    stroke={palette.primary}
                    strokeWidth={3}
                    dot={{ fill: palette.primary, r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500">
          <CardHeader className="pb-2">
            <CardTitle>Revenue Distribution</CardTitle>
            <CardDescription>Income breakdown by API</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <PieChart width={360} height={280}>
              <Pie
                data={data.revenueByApi}
                dataKey="value"
                nameKey="api"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={2}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.revenueByApi.map((_: any, i: number) => (
                  <Cell key={i} fill={palette.chart[i % palette.chart.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </CardContent>
        </Card>
      </section>

      {/* Listings & Top Buyers */}
      <section className="grid gap-4 lg:grid-cols-2" aria-label="Listings and buyers">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle>Active Listings</CardTitle>
            <CardDescription>Manage your API offerings</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b">
                <tr className="[&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
                  <th>API</th>
                  <th>Status</th>
                  <th>Price</th>
                  <th>Quota</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.listings.map((l: any) => (
                  <tr key={l.api} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 font-medium">{l.api}</td>
                    <td>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                          l.status === "active"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                        )}
                      >
                        <div className={cn("size-1.5 rounded-full", l.status === "active" ? "bg-emerald-500" : "bg-amber-500")} />
                        {l.status}
                      </span>
                    </td>
                    <td className="font-mono">${l.priceUsd.toFixed(3)}</td>
                    <td>{formatNumber(l.quota)}</td>
                    <td className="font-semibold text-amber-600">${l.earningsUsd.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle>Top Buyers</CardTitle>
            <CardDescription>Your best customers</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b">
                <tr className="[&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
                  <th>Buyer</th>
                  <th>Calls</th>
                  <th>Spend</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.topBuyers.map((b: any) => (
                  <tr key={b.buyer} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 font-medium">{b.buyer}</td>
                    <td>{formatNumber(b.calls)}</td>
                    <td className="font-semibold text-pink-600">${b.spendUsd.toFixed(2)}</td>
                    <td>
                      {b.returning && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                          <ArrowUpRight className="size-3" />
                          Returning
                        </span>
                      )}
                    </td>
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

function StatCard(props: { title: string; value: string; change: string; icon: any; color: string; borderColor: string }) {
  const Icon = props.icon

  return (
    <Card className="relative overflow-hidden hover:shadow-xl transition-all border-t-4" style={{ borderTopColor: props.borderColor }}>
      <div className={cn("absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-10 rounded-full -mr-12 -mt-12", props.color)} />
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">{props.title}</p>
          <div className={cn("rounded-lg p-2 bg-gradient-to-br", props.color)}>
            <Icon className="size-5 text-white" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <p className="text-3xl font-bold">{props.value}</p>
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            {props.change}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function formatNumber(n: number) {
  return new Intl.NumberFormat().format(n)
}
