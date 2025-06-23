import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useEffect } from 'react';
import { tokenApi } from '@/lib/api/tokens';
import { Token, TableFilters, TokenListResponse } from '@/lib/types';
import { useAppSelector, useAppDispatch } from '@/lib/store';
import { setTokens, addTokens, setLoading, setPagination } from '@/lib/store/slices/tokensSlice';

// Query keys for React Query
export const tokenQueryKeys = {
  all: ['tokens'] as const,
  lists: () => [...tokenQueryKeys.all, 'list'] as const,
  list: (filters: Partial<TableFilters>, page?: number) => 
    [...tokenQueryKeys.lists(), { filters, page }] as const,
  search: (query: string, filters?: Partial<TableFilters>) => 
    [...tokenQueryKeys.all, 'search', { query, filters }] as const,
  trending: (limit?: number) => 
    [...tokenQueryKeys.all, 'trending', { limit }] as const,
  details: () => [...tokenQueryKeys.all, 'details'] as const,
  detail: (id: string) => [...tokenQueryKeys.details(), id] as const,
  cache: () => [...tokenQueryKeys.all, 'cache'] as const,
  cacheStats: () => [...tokenQueryKeys.cache(), 'stats'] as const,
};

// Cache times (in milliseconds)
const CACHE_TIMES = {
  tokens: 30 * 1000, // 30 seconds
  trending: 60 * 1000, // 1 minute
  details: 5 * 60 * 1000, // 5 minutes
  search: 30 * 1000, // 30 seconds
} as const;

/**
 * Hook to fetch paginated tokens with filters
 */
export function useTokens(
  filters: Partial<TableFilters> = {},
  page = 1,
  pageSize = 50,
  cursor?: string,
  options: { enabled?: boolean; keepPreviousData?: boolean } = {}
) {
  const dispatch = useAppDispatch();
  const { enabled = true, keepPreviousData = true } = options;

  return useQuery({
    queryKey: tokenQueryKeys.list(filters, page),
    queryFn: async (): Promise<TokenListResponse> => {
      dispatch(setLoading({ isLoading: true, error: null }));
      try {
        const result = await tokenApi.getTokens(filters, page, pageSize, cursor);
        
        // Update Redux store
        if (page === 1) {
          dispatch(setTokens(result.tokens));
        } else {
          dispatch(addTokens(result.tokens));
        }
        dispatch(setPagination(result.pagination));
        dispatch(setLoading({ isLoading: false }));
        
        return result;
      } catch (error: any) {
        console.error('Error fetching tokens:', error);
        dispatch(setLoading({ isLoading: false, error: error.message }));
        throw error;
      }
    },
    staleTime: 0, // Always refetch when filters change
    gcTime: CACHE_TIMES.tokens * 5,
    enabled,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    // Add retry logic
    retry: (failureCount, error: any) => {
      // Don't retry if it's a client error (4xx)
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      // Retry up to 3 times for network errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook for infinite scrolling tokens
 */
export function useInfiniteTokens(
  filters: Partial<TableFilters> = {},
  pageSize = 50,
  options: { enabled?: boolean } = {}
) {
  const dispatch = useAppDispatch();
  const { enabled = true } = options;

  return useInfiniteQuery({
    queryKey: tokenQueryKeys.list(filters),
    queryFn: async ({ pageParam = 1 }): Promise<TokenListResponse> => {
      dispatch(setLoading({ isLoading: pageParam === 1, error: null }));
      try {
        const result = await tokenApi.getTokens(filters, pageParam as number, pageSize);
        
        // Update Redux store
        if (pageParam === 1) {
          dispatch(setTokens(result.tokens));
        } else {
          dispatch(addTokens(result.tokens));
        }
        
        dispatch(setLoading({ isLoading: false }));
        return result;
      } catch (error: any) {
        dispatch(setLoading({ isLoading: false, error: error.message }));
        throw error;
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: TokenListResponse) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    staleTime: CACHE_TIMES.tokens,
    gcTime: CACHE_TIMES.tokens * 5,
    enabled,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to search tokens
 */
export function useTokenSearch(
  query: string,
  filters: Partial<TableFilters> = {},
  options: { enabled?: boolean; debounceMs?: number } = {}
) {
  const { enabled = true, debounceMs = 300 } = options;
  
  // Simple debouncing logic
  const debouncedQuery = useMemo(() => {
    if (!query || query.length < 2) return '';
    return query;
  }, [query]);

  return useQuery({
    queryKey: tokenQueryKeys.search(debouncedQuery, filters),
    queryFn: () => tokenApi.searchTokens(debouncedQuery, filters),
    staleTime: CACHE_TIMES.search,
    gcTime: CACHE_TIMES.search * 5,
    enabled: enabled && debouncedQuery.length >= 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch trending tokens
 */
export function useTrendingTokens(
  limit = 50,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: tokenQueryKeys.trending(limit),
    queryFn: () => tokenApi.getTrendingTokens(limit),
    staleTime: CACHE_TIMES.trending,
    gcTime: CACHE_TIMES.trending * 5,
    enabled,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook to fetch featured tokens (specific popular tokens from DexScreener)
 */
export function useFeaturedTokens(
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['tokens', 'featured'],
    queryFn: () => tokenApi.getFeaturedTokens(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook to fetch token details
 */
export function useTokenDetails(
  tokenId: string,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: tokenQueryKeys.detail(tokenId),
    queryFn: () => tokenApi.getTokenDetails(tokenId),
    staleTime: CACHE_TIMES.details,
    gcTime: CACHE_TIMES.details * 2,
    enabled: enabled && !!tokenId,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to clear token cache
 */
export function useClearTokenCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tokenApi.clearCache,
    onSuccess: () => {
      // Invalidate all token queries
      queryClient.invalidateQueries({ queryKey: tokenQueryKeys.all });
    },
  });
}

/**
 * Hook to get cache statistics
 */
export function useCacheStats(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: tokenQueryKeys.cacheStats(),
    queryFn: tokenApi.getCacheStats,
    staleTime: 30 * 1000, // 30 seconds
    enabled,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to refresh token data
 */
export function useRefreshTokens() {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  return useCallback(async () => {
    dispatch(setLoading({ isRefreshing: true }));
    try {
      await queryClient.invalidateQueries({ queryKey: tokenQueryKeys.lists() });
      await queryClient.refetchQueries({ queryKey: tokenQueryKeys.lists() });
    } finally {
      dispatch(setLoading({ isRefreshing: false }));
    }
  }, [queryClient, dispatch]);
}

/**
 * Hook for optimistic updates when favoriting tokens
 */
export function useOptimisticTokenUpdate() {
  const queryClient = useQueryClient();

  return useCallback((tokenId: string, updates: Partial<Token>) => {
    // Update all token list queries
    queryClient.setQueriesData(
      { queryKey: tokenQueryKeys.lists() },
      (oldData: TokenListResponse | undefined) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          tokens: oldData.tokens.map(token =>
            token.id === tokenId ? { ...token, ...updates } : token
          ),
        };
      }
    );

    // Update token details query
    queryClient.setQueryData(
      tokenQueryKeys.detail(tokenId),
      (oldData: Token | undefined) => {
        if (!oldData) return oldData;
        return { ...oldData, ...updates };
      }
    );
  }, [queryClient]);
}

/**
 * Hook to prefetch token details
 */
export function usePrefetchTokenDetails() {
  const queryClient = useQueryClient();

  return useCallback((tokenId: string) => {
    queryClient.prefetchQuery({
      queryKey: tokenQueryKeys.detail(tokenId),
      queryFn: () => tokenApi.getTokenDetails(tokenId),
      staleTime: CACHE_TIMES.details,
    });
  }, [queryClient]);
}

/**
 * Custom hook that combines Redux state with React Query data
 */
export function useTokensWithState() {
  const dispatch = useAppDispatch();
  const reduxState = useAppSelector(state => state.tokens);
  const filters = useAppSelector(state => state.filters.filters);
  const searchQuery = useAppSelector(state => state.filters.searchQuery);
  const quickFilter = useAppSelector(state => state.filters.quickFilter);
  const timeframe = useAppSelector(state => state.filters.timeframe);
  const activeTab = useAppSelector(state => state.filters.activeTab);
  
  // Combine all filters for the API call
  const combinedFilters = useMemo(() => ({
    ...filters,
    timeframe,
    searchQuery: searchQuery || undefined,
    quickFilter: quickFilter !== 'all' ? quickFilter : undefined,
  }), [filters, searchQuery, quickFilter, timeframe]);
  
  // Choose data source based on active tab
  const trendingQuery = useTrendingTokens(100, { enabled: activeTab === 'trending' });
  const featuredQuery = useFeaturedTokens({ enabled: activeTab === 'pump-live' });
  const regularQuery = useTokens(
    combinedFilters,
    reduxState.pagination.page,
    reduxState.pagination.pageSize,
    reduxState.pagination.cursor,
    { enabled: activeTab === 'dex-screener' }
  );

  // Update Redux store when data changes
  useEffect(() => {
    let tokensToStore: Token[] = [];
    let isLoading = false;
    let error: string | null = null;

    switch (activeTab) {
      case 'trending':
        if (trendingQuery.data?.tokens) {
          tokensToStore = trendingQuery.data.tokens;
        }
        isLoading = trendingQuery.isLoading;
        error = trendingQuery.error?.message || null;
        break;
      case 'pump-live':
        if (featuredQuery.data?.tokens) {
          tokensToStore = featuredQuery.data.tokens.filter(token => token.isPumpFun);
        }
        isLoading = featuredQuery.isLoading;
        error = featuredQuery.error?.message || null;
        break;
      default:
        if (regularQuery.data?.tokens) {
          tokensToStore = regularQuery.data.tokens;
        }
        isLoading = regularQuery.isLoading;
        error = regularQuery.error?.message || null;
        break;
    }

    // Update Redux store
    dispatch(setLoading({ isLoading, error }));
    if (tokensToStore.length > 0) {
      dispatch(setTokens(tokensToStore));
    }
  }, [activeTab, trendingQuery.data, featuredQuery.data, regularQuery.data, trendingQuery.isLoading, featuredQuery.isLoading, regularQuery.isLoading, trendingQuery.error, featuredQuery.error, regularQuery.error, dispatch]);

  // Select the appropriate query result based on active tab
  const queryResult = useMemo(() => {
    switch (activeTab) {
      case 'trending':
        return {
          ...trendingQuery,
          data: trendingQuery.data ? {
            tokens: trendingQuery.data.tokens,
            pagination: {
              page: 1,
              pageSize: trendingQuery.data.tokens.length,
              total: trendingQuery.data.tokens.length,
              totalPages: 1,
              hasMore: false,
            }
          } : undefined
        };
      case 'pump-live':
        return {
          ...featuredQuery,
          data: featuredQuery.data ? {
            tokens: featuredQuery.data.tokens.filter(token => token.isPumpFun),
            pagination: {
              page: 1,
              pageSize: featuredQuery.data.tokens.length,
              total: featuredQuery.data.tokens.length,
              totalPages: 1,
              hasMore: false,
            }
          } : undefined
        };
      default:
        return regularQuery;
    }
  }, [activeTab, trendingQuery, featuredQuery, regularQuery]);

  return {
    ...queryResult,
    // Merge Redux state with Query result
    tokens: reduxState.tokens,
    loading: reduxState.loading,
    pagination: reduxState.pagination,
    selectedTokens: reduxState.selectedTokens,
    favoriteTokens: reduxState.favoriteTokens,
    searchQuery: reduxState.searchQuery,
    isRealTimeEnabled: reduxState.isRealTimeEnabled,
    priceUpdates: reduxState.priceUpdates,
    // Add error from React Query if Redux doesn't have it
    error: reduxState.loading.error || queryResult.error?.message || null,
    // Add tab information
    activeTab,
  };
} 