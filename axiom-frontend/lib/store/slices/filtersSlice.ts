import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TableFilters, SortOption } from '@/lib/types';

interface FiltersState {
  filters: TableFilters;
  searchQuery: string;
  quickFilter: 'all' | 'trending' | 'new' | 'gainers' | 'losers' | 'volume';
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
    excludeRugs: true,
    timeframe: '24h',
    sortBy: 'marketCap',
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
    },
    
    setQuickFilter: (state, action: PayloadAction<'all' | 'trending' | 'new' | 'gainers' | 'losers' | 'volume'>) => {
      state.quickFilter = action.payload;
    },
    
    setPriceRange: (state, action: PayloadAction<{ min: number | null; max: number | null }>) => {
      state.priceRange = action.payload;
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
  setPriceRange,
  toggleQuickFilter,
  resetFilters,
  openFilterModal,
  closeFilterModal,
  applyPresetFilter,
} = filtersSlice.actions;

export default filtersSlice.reducer; 