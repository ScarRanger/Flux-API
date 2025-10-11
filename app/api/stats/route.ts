export async function GET() {
  // Mock stats; in production, aggregate from DB/chain indexer
  const stats = {
    volume24h: "$182,340",
    listings: 142,
    callsRouted: "12.4M",
    savingsPct: 34,
    activeNodes: 318,
    uptime: 99.99,
  }
  return Response.json({ stats }, { headers: { "Cache-Control": "no-store" } })
}
