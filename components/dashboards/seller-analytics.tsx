"use client"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
  Cell,
} from "recharts"
import { cn } from "@/lib/utils"
import { DollarSign, Package, TrendingUp, Users, Zap, ArrowUpRight, Plus, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function SellerAnalytics() {
  const { dbUser } = useAuth()
  const { data, error } = useSWR(
    dbUser?.firebase_uid ? `/api/dashboard/seller?userId=${dbUser.firebase_uid}` : null,
    fetcher, 
    { 
      revalidateOnFocus: false,
      onSuccess: (data) => {
        if (data?.kpis) {
          console.log('✅ Seller dashboard data loaded:', {
            earningsUsd: data.kpis.earningsUsd,
            activeListings: data.kpis.activeListings,
            callsServed: data.kpis.callsServed,
            quotaAvailable: data.kpis.quotaAvailable
          })
        }
      },
      onError: (err) => {
        console.error('❌ Seller dashboard data failed:', err)
      }
    }
  )
  
  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive text-lg font-semibold">Failed to load dashboard data</p>
          <p className="text-muted-foreground text-sm mt-2">{error.message}</p>
        </div>
      </div>
    )
  }
  
  if (!data) {
    return (
      <div className="grid gap-4 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="h-32 animate-pulse bg-muted/40" aria-busy="true" aria-live="polite" />
        ))}
      </div>
    )
  }

  const palette = {
    primary: "#F59E0B",
    secondary: "#EC4899", 
    accent: "#8B5CF6",
    success: "#10B981",
    info: "#3B82F6",
  }

  function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border bg-card p-3 text-sm shadow-xl">
        <div className="font-semibold mb-2">{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mt-1">
            <div className="size-3 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-bold">{p.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Revenue Metrics Cards */}
      <section aria-label="Revenue metrics">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            title="Monthly Revenue"
            value={`${data.kpis.earningsUsd.toFixed(6)} ETH`}
            change="+18.2%"
            icon={DollarSign}
            gradient="from-amber-500 via-orange-500 to-amber-600"
          />
          <MetricCard
            title="Active Listings"
            value={String(data.kpis.activeListings)}
            change="+12 this week"
            icon={Package}
            gradient="from-pink-500 via-rose-500 to-pink-600"
          />
          <MetricCard
            title="Total Calls"
            value={formatNumber(data.kpis.callsServed)}
            change="+24.3%"
            icon={TrendingUp}
            gradient="from-violet-500 via-purple-500 to-violet-600"
          />
          <MetricCard
            title="Avg Price/Call"
            value={`${data.kpis.avgPricePerCallUsd.toFixed(8)} ETH`}
            change="+5.1%"
            icon={Zap}
            gradient="from-emerald-500 via-teal-500 to-emerald-600"
          />
          <MetricCard
            title="Available Quota"
            value={formatNumber(data.kpis.quotaAvailable)}
            change="Updated now"
            icon={Clock}
            gradient="from-blue-500 via-cyan-500 to-blue-600"
          />
        </div>
      </section>

      {/* Revenue Trend & API Performance Radar */}
      <section className="grid gap-4 lg:grid-cols-5" aria-label="Revenue analysis">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Revenue Trends</CardTitle>
                <CardDescription>Daily earnings breakdown</CardDescription>
              </div>
              {/* <Button asChild size="sm" className="gap-2">
                <Link href="/sell-api">
                  <Plus className="size-4" />
                  List API
                </Link>
              </Button> */}
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ earnings: { label: "Earnings", color: palette.primary } }} className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.earningsOverTime} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={palette.primary} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={palette.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#94A3B8", fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="earnings" 
                    stroke={palette.primary} 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#revenueGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>API Performance</CardTitle>
            <CardDescription>Multi-metric analysis</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <RadarChart width={320} height={320} data={data.listings.slice(0, 5).map((l: any) => ({
              api: l.api.slice(0, 10),
              quota: l.quota / 100,
              earnings: l.earningsUsd,
              price: l.priceUsd * 1000,
            }))}>
              <PolarGrid stroke={palette.accent} opacity={0.3} />
              <PolarAngleAxis dataKey="api" tick={{ fill: "#94A3B8", fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 'auto']} tick={{ fill: "#94A3B8", fontSize: 10 }} />
              <Radar name="Quota" dataKey="quota" stroke={palette.secondary} fill={palette.secondary} fillOpacity={0.6} />
              <Radar name="Earnings" dataKey="earnings" stroke={palette.accent} fill={palette.accent} fillOpacity={0.6} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </RadarChart>
          </CardContent>
        </Card>
      </section>

      {/* API Scatter Plot & Top Buyers */}
      <section className="grid gap-4 lg:grid-cols-2" aria-label="Performance insights">
        <Card className="">
          <CardHeader className="pb-2">
            <CardTitle>API Value Matrix</CardTitle>
            <CardDescription>Price vs Volume analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.3} />
                  <XAxis type="number" dataKey="quota" name="Quota" tick={{ fill: "#94A3B8" }} />
                  <YAxis type="number" dataKey="earnings" name="Revenue" tick={{ fill: "#94A3B8" }} />
                  <ZAxis type="number" dataKey="price" name="Price" range={[50, 400]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                  <Legend />
                  <Scatter 
                    name="APIs" 
                    data={data.listings.map((l: any) => ({
                      quota: l.quota,
                      earnings: l.earningsUsd,
                      price: l.priceUsd * 1000,
                    }))} 
                    fill={palette.secondary}
                  >
                    {data.listings.map((_: any, i: number) => (
                      <Cell key={i} fill={`hsl(${(i * 360) / data.listings.length}, 70%, 60%)`} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader className="pb-2">
            <CardTitle>Top Performing Buyers</CardTitle>
            <CardDescription>Highest revenue contributors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topBuyers.slice(0, 5).map((b: any, idx: number) => (
                <div key={b.buyer} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-center size-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold">
                    #{idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{b.buyer}</div>
                    <div className="text-xs text-muted-foreground">{formatNumber(b.calls)} calls</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-amber-600">${b.spendUsd.toFixed(2)}</div>
                    {b.returning && (
                      <div className="flex items-center gap-1 text-xs text-emerald-600">
                        <ArrowUpRight className="size-3" />
                        Repeat
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Listings Table */}
      <section aria-label="Active listings">
        <Card className="">
          <CardHeader className="pb-2">
            <CardTitle>Active API Listings</CardTitle>
            <CardDescription>Manage and monitor your offerings</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="[&>th]:py-3 [&>th]:text-left [&>th]:font-semibold [&>th]:text-muted-foreground">
                  <th>API Name</th>
                  <th>Status</th>
                  <th>Price/Call</th>
                  <th>Quota</th>
                  <th>Revenue</th>
                  <th>Performance</th>
                </tr>
              </thead>
              <tbody>
                {data.listings.map((l: any) => (
                  <tr key={l.api} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="py-4 font-semibold">{l.api}</td>
                    <td>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                        l.status === "active" 
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      )}>
                        <div className={cn("size-2 rounded-full", l.status === "active" ? "bg-emerald-500" : "bg-amber-500")} />
                        {l.status}
                      </span>
                    </td>
                    <td className="font-mono text-primary">${l.priceUsd.toFixed(4)}</td>
                    <td className="font-medium">{formatNumber(l.quota)}</td>
                    <td className="font-bold text-amber-600">${l.earningsUsd.toFixed(2)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" 
                            style={{ width: `${Math.min((l.earningsUsd / data.kpis.earningsUsd) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{Math.round((l.earningsUsd / data.kpis.earningsUsd) * 100)}%</span>
                      </div>
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

function MetricCard(props: { title: string; value: string; change: string; icon: any; gradient: string }) {
  const Icon = props.icon
  
  return (
    <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity", props.gradient)} />
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={cn("rounded-xl p-3 bg-gradient-to-br shadow-lg", props.gradient)}>
            <Icon className="size-6 text-white" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{props.title}</p>
          <p className="text-3xl font-bold mb-1">{props.value}</p>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{props.change}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function formatNumber(n: number) {
  return new Intl.NumberFormat().format(n)
}
