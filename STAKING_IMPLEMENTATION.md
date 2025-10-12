# API Key Security with 0.1 ETH Minimum Staking

## Overview

This implementation adds a **0.1 ETH minimum staking requirement** for API key purchases to prevent theft and misuse of API keys, as mentioned in the problem statement. The system uses an escrow-based approach where users must stake 0.1 ETH to obtain API keys, providing financial incentive to prevent malicious behavior.

## How It Works

### 1. Staking Requirement
- **Minimum Stake**: 0.1 ETH required for all API key purchases
- **Security Purpose**: Prevents API key theft and leak by requiring collateral
- **Upgrade Support**: Existing stake holders can upgrade quota without additional deposit

### 2. Purchase Flow Enhancement

#### Original Flow:
1. User pays for API access directly
2. Receives API key immediately
3. No security mechanism against misuse

#### Enhanced Flow with Staking:
1. User initiates purchase with `isUpgrade` flag (optional)
2. System checks for existing stake for the API listing
3. **New Users**: Must deposit 0.1 ETH stake + API cost
4. **Existing Users**: Can upgrade quota using existing stake
5. Stake is recorded in `escrow_stakes` table
6. API key is generated after successful staking
7. User receives API access with stake protection

### 3. Database Schema

```sql
-- Escrow Stakes Table
CREATE TABLE escrow_stakes (
    deposit_id SERIAL PRIMARY KEY,
    buyer_uid VARCHAR(128) NOT NULL,
    api_listing_id INTEGER NOT NULL,
    stake_amount DECIMAL(18, 10) NOT NULL DEFAULT 0.1,
    quota_purchased INTEGER NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    is_upgraded BOOLEAN DEFAULT FALSE,
    upgraded_at TIMESTAMP,
    slashed_amount DECIMAL(18, 10) DEFAULT 0,
    slashed_at TIMESTAMP,
    slash_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### 1. Enhanced Purchase Endpoint
**POST** `/api/marketplace/purchase`

#### Request Body:
```json
{
  "buyerId": "firebase_uid",
  "listingId": 123,
  "packageSize": 1000,
  "totalAmount": 0.15,
  "isUpgrade": false
}
```

#### Response:
```json
{
  "success": true,
  "purchase": { ... },
  "apiAccess": { ... },
  "escrowStake": {
    "depositId": 456,
    "stakeAmount": "0.1",
    "transactionHash": "0x...",
    "isUpgrade": false,
    "securityNote": "Your 0.1 ETH stake secures this API key and prevents theft."
  }
}
```

### 2. Stake Management Endpoint
**POST** `/api/escrow/manage`

#### Withdraw Stake:
```json
{
  "action": "withdraw",
  "depositId": 456,
  "buyerUid": "firebase_uid"
}
```

#### Administrative Slash (for malicious behavior):
```json
{
  "action": "slash",
  "depositId": 456,
  "adminUid": "admin_firebase_uid",
  "slashReason": "API key misuse detected"
}
```

#### Query Stakes:
**GET** `/api/escrow/manage?buyerUid=firebase_uid&listingId=123`

## Smart Contracts

### 1. PaymentEscrow Contract
- **Location**: `smart_contracts/PaymentEscrow.sol`
- **Purpose**: Manages 0.1 ETH minimum stakes with upgrade logic
- **Key Features**:
  - Minimum 0.1 ETH deposit validation
  - Upgrade prevention for double deposits
  - Administrative slashing for malicious behavior
  - Withdrawal mechanisms after API usage completion

### 2. Existing Escrow Client
- **Location**: `lib/escrow-client.ts`
- **Integration**: Modified to work with existing escrow system
- **Features**: Stake deposits, withdrawals, and query functionality

## Security Features

### 1. Minimum Stake Enforcement
```typescript
const MIN_STAKE_ETH = "0.1"
const minStakeWei = ethers.parseEther(MIN_STAKE_ETH)

// Validation in contract and backend
if (currentStake < minStakeWei) {
  throw new Error(`Stake ${existingStake.stake_amount} ETH is below minimum required ${MIN_STAKE_ETH} ETH`)
}
```

### 2. Upgrade Logic Prevention
- Users with existing stakes can upgrade quota without additional deposits
- Prevents double-staking for the same API listing
- Tracks upgrade history with timestamps

### 3. Slashing Mechanism
- Administrative function to slash stakes for malicious behavior
- Audit logging for all administrative actions
- Funds recovery for ecosystem protection

## Usage Examples

### 1. First-time API Key Purchase (New Stake)
```bash
curl -X POST /api/marketplace/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "buyerId": "user123",
    "listingId": 1,
    "packageSize": 1000,
    "totalAmount": 0.15,
    "isUpgrade": false
  }'
```

### 2. Quota Upgrade (Existing Stake)
```bash
curl -X POST /api/marketplace/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "buyerId": "user123",
    "listingId": 1,
    "packageSize": 2000,
    "totalAmount": 0.10,
    "isUpgrade": true
  }'
```

### 3. Stake Withdrawal
```bash
curl -X POST /api/escrow/manage \
  -H "Content-Type: application/json" \
  -d '{
    "action": "withdraw",
    "depositId": 456,
    "buyerUid": "user123"
  }'
```

## Configuration

### Environment Variables
```bash
# PaymentEscrow Contract Address (deploy and update)
NEXT_PUBLIC_PAYMENT_ESCROW_CONTRACT=0x0000000000000000000000000000000000000000

# Admin private key for slashing operations
ADMIN_PRIVATE_KEY=0x...

# RPC URL for blockchain interaction
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/...
```

### Database Migration
Run the escrow stakes table creation:
```sql
-- Execute lib/escrow-stakes.sql
```

## Benefits

### 1. **API Key Security**
- 0.1 ETH collateral prevents casual theft/sharing
- Financial disincentive for malicious behavior
- Traceable blockchain transactions for accountability

### 2. **Upgrade Flexibility**
- Existing users can increase quota without new stakes
- Seamless user experience for legitimate usage
- Cost-effective scaling for API consumers

### 3. **Administrative Control**
- Slashing mechanism for policy enforcement
- Audit trails for all stake-related actions
- Recovery mechanisms for ecosystem protection

### 4. **Economic Alignment**
- Users have skin in the game for proper API usage
- Sellers protected from key misuse
- Platform revenue from stake management

## Security Considerations

1. **Minimum Stake Validation**: Enforced at both contract and application levels
2. **Upgrade Logic**: Prevents double deposits while allowing quota increases
3. **Administrative Controls**: Proper role-based access for slashing operations
4. **Audit Logging**: Complete trail of all stake-related activities
5. **Withdrawal Protection**: Time locks and validation before stake recovery

## Next Steps

1. **Deploy PaymentEscrow Contract**: Update `NEXT_PUBLIC_PAYMENT_ESCROW_CONTRACT` with deployed address
2. **Test Integration**: Verify purchase flow with staking requirements
3. **Monitor Stakes**: Implement dashboard for stake management
4. **Automate Slashing**: Set up monitoring for automatic malicious behavior detection

This implementation successfully addresses the problem statement requirement for "stake amount min 0.1" to prevent API key theft and leakage through financial incentives and administrative controls.