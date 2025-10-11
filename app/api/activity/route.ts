export async function GET() {
  const notifications = [
    { id: "n1", title: "Purchase confirmed: 50k calls (0x…89a1)", time: "2m ago", cta: "View" },
    { id: "n2", title: "Earnings claim ready: 230 USDC", time: "12m ago", cta: "Claim" },
    { id: "n3", title: "Node uptime > 99.99% for 7d", time: "1h ago" },
  ]
  return Response.json({ notifications }, { headers: { "Cache-Control": "no-store" } })
}
