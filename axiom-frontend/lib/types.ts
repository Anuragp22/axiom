// Token Trading Table Types

export interface TokenInfo {
  id: string;
  symbol: string;
  name: string;
  image: string;
  chainId: number;
  address: string;
  decimals: number;
}

export interface PairInfo {
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  pairAddress: string;
  dexId: string;
  url: string;
}

export interface SocialLinks {
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  github?: string;
}

export interface AuditInfo {
  honeypot: boolean;
  honeypotPercentage?: number;
  isVerified: boolean;
  isScam: boolean;
  rugRisk: 'low' | 'medium' | 'high';
  liquidityLocked: boolean;
  mintDisabled: boolean;
  riskScore: number;
  burnPercentage: number;
  isPaid: boolean;
}

export interface PriceData {
  current: number;
  change24h: number;
  change1h: number;
  change5m: number;
  high24h: number;
  low24h: number;
}

export interface VolumeData {
  h24: number;
  h6: number;
  h1: number;
  m5: number;
}

export interface TransactionData {
  buys24h: number;
  sells24h: number;
  total24h: number;
  makers: number;
  swaps: number;
}

export interface LiquidityData {
  usd: number;
  base: number;
  quote: number;
}

export interface Token {
  id: string;
  name: string;
  symbol: string;
  imageUrl: string;
  pairInfo: PairInfo;
  priceData: PriceData;
  volumeData: VolumeData;
  transactionData: TransactionData;
  liquidityData: LiquidityData;
  marketCap: number;
  liquidity: number;
  volume24h: number;
  transactions24h: number;
  buys24h: number;
  sells24h: number;
  priceChange24h: number;
  fdv: number; // Fully Diluted Valuation
  audit: AuditInfo;
  socialLinks: SocialLinks;
  age: string; // Age display string like "51m"
  communityUrl?: string;
  isPumpFun: boolean;
  isGraduated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TableFilters {
  minLiquidity?: number;
  maxLiquidity?: number;
  minMarketCap?: number;
  maxMarketCap?: number;
  minVolume?: number;
  maxVolume?: number;
  onlyVerified?: boolean;
  onlyGraduated?: boolean;
  excludeRugs?: boolean;
  timeframe: '5m' | '1h' | '6h' | '24h';
  sortBy: SortOption;
  sortDirection: 'asc' | 'desc';
}

export type SortOption = 
  | 'marketCap'
  | 'liquidity'
  | 'volume'
  | 'priceChange'
  | 'age'
  | 'transactions';

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface LoadingState {
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

// WebSocket Message Types
export interface WSPriceUpdate {
  type: 'PRICE_UPDATE';
  tokenId: string;
  price: number;
  change: number;
  volume: number;
  timestamp: number;
}

export interface WSTokenUpdate {
  type: 'TOKEN_UPDATE';
  token: Partial<Token>;
  timestamp: number;
}

export interface WSNewToken {
  type: 'NEW_TOKEN';
  token: Token;
  timestamp: number;
}

export type WSMessage = WSPriceUpdate | WSTokenUpdate | WSNewToken;

// Component Props Types
export interface TokenRowProps {
  token: Token;
  isSelected?: boolean;
  onSelect?: (tokenId: string) => void;
  onBuy?: (token: Token) => void;
}

export interface HeaderControlsProps {
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  onFilterOpen: () => void;
  onSettingsOpen: () => void;
}

export interface QuickBuyProps {
  amount: string;
  onAmountChange: (amount: string) => void;
  selectedToken?: string;
  onTokenSelect: (token: string) => void;
}

// Error Types
export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
}

// Response Types
export interface TokenListResponse {
  tokens: Token[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: TableFilters;
}

export interface TokenDetailsResponse {
  token: Token;
  priceHistory: Array<{
    timestamp: number;
    price: number;
    volume: number;
  }>;
}

// Modal Types
export interface ModalState {
  tokenDetails: {
    isOpen: boolean;
    tokenId: string | null;
  };
  filters: {
    isOpen: boolean;
  };
  settings: {
    isOpen: boolean;
  };
  buy: {
    isOpen: boolean;
    token: Token | null;
  };
}

// User Preferences
export interface UserPreferences {
  defaultTimeframe: string;
  autoRefresh: boolean;
  refreshInterval: number;
  defaultFilters: Partial<TableFilters>;
  favoriteTokens: string[];
  notifications: {
    priceAlerts: boolean;
    newTokens: boolean;
    volumeSpikes: boolean;
  };
} 