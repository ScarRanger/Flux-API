# Flux-API: Decentralized API Marketplace

A production-grade decentralized API marketplace leveraging Ethereum smart contracts, PostgreSQL, and AI. Flux-API enables trustless API monetization through blockchain-backed escrow, cryptographic verification, and real-time usage tracking.

## Architecture Overview

```
┌─────────────────┐
│   Next.js 15    │
│   Frontend      │
└────────┬────────┘
         │
    ┌────┴────┐
    │  API    │
    │ Routes  │
    └────┬────┘
         │
    ┌────┴─────────────────────┐
    │                          │
┌───▼────────┐      ┌─────────▼──────┐
│ PostgreSQL │      │ Ethereum       │
│ Database   │      │ Smart Contracts│
└────────────┘      └────────────────┘
```

## Core Features

### 1. **Decentralized Escrow System**
- **Smart Contract**: `PaymentEscrow.sol` deployed at `0xbd51932f3d21697a04d5d078aa8fb878a76394ef` (Sepolia)
- **Staking Mechanism**: 0.1 ETH minimum stake per API purchase
- **Gas-Optimized Transactions**: Batch processing via `lib/blockchain-queue.ts`
- **State Management**: Dual-layer architecture (on-chain + PostgreSQL) for performance

### 2. **API Gateway & Proxy**
- **Endpoint**: `/api/gateway/call` with JWT-based authentication
- **CORS Middleware**: Global preflight handling (`middleware.ts`)
- **Request Validation**: X-BNB-API-Key header verification
- **Blockchain Logging**: Every API call logged on-chain via `UsageTracking.sol`
- **Quota Management**: Real-time rate limiting and usage tracking

### 3. **Dynamic Marketplace**
- **Search & Filter**: PostgreSQL full-text search with JSONB category indexing
- **Real-time Filters**: `/api/marketplace/filters` with dynamic category/region/price aggregation
- **API Verification**: On-chain registry via `APIRegistry.sol` + off-chain metadata validation
- **Seller Analytics**: Revenue tracking, usage metrics, uptime monitoring

### 4. **AI Integration**
- **Gemini API**: Conversational interface for API discovery
- **Gateway Integration**: AI requests routed through authenticated gateway
- **Context-Aware**: Access to user purchase history and API metadata

### 5. **Keeper Node Network**
- **Decentralized Validation**: Keeper nodes verify API health and uptime
- **Staking Requirements**: `KeeperNodeStaking.sol` for node operators
- **Health Monitoring**: Periodic endpoint checks with blockchain reporting

## Tech Stack

### Frontend
- **Framework**: Next.js 15.5.4 (App Router, Server Components)
- **UI Library**: Shadcn UI + Radix UI primitives
- **Styling**: TailwindCSS 3.x with custom design tokens
- **State Management**: SWR for data fetching, React Context for auth
- **Type Safety**: TypeScript 5.x with strict mode

### Backend
- **Runtime**: Node.js 20+ with Next.js API routes
- **Database**: PostgreSQL 15+ with connection pooling (`pg` library)
- **ORM**: Raw SQL queries for performance-critical operations
- **Authentication**: Firebase Auth + Ethereum wallet signatures

### Blockchain
- **Network**: Ethereum Sepolia testnet (chainId: 11155111)
- **Library**: ethers.js v6 for contract interaction
- **Contracts**:
  - `PaymentEscrow.sol`: Stake management and fund locking
  - `APIRegistry.sol`: On-chain API metadata storage
  - `UsageTracking.sol`: Per-call logging and analytics
  - `KeeperNodeRegistry.sol`: Validator node management
  - `SubscriptionManager.sol`: Recurring payment handling
- **Gas Optimization**: Queue-based transaction batching

### Infrastructure
- **Database Schema**:
  - `api_listings`: Marketplace catalog with JSONB metadata
  - `escrow_stakes`: Stake records with transaction hashes
  - `usage_logs`: API call history and blockchain pointers
  - `keeper_nodes`: Validator network registry
- **Caching**: SWR client-side cache + PostgreSQL query optimization
- **CORS**: Global middleware with configurable origins

## Getting Started

### Prerequisites
- **Node.js**: v20.x or higher
- **pnpm**: v8.x (recommended) or npm/yarn
- **PostgreSQL**: v15+ with UUID extension enabled
- **Ethereum Wallet**: MetaMask or compatible (Sepolia testnet ETH required)
- **RPC Provider**: Alchemy/Infura Sepolia endpoint

### Environment Configuration

Create `.env.local` with the following variables:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/flux_api"

# Blockchain
NEXT_PUBLIC_PAYMENT_ESCROW_CONTRACT="0xbd51932f3d21697a04d5d078aa8fb878a76394ef"
NEXT_PUBLIC_API_REGISTRY_CONTRACT="<registry_address>"
NEXT_PUBLIC_USAGE_TRACKING_CONTRACT="<tracking_address>"
NEXT_PUBLIC_KEEPER_REGISTRY_CONTRACT="<keeper_address>"
NEXT_PUBLIC_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/<your-key>"
PRIVATE_KEY="<deployer_private_key>" # For server-side transactions

# Firebase (Authentication)
NEXT_PUBLIC_FIREBASE_API_KEY="<firebase_api_key>"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="<project>.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="<project_id>"
FIREBASE_ADMIN_SERVICE_ACCOUNT='{"type":"service_account",...}'

# AI Integration
GEMINI_API_KEY="<gemini_api_key>"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Database Setup

1. **Create PostgreSQL database:**
   ```sql
   CREATE DATABASE flux_api;
   \c flux_api
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

2. **Run schema migrations:**
   ```sql
   -- api_listings table
   CREATE TABLE api_listings (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     seller_id VARCHAR(255) NOT NULL,
     name VARCHAR(255) NOT NULL,
     description TEXT,
     base_endpoint TEXT NOT NULL,
     price_per_call NUMERIC(20, 0) NOT NULL, -- Wei
     categories JSONB,
     region VARCHAR(100),
     status VARCHAR(50) DEFAULT 'active',
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- escrow_stakes table
   CREATE TABLE escrow_stakes (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id VARCHAR(255) NOT NULL,
     api_id UUID REFERENCES api_listings(id),
     stake_amount NUMERIC(20, 0) NOT NULL, -- Wei
     status VARCHAR(50) DEFAULT 'active',
     tx_hash VARCHAR(66),
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- usage_logs table
   CREATE TABLE usage_logs (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id VARCHAR(255) NOT NULL,
     api_id UUID REFERENCES api_listings(id),
     endpoint TEXT,
     method VARCHAR(10),
     status_code INTEGER,
     gas_used NUMERIC(20, 0),
     tx_hash VARCHAR(66),
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Add indexes for performance
   CREATE INDEX idx_listings_status ON api_listings(status);
   CREATE INDEX idx_listings_categories ON api_listings USING GIN(categories);
   CREATE INDEX idx_stakes_user ON escrow_stakes(user_id);
   CREATE INDEX idx_usage_api ON usage_logs(api_id);
   ```

### Smart Contract Deployment (Optional)

If redeploying contracts:

```bash
# Install Hardhat/Foundry
cd smart_contracts

# Compile contracts
npx hardhat compile

# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Verify on Etherscan
npx hardhat verify --network sepolia <contract_address>
```

### Installation Steps

1. **Clone repository:**
   ```bash
   git clone https://github.com/ScarRanger/Flux-API.git
   cd Flux-API
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Initialize database:**
   ```bash
   # Run SQL schema from above
   psql -U postgres -d flux_api -f schema.sql
   ```

5. **Seed test data (optional):**
   ```bash
   npx tsx scripts/seed-data.ts
   ```

6. **Start development server:**
   ```bash
   pnpm dev
   ```

7. **Access application:**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - API Docs: [http://localhost:3000/api](http://localhost:3000/api)
   - Chatbot: [http://localhost:3000/chatbot.html](http://localhost:3000/chatbot.html)

## API Reference

### Marketplace Endpoints

**GET `/api/marketplace`**
- Query Parameters: `search`, `category`, `location`, `minPrice`, `maxPrice`
- Returns: Paginated API listings with metadata
- Example: `/api/marketplace?category=AI/ML&location=US`

**GET `/api/marketplace/filters`**
- Returns: Available categories, regions, and price ranges
- Response:
  ```json
  {
    "categories": ["All", "AI/ML", "Data", "Payment"],
    "regions": ["All", "US", "EU", "APAC"],
    "priceRange": { "min": 0, "max": 0.005 }
  }
  ```

**POST `/api/marketplace/purchase`**
- Body: `{ apiId, walletAddress }`
- Creates escrow stake and grants API access
- Returns: Transaction hash and stake details

### Gateway Endpoints

**POST `/api/gateway/call`**
- Headers: `X-BNB-API-Key`, `Authorization`
- Body: `{ base_endpoint, path, method, headers, body }`
- Proxies authenticated API calls with blockchain logging
- Response: Target API response + usage metadata

**OPTIONS `/api/gateway/call`**
- CORS preflight handler
- Returns: CORS headers for cross-origin requests

### Escrow Management

**GET `/api/escrow/stakes?userId=<firebase_uid>`**
- Returns: User's active stakes with current amounts
- Response includes: `stakeAmount`, `apiName`, `status`, `txHash`

**POST `/api/escrow/withdraw`**
- Body: `{ stakeId, walletAddress }`
- Withdraws stake from escrow contract
- Requires: Stake to be in `active` state

**GET `/api/escrow/manage?userId=<firebase_uid>`**
- Returns: Detailed stake information with API metadata
- Includes: Purchase date, usage stats, withdrawal eligibility

### User Management

**GET `/api/user/by-address?address=<wallet_address>`**
- Lookup firebase_uid from wallet address
- Used internally for stake queries

**GET `/api/user/profile?userId=<firebase_uid>`**
- Returns: User profile, wallet balances, API purchases

### Analytics

**GET `/api/stats/global`**
- Returns: Platform-wide metrics (total APIs, transactions, volume)

**GET `/api/stats/seller?sellerId=<firebase_uid>`**
- Returns: Seller-specific analytics (revenue, API performance)

## Smart Contract Interfaces

### PaymentEscrow.sol

```solidity
// Stake ETH for API access
function stakeForAPI(address apiRegistry, uint256 apiId) external payable;

// Withdraw stake after usage
function withdrawStake(uint256 stakeId) external;

// Constants
uint256 public constant STAKE_AMOUNT = 0.1 ether;
```

### APIRegistry.sol

```solidity
// Register new API
function registerAPI(
  string calldata name,
  string calldata endpoint,
  uint256 pricePerCall,
  string[] calldata categories
) external returns (uint256);

// Verify API on-chain
function verifyAPI(uint256 apiId, bool verified) external onlyOwner;
```

### UsageTracking.sol

```solidity
// Log API call on-chain
function logUsage(
  address user,
  uint256 apiId,
  string calldata endpoint,
  uint256 gasUsed
) external;

// Query usage history
function getUserUsage(address user) external view returns (UsageLog[] memory);
```

## Usage Examples

### Buying an API

```typescript
import { ethers } from 'ethers';
import { PaymentEscrowABI } from './smart_contracts/escrow_abi.json';

async function purchaseAPI(apiId: string, walletAddress: string) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  const escrow = new ethers.Contract(
    process.env.NEXT_PUBLIC_PAYMENT_ESCROW_CONTRACT,
    PaymentEscrowABI,
    signer
  );
  
  const tx = await escrow.stakeForAPI(apiId, {
    value: ethers.parseEther('0.1')
  });
  
  await tx.wait();
  return tx.hash;
}
```

### Calling a Purchased API

```typescript
async function callAPI(apiKey: string, endpoint: string, params: any) {
  const response = await fetch('/api/gateway/call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-BNB-API-Key': apiKey
    },
    body: JSON.stringify({
      base_endpoint: 'https://api.example.com',
      path: '/v1/data',
      method: 'GET',
      headers: {},
      body: params
    })
  });
  
  return response.json();
}
```

### Querying Stakes

```typescript
async function getMyStakes(userId: string) {
  const response = await fetch(`/api/escrow/stakes?userId=${userId}`);
  const data = await response.json();
  
  return data.stakes.map((stake: any) => ({
    apiName: stake.api_name,
    amount: ethers.formatEther(stake.stake_amount),
    status: stake.status,
    txHash: stake.tx_hash
  }));
}
```

## Project Structure

```
flux-api/
├── app/                          # Next.js app router
│   ├── api/                      # Backend API routes
│   │   ├── marketplace/          # Marketplace endpoints
│   │   │   ├── route.ts          # List/search APIs
│   │   │   ├── filters/          # Dynamic filter data
│   │   │   └── purchase/         # Purchase API + stake
│   │   ├── gateway/              # API gateway proxy
│   │   │   └── call/             # Authenticated call handler
│   │   ├── escrow/               # Escrow management
│   │   │   ├── stakes/           # Query user stakes
│   │   │   └── manage/           # Stake CRUD operations
│   │   ├── user/                 # User management
│   │   └── stats/                # Analytics endpoints
│   ├── marketplace/              # Marketplace UI
│   ├── buyer/                    # Buyer dashboard
│   ├── seller/                   # Seller dashboard
│   └── profile/                  # User profile
├── components/                   # React components
│   ├── marketplace/              # Marketplace UI components
│   ├── dashboards/               # Dashboard components
│   ├── shared/                   # Shared components
│   └── ui/                       # Shadcn UI primitives
├── lib/                          # Core libraries
│   ├── database.ts               # PostgreSQL connection pool
│   ├── escrow-client.ts          # Escrow contract client
│   ├── api-registry-contract.ts  # Registry contract client
│   ├── blockchain-queue.ts       # Transaction batching
│   ├── keeper-client.ts          # Keeper node client
│   └── wallet-client.ts          # Wallet integration
├── smart_contracts/              # Solidity contracts + ABIs
│   ├── PaymentEscrow.sol
│   ├── APIRegistry.sol
│   ├── UsageTracking.sol
│   ├── KeeperNodeRegistry.sol
│   └── artifacts/                # Compiled contract ABIs
├── middleware.ts                 # Global CORS middleware
├── next.config.mjs               # Next.js configuration
└── tsconfig.json                 # TypeScript config
```

## Security Considerations

### Smart Contract Security
- **Reentrancy Protection**: All state changes before external calls
- **Access Control**: Role-based permissions (owner, keeper, user)
- **Input Validation**: Require statements on all public functions
- **Overflow Protection**: Solidity 0.8.x automatic checks

### Application Security
- **Authentication**: Firebase Auth + wallet signature verification
- **API Key Management**: Encrypted storage, rotatable keys
- **SQL Injection Prevention**: Parameterized queries only
- **CORS**: Configurable origins (currently wildcard for development)
- **Rate Limiting**: Per-user quotas enforced at gateway level

### Best Practices
- **Private Keys**: Never commit to version control (use `.env.local`)
- **RPC Endpoints**: Use rate-limited providers (Alchemy/Infura)
- **Database**: Enable SSL in production (`DATABASE_URL?sslmode=require`)
- **HTTPS**: Always use TLS in production environments

## Performance Optimization

### Database
- **Connection Pooling**: `pg` library with max 20 connections
- **Indexing Strategy**: 
  - B-tree on `status`, `user_id`, `api_id`
  - GIN index on JSONB `categories` column
- **Query Optimization**: Use `EXPLAIN ANALYZE` for slow queries

### Blockchain
- **Transaction Batching**: Queue operations in `lib/blockchain-queue.ts`
- **Gas Estimation**: Pre-calculate gas before transactions
- **Event Listening**: WebSocket connections for real-time updates

### Frontend
- **Code Splitting**: Next.js automatic route-based splitting
- **SWR Caching**: Client-side cache with revalidation
- **Image Optimization**: Next.js `<Image>` component
- **Bundle Analysis**: `pnpm build && pnpm analyze`

## Troubleshooting

### Common Issues

**"PaymentEscrow contract address not configured"**
- Ensure `NEXT_PUBLIC_PAYMENT_ESCROW_CONTRACT` is set in `.env.local`
- Restart dev server after adding environment variables

**"Insufficient stake amount" error**
- Contract requires exactly 0.1 ETH stake
- Check wallet has sufficient Sepolia testnet ETH
- Verify gas fee buffer (total cost ≈ 0.102 ETH)

**CORS errors in browser console**
- Check `middleware.ts` is properly configured
- Verify `Access-Control-Allow-Origin` header in responses
- For production, replace wildcard `*` with specific origins

**Database connection timeout**
- Check PostgreSQL is running: `pg_isready`
- Verify `DATABASE_URL` format: `postgresql://user:pass@host:5432/dbname`
- Increase connection pool size if needed

**Transaction reverted errors**
- Check Sepolia RPC endpoint is responsive
- Verify contract address is correct on Sepolia
- Ensure wallet has sufficient gas for transaction

### Debug Mode

Enable verbose logging:
```bash
# In .env.local
DEBUG=true
LOG_LEVEL=verbose
```

View blockchain queue status:
```typescript
import { getQueueStatus } from '@/lib/blockchain-queue';
const status = await getQueueStatus(); // Returns pending tx count
```

## Deployment

### Production Build

```bash
# Build optimized production bundle
pnpm build

# Start production server
pnpm start
```

### Environment-Specific Config

**Production `.env.production`:**
```bash
# Use mainnet contracts (when ready)
NEXT_PUBLIC_PAYMENT_ESCROW_CONTRACT="<mainnet_address>"
NEXT_PUBLIC_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/<key>"

# Restrict CORS to your domain
ALLOWED_ORIGINS="https://flux-api.com,https://www.flux-api.com"

# Enable production DB SSL
DATABASE_URL="postgresql://user:pass@host:5432/flux_api?sslmode=require"
```

### Recommended Hosting
- **Frontend**: Vercel (Next.js native support)
- **Database**: Supabase, Railway, or AWS RDS
- **RPC Provider**: Alchemy Pro or Infura Premium
- **Monitoring**: Sentry for error tracking, DataDog for metrics

## Contributing

### Development Workflow

1. **Fork repository** and create feature branch
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Follow TypeScript strict mode** conventions
   - All functions must have return types
   - No implicit `any` types
   - Enable ESLint rules: `pnpm lint`

3. **Write tests** for new features
   ```bash
   # Run test suite
   pnpm test
   
   # Test specific file
   pnpm test lib/escrow-client.test.ts
   ```

4. **Update documentation** in README if changing:
   - API endpoints
   - Smart contract interfaces
   - Environment variables
   - Database schema

5. **Submit pull request** with:
   - Clear description of changes
   - Screenshots for UI changes
   - Test results
   - Updated CHANGELOG.md

### Code Style

- **Formatting**: Prettier with 2-space indentation
- **Linting**: ESLint with Next.js rules
- **Naming**: 
  - Components: PascalCase (`ApiCard.tsx`)
  - Utilities: camelCase (`formatAddress()`)
  - Constants: UPPER_SNAKE_CASE (`STAKE_AMOUNT`)

## Roadmap

- [ ] Mainnet deployment (Ethereum L1)
- [ ] L2 support (Arbitrum, Optimism)
- [ ] API usage analytics dashboard
- [ ] Subscription-based pricing models
- [ ] Keeper node incentive mechanism
- [ ] Mobile app (React Native)
- [ ] API versioning and deprecation
- [ ] Dispute resolution system

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenZeppelin for smart contract libraries
- Shadcn for UI component primitives
- Ethers.js for Ethereum interaction
- Google Gemini for AI capabilities

---

**Built by [Rhine Pereira](https://github.com/ScarRanger), [@ashleyalmeida07](https://github.com/ashleyalmeida07), [@Jason3105](https://github.com/Jason3105) | October 2025**

For support: [GitHub Issues](https://github.com/ScarRanger/Flux-API/issues) | [Discussions](https://github.com/ScarRanger/Flux-API/discussions)
