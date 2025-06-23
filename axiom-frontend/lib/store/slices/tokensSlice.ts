import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Token, LoadingState, PaginationState } from '@/lib/types';

interface TokensState {
  tokens: Token[];
  selectedTokens: string[];
  favoriteTokens: string[];
  loading: LoadingState;
  pagination: PaginationState;
  lastUpdated: number;
  priceUpdates: Record<string, {
    price: number;
    change: number;
    timestamp: number;
    animate: boolean;
  }>;
  searchQuery: string;
  isRealTimeEnabled: boolean;
  lastUpdateTimestamps: Record<string, number>;
}

const initialState: TokensState = {
  tokens: [],
  selectedTokens: [],
  favoriteTokens: [],
  loading: {
    isLoading: false,
    isRefreshing: false,
    error: null,
  },
  pagination: {
    page: 1,
    pageSize: 6,
    total: 0,
    cursor: undefined,
    hasMore: false,
  },
  lastUpdated: 0,
  priceUpdates: {},
  searchQuery: '',
  isRealTimeEnabled: true,
  lastUpdateTimestamps: {},
};

// Throttle constant - minimum time between updates for same token (in ms)
const UPDATE_THROTTLE_MS = 500;

const tokensSlice = createSlice({
  name: 'tokens',
  initialState,
  reducers: {
    setTokens: (state, action: PayloadAction<Token[]>) => {
      state.tokens = action.payload;
      state.lastUpdated = Date.now();
    },
    
    addTokens: (state, action: PayloadAction<Token[]>) => {
      const existingIds = new Set(state.tokens.map(t => t.id));
      const newTokens = action.payload.filter(t => !existingIds.has(t.id));
      state.tokens.push(...newTokens);
    },
    
    updateToken: (state, action: PayloadAction<Partial<Token> & { id: string }>) => {
      const index = state.tokens.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.tokens[index] = { ...state.tokens[index], ...action.payload };
      }
    },
    
    updateTokenPrice: (state, action: PayloadAction<{
      tokenId: string;
      price: number;
      change: number;
      volume?: number;
      liquidity?: number;
    }>) => {
      const { tokenId, price, change, volume, liquidity } = action.payload;
      const now = Date.now();
      const lastUpdate = state.lastUpdateTimestamps[tokenId] || 0;
      
      // Throttle updates - only allow updates every UPDATE_THROTTLE_MS
      if (now - lastUpdate < UPDATE_THROTTLE_MS) {
        return; // Skip this update
      }
      
      const tokenIndex = state.tokens.findIndex(t => t.id === tokenId);
      
      if (tokenIndex !== -1) {
        const currentPrice = state.tokens[tokenIndex].priceData.current;
        // Only update if price actually changed significantly (avoid micro-changes)
        const priceChangeThreshold = Math.abs((price - currentPrice) / currentPrice) > 0.001; // 0.1% threshold
        
        if (priceChangeThreshold) {
          state.tokens[tokenIndex].priceData.current = price;
          state.tokens[tokenIndex].priceData.change24h = change;
          if (volume !== undefined) {
            state.tokens[tokenIndex].volume24h = volume;
          }
          if (liquidity !== undefined) {
            state.tokens[tokenIndex].liquidity = liquidity;
          }
          
          state.priceUpdates[tokenId] = {
            price,
            change,
            timestamp: now,
            animate: true,
          };
          
          state.lastUpdateTimestamps[tokenId] = now;
        }
      }
    },
    
    toggleTokenSelection: (state, action: PayloadAction<string>) => {
      const tokenId = action.payload;
      const index = state.selectedTokens.indexOf(tokenId);
      if (index === -1) {
        state.selectedTokens.push(tokenId);
      } else {
        state.selectedTokens.splice(index, 1);
      }
    },
    
    clearTokenSelection: (state) => {
      state.selectedTokens = [];
    },
    
    toggleFavoriteToken: (state, action: PayloadAction<string>) => {
      const tokenId = action.payload;
      const index = state.favoriteTokens.indexOf(tokenId);
      if (index === -1) {
        state.favoriteTokens.push(tokenId);
      } else {
        state.favoriteTokens.splice(index, 1);
      }
    },
    
    setLoading: (state, action: PayloadAction<Partial<LoadingState>>) => {
      state.loading = { ...state.loading, ...action.payload };
    },
    
    setPagination: (state, action: PayloadAction<Partial<PaginationState>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    
    toggleRealTime: (state) => {
      state.isRealTimeEnabled = !state.isRealTimeEnabled;
    },
    
    clearPriceAnimations: (state) => {
      Object.keys(state.priceUpdates).forEach(tokenId => {
        if (state.priceUpdates[tokenId]) {
          state.priceUpdates[tokenId].animate = false;
        }
      });
    },
    
    removeToken: (state, action: PayloadAction<string>) => {
      const tokenId = action.payload;
      state.tokens = state.tokens.filter(t => t.id !== tokenId);
      state.selectedTokens = state.selectedTokens.filter(id => id !== tokenId);
      delete state.priceUpdates[tokenId];
      delete state.lastUpdateTimestamps[tokenId];
    },
  },
});

export const {
  setTokens,
  addTokens,
  updateToken,
  updateTokenPrice,
  toggleTokenSelection,
  clearTokenSelection,
  toggleFavoriteToken,
  setLoading,
  setPagination,
  setSearchQuery,
  toggleRealTime,
  clearPriceAnimations,
  removeToken,
} = tokensSlice.actions;

export default tokensSlice.reducer; 