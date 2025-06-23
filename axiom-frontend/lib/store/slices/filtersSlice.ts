import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TableFilters, SortOption } from '@/lib/types';

export type QuickFilterOption = 'all' | 'trending' | 'new' | 'gainers' | 'losers' | 'volume' | 'pump';
export type ActiveTab = 'dex-screener' | 'trending' | 'pump-live';

interface FiltersState {
  filters: TableFilters;
  searchQuery: string;
  quickFilter: QuickFilterOption;
  quickFilters: {
    showOnlyFavorites: boolean;
    showOnlyVerified: boolean;
    showOnlyGraduated: boolean;
    hideRugs: boolean;
  };
  priceRange: {
    min: number | null;
    max: number | null;
  };
  isFilterModalOpen: boolean;
  timeframe: '5m' | '1h' | '6h' | '24h';
  modals: {
    filters: boolean;
    settings: boolean;
  };
  activeTab: ActiveTab;
}

const initialState: FiltersState = {
  filters: {
    minLiquidity: undefined,
    maxLiquidity: undefined,
    minMarketCap: undefined,
    maxMarketCap: undefined,
    minVolume: undefined,
    maxVolume: undefined,
    onlyVerified: false,
    onlyGraduated: false,
    excludeRugs: false,
    timeframe: '24h',
    sortBy: 'volume',
    sortDirection: 'desc',
  },
  searchQuery: '',
  quickFilter: 'all',
  quickFilters: {
    showOnlyFavorites: false,
    showOnlyVerified: false,
    showOnlyGraduated: false,
    hideRugs: true,
  },
  priceRange: {
    min: null,
    max: null,
  },
  isFilterModalOpen: false,
  timeframe: '24h',
  modals: {
    filters: false,
    settings: false,
  },
  activeTab: 'dex-screener',
};

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<TableFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    setSortBy: (state, action: PayloadAction<SortOption>) => {
      state.filters.sortBy = action.payload;
    },
    
    setSortDirection: (state, action: PayloadAction<'asc' | 'desc'>) => {
      state.filters.sortDirection = action.payload;
    },
    
    setTimeframe: (state, action: PayloadAction<'5m' | '1h' | '6h' | '24h'>) => {
      state.timeframe = action.payload;
      state.filters.timeframe = action.payload;
    },
    
    setMinLiquidity: (state, action: PayloadAction<number | undefined>) => {
      state.filters.minLiquidity = action.payload;
    },
    
    setMaxLiquidity: (state, action: PayloadAction<number | undefined>) => {
      state.filters.maxLiquidity = action.payload;
    },
    
    setMinMarketCap: (state, action: PayloadAction<number | undefined>) => {
      state.filters.minMarketCap = action.payload;
    },
    
    setMaxMarketCap: (state, action: PayloadAction<number | undefined>) => {
      state.filters.maxMarketCap = action.payload;
    },
    
    setMinVolume: (state, action: PayloadAction<number | undefined>) => {
      state.filters.minVolume = action.payload;
    },
    
    setMaxVolume: (state, action: PayloadAction<number | undefined>) => {
      state.filters.maxVolume = action.payload;
    },
    
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      // Note: We don't reset pagination here as it's handled client-side
    },
    
    setQuickFilter: (state, action: PayloadAction<QuickFilterOption>) => {
      state.quickFilter = action.payload;
      // Note: We don't reset pagination here as it's handled client-side
    },
    
    setActiveTab: (state, action: PayloadAction<ActiveTab>) => {
      state.activeTab = action.payload;
      // Reset quick filter when switching tabs
      if (action.payload === 'trending') {
        state.quickFilter = 'trending';
      } else if (action.payload === 'pump-live') {
        state.quickFilter = 'pump';
      } else {
        state.quickFilter = 'all';
      }
    },
    
    setPriceRange: (state, action: PayloadAction<{ min?: number; max?: number }>) => {
      if (action.payload.min !== undefined) {
        state.filters.minMarketCap = action.payload.min;
      }
      if (action.payload.max !== undefined) {
        state.filters.maxMarketCap = action.payload.max;
      }
    },
    
    toggleQuickFilter: (state, action: PayloadAction<keyof FiltersState['quickFilters']>) => {
      const filterKey = action.payload;
      state.quickFilters[filterKey] = !state.quickFilters[filterKey];
      
      // Update main filters based on quick filters
      switch (filterKey) {
        case 'showOnlyVerified':
          state.filters.onlyVerified = state.quickFilters.showOnlyVerified;
          break;
        case 'showOnlyGraduated':
          state.filters.onlyGraduated = state.quickFilters.showOnlyGraduated;
          break;
        case 'hideRugs':
          state.filters.excludeRugs = state.quickFilters.hideRugs;
          break;
      }
    },
    
    resetFilters: (state) => {
      state.filters = initialState.filters;
      state.searchQuery = initialState.searchQuery;
      state.quickFilter = initialState.quickFilter;
      state.quickFilters = initialState.quickFilters;
      state.priceRange = initialState.priceRange;
    },
    
    openFilterModal: (state) => {
      state.isFilterModalOpen = true;
    },
    
    closeFilterModal: (state) => {
      state.isFilterModalOpen = false;
    },
    
    applyPresetFilter: (state, action: PayloadAction<'trending' | 'new' | 'top-volume' | 'top-gainers' | 'top-losers'>) => {
      const preset = action.payload;
      
      // Reset to base state first
      state.filters = { ...initialState.filters };
      
      switch (preset) {
        case 'trending':
          state.filters.sortBy = 'volume';
          state.filters.sortDirection = 'desc';
          state.filters.timeframe = '1h';
          state.filters.minVolume = 10000;
          break;
        case 'new':
          state.filters.sortBy = 'age';
          state.filters.sortDirection = 'asc';
          state.filters.timeframe = '24h';
          break;
        case 'top-volume':
          state.filters.sortBy = 'volume';
          state.filters.sortDirection = 'desc';
          state.filters.timeframe = '24h';
          break;
        case 'top-gainers':
          state.filters.sortBy = 'priceChange';
          state.filters.sortDirection = 'desc';
          state.filters.timeframe = '24h';
          break;
        case 'top-losers':
          state.filters.sortBy = 'priceChange';
          state.filters.sortDirection = 'asc';
          state.filters.timeframe = '24h';
          break;
      }
    },
  },
});

export const {
  setFilters,
  setSortBy,
  setSortDirection,
  setTimeframe,
  setMinLiquidity,
  setMaxLiquidity,
  setMinMarketCap,
  setMaxMarketCap,
  setMinVolume,
  setMaxVolume,
  setSearchQuery,
  setQuickFilter,
  setActiveTab,
  setPriceRange,
  toggleQuickFilter,
  resetFilters,
  openFilterModal,
  closeFilterModal,
  applyPresetFilter,
} = filtersSlice.actions;

export default filtersSlice.reducer; 