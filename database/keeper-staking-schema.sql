-- Keeper Nodes Staking and Reputation System
-- Database schema for tracking keeper node operations

-- Main keeper nodes table
CREATE TABLE IF NOT EXISTS keeper_nodes (
  id SERIAL PRIMARY KEY,
  node_address VARCHAR(42) UNIQUE NOT NULL,
  owner_uid VARCHAR(255) NOT NULL,
  staked_amount DECIMAL(20, 18) NOT NULL DEFAULT 0,
  reputation_score INTEGER NOT NULL DEFAULT 100 CHECK (reputation_score >= 0 AND reputation_score <= 100),
  reputation_tier VARCHAR(20) NOT NULL DEFAULT 'EXCELLENT',
  total_tasks_completed INTEGER NOT NULL DEFAULT 0,
  total_tasks_failed INTEGER NOT NULL DEFAULT 0,
  total_slash_count INTEGER NOT NULL DEFAULT 0,
  registration_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_activity_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unstake_request_time TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  suspension_reason TEXT,
  node_metadata JSONB,
  blockchain_tx_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_uid) REFERENCES users(firebase_uid) ON DELETE CASCADE
);

-- Slash events table
CREATE TABLE IF NOT EXISTS keeper_slash_events (
  id SERIAL PRIMARY KEY,
  node_address VARCHAR(42) NOT NULL,
  reporter_address VARCHAR(42),
  slash_amount DECIMAL(20, 18) NOT NULL,
  slash_reason VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  evidence_ipfs_hash TEXT,
  evidence_description TEXT,
  disputed BOOLEAN NOT NULL DEFAULT false,
  dispute_reason TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolution_details TEXT,
  blockchain_tx_hash VARCHAR(255),
  blockchain_block BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  FOREIGN KEY (node_address) REFERENCES keeper_nodes(node_address) ON DELETE CASCADE
);

-- Task assignments to keeper nodes
CREATE TABLE IF NOT EXISTS keeper_task_assignments (
  id SERIAL PRIMARY KEY,
  node_address VARCHAR(42) NOT NULL,
  task_type VARCHAR(50) NOT NULL,
  api_listing_id INTEGER NOT NULL,
  buyer_uid VARCHAR(255) NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  success BOOLEAN,
  failure_reason TEXT,
  response_time_ms INTEGER,
  blockchain_tx_hash VARCHAR(255),
  FOREIGN KEY (node_address) REFERENCES keeper_nodes(node_address) ON DELETE CASCADE,
  FOREIGN KEY (api_listing_id) REFERENCES api_listings(id) ON DELETE CASCADE
);

-- Keeper node performance metrics (aggregated)
CREATE TABLE IF NOT EXISTS keeper_performance_metrics (
  id SERIAL PRIMARY KEY,
  node_address VARCHAR(42) NOT NULL,
  metric_date DATE NOT NULL,
  tasks_assigned INTEGER NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  tasks_failed INTEGER NOT NULL DEFAULT 0,
  avg_response_time_ms INTEGER,
  uptime_percentage DECIMAL(5, 2),
  slash_count INTEGER NOT NULL DEFAULT 0,
  reputation_score_start INTEGER,
  reputation_score_end INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(node_address, metric_date),
  FOREIGN KEY (node_address) REFERENCES keeper_nodes(node_address) ON DELETE CASCADE
);

-- Stake history for auditing
CREATE TABLE IF NOT EXISTS keeper_stake_history (
  id SERIAL PRIMARY KEY,
  node_address VARCHAR(42) NOT NULL,
  action VARCHAR(20) NOT NULL,
  amount DECIMAL(20, 18) NOT NULL,
  previous_stake DECIMAL(20, 18) NOT NULL,
  new_stake DECIMAL(20, 18) NOT NULL,
  blockchain_tx_hash VARCHAR(255),
  blockchain_block BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (node_address) REFERENCES keeper_nodes(node_address) ON DELETE CASCADE
);

-- Reputation history for tracking changes
CREATE TABLE IF NOT EXISTS keeper_reputation_history (
  id SERIAL PRIMARY KEY,
  node_address VARCHAR(42) NOT NULL,
  previous_score INTEGER NOT NULL,
  new_score INTEGER NOT NULL,
  change_reason VARCHAR(100) NOT NULL,
  associated_task_id INTEGER,
  associated_slash_id INTEGER,
  blockchain_tx_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (node_address) REFERENCES keeper_nodes(node_address) ON DELETE CASCADE,
  FOREIGN KEY (associated_task_id) REFERENCES keeper_task_assignments(id) ON DELETE SET NULL,
  FOREIGN KEY (associated_slash_id) REFERENCES keeper_slash_events(id) ON DELETE SET NULL
);

-- API key assignments to keeper nodes (secure tracking)
CREATE TABLE IF NOT EXISTS keeper_api_key_assignments (
  id SERIAL PRIMARY KEY,
  node_address VARCHAR(42) NOT NULL,
  api_listing_id INTEGER NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP,
  access_count INTEGER NOT NULL DEFAULT 0,
  last_access_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  revocation_reason TEXT,
  FOREIGN KEY (node_address) REFERENCES keeper_nodes(node_address) ON DELETE CASCADE,
  FOREIGN KEY (api_listing_id) REFERENCES api_listings(id) ON DELETE CASCADE
);

-- Dispute resolution tracking
CREATE TABLE IF NOT EXISTS keeper_dispute_resolutions (
  id SERIAL PRIMARY KEY,
  slash_event_id INTEGER NOT NULL,
  arbitrator_uid VARCHAR(255),
  decision VARCHAR(20) NOT NULL,
  refund_amount DECIMAL(20, 18),
  resolution_notes TEXT,
  evidence_reviewed JSONB,
  blockchain_tx_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (slash_event_id) REFERENCES keeper_slash_events(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_keeper_nodes_address ON keeper_nodes(node_address);
CREATE INDEX IF NOT EXISTS idx_keeper_nodes_active ON keeper_nodes(is_active, is_suspended);
CREATE INDEX IF NOT EXISTS idx_keeper_nodes_reputation ON keeper_nodes(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_keeper_nodes_stake ON keeper_nodes(staked_amount DESC);

CREATE INDEX IF NOT EXISTS idx_keeper_slash_events_node ON keeper_slash_events(node_address);
CREATE INDEX IF NOT EXISTS idx_keeper_slash_events_time ON keeper_slash_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_keeper_slash_events_disputed ON keeper_slash_events(disputed, resolved);

CREATE INDEX IF NOT EXISTS idx_keeper_task_assignments_node ON keeper_task_assignments(node_address);
CREATE INDEX IF NOT EXISTS idx_keeper_task_assignments_time ON keeper_task_assignments(assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_keeper_task_assignments_api ON keeper_task_assignments(api_listing_id);

CREATE INDEX IF NOT EXISTS idx_keeper_performance_date ON keeper_performance_metrics(node_address, metric_date DESC);

CREATE INDEX IF NOT EXISTS idx_keeper_stake_history_node ON keeper_stake_history(node_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_keeper_reputation_history_node ON keeper_reputation_history(node_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_keeper_api_key_assignments_node ON keeper_api_key_assignments(node_address, is_active);
CREATE INDEX IF NOT EXISTS idx_keeper_api_key_assignments_api ON keeper_api_key_assignments(api_listing_id, is_active);

-- Views for common queries

-- Active keeper nodes with good reputation
CREATE OR REPLACE VIEW active_keeper_nodes AS
SELECT 
  kn.*,
  CASE 
    WHEN kn.total_tasks_completed + kn.total_tasks_failed > 0 
    THEN (kn.total_tasks_completed::DECIMAL / (kn.total_tasks_completed + kn.total_tasks_failed) * 100)::INTEGER
    ELSE 100
  END as success_rate,
  (SELECT COUNT(*) FROM keeper_slash_events WHERE node_address = kn.node_address) as total_slashes,
  (SELECT COUNT(*) FROM keeper_api_key_assignments WHERE node_address = kn.node_address AND is_active = true) as active_key_assignments
FROM keeper_nodes kn
WHERE kn.is_active = true 
  AND kn.is_suspended = false
  AND kn.staked_amount >= 0.1
  AND kn.reputation_score >= 40
ORDER BY kn.reputation_score DESC, kn.staked_amount DESC;

-- Keeper node leaderboard
CREATE OR REPLACE VIEW keeper_node_leaderboard AS
SELECT 
  kn.node_address,
  kn.reputation_score,
  kn.reputation_tier,
  kn.staked_amount,
  kn.total_tasks_completed,
  kn.total_tasks_failed,
  CASE 
    WHEN kn.total_tasks_completed + kn.total_tasks_failed > 0 
    THEN ROUND((kn.total_tasks_completed::DECIMAL / (kn.total_tasks_completed + kn.total_tasks_failed) * 100), 2)
    ELSE 100
  END as success_rate_percentage,
  kn.total_slash_count,
  (SELECT AVG(response_time_ms) FROM keeper_task_assignments WHERE node_address = kn.node_address AND success = true) as avg_response_time_ms,
  kn.registration_time,
  kn.last_activity_time,
  u.display_name as owner_name,
  u.email as owner_email
FROM keeper_nodes kn
JOIN users u ON kn.owner_uid = u.firebase_uid
WHERE kn.is_active = true
ORDER BY kn.reputation_score DESC, kn.total_tasks_completed DESC, kn.staked_amount DESC;

-- Functions

-- Update reputation tier based on score
CREATE OR REPLACE FUNCTION update_reputation_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reputation_score >= 95 THEN
    NEW.reputation_tier := 'EXCELLENT';
  ELSIF NEW.reputation_score >= 80 THEN
    NEW.reputation_tier := 'GOOD';
  ELSIF NEW.reputation_score >= 60 THEN
    NEW.reputation_tier := 'FAIR';
  ELSIF NEW.reputation_score >= 40 THEN
    NEW.reputation_tier := 'POOR';
  ELSE
    NEW.reputation_tier := 'CRITICAL';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update reputation tier
CREATE TRIGGER trigger_update_reputation_tier
BEFORE INSERT OR UPDATE OF reputation_score ON keeper_nodes
FOR EACH ROW
EXECUTE FUNCTION update_reputation_tier();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_keeper_nodes_updated_at
BEFORE UPDATE ON keeper_nodes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-suspend node if stake drops below minimum
CREATE OR REPLACE FUNCTION check_minimum_stake()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.staked_amount < 0.1 AND NEW.is_active = true THEN
    NEW.is_suspended := true;
    NEW.suspension_reason := 'Stake dropped below minimum requirement (0.1 ETH)';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_minimum_stake
BEFORE UPDATE OF staked_amount ON keeper_nodes
FOR EACH ROW
EXECUTE FUNCTION check_minimum_stake();

-- Comments for documentation
COMMENT ON TABLE keeper_nodes IS 'Main registry of keeper nodes with staking and reputation tracking';
COMMENT ON TABLE keeper_slash_events IS 'Records of all slashing events against keeper nodes';
COMMENT ON TABLE keeper_task_assignments IS 'Task assignments and completions for keeper nodes';
COMMENT ON TABLE keeper_performance_metrics IS 'Daily aggregated performance metrics per keeper node';
COMMENT ON TABLE keeper_stake_history IS 'Audit trail of all staking actions';
COMMENT ON TABLE keeper_reputation_history IS 'Audit trail of reputation score changes';
COMMENT ON TABLE keeper_api_key_assignments IS 'Tracks which keeper nodes have access to which API keys';
COMMENT ON TABLE keeper_dispute_resolutions IS 'Records of dispute resolutions for slash events';
