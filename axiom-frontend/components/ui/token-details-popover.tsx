'use client';

import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { SimpleTokenAvatar, TokenAvatar } from '@/components/ui/token-avatar';
import { Token } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@radix-ui/react-popover';

interface TokenDetailsPopoverProps {
  token: Token;
  children: React.ReactNode;
  similarTokens?: Token[];
}

export const TokenDetailsPopover: React.FC<TokenDetailsPopoverProps> = ({
  token,
  children,
  similarTokens = []
}) => {
  const formatNumber = (value: any) => {
    const num = Number(value || 0);
    if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatCount = (value: any) => {
    const num = Number(value || 0);
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return String(num);
  };

  const getChangeColor = (change: any) => {
    const value = Number(change || 0);
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  // Only show similar tokens if they are provided

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          className="w-96 p-0 bg-[#1a1b23] border-[#2a2d3a] shadow-2xl rounded-lg border z-50" 
          align="start"
          sideOffset={8}
        >
        <div className="p-4 space-y-4">
          {/* Header with large token image */}
          <div className="flex items-start gap-4">
            <div className="relative">
              <TokenAvatar 
                symbol={(token as any)?.baseToken?.symbol || ''}
                name={(token as any)?.baseToken?.name || ''}
                size={80}
                className="rounded-lg"
                imageUrl={(token as any)?.info?.imageUrl}
              />
              {/* AMM Badge */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-[#1a1b23] rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full"></div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white text-lg font-semibold truncate">{(token as any)?.baseToken?.name || (token as any)?.baseToken?.symbol || ''}</h3>
                <button className="text-gray-400 hover:text-white transition-colors" aria-label={`Copy ${(token as any)?.baseToken?.name || ''} address to clipboard`}>
                  <i className="ri-file-copy-line text-sm"></i>
                </button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-gray-300 text-sm">{(token as any)?.baseToken?.symbol || ''}</span>
              </div>
              <div className="flex items-center gap-3">
                {((token as any)?.info?.websites?.[0]?.url) && (
                  <a 
                    href={(token as any).info.websites[0].url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#5DBCFF] hover:text-[#70c4ff] transition-colors"
                    aria-label={`View ${(token as any)?.baseToken?.name || ''} website (opens in new tab)`}
                  >
                    <i className="ri-link text-lg"></i>
                  </a>
                )}
                <a 
                  href={`https://x.com/search?q=${encodeURIComponent((token as any)?.baseToken?.symbol || '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label={`Search for ${(token as any)?.baseToken?.symbol || ''} on X (formerly Twitter) (opens in new tab)`}
                >
                  <i className="ri-search-line text-lg"></i>
                </a>
                {(((token as any)?.url) || ((token as any)?.pairAddress)) && (
                  <a 
                    href={(token as any).url || `https://dexscreener.com/solana/${(token as any).pairAddress}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label={`View ${((token as any)?.baseToken?.name || '')} trading pair details (opens in new tab)`}
                  >
                    <i className="ri-external-link-line text-lg"></i>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Token Stats */}
          <div className="grid grid-cols-2 gap-4 py-3 border-t border-[#2a2d3a]">
            <div>
              <div className="text-gray-400 text-xs mb-1">Market Cap</div>
              <div className="text-white font-medium">{formatNumber((token as any).fdv || (token as any).marketCap || 0)}</div>
              <div className={cn("text-xs font-medium", getChangeColor((token as any)?.priceChange?.h24 || 0))}>
                {Number(((token as any)?.priceChange?.h24 || 0)) >= 0 ? '+' : ''}{Number(((token as any)?.priceChange?.h24 || 0)).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">Liquidity</div>
              <div className="text-white font-medium">{formatNumber((token as any)?.liquidity?.usd || 0)}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">Volume 24h</div>
              <div className="text-white font-medium">{formatNumber((token as any)?.volume?.h24 || 0)}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">Transactions</div>
              <div className="text-white font-medium">{formatCount(((token as any)?.txns?.h24?.buys || 0) + ((token as any)?.txns?.h24?.sells || 0))}</div>
              <div className="text-xs">
                <span className="text-green-400">{formatCount((token as any)?.txns?.h24?.buys || 0)}</span>
                <span className="text-gray-400"> / </span>
                <span className="text-red-400">{formatCount((token as any)?.txns?.h24?.sells || 0)}</span>
              </div>
            </div>
          </div>

          {/* Similar Tokens Section - Only show if similar tokens are provided */}
          {similarTokens.length > 0 && (
            <div className="border-t border-[#2a2d3a] pt-3">
              <div className="text-gray-400 text-sm mb-3">Similar Tokens</div>
              <div className="space-y-2">
                {similarTokens.slice(0, 2).map((similarToken: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#2a2d3a] transition-colors cursor-pointer">
                    <SimpleTokenAvatar 
                      symbol={(similarToken as any)?.baseToken?.symbol || ''}
                      name={(similarToken as any)?.baseToken?.name || ''}
                      size={32}
                      className="rounded-md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">{(similarToken as any)?.baseToken?.symbol || ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-medium", getChangeColor((similarToken as any)?.priceChange?.h24 || 0))}>
                          {Number(((similarToken as any)?.priceChange?.h24 || 0)) >= 0 ? '+' : ''}{Number(((similarToken as any)?.priceChange?.h24 || 0)).toFixed(2)}%
                        </span>
                        <span className="text-gray-400 text-xs">{formatCount((((similarToken as any)?.txns?.h24?.buys || 0) + ((similarToken as any)?.txns?.h24?.sells || 0)) || 0)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white text-sm font-medium">{formatNumber((similarToken as any)?.fdv || (similarToken as any)?.marketCap || 0)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-[#2a2d3a]">
            <button className="flex-1 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors">
              Buy
            </button>
            <button className="flex-1 bg-[#2a2d3a] hover:bg-[#3a3d4a] text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors">
              Details
            </button>
            <button className="bg-[#2a2d3a] hover:bg-[#3a3d4a] text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors">
              <i className="ri-heart-line"></i>
            </button>
          </div>
        </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}; 