import { DecentralizedNetworkDashboard } from '@/components/decentralized-network-dashboard'
import { Container } from '@/components/site/container'

export default function NetworkPage() {
  return (
    <Container>
      <div className="py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Decentralized Network</h1>
          <p className="text-muted-foreground">
            Monitor the health and status of keeper nodes powering our decentralized API marketplace
          </p>
        </div>

        <DecentralizedNetworkDashboard />
      </div>
    </Container>
  )
}
