'use client';

import Image from 'next/image';
import React from 'react';

// Mock token data
const mockToken = {
  id: '1',
  name: 'PepeCoin',
  symbol: 'PEPE',
  imageUrl: 'https://images.rawpixel.com/image_800/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA0L3YxMTYxLWItMDQ0LWwyOHRmc3IzLmpwZw.jpg',
  marketCap: 1250000,
  priceChange24h: 12.45,
  liquidity: 850000,
  volume24h: 420000,
  transactions24h: 1250,
  buys24h: 780,
  sells24h: 470,
  age: '2h 15m',
  communityUrl: 'https://t.me/pepecoin',
  audit: {
    riskScore: 15,
    burnPercentage: 85,
    isPaid: false
  }
};

interface TokenRowProps {
  token: typeof mockToken;
}

const TokenRow = ({ token }: TokenRowProps) => {
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
    <div className="whitespace-nowrap border-primaryStroke/50 border-b-[1px] bg-backgroundSecondary flex flex-row flex-grow w-full max-w-[1420px] min-w-[980px] sm:min-w-[1164px] h-[72px] sm:h-[88px] min-h-[72px] sm:min-h-[88px] max-h-[72px] sm:max-h-[88px] px-0 sm:px-[12px] justify-start items-center rounded-b-[0px] active:bg-primaryStroke/50 sm:hover:bg-primaryStroke/50 cursor-pointer">
      <div className="flex flex-row flex-grow w-full h-full items-center">
        {/* Pair Info */}
        <div className="min-w-0 flex flex-row w-[224px] sm:w-[320px] px-[12px] gap-[12px] justify-start items-center">
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
                    <Image 
                      alt={`${token.name} coin`}
                      loading="eager" 
                      width="36" 
                      height="36" 
                      decoding="async" 
                      className="rounded-[1px] w-full h-full object-cover" 
                      src={token.imageUrl}
                      style={{ color: 'transparent', objectFit: 'cover' }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjM2IiBoZWlnaHQ9IjM2IiByeD0iNCIgZmlsbD0iIzNBM0E0MiIvPgo8dGV4dCB4PSIxOCIgeT0iMjIiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI0ZGRkZGRiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VDwvdGV4dD4KICA8L3N2Zz4=';
                      }}
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
        <div className="min-w-0 flex flex-1 flex-row px-[12px] justify-start items-center">
          <div className="flex flex-col gap-[4px] justify-start items-start">
            <div className="flex flex-row gap-[4px] justify-start items-center">
              <span className="text-textPrimary text-[12px] sm:text-[14px] font-medium">
                {formatNumber(token.marketCap)}
              </span>
            </div>
            <div className="flex flex-row gap-[4px] justify-start items-center">
              <span className={`font-GeistMono text-[12px] sm:text-[12px] font-medium ${getChangeColor(token.priceChange24h)}`}>
                {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Liquidity */}
        <div className="min-w-0 flex flex-1 flex-row px-[12px] justify-start items-center">
          <div className="flex flex-col gap-[4px] justify-start items-start">
            <div className="flex flex-row gap-[4px] justify-start items-center">
              <span className="text-textPrimary text-[12px] sm:text-[14px] font-medium">
                {formatNumber(token.liquidity)}
              </span>
            </div>
          </div>
        </div>

        {/* Volume */}
        <div className="min-w-0 flex flex-1 flex-row px-[12px] justify-start items-center">
          <div className="flex flex-col gap-[4px] justify-start items-start">
            <div className="flex flex-row gap-[4px] justify-start items-center">
              <span className="text-textPrimary text-[12px] sm:text-[14px] font-medium">
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
              onClick={() => console.log('Buy clicked', token.symbol)}
              className="bg-primaryBlue hover:bg-primaryBlueHover text-textPrimary font-medium py-[6px] px-[16px] rounded-[4px] text-[12px] sm:text-[14px] transition-colors duration-150"
            >
              Buy
            </button>
            <button 
              onClick={() => console.log('Favorite clicked', token.symbol)}
              className="text-textSecondary hover:text-primaryBlue transition-colors duration-150"
            >
              <i className="ri-star-line text-[16px] sm:text-[18px]"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TokenTable = () => {
  return (
    <div className="w-full">
      {/* Table Header */}
      <div className="whitespace-nowrap border-primaryStroke/50 border-b-[1px] bg-backgroundSecondary flex flex-row flex-grow w-full max-w-[1420px] min-w-[980px] sm:min-w-[1164px] h-[48px] min-h-[48px] max-h-[48px] px-0 sm:px-[12px] justify-start items-center">
        <div className="flex flex-row flex-grow w-full h-full items-center">
          {/* Pair Info Header */}
          <div className="min-w-0 flex flex-row w-[224px] sm:w-[320px] px-[12px] gap-[12px] justify-start items-center">
            <span className="text-textSecondary text-[12px] sm:text-[14px] font-medium uppercase tracking-wider">
              Pair Info
            </span>
          </div>

          {/* Market Cap Header */}
          <div className="min-w-0 flex flex-1 flex-row px-[12px] justify-start items-center">
            <span className="text-textSecondary text-[12px] sm:text-[14px] font-medium uppercase tracking-wider">
              Market Cap
            </span>
          </div>

          {/* Liquidity Header */}
          <div className="min-w-0 flex flex-1 flex-row px-[12px] justify-start items-center">
            <span className="text-textSecondary text-[12px] sm:text-[14px] font-medium uppercase tracking-wider">
              Liquidity
            </span>
          </div>

          {/* Volume Header */}
          <div className="min-w-0 flex flex-1 flex-row px-[12px] justify-start items-center">
            <span className="text-textSecondary text-[12px] sm:text-[14px] font-medium uppercase tracking-wider">
              Volume
            </span>
          </div>

          {/* TXNS Header */}
          <div className="min-w-0 flex flex-1 flex-row px-[12px] justify-start items-center">
            <span className="text-textSecondary text-[12px] sm:text-[14px] font-medium uppercase tracking-wider">
              TXNS
            </span>
          </div>

          {/* Audit Header */}
          <div className="min-w-0 flex flex-1 flex-row px-[12px] justify-start items-center">
            <span className="text-textSecondary text-[12px] sm:text-[14px] font-medium uppercase tracking-wider">
              Audit
            </span>
          </div>

          {/* Action Header */}
          <div className="min-w-0 flex flex-1 flex-row px-[12px] justify-start items-center">
            <span className="text-textSecondary text-[12px] sm:text-[14px] font-medium uppercase tracking-wider">
              Action
            </span>
          </div>
        </div>
      </div>

      {/* Token Row */}
      <TokenRow token={mockToken} />
    </div>
  );
}; 