// Shared types that can be used on both client and server
export interface User {
  id: string;
  firebase_uid: string;
  email: string;
  display_name?: string;
  photo_url?: string;
  wallet_address: string;
  encrypted_private_key: string; // Server-side only
  encryption_salt: string; // Server-side only
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

export interface UserBalance {
  id: string;
  user_id: string;
  escrow_balance: number;
  earnings_balance: number;
  total_spent: number;
  total_earned: number;
  created_at: Date;
  updated_at: Date;
}

export interface APIQuota {
  id: string;
  user_id: string;
  api_endpoint: string;
  quota_amount: number;
  used_amount: number;
  price_per_call: number;
  token_id?: string;
  created_at: Date;
  updated_at: Date;
}