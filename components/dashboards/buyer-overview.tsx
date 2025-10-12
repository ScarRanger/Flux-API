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
  AreaChart,
  Area,
} from "recharts"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, DollarSign, Activity, Package, Zap } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function BuyerOverview() {
  const { dbUser } = useAuth()
  const { data, error } = useSWR(
    dbUser?.firebase_uid ? `/api/dashboard/buyer?userId=${dbUser.firebase_uid}` : null, 
    fetcher, 
    { 
      revalidateOnFocus: false,
      onSuccess: (data) => {
        console.log('✅ Dashboard data loaded:', {
          quotaPurchased: data.kpis.quotaPurchased,
          quotaUsed: data.kpis.quotaUsed,
          totalRequests: data.quickStats.totalRequests,
          activeSubscriptions: data.kpis.activeSubscriptions
        })
      },
      onError: (err) => {
        console.error('❌ Dashboard data failed:', err)
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
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-24 animate-pulse bg-muted/40" aria-busy="true" aria-live="polite" />
        ))}
      </div>
    )
  }

  // replace previous colors with a compact palette and CSS fallbacks
  const palette = {
    calls: "#6366F1", // indigo-500
    success: "#10B981", // green-500
    bar: "#7C3AED", // purple-600
    pie: ["#6366F1", "#10B981", "#F59E0B", "#9CA3AF"], // calls, success, savings, neutral
    muted: "#94A3B8",
  }

  // custom tooltip used for recharts (simple and consistent)
  function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload || !payload.length) return null
    return (
      <div className="rounded-md border bg-card p-3 text-sm shadow">
        <div className="font-medium">{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mt-1">
            <span className="inline-block w-2 h-2 rounded" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-semibold">{typeof p.value === "number" ? p.value : p.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Enhanced KPIs with icons and trends */}
      <section aria-label="Buyer KPIs">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <EnhancedKpi
            title="Quota Purchased"
            value={formatNumber(data.kpis.quotaPurchased)}
            helper="total calls"
            icon={Package}
            trend={12.5}
            color="from-blue-500 to-cyan-500"
          />
          <EnhancedKpi
            title="Quota Used"
            value={formatNumber(data.kpis.quotaUsed)}
            helper={`${percent(data.kpis.quotaUsed, data.kpis.quotaPurchased)} used`}
            icon={Activity}
            trend={8.3}
            color="from-purple-500 to-pink-500"
          />
          <EnhancedKpi
            title="Cost Saved"
            value={`${data.kpis.costSavedUsd.toFixed(6)} ETH`}
            helper="vs on-demand"
            icon={DollarSign}
            trend={15.2}
            color="from-green-500 to-emerald-500"
          />
          <EnhancedKpi
            title="Active Subscriptions"
            value={String(data.kpis.activeSubscriptions)}
            helper="auto-renew enabled"
            icon={Zap}
            trend={5.7}
            color="from-orange-500 to-red-500"
          />
        </div>
      </section>

      {/* Calls over time + Quick Stats side by side */}
      <section className="grid gap-4 lg:grid-cols-4" aria-label="Calls over time and quick stats">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-balance">API Calls Over Time</CardTitle>
            <CardDescription>Success rate and average latency trends</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                calls: { label: "Calls", color: palette.calls },
                successRate: { label: "Success", color: palette.success },
              }}
              className="h-[400px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.callsOverTime} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  {/* gradient defs */}
                  <defs>
                    <linearGradient id="gradCalls" x1="0" x2="1">
                      <stop offset="0%" stopColor={palette.calls} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={palette.calls} stopOpacity={0.3} />
                    </linearGradient>
                    <linearGradient id="gradSuccess" x1="0" x2="1">
                      <stop offset="0%" stopColor={palette.success} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={palette.success} stopOpacity={0.3} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke={palette.muted} />
                  <XAxis dataKey="date" tick={{ fill: palette.muted }} />
                  <YAxis yAxisId="left" tick={{ fill: palette.muted }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0.8, 1]}
                    tickFormatter={(v) => `${Math.round(v * 100)}%`}
                    tick={{ fill: palette.muted }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="calls"
                    name="Calls"
                    stroke="url(#gradCalls)"
                    strokeWidth={3}
                    yAxisId="left"
                    activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="successRate"
                    name="Success Rate"
                    stroke="url(#gradSuccess)"
                    yAxisId="right"
                    dot={false}
                    strokeWidth={3}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>At a glance</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-evenly py-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div>
                <p className="text-xs text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold">{data.quickStats.avgResponseTimeMs}ms</p>
              </div>
              <Activity className="size-10 text-blue-500" />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div>
                <p className="text-xs text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{(data.quickStats.successRate * 100).toFixed(1)}%</p>
              </div>
              <TrendingUp className="size-10 text-green-500" />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div>
                <p className="text-xs text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{formatNumber(data.quickStats.totalRequests)}</p>
              </div>
              <Zap className="size-10 text-purple-500" />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div>
                <p className="text-xs text-muted-foreground">Cost per Call</p>
                <p className="text-2xl font-bold">${data.quickStats.costPerCall.toFixed(4)}</p>
              </div>
              <DollarSign className="size-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Two column layout: Hourly Pattern, Cost Breakdown */}
      <section className="grid gap-4 lg:grid-cols-2" aria-label="Usage pattern and cost breakdown">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Hourly Pattern</CardTitle>
            <CardDescription>Calls distribution by hour</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ calls: { label: "Calls", color: palette.bar } }} className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hourlyPattern} margin={{ top: 4, right: 16, bottom: 8, left: 0 }}>
                  <defs>
                    <linearGradient id="gradBar" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={palette.bar} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={palette.bar} stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={palette.muted} />
                  <XAxis dataKey="hour" tick={{ fill: palette.muted }} />
                  <YAxis tick={{ fill: palette.muted }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="calls" name="Calls" fill="url(#gradBar)" radius={[6, 6, 0, 0]} />
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
                  <Cell key={i} fill={palette.pie[i % palette.pie.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
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
                    <td>{row.costUsd.toFixed(6)} ETH</td>
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

function EnhancedKpi(props: {
  title: string
  value: string
  helper?: string
  icon: any
  trend: number
  color: string
}) {
  const Icon = props.icon
  const isPositive = props.trend > 0

  return (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all">
      {/* Gradient background */}
      <div
        className={cn(
          "absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity rounded-full -mr-16 -mt-16",
          props.color
        )}
      />
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">{props.title}</CardTitle>
          {props.helper && <CardDescription className="text-xs">{props.helper}</CardDescription>}
        </div>
        <div className={cn("rounded-lg p-2.5 bg-gradient-to-br", props.color)}>
          <Icon className="size-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <p className="text-3xl font-bold">{props.value}</p>
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              isPositive ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
            )}
          >
            {isPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            <span>{Math.abs(props.trend)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
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
        <p className="text-2xl font-semibold text-foreground">{props.value}</p>
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
