'use client';
import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { SimpleTokenAvatar, TokenAvatar } from '@/components/ui/token-avatar';
import { TokenDetailsPopover } from '@/components/ui/token-details-popover';
import { useTokensWithState } from '@/lib/hooks/useTokens';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { setSortBy, setSortDirection } from '@/lib/store/slices/filtersSlice';
import { clearPriceAnimations, toggleFavoriteToken, toggleTokenSelection } from '@/lib/store/slices/tokensSlice';
import { openBuy, openTokenDetails } from '@/lib/store/slices/modalsSlice';
import { TokenTableSkeleton, PulseAnimation } from '@/components/ui/loading-states';
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
  const websiteUrl = (token as any)?.info?.websites?.[0]?.url || '';
  const socials = ((token as any)?.info?.socials || []) as any[];
  const twitterUrl = socials.find((s: any) => (s?.type || '').toLowerCase() === 'twitter')?.url || '';
  const telegramUrl = socials.find((s: any) => (s?.type || '').toLowerCase() === 'telegram')?.url || '';
  const formatNumber = (value: any) => {
    const num = Number(value || 0);
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  const formatCount = (value: any) => {
    const num = Number(value || 0);
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return String(num);
  };

  const formatPrice = (input: any) => {
    const price = Number(input || 0);
    if (price >= 1) return price.toFixed(4);
    if (price >= 0.01) return price.toFixed(6);
    if (price >= 0.000001) return price.toFixed(8);
    return price.toFixed(12);
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-increase' : 'text-decrease';
  };

  return (
    <div 
      className={`border-primaryStroke/50 border-b-[1px] bg-backgroundSecondary flex flex-col sm:flex-row w-full min-h-[120px] sm:min-h-[72px] lg:min-h-[88px] px-3 sm:px-[12px] py-3 sm:py-0 justify-start items-stretch sm:items-center active:bg-primaryStroke/50 sm:hover:bg-primaryStroke/50 cursor-pointer transition-colors duration-200 ${
        isSelected ? 'bg-primaryBlue/10 border-primaryBlue/50' : ''
      }`}
      onClick={() => onDetails?.(((token as any).pairAddress) || token.id)}
      style={{
        // Prevent layout shift by reserving space
        contentVisibility: 'auto',
        containIntrinsicSize: '1px 88px',
      }}
    >
      {/* Mobile Layout */}
      <div className="flex sm:hidden flex-col w-full space-y-3">
        {/* Top Row - Token Info and Price */}
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-row gap-3 items-center flex-1 min-w-0">
            <SimpleTokenAvatar 
              symbol={(token as any)?.baseToken?.symbol || ''}
              name={(token as any)?.baseToken?.name || ''}
              size={40}
              className="rounded-lg flex-shrink-0"
            />
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex flex-row gap-2 items-center min-w-0">
                <span className="text-textPrimary text-sm font-medium truncate">
                  {(token as any)?.baseToken?.name || ''}
                </span>
                <span className="text-textTertiary text-sm font-medium truncate">
                  {(token as any)?.baseToken?.symbol || ''}
                </span>
              </div>
              <div className="flex flex-row gap-2 items-center">
                <span className="text-primaryGreen text-[12px] sm:text-[14px] font-medium">3mo</span>
                {twitterUrl && (
                  <a
                    href={twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#5DBCFF] hover:text-[#70c4ff] transition-colors duration-[125ms] flex flex-row flex-shrink-0 gap-[2px] justify-start items-center cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Open Twitter profile (opens in new tab)`}
                  >
                    <i className="ri-user-line text-sm" />
                  </a>
                )}
                {websiteUrl && (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Open website (opens in new tab)`}
                  >
                    <i className="text-textSecondary ri-global-line text-[14px] sm:text-[16px] hover:text-primaryBlueHover transition-colors duration-[125ms]" />
                  </a>
                )}
                {telegramUrl && (
                  <a
                    href={telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Open Telegram (opens in new tab)`}
                  >
                    <i className="text-textSecondary ri-telegram-2-line text-[14px] sm:text-[16px] hover:text-primaryBlueHover transition-colors duration-[125ms]" />
                  </a>
                )}
                <a
                  href={`https://x.com/search?q=${encodeURIComponent((token as any)?.baseToken?.symbol || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Search on X (opens in new tab)`}
                >
                  <i className="text-textSecondary ri-search-line text-[14px] sm:text-[16px] hover:text-primaryBlueHover transition-colors duration-[125ms]" />
                </a>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end flex-shrink-0">
            <PulseAnimation 
              isAnimating={priceUpdate?.animate}
              variant={priceUpdate?.change && priceUpdate.change > 0 ? "green" : "red"}
            >
              <span className="text-textPrimary text-sm font-medium">
                 ${formatPrice(priceUpdate?.price || Number((token as any).priceUsd || 0))}
              </span>
            </PulseAnimation>
            <PulseAnimation 
              isAnimating={priceUpdate?.animate}
              variant={priceUpdate?.change && priceUpdate.change > 0 ? "green" : "red"}
            >
               <span className={`text-xs font-medium ${getChangeColor(priceUpdate?.change || (token as any)?.priceChange?.h24 || 0)}`}>
                 {(priceUpdate?.change || (token as any)?.priceChange?.h24 || 0) >= 0 ? '+' : ''}{(priceUpdate?.change || (token as any)?.priceChange?.h24 || 0).toFixed(2)}%
              </span>
            </PulseAnimation>
          </div>
        </div>

        {/* Bottom Row - Stats */}
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="flex flex-col">
            <span className="text-textSecondary font-medium mb-1">Market Cap</span>
             <span className="text-textPrimary font-medium">{formatNumber((token as any).fdv || (token as any).marketCap || 0)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-textSecondary font-medium mb-1">Liquidity</span>
             <span className="text-textPrimary font-medium">{formatNumber((token as any).liquidity?.usd || 0)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-textSecondary font-medium mb-1">Volume</span>
             <span className="text-textPrimary font-medium">{formatNumber((token as any).volume?.h24 || 0)}</span>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:flex flex-row flex-grow w-full h-full items-center">
        {/* Pair Info */}
        <div className="min-w-0 flex flex-row w-[200px] lg:w-[320px] px-[12px] gap-[12px] justify-start items-center">
          <div className="relative w-[40px] sm:w-[52px] lg:w-[62px] h-[40px] sm:h-[52px] lg:h-[62px] justify-center items-center flex-shrink-0">
            {/* AMM Badge */}
            <div className="flex [background:linear-gradient(219deg,#FFD700_0%,#DAA520_48.97%,#B8860B_48.98%,#996515_100%)] absolute top-[28px] sm:top-[38px] lg:top-[53px] left-[28px] sm:left-[38px] lg:left-[53px] p-[1px] w-[14px] sm:w-[16px] h-[14px] sm:h-[16px] justify-center items-center rounded-full z-30">
              <div className="flex justify-center items-center bg-background absolute w-[12px] sm:w-[14px] h-[12px] sm:h-[14px] rounded-full z-30">
                <div className="w-[8px] sm:w-[10px] h-[8px] sm:h-[10px] rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600"></div>
              </div>
            </div>
            
            {/* Token Image */}
            <div className="bg-[#53D38E]/20 absolute flex p-[1px] justify-start items-center rounded-[4px] z-20">
              <div className="bg-backgroundSecondary flex p-[2px] justify-start items-center rounded-[3px]">
                <div className="w-[36px] sm:w-[46px] lg:w-[56px] h-[36px] sm:h-[46px] lg:h-[56px] flex-shrink-0 group/image relative">
                  <div className="pointer-events-none border-textPrimary/10 border-[1px] absolute w-full h-full z-10 rounded-[1px]"></div>
                  <div className="w-full h-full relative">
                    
                    <TokenAvatar 
                      symbol={(token as any)?.baseToken?.symbol || ''}
                      name={(token as any)?.baseToken?.name || ''}
                      size={36}
                      className="rounded-[1px] w-full h-full"
                      imageUrl={(token as any)?.info?.imageUrl}
                      fitParent
                    />
                    <TokenDetailsPopover token={token}>
                      <button 
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200 flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                          aria-label={`View token details`}
                      >
                        <i className="ri-camera-line text-white text-[16px] sm:text-[20px] lg:text-[24px]"></i>
                      </button>
                    </TokenDetailsPopover>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Background gradient */}
            <div className="[background:linear-gradient(219deg,#FFD700_0%,#DAA520_48.97%,#B8860B_48.98%,#996515_100%)] absolute top-0 left-0 w-full h-full rounded-[4px] z-10"></div>
          </div>
          
          {/* Token Info */}
          <div className="flex flex-col gap-[4px] justify-start items-start">
            <div className="flex flex-row gap-[4px] justify-start items-center">
              <span className="text-textPrimary text-[12px] sm:text-[16px] font-medium tracking-[-0.02em]">
                {(token as any)?.baseToken?.name || ''}
              </span>
              <span className="contents">
                <div className="group flex flex-row gap-[4px] justify-start items-center">
                  <span className="text-textTertiary text-[12px] sm:text-[16px] font-medium tracking-[-0.02em] group-hover:text-primaryBlueHover transition-colors duration-[125ms] cursor-pointer">
                    {(token as any)?.baseToken?.symbol || ''}
                  </span>
                  <button className="group-hover:text-primaryBlue transition-colors duration-200 cursor-pointer" aria-label={`Copy token symbol to clipboard`}>
                    <i className="text-textTertiary ri-file-copy-fill text-[12px] sm:text-[14px] group-hover:text-primaryBlueHover"></i>
                  </button>
                </div>
              </span>
            </div>
            <div className="flex flex-row gap-[8px] justify-start items-center">
              <span className="text-primaryGreen text-[12px] sm:text-[14px] font-medium">3mo</span>
              {twitterUrl && (
                <a 
                  href={twitterUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[#5DBCFF] hover:text-[#70c4ff] transition-colors duration-[125ms] flex flex-row flex-shrink-0 gap-[2px] justify-start items-center cursor-pointer"
                  aria-label={`Open Twitter profile (opens in new tab)`}
                >
                  <i className="ri-user-line" style={{ fontSize: '16px' }}></i>
                </a>
              )}
              {websiteUrl && (
                <a 
                  href={websiteUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center"
                  aria-label={`View ${(token as any)?.baseToken?.name || ''} website (opens in new tab)`}
                >
                  <i className="text-textSecondary ri-global-line text-[14px] sm:text-[16px] hover:text-primaryBlueHover transition-colors duration-[125ms]"></i>
                </a>
              )}
              {telegramUrl && (
                <a 
                  href={telegramUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center"
                  aria-label={`Open Telegram (opens in new tab)`}
                >
                  <i className="text-textSecondary ri-telegram-2-line text-[14px] sm:text-[16px] hover:text-primaryBlueHover transition-colors duration-[125ms]"></i>
                </a>
              )}
              <a 
                href={`https://x.com/search?q=${encodeURIComponent((token as any)?.baseToken?.symbol || '')}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center"
                aria-label={`Search on X (opens in new tab)`}
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
                isAnimating={priceUpdate?.animate}
                variant="green"
              >
                 <span className="text-textPrimary text-[11px] lg:text-[14px] font-medium">
                   {formatNumber((token as any).fdv || (token as any).marketCap || 0)}
                 </span>
              </PulseAnimation>
            </div>
          </div>
        </div>

        {/* Liquidity */}
        <div className="min-w-0 flex flex-1 flex-row px-[8px] lg:px-[12px] justify-start items-center">
          <div className="flex flex-col gap-[4px] justify-start items-start">
            <div className="flex flex-row gap-[4px] justify-start items-center">
              <PulseAnimation 
                isAnimating={priceUpdate?.animate}
                variant="green"
              >
                 <span className="text-textPrimary text-[11px] lg:text-[14px] font-medium">
                   {formatNumber((token as any).liquidity?.usd || 0)}
                 </span>
              </PulseAnimation>
            </div>
          </div>
        </div>

        {/* Volume */}
        <div className="min-w-0 flex flex-1 flex-row px-[8px] lg:px-[12px] justify-start items-center">
          <div className="flex flex-col gap-[4px] justify-start items-start">
            <div className="flex flex-row gap-[4px] justify-start items-center">
              <PulseAnimation 
                isAnimating={priceUpdate?.animate}
                variant="green"
              >
                 <span className="text-textPrimary text-[11px] lg:text-[14px] font-medium">
                   {formatNumber((token as any).volume?.h24 || 0)}
                 </span>
              </PulseAnimation>
            </div>
          </div>
        </div>

        {/* TXNS */}
        <div className="min-w-0 flex flex-1 flex-row px-[12px] justify-start items-center">
          <div className="flex flex-col gap-[4px] justify-start items-start">
            <div className="flex flex-row gap-[4px] justify-start items-center">
               <span className="text-textPrimary text-[12px] sm:text-[14px] font-medium">
                 {formatCount(((token as any)?.txns?.h24?.buys || 0) + ((token as any)?.txns?.h24?.sells || 0))}
              </span>
            </div>
            <div className="flex flex-row gap-[4px] justify-start items-center">
              <div className="flex flex-row gap-[4px] justify-start items-center">
                <span className="text-increase text-[12px] font-medium font-GeistMono">
                  {formatCount((token as any)?.txns?.h24?.buys || 0)}
                </span>
                <span className="text-textSecondary text-[12px] font-medium font-GeistMono">/</span>
                <span className="text-decrease text-[12px] font-medium font-GeistMono">
                  {formatCount((token as any)?.txns?.h24?.sells || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Audit removed */}

        {/* Action */}
        <div className="min-w-0 flex flex-1 flex-row px-[12px] justify-start items-center">
          <div className="flex flex-row gap-[8px] justify-start items-center">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onBuy?.(token);
              }}
              className="bg-primaryBlue hover:bg-primaryBlueHover text-textPrimary font-medium py-[6px] px-[16px] rounded-[4px] text-[12px] sm:text-[14px] transition-colors duration-150"
              aria-label={`Buy ${token.name} (${token.symbol})`}
            >
              Buy
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onFavorite?.(token.id);
              }}
              className="text-textSecondary hover:text-primaryBlue transition-colors duration-150"
              aria-label={`Add ${token.name} to favorites`}
            >
              <i className="ri-star-line text-[16px] sm:text-[18px]"></i>
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(token.id);
              }}
              className="text-textSecondary hover:text-primaryBlue transition-colors duration-150"
              aria-label={isSelected ? `Deselect ${token.name}` : `Select ${token.name}`}
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
  const { tokens, loading, error, selectedTokens, priceUpdates } = useTokensWithState();
  
  const filters = useAppSelector(state => state.filters.filters);

  // Clear animation flags after a delay when any token is animating
  useEffect(() => {
    const animatingTokens = Object.entries(priceUpdates).filter(([_, update]) => update.animate);
    
    if (animatingTokens.length > 0) {
      const timeout = setTimeout(() => {
        dispatch(clearPriceAnimations());
      }, 800);
      
      return () => clearTimeout(timeout);
    }
  }, [priceUpdates, dispatch]);

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

  // Memoized filtered and sorted tokens with client-side pagination
  const { sortedTokens, totalFilteredCount, paginatedTokens } = useMemo(() => {
    if (!tokens.length) return { sortedTokens: [], totalFilteredCount: 0, paginatedTokens: [] };

    // tokens are raw pairs now
    let filteredTokens = [...(tokens as any[])];

    // Apply search filter
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filteredTokens = filteredTokens.filter(pair => {
          const name = pair?.baseToken?.name || '';
          const symbol = pair?.baseToken?.symbol || '';
          const pairAddr = pair?.pairAddress || '';
          return name.toLowerCase().includes(query) || symbol.toLowerCase().includes(query) || pairAddr.toLowerCase().includes(query);
        });
    }

    // Apply quick filters
    switch (quickFilter) {
      case 'trending':
        filteredTokens = filteredTokens.filter(pair => (pair?.volume?.h24 || 0) > 50000);
        break;
      case 'new':
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        filteredTokens = filteredTokens.filter(pair => (pair?.createdAt ? new Date(pair.createdAt).getTime() : 0) > oneDayAgo);
        break;
      case 'gainers':
        filteredTokens = filteredTokens.filter(pair => (pair?.priceChange?.h24 || 0) > 0);
        break;
      case 'losers':
        filteredTokens = filteredTokens.filter(pair => (pair?.priceChange?.h24 || 0) < 0);
        break;
      case 'volume':
        filteredTokens = filteredTokens.filter(pair => (pair?.volume?.h24 || 0) > 100000);
        break;
      case 'pump':
        filteredTokens = filteredTokens.filter(token => token.isPumpFun);
        break;
      case 'all':
      default:
        // No additional filtering
        break;
    }

    // Apply main filters
    if (filters.minMarketCap) filteredTokens = filteredTokens.filter(pair => (pair?.fdv || 0) >= filters.minMarketCap!);
    if (filters.maxMarketCap) filteredTokens = filteredTokens.filter(pair => (pair?.fdv || 0) <= filters.maxMarketCap!);
    if (filters.minLiquidity) filteredTokens = filteredTokens.filter(pair => (pair?.liquidity?.usd || 0) >= filters.minLiquidity!);
    if (filters.maxLiquidity) filteredTokens = filteredTokens.filter(pair => (pair?.liquidity?.usd || 0) <= filters.maxLiquidity!);
    if (filters.minVolume) filteredTokens = filteredTokens.filter(pair => (pair?.volume?.h24 || 0) >= filters.minVolume!);
    if (filters.maxVolume) filteredTokens = filteredTokens.filter(pair => (pair?.volume?.h24 || 0) <= filters.maxVolume!);

    // Apply sorting
    const sorted = filteredTokens.sort((a, b) => {
      const direction = filters.sortDirection === 'asc' ? 1 : -1;
      
      switch (filters.sortBy) {
        case 'marketCap': {
          const av = (a?.fdv ?? a?.marketCap ?? 0);
          const bv = (b?.fdv ?? b?.marketCap ?? 0);
          return (av - bv) * direction;
        }
        case 'liquidity':
          return ((a?.liquidity?.usd || 0) - (b?.liquidity?.usd || 0)) * direction;
        case 'volume': {
          const timeframe = (filters.timeframe || '24h');
          const getVol = (p: any) => {
            if (timeframe === '5m') return p?.volume?.m5 ?? p?.volume?.h1 ?? 0;
            if (timeframe === '1h') return p?.volume?.h1 ?? 0;
            if (timeframe === '6h') return p?.volume?.h6 ?? p?.volume?.h24 ?? 0;
            return p?.volume?.h24 ?? 0;
          };
          return (getVol(a) - getVol(b)) * direction;
        }
        case 'priceChange': {
          const timeframe = (filters.timeframe || '24h');
          const getChange = (p: any) => {
            if (timeframe === '5m') return p?.priceChange?.m5 ?? p?.priceChange?.h1 ?? 0;
            if (timeframe === '1h') return p?.priceChange?.h1 ?? 0;
            if (timeframe === '6h') return p?.priceChange?.h6 ?? p?.priceChange?.h24 ?? 0;
            return p?.priceChange?.h24 ?? 0;
          };
          return (getChange(a) - getChange(b)) * direction;
        }
        case 'transactions': {
          const timeframe = (filters.timeframe || '24h');
          const getTx = (p: any) => {
            if (timeframe === '5m') return (p?.txns?.m5?.buys || 0) + (p?.txns?.m5?.sells || 0);
            if (timeframe === '1h') return (p?.txns?.h1?.buys || 0) + (p?.txns?.h1?.sells || 0);
            if (timeframe === '6h') return (p?.txns?.h6?.buys || 0) + (p?.txns?.h6?.sells || 0);
            return (p?.txns?.h24?.buys || 0) + (p?.txns?.h24?.sells || 0);
          };
          return (getTx(a) - getTx(b)) * direction;
        }
        case 'age':
          return 0;
        default:
          return 0;
      }
    });

    // Show more rows to make live updates visible across list
    const maxVisible = 150;
    const visibleTokens = sorted.slice(0, maxVisible);

    return {
      sortedTokens: sorted,
      totalFilteredCount: filteredTokens.length,
      paginatedTokens: visibleTokens
    };
  }, [tokens, filters, searchQuery, quickFilter]);

  // Debounced token rendering to prevent main-thread blocking
  const [debouncedTokens, setDebouncedTokens] = useState<Token[]>([]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Use requestIdleCallback if available to defer heavy rendering
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          setDebouncedTokens(paginatedTokens);
        });
      } else {
        // Fallback to setTimeout
        setTimeout(() => {
          setDebouncedTokens(paginatedTokens);
        }, 0);
      }
    }, 100); // 100ms debounce

    return () => clearTimeout(timeoutId);
  }, [paginatedTokens]);

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => {
    const isActive = filters.sortBy === field;
    const direction = filters.sortDirection;
    
    return (
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1 text-textSecondary hover:text-textPrimary transition-colors text-[10px] lg:text-[14px] font-medium uppercase tracking-wider"
        aria-label={`Sort by ${field} ${isActive ? (direction === 'asc' ? 'descending' : 'ascending') : 'descending'}`}
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
        {/* <div className="flex justify-between items-center mb-2">
          <DataStatusIndicator 
            isConnected={isConnected}
            isSimulating={isSimulating}
          />
          <div className="text-xs text-textSecondary">
            {totalFilteredCount} of {tokens.length} tokens • Updated live
          </div>
        </div> */}

        {/* Table Container with Fixed Height */}
        <div className="border border-primaryStroke/50 rounded-lg bg-backgroundSecondary overflow-hidden">
          {/* Table Header - Desktop Only */}
            <div className="hidden sm:flex border-primaryStroke/50 border-b-[1px] bg-backgroundSecondary flex-row w-full h-[48px] min-h-[48px] max-h-[48px] px-[12px] justify-start items-center sticky top-0 z-10">
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

            {/* Audit column removed */}

            {/* Action Header - Hidden on smaller screens */}
            <div className="min-w-0 hidden lg:flex flex-1 flex-row px-[12px] justify-start items-center">
              <span className="text-textSecondary text-[11px] lg:text-[14px] font-medium uppercase tracking-wider">
                Action
              </span>
            </div>
          </div>
        </div>

          {/* Scrollable Table Body */}
          <div className="h-[600px] max-h-[600px] overflow-y-auto table-scrollbar">
            {loading.isLoading && tokens.length === 0 ? (
              <TokenTableSkeleton rows={10} />
            ) : (
              <div className="w-full">
                {debouncedTokens.map((token) => {
                  const pairId = (token as any).pairAddress || (token as any)?.baseToken?.address || (token as any)?.id;
                  return (
                  <TokenRow
                    key={pairId}
                    token={token}
                    isSelected={selectedTokens.includes(pairId)}
                    priceUpdate={priceUpdates[pairId]}
                    onSelect={(id) => handleTokenSelect(id)}
                    onFavorite={(id) => handleFavorite(id)}
                    onBuy={handleBuy}
                    onDetails={handleDetails}
                  />
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {!loading.isLoading && totalFilteredCount === 0 && (
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
        </div>


      </div>
    </ErrorBoundary>
  );
}; 