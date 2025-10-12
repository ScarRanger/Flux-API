-- Escrow Stakes Table for PaymentEscrow System
-- Tracks 0.1 ETH minimum stakes for API key security

CREATE TABLE IF NOT EXISTS escrow_stakes (
    deposit_id SERIAL PRIMARY KEY,
    buyer_uid VARCHAR(128) NOT NULL,
    api_listing_id INTEGER NOT NULL,
    stake_amount DECIMAL(18, 10) NOT NULL DEFAULT 0.1,
    quota_purchased INTEGER NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    is_upgraded BOOLEAN DEFAULT FALSE,
    upgraded_at TIMESTAMP,
    upgrade_tx_hash VARCHAR(66),
    slashed_amount DECIMAL(18, 10) DEFAULT 0,
    slashed_at TIMESTAMP,
    slash_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_escrow_buyer 
        FOREIGN KEY (buyer_uid) 
        REFERENCES users(firebase_uid) 
        ON DELETE CASCADE,
        
    CONSTRAINT fk_escrow_listing 
        FOREIGN KEY (api_listing_id) 
        REFERENCES api_listings(id) 
        ON DELETE CASCADE,
        
    CONSTRAINT ck_stake_amount 
        CHECK (stake_amount >= 0.1),
        
    CONSTRAINT ck_status 
        CHECK (status IN ('active', 'slashed', 'withdrawn'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_escrow_stakes_buyer ON escrow_stakes(buyer_uid);
CREATE INDEX IF NOT EXISTS idx_escrow_stakes_listing ON escrow_stakes(api_listing_id);
CREATE INDEX IF NOT EXISTS idx_escrow_stakes_status ON escrow_stakes(status);
CREATE INDEX IF NOT EXISTS idx_escrow_stakes_tx_hash ON escrow_stakes(transaction_hash);

-- Unique constraint to prevent duplicate active stakes
CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_stakes_unique_active 
    ON escrow_stakes(buyer_uid, api_listing_id) 
    WHERE status = 'active';

-- Add comments
COMMENT ON TABLE escrow_stakes IS 'Tracks PaymentEscrow stakes for API key security with 0.1 ETH minimum';
COMMENT ON COLUMN escrow_stakes.stake_amount IS 'Amount staked in ETH, minimum 0.1 ETH required';
COMMENT ON COLUMN escrow_stakes.status IS 'Stake status: active, slashed, or withdrawn';
COMMENT ON COLUMN escrow_stakes.is_upgraded IS 'Whether this stake has been upgraded for additional quota';
COMMENT ON COLUMN escrow_stakes.slashed_amount IS 'Amount slashed for malicious behavior';