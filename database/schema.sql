-- Users table (if not exists)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  firebase_uid VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  photo_url TEXT,
  wallet_address VARCHAR(255) UNIQUE NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  encryption_salt VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'buyer',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Buyer Stats
CREATE TABLE IF NOT EXISTS buyer_stats (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  quota_purchased INTEGER DEFAULT 0,
  quota_used INTEGER DEFAULT 0,
  cost_saved_usd DECIMAL(10, 2) DEFAULT 0,
  active_subscriptions INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- API Usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  api VARCHAR(255) NOT NULL,
  calls INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 4) DEFAULT 0,
  avg_latency_ms INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 4) DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user_date ON api_usage(user_id, date);

-- API Call Logs
CREATE TABLE IF NOT EXISTS api_call_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  api VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  path TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  latency_ms INTEGER NOT NULL,
  cost DECIMAL(10, 6) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_call_logs_user_time ON api_call_logs(user_id, timestamp);

-- Seller Stats
CREATE TABLE IF NOT EXISTS seller_stats (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  earnings_usd DECIMAL(10, 2) DEFAULT 0,
  active_listings INTEGER DEFAULT 0,
  calls_served INTEGER DEFAULT 0,
  avg_price_per_call_usd DECIMAL(10, 6) DEFAULT 0,
  quota_available INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- API Listings
CREATE TABLE IF NOT EXISTS api_listings (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  api VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  status VARCHAR(20) DEFAULT 'active',
  price_usd DECIMAL(10, 6) NOT NULL,
  quota INTEGER NOT NULL,
  earnings_usd DECIMAL(10, 2) DEFAULT 0,
  location VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_listings_user_status ON api_listings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_listings_category ON api_listings(category);

-- Earnings History
CREATE TABLE IF NOT EXISTS earnings_history (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  earnings DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_earnings_user_date ON earnings_history(user_id, date);

-- Top Buyers
CREATE TABLE IF NOT EXISTS top_buyers (
  id SERIAL PRIMARY KEY,
  seller_id VARCHAR(255) NOT NULL,
  buyer_name VARCHAR(255) NOT NULL,
  calls INTEGER DEFAULT 0,
  spend_usd DECIMAL(10, 2) DEFAULT 0,
  returning BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_top_buyers_seller ON top_buyers(seller_id);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  seller_id VARCHAR(255) NOT NULL,
  buyer_id VARCHAR(255) NOT NULL,
  api_listing_id INTEGER REFERENCES api_listings(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reviews_seller_rating ON reviews(seller_id, rating);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id SERIAL PRIMARY KEY,
  buyer_id VARCHAR(255) NOT NULL,
  api_listing_id INTEGER REFERENCES api_listings(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  total_price DECIMAL(10, 4) NOT NULL,
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON purchases(buyer_id, created_at);
