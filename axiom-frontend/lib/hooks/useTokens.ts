import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
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
        dispatch(setLoading({ isLoading: false, error: error.message }));
        throw error;
      }
    },
    staleTime: 0, // Always refetch when filters change
    gcTime: CACHE_TIMES.tokens * 5,
    enabled,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
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
  const reduxState = useAppSelector(state => state.tokens);
  const filters = useAppSelector(state => state.filters.filters);
  const searchQuery = useAppSelector(state => state.filters.searchQuery);
  const quickFilter = useAppSelector(state => state.filters.quickFilter);
  const timeframe = useAppSelector(state => state.filters.timeframe);
  
  // Combine all filters for the API call
  const combinedFilters = useMemo(() => ({
    ...filters,
    timeframe,
    searchQuery: searchQuery || undefined,
    quickFilter: quickFilter !== 'all' ? quickFilter : undefined,
  }), [filters, searchQuery, quickFilter, timeframe]);
  
  const queryResult = useTokens(
    combinedFilters,
    reduxState.pagination.page,
    reduxState.pagination.pageSize,
    reduxState.pagination.cursor
  );

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
  };
} 