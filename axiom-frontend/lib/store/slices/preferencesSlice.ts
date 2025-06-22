import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserPreferences, TableFilters } from '@/lib/types';

const initialState: UserPreferences = {
  defaultTimeframe: '24h',
  autoRefresh: true,
  refreshInterval: 30000, // 30 seconds
  defaultFilters: {
    timeframe: '24h',
    sortBy: 'marketCap',
    sortDirection: 'desc',
    excludeRugs: true,
  },
  favoriteTokens: [],
  notifications: {
    priceAlerts: true,
    newTokens: true,
    volumeSpikes: true,
  },
};

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setDefaultTimeframe: (state, action: PayloadAction<string>) => {
      state.defaultTimeframe = action.payload;
    },
    
    toggleAutoRefresh: (state) => {
      state.autoRefresh = !state.autoRefresh;
    },
    
    setRefreshInterval: (state, action: PayloadAction<number>) => {
      state.refreshInterval = action.payload;
    },
    
    setDefaultFilters: (state, action: PayloadAction<Partial<TableFilters>>) => {
      state.defaultFilters = { ...state.defaultFilters, ...action.payload };
    },
    
    addFavoriteToken: (state, action: PayloadAction<string>) => {
      const tokenId = action.payload;
      if (!state.favoriteTokens.includes(tokenId)) {
        state.favoriteTokens.push(tokenId);
      }
    },
    
    removeFavoriteToken: (state, action: PayloadAction<string>) => {
      const tokenId = action.payload;
      state.favoriteTokens = state.favoriteTokens.filter(id => id !== tokenId);
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
    
    setNotificationPreference: (state, action: PayloadAction<{
      type: keyof UserPreferences['notifications'];
      enabled: boolean;
    }>) => {
      const { type, enabled } = action.payload;
      state.notifications[type] = enabled;
    },
    
    toggleNotification: (state, action: PayloadAction<keyof UserPreferences['notifications']>) => {
      const notificationType = action.payload;
      state.notifications[notificationType] = !state.notifications[notificationType];
    },
    
    resetPreferences: (state) => {
      Object.assign(state, initialState);
    },
    
    importPreferences: (state, action: PayloadAction<Partial<UserPreferences>>) => {
      Object.assign(state, action.payload);
    },
    
    exportPreferences: (state) => {
      // This action doesn't modify state but triggers export logic in components
      return state;
    },
  },
});

export const {
  setDefaultTimeframe,
  toggleAutoRefresh,
  setRefreshInterval,
  setDefaultFilters,
  addFavoriteToken,
  removeFavoriteToken,
  toggleFavoriteToken,
  setNotificationPreference,
  toggleNotification,
  resetPreferences,
  importPreferences,
  exportPreferences,
} = preferencesSlice.actions;

export default preferencesSlice.reducer; 