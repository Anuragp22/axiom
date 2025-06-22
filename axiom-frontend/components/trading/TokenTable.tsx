'use client';

import Image from 'next/image';
import React, { useMemo, useCallback } from 'react';
import { SimpleTokenAvatar } from '@/components/ui/token-avatar';
import { useTokensWithState } from '@/lib/hooks/useTokens';
import { useRealTimeUpdates } from '@/lib/hooks/useWebSocket';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { setSortBy, setSortDirection } from '@/lib/store/slices/filtersSlice';
import { toggleFavoriteToken, toggleTokenSelection } from '@/lib/store/slices/tokensSlice';
import { openBuy, openTokenDetails } from '@/lib/store/slices/modalsSlice';
import { TokenTableSkeleton, PulseAnimation, DataStatusIndicator } from '@/components/ui/loading-states';
import { ErrorBoundary, ErrorAlert } from '@/components/ui/error-boundary';
import { Token } from '@/lib/types';

interface TokenRowProps {
  token: Token;
  isSelected?: boolean;
  priceUpdate?: {
    price: number;
    change: number;
    timestamp: number;
    animate: boolean;
  };
  onSelect?: (tokenId: string) => void;
  onFavorite?: (tokenId: string) => void;
  onBuy?: (token: Token) => void;
  onDetails?: (tokenId: string) => void;
}

const TokenRow = ({ 
  token, 
  isSelected = false, 
  priceUpdate,
  onSelect,
  onFavorite,
  onBuy,
  onDetails 
}: TokenRowProps) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`;
    }
    return `$${num.toFixed(0)}`;
  };

  const formatCount = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-increase' : 'text-decrease';
  };

  return (
    <div 
      className={`border-primaryStroke/50 border-b-[1px] bg-backgroundSecondary flex flex-col sm:flex-row w-full min-h-[120px] sm:min-h-[72px] lg:min-h-[88px] px-2 sm:px-[12px] py-2 sm:py-0 justify-start items-stretch sm:items-center active:bg-primaryStroke/50 sm:hover:bg-primaryStroke/50 cursor-pointer transition-colors duration-200 ${
        isSelected ? 'bg-primaryBlue/10 border-primaryBlue/50' : ''
      }`}
      onClick={() => onDetails?.(token.id)}
    >
      {/* Mobile Layout */}
      <div className="flex sm:hidden flex-col w-full space-y-3">
        {/* Top Row - Token Info and Price */}
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-row gap-3 items-center flex-1">
            <SimpleTokenAvatar 
              symbol={token.symbol}
              name={token.name}
              size={32}
              className="rounded-lg flex-shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <div className="flex flex-row gap-2 items-center">
                <span className="text-textPrimary text-sm font-medium truncate">
                  {token.name}
                </span>
                <span className="text-textTertiary text-sm font-medium">
                  {token.symbol.length > 6 ? `${token.symbol.substring(0, 6)}...` : token.symbol}
                </span>
              </div>
              <div className="flex flex-row gap-2 items-center">
                <span className="text-primaryGreen text-xs font-medium">
                  {token.age}
                </span>
                {token.communityUrl && (
                  <a 
                    href={token.communityUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[#5DBCFF] hover:text-[#70c4ff] transition-colors"
                  >
                    <i className="ri-group-3-line text-sm"></i>
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <PulseAnimation 
              isAnimating={priceUpdate?.animate}
              variant={priceUpdate?.change && priceUpdate.change > 0 ? "green" : "red"}
            >
              <span className={`text-sm font-medium ${getChangeColor(token.priceChange24h)}`}>
                {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
              </span>
            </PulseAnimation>
          </div>
        </div>

        {/* Bottom Row - Stats */}
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="flex flex-col">
            <span className="text-textSecondary font-medium mb-1">Market Cap</span>
            <span className="text-textPrimary font-medium">{formatNumber(token.marketCap)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-textSecondary font-medium mb-1">Liquidity</span>
            <span className="text-textPrimary font-medium">{formatNumber(token.liquidity)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-textSecondary font-medium mb-1">Volume</span>
            <span className="text-textPrimary font-medium">{formatNumber(token.volume24h)}</span>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:flex flex-row flex-grow w-full h-full items-center">
        {/* Pair Info */}
        <div className="min-w-0 flex flex-row w-[200px] lg:w-[320px] px-[12px] gap-[12px] justify-start items-center">
          <div className="relative w-[40px] sm:w-[62px] h-[40px] sm:h-[62px] justify-center items-center">
            {/* AMM Badge */}
            <div className="flex [background:linear-gradient(219deg,#FFD700_0%,#DAA520_48.97%,#B8860B_48.98%,#996515_100%)] absolute top-[32px] sm:top-[53px] left-[32px] sm:left-[53px] p-[1px] w-[14px] sm:w-[16px] h-[14px] sm:h-[16px] justify-center items-center rounded-full z-30">
              <div className="flex justify-center items-center bg-background absolute w-[12px] sm:w-[14px] h-[12px] sm:h-[14px] rounded-full z-30">
                <div className="w-[8px] sm:w-[10px] h-[8px] sm:h-[10px] rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600"></div>
              </div>
            </div>
            
            {/* Token Image */}
            <div className="bg-[#53D38E]/20 absolute flex p-[1px] justify-start items-center rounded-[4px] z-20">
              <div className="bg-backgroundSecondary flex p-[2px] justify-start items-center rounded-[3px]">
                <div className="w-[36px] sm:w-[56px] h-[36px] sm:h-[56px] flex-shrink-0 group/image relative">
                  <div className="pointer-events-none border-textPrimary/10 border-[1px] absolute w-[36px] sm:w-[56px] h-[36px] sm:h-[56px] z-10 rounded-[1px]"></div>
                  <div className="w-full h-full relative">
                    <SimpleTokenAvatar 
                      symbol={token.symbol}
                      name={token.name}
                      size={36}
                      className="rounded-[1px] w-full h-full"
                    />
                    <button className="absolute inset-0 bg-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <i className="ri-camera-line text-white text-[24px]"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Background gradient */}
            <div className="[background:linear-gradient(219deg,#FFD700_0%,#DAA520_48.97%,#B8860B_48.98%,#996515_100%)] absolute top-0 left-0 w-[42px] sm:w-[62px] h-[42px] sm:h-[62px] rounded-[4px] z-10"></div>
          </div>
          
          {/* Token Info */}
          <div className="flex flex-col gap-[4px] justify-start items-start">
            <div className="flex flex-row gap-[4px] justify-start items-center">
              <span className="text-textPrimary text-[12px] sm:text-[16px] font-medium tracking-[-0.02em]">
                {token.name}
              </span>
              <span className="contents">
                <div className="group flex flex-row gap-[4px] justify-start items-center">
                  <span className="text-textTertiary text-[12px] sm:text-[16px] font-medium tracking-[-0.02em] group-hover:text-primaryBlueHover transition-colors duration-[125ms] cursor-pointer">
                    {token.symbol.length > 8 ? `${token.symbol.substring(0, 8)}...` : token.symbol}
                  </span>
                  <button className="group-hover:text-primaryBlue transition-colors duration-200 cursor-pointer">
                    <i className="text-textTertiary ri-file-copy-fill text-[12px] sm:text-[14px] group-hover:text-primaryBlueHover"></i>
                  </button>
                </div>
              </span>
            </div>
            <div className="flex flex-row gap-[8px] justify-start items-center">
              <span className="text-primaryGreen text-[12px] sm:text-[14px] font-medium">
                {token.age}
              </span>
              <div>
                <a 
                  href={token.communityUrl || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[#5DBCFF] hover:text-[#70c4ff] transition-colors duration-[125ms] flex flex-row flex-shrink-0 gap-[2px] justify-start items-center cursor-pointer"
                >
                  <i className="ri-group-3-line" style={{ fontSize: '16px' }}></i>
                </a>
              </div>
              <a 
                href={`https://x.com/search?q=${token.symbol}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center"
              >
                <i className="text-textSecondary ri-search-line text-[14px] sm:text-[16px] hover:text-primaryBlueHover transition-colors duration-[125ms]"></i>
              </a>
            </div>
          </div>
        </div>

        {/* Market Cap */}
        <div className="min-w-0 flex flex-1 flex-row px-[8px] lg:px-[12px] justify-start items-center">
          <div className="flex flex-col gap-[4px] justify-start items-start">
            <div className="flex flex-row gap-[4px] justify-start items-center">
              <PulseAnimation 
                isAnimating={priceUpdate?.animate && priceUpdate.change > 0}
                variant={priceUpdate?.change && priceUpdate.change > 0 ? "green" : "red"}
              >
                <span className="text-textPrimary text-[11px] lg:text-[14px] font-medium">
                  {formatNumber(token.marketCap)}
                </span>
              </PulseAnimation>
            </div>
            <div className="flex flex-row gap-[4px] justify-start items-center">
              <PulseAnimation 
                isAnimating={priceUpdate?.animate}
                variant={priceUpdate?.change && priceUpdate.change > 0 ? "green" : "red"}
              >
                <span className={`font-GeistMono text-[10px] lg:text-[12px] font-medium ${getChangeColor(token.priceChange24h)}`}>
                  {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                </span>
              </PulseAnimation>
            </div>
          </div>
        </div>

        {/* Liquidity */}
        <div className="min-w-0 flex flex-1 flex-row px-[8px] lg:px-[12px] justify-start items-center">
          <div className="flex flex-col gap-[4px] justify-start items-start">
            <div className="flex flex-row gap-[4px] justify-start items-center">
              <span className="text-textPrimary text-[11px] lg:text-[14px] font-medium">
                {formatNumber(token.liquidity)}
              </span>
            </div>
          </div>
        </div>

        {/* Volume */}
        <div className="min-w-0 flex flex-1 flex-row px-[8px] lg:px-[12px] justify-start items-center">
          <div className="flex flex-col gap-[4px] justify-start items-start">
            <div className="flex flex-row gap-[4px] justify-start items-center">
              <span className="text-textPrimary text-[11px] lg:text-[14px] font-medium">
                {formatNumber(token.volume24h)}
              </span>
            </div>
          </div>
        </div>

        {/* TXNS */}
        <div className="min-w-0 flex flex-1 flex-row px-[12px] justify-start items-center">
          <div className="flex flex-col gap-[4px] justify-start items-start">
            <div className="flex flex-row gap-[4px] justify-start items-center">
              <span className="text-textPrimary text-[12px] sm:text-[14px] font-medium">
                {formatCount(token.transactions24h)}
              </span>
            </div>
            <div className="flex flex-row gap-[4px] justify-start items-center">
              <div className="flex flex-row gap-[4px] justify-start items-center">
                <span className="text-increase text-[12px] font-medium font-GeistMono">
                  {formatCount(token.buys24h)}
                </span>
                <span className="text-textSecondary text-[12px] font-medium font-GeistMono">/</span>
                <span className="text-decrease text-[12px] font-medium font-GeistMono">
                  {formatCount(token.sells24h)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Log */}
        <div className="min-w-0 flex flex-1 flex-row px-[12px] justify-start items-center">
          <div className="flex flex-row gap-[0px] min-w-[72px] justify-start items-center">
            <div className="flex flex-col gap-[4px] justify-start items-start">
              {/* Risk Score */}
              <div className="bg-backgroundSecondary border-primaryStroke/50 border-[1px] flex flex-row h-[16px] min-h-[16px] max-h-[16px] sm:h-[20px] sm:min-h-[20px] sm:max-h-[20px] px-[4px] gap-[4px] justify-start items-center rounded-[4px]">
                <i className="text-primaryRed ri-user-star-line text-[10px] sm:text-[12px]"></i>
                <span className="text-primaryRed font-GeistMono text-[10px] sm:text-[11px] font-medium">
                  {token.audit.riskScore}%
                </span>
              </div>
              
              {/* Burn Status */}
              <div className="bg-backgroundSecondary border-primaryStroke/50 border-[1px] flex flex-row h-[16px] min-h-[16px] max-h-[16px] sm:h-[20px] sm:min-h-[20px] sm:max-h-[20px] px-[4px] gap-[4px] justify-start items-center rounded-[4px]">
                <i className="text-primaryGreen ri-fire-line text-[10px] sm:text-[12px]"></i>
                <span className="text-primaryGreen font-GeistMono text-[10px] sm:text-[11px] font-medium">
                  {token.audit.burnPercentage}%
                </span>
              </div>
              
              {/* Paid Status */}
              <div className="bg-backgroundSecondary border-primaryStroke/50 border-[1px] flex flex-row h-[16px] min-h-[16px] max-h-[16px] sm:h-[20px] sm:min-h-[20px] sm:max-h-[20px] px-[4px] gap-[4px] justify-start items-center rounded-[4px]">
                <i className={`${token.audit.isPaid ? 'text-primaryGreen' : 'text-textSecondary'} ri-vip-crown-line text-[10px] sm:text-[12px]`}></i>
                <span className={`${token.audit.isPaid ? 'text-primaryGreen' : 'text-textSecondary'} font-GeistMono text-[10px] sm:text-[11px] font-medium`}>
                  {token.audit.isPaid ? 'PAID' : 'FREE'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="min-w-0 flex flex-1 flex-row px-[12px] justify-start items-center">
          <div className="flex flex-row gap-[8px] justify-start items-center">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onBuy?.(token);
              }}
              className="bg-primaryBlue hover:bg-primaryBlueHover text-textPrimary font-medium py-[6px] px-[16px] rounded-[4px] text-[12px] sm:text-[14px] transition-colors duration-150"
            >
              Buy
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onFavorite?.(token.id);
              }}
              className="text-textSecondary hover:text-primaryBlue transition-colors duration-150"
            >
              <i className="ri-star-line text-[16px] sm:text-[18px]"></i>
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(token.id);
              }}
              className="text-textSecondary hover:text-primaryBlue transition-colors duration-150"
            >
              <i className={`text-[16px] sm:text-[18px] ${isSelected ? 'ri-checkbox-fill text-primaryBlue' : 'ri-checkbox-blank-line'}`}></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TokenTable = () => {
  const dispatch = useAppDispatch();
  const {
    tokens,
    loading,
    error,
    selectedTokens,
    favoriteTokens,
    priceUpdates,
  } = useTokensWithState();
  
  const filters = useAppSelector(state => state.filters.filters);
  const { isConnected, isSimulating } = useRealTimeUpdates();

  // Memoized handlers
  const handleSort = useCallback((field: string) => {
    const currentSort = filters.sortBy;
    const currentDirection = filters.sortDirection;
    
    if (currentSort === field) {
      dispatch(setSortDirection(currentDirection === 'asc' ? 'desc' : 'asc'));
    } else {
      dispatch(setSortBy(field as any));
      dispatch(setSortDirection('desc'));
    }
  }, [filters.sortBy, filters.sortDirection, dispatch]);

  const handleTokenSelect = useCallback((tokenId: string) => {
    dispatch(toggleTokenSelection(tokenId));
  }, [dispatch]);

  const handleFavorite = useCallback((tokenId: string) => {
    dispatch(toggleFavoriteToken(tokenId));
  }, [dispatch]);

  const handleBuy = useCallback((token: Token) => {
    dispatch(openBuy(token));
  }, [dispatch]);

  const handleDetails = useCallback((tokenId: string) => {
    dispatch(openTokenDetails(tokenId));
  }, [dispatch]);

  // Get filter state
  const searchQuery = useAppSelector(state => state.filters.searchQuery);
  const quickFilter = useAppSelector(state => state.filters.quickFilter);

  // Memoized filtered and sorted tokens
  const sortedTokens = useMemo(() => {
    if (!tokens.length) return [];

    let filteredTokens = [...tokens];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filteredTokens = filteredTokens.filter(token => 
        token.name.toLowerCase().includes(query) ||
        token.symbol.toLowerCase().includes(query) ||
        token.pairInfo.pairAddress.toLowerCase().includes(query)
      );
    }

    // Apply quick filters
    switch (quickFilter) {
      case 'trending':
        filteredTokens = filteredTokens.filter(token => token.volume24h > 50000);
        break;
      case 'new':
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        filteredTokens = filteredTokens.filter(token => 
          new Date(token.createdAt).getTime() > oneDayAgo
        );
        break;
      case 'gainers':
        filteredTokens = filteredTokens.filter(token => token.priceChange24h > 0);
        break;
      case 'losers':
        filteredTokens = filteredTokens.filter(token => token.priceChange24h < 0);
        break;
      case 'volume':
        filteredTokens = filteredTokens.filter(token => token.volume24h > 100000);
        break;
      case 'all':
      default:
        // No additional filtering
        break;
    }

    // Apply main filters
    if (filters.minMarketCap) {
      filteredTokens = filteredTokens.filter(token => token.marketCap >= filters.minMarketCap!);
    }
    if (filters.maxMarketCap) {
      filteredTokens = filteredTokens.filter(token => token.marketCap <= filters.maxMarketCap!);
    }
    if (filters.minLiquidity) {
      filteredTokens = filteredTokens.filter(token => token.liquidity >= filters.minLiquidity!);
    }
    if (filters.maxLiquidity) {
      filteredTokens = filteredTokens.filter(token => token.liquidity <= filters.maxLiquidity!);
    }
    if (filters.minVolume) {
      filteredTokens = filteredTokens.filter(token => token.volume24h >= filters.minVolume!);
    }
    if (filters.maxVolume) {
      filteredTokens = filteredTokens.filter(token => token.volume24h <= filters.maxVolume!);
    }

    // Apply sorting
    return filteredTokens.sort((a, b) => {
      const direction = filters.sortDirection === 'asc' ? 1 : -1;
      
      switch (filters.sortBy) {
        case 'marketCap':
          return (a.marketCap - b.marketCap) * direction;
        case 'liquidity':
          return (a.liquidity - b.liquidity) * direction;
        case 'volume':
          return (a.volume24h - b.volume24h) * direction;
        case 'priceChange':
          return (a.priceChange24h - b.priceChange24h) * direction;
        case 'transactions':
          return (a.transactions24h - b.transactions24h) * direction;
        case 'age':
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction;
        default:
          return 0;
      }
    });
  }, [tokens, filters, searchQuery, quickFilter]);

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => {
    const isActive = filters.sortBy === field;
    const direction = filters.sortDirection;
    
    return (
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1 text-textSecondary hover:text-textPrimary transition-colors text-[10px] lg:text-[14px] font-medium uppercase tracking-wider"
      >
        {children}
        {isActive && (
          <i className={`ri-arrow-${direction === 'asc' ? 'up' : 'down'}-s-line text-primaryBlue text-[12px] lg:text-[14px]`} />
        )}
      </button>
    );
  };

  // Error state
  if (error) {
    return (
      <ErrorBoundary level="component">
        <div className="w-full">
          <ErrorAlert 
            error={loading.error || 'Failed to load tokens'} 
            className="mb-4"
          />
          <TokenTableSkeleton rows={5} />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary level="component">
      <div className="w-full relative">
        {/* Connection Status */}
        <div className="flex justify-between items-center mb-2">
          <DataStatusIndicator 
            isConnected={isConnected}
            isSimulating={isSimulating}
          />
          <div className="text-xs text-textSecondary">
            {tokens.length} tokens • Updated live
          </div>
        </div>

        {/* Table Header - Desktop Only */}
        <div className="hidden sm:flex border-primaryStroke/50 border-b-[1px] bg-backgroundSecondary flex-row w-full h-[48px] min-h-[48px] max-h-[48px] px-[12px] justify-start items-center">
          <div className="flex flex-row flex-grow w-full h-full items-center">
            {/* Pair Info Header */}
            <div className="min-w-0 flex flex-row w-[200px] lg:w-[320px] px-[12px] gap-[12px] justify-start items-center">
              <span className="text-textSecondary text-[11px] lg:text-[14px] font-medium uppercase tracking-wider">
                Pair Info
              </span>
            </div>

            {/* Market Cap Header */}
            <div className="min-w-0 flex flex-1 flex-row px-[8px] lg:px-[12px] justify-start items-center">
              <SortableHeader field="marketCap">Market Cap</SortableHeader>
            </div>

            {/* Liquidity Header */}
            <div className="min-w-0 flex flex-1 flex-row px-[8px] lg:px-[12px] justify-start items-center">
              <SortableHeader field="liquidity">Liquidity</SortableHeader>
            </div>

            {/* Volume Header */}
            <div className="min-w-0 flex flex-1 flex-row px-[8px] lg:px-[12px] justify-start items-center">
              <SortableHeader field="volume">Volume</SortableHeader>
            </div>

            {/* TXNS Header - Hidden on smaller screens */}
            <div className="min-w-0 hidden lg:flex flex-1 flex-row px-[12px] justify-start items-center">
              <SortableHeader field="transactions">TXNS</SortableHeader>
            </div>

            {/* Audit Header - Hidden on smaller screens */}
            <div className="min-w-0 hidden lg:flex flex-1 flex-row px-[12px] justify-start items-center">
              <span className="text-textSecondary text-[11px] lg:text-[14px] font-medium uppercase tracking-wider">
                Audit
              </span>
            </div>

            {/* Action Header - Hidden on smaller screens */}
            <div className="min-w-0 hidden lg:flex flex-1 flex-row px-[12px] justify-start items-center">
              <span className="text-textSecondary text-[11px] lg:text-[14px] font-medium uppercase tracking-wider">
                Action
              </span>
            </div>
          </div>
        </div>

        {/* Table Body */}
        {loading.isLoading && tokens.length === 0 ? (
          <TokenTableSkeleton rows={10} />
        ) : (
          <div className="w-full">
            {sortedTokens.map((token) => (
              <TokenRow
                key={token.id}
                token={token}
                isSelected={selectedTokens.includes(token.id)}
                priceUpdate={priceUpdates[token.id]}
                onSelect={handleTokenSelect}
                onFavorite={handleFavorite}
                onBuy={handleBuy}
                onDetails={handleDetails}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading.isLoading && tokens.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 mb-4 bg-primaryStroke/20 rounded-full flex items-center justify-center">
              <i className="ri-search-line text-2xl text-textSecondary" />
            </div>
            <h3 className="text-lg font-semibold text-textPrimary mb-2">No tokens found</h3>
            <p className="text-textSecondary max-w-md">
              Try adjusting your filters or search criteria to find more tokens.
            </p>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}; 