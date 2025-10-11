import { NextResponse } from "next/server"

export async function GET() {
  // Mock data to drive charts and KPIs
  const now = new Date()
  const days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - (13 - i))
    return d.toISOString().slice(0, 10)
  })

  return NextResponse.json({
    kpis: {
      quotaPurchased: 120000,
      quotaUsed: 76200,
      costSavedUsd: 1845.32,
      activeSubscriptions: 6,
    },
    callsOverTime: days.map((date, i) => ({
      date,
      calls: Math.round(3000 + 1500 * Math.sin(i / 2) + (i % 5) * 120),
      successRate: 0.93 + (i % 3) * 0.01,
      avgLatencyMs: 190 - (i % 4) * 8,
    })),
    hourlyPattern: Array.from({ length: 24 }).map((_, hour) => ({
      hour,
      calls: Math.round(150 + 120 * Math.sin((hour / 24) * Math.PI * 2)),
    })),
    costBreakdown: [
      { key: "perCall", label: "Per-call", value: 58 },
      { key: "volumeDiscounts", label: "Volume discounts", value: 27 },
      { key: "networkFees", label: "Network fees", value: 10 },
      { key: "other", label: "Other", value: 5 },
    ],
    usageByApi: [
      { api: "OpenAI", calls: 24000, success: 0.98, avgLatencyMs: 140, costUsd: 320 },
      { api: "WeatherPro", calls: 18000, success: 0.96, avgLatencyMs: 210, costUsd: 120 },
      { api: "MapsKit", calls: 14000, success: 0.94, avgLatencyMs: 260, costUsd: 190 },
      { api: "PaymentsX", calls: 9600, success: 0.92, avgLatencyMs: 310, costUsd: 220 },
    ],
    recentLogs: Array.from({ length: 12 }).map((_, i) => ({
      id: `log_${i}`,
      time: new Date(now.getTime() - i * 60_000).toISOString(),
      api: ["OpenAI", "WeatherPro", "MapsKit", "PaymentsX"][i % 4],
      status: i % 9 === 0 ? "error" : "ok",
      latencyMs: 120 + (i % 6) * 20,
      cost: 0.002 + (i % 3) * 0.001,
      method: ["GET", "POST"][i % 2],
      path: ["/v1/complete", "/v1/forecast", "/v1/route", "/v1/charge"][i % 4],
    })),
  })
}
