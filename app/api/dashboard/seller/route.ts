import { NextResponse } from "next/server"

export async function GET() {
  const now = new Date()
  const days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - (13 - i))
    return d.toISOString().slice(0, 10)
  })

  return NextResponse.json({
    kpis: {
      earningsUsd: 4823.91,
      activeListings: 8,
      callsServed: 186_400,
      avgPricePerCallUsd: 0.006,
      quotaAvailable: 420_000,
    },
    earningsOverTime: days.map((date, i) => ({
      date,
      earnings: Math.round(180 + 95 * Math.sin(i / 1.8) + (i % 5) * 12),
    })),
    revenueByApi: [
      { api: "OpenAI", value: 38 },
      { api: "WeatherPro", value: 22 },
      { api: "MapsKit", value: 18 },
      { api: "PaymentsX", value: 14 },
      { api: "Other", value: 8 },
    ],
    peakTimes: Array.from({ length: 7 }).map((_, day) => ({
      day,
      hours: Array.from({ length: 24 }).map((__, hour) => ({
        hour,
        value: Math.max(0, Math.round(8 + 10 * Math.sin((hour / 24) * Math.PI * 2) + (day % 3) * 4)),
      })),
    })),
    topBuyers: [
      { buyer: "Acme Corp", calls: 22000, spendUsd: 310.2, returning: true },
      { buyer: "Beta Labs", calls: 16400, spendUsd: 225.7, returning: false },
      { buyer: "DataHub", calls: 14100, spendUsd: 205.1, returning: true },
      { buyer: "Nova Apps", calls: 9900, spendUsd: 141.3, returning: false },
    ],
    listings: [
      { api: "OpenAI", status: "active", priceUsd: 0.007, quota: 140000, earningsUsd: 2120.4 },
      { api: "WeatherPro", status: "active", priceUsd: 0.004, quota: 110000, earningsUsd: 860.2 },
      { api: "MapsKit", status: "paused", priceUsd: 0.006, quota: 90000, earningsUsd: 510.6 },
      { api: "PaymentsX", status: "active", priceUsd: 0.008, quota: 80000, earningsUsd: 780.8 },
    ],
  })
}
