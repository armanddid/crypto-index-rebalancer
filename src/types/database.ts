// Database model types (SQLite row types)

export interface UserRow {
  user_id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
}

export interface AccountRow {
  account_id: string;
  user_id: string;
  name: string;
  wallet_address: string;
  encrypted_private_key: string;
  deposit_addresses: string; // JSON string
  created_at: string;
}

export interface IndexRow {
  index_id: string;
  account_id: string;
  name: string;
  description: string | null;
  status: string;
  target_allocation: string; // JSON string
  current_allocation: string | null; // JSON string
  total_value: number;
  total_drift: number;
  rebalancing_config: string; // JSON string
  risk_config: string; // JSON string
  last_rebalance: string | null;
  next_rebalance_check: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeRow {
  trade_id: string;
  index_id: string;
  rebalance_id: string | null;
  type: string;
  action: string;
  from_asset: string;
  to_asset: string;
  amount: number;
  executed_price: number | null;
  status: string;
  near_deposit_address: string | null;
  near_tx_hash: string | null;
  retry_attempt: number;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface RebalanceRow {
  rebalance_id: string;
  index_id: string;
  reason: string;
  total_drift: number;
  status: string;
  trades_count: number;
  completed_trades_count: number;
  cost: number;
  duration: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface WebhookRow {
  webhook_id: string;
  user_id: string;
  url: string;
  events: string; // JSON string
  secret: string;
  active: number; // SQLite boolean (0 or 1)
  created_at: string;
}

export interface RefreshTokenRow {
  token_id: string;
  user_id: string;
  refresh_token: string;
  expires_at: string;
  created_at: string;
}

export interface PriceHistoryRow {
  id: number;
  symbol: string;
  price: number;
  timestamp: string;
}

