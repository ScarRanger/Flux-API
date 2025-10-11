export async function GET() {
  const items = [
    { id: "1", name: "WeatherPro", category: "Weather", price: "$0.0009", discount: 22, quota: "320k", rating: "4.8" },
    { id: "2", name: "MapsXYZ", category: "Geospatial", price: "$0.0014", discount: 15, quota: "180k", rating: "4.6" },
    { id: "3", name: "NewsFeed", category: "News", price: "$0.0005", discount: 35, quota: "500k", rating: "4.7" },
    { id: "4", name: "SentimentAI", category: "AI", price: "$0.0031", discount: 12, quota: "95k", rating: "4.4" },
  ]
  return Response.json({ items }, { headers: { "Cache-Control": "no-store" } })
}
