'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FilterPanel } from './FilterPanel';
import { cn } from '@/lib/utils';
import { useAppSelector, useAppDispatch } from '@/lib/store';
import { setTimeframe, setActiveTab } from '@/lib/store/slices/filtersSlice';
import { useQueryClient } from '@tanstack/react-query';
import { tokenQueryKeys } from '@/lib/hooks/useTokens';
import Image from 'next/image';

const timeframes = [
  { id: '5m', label: '5m' },
  { id: '1h', label: '1h' },
  { id: '6h', label: '6h' },
  { id: '24h', label: '24h' },
] as const;

export function Header() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const activeTimeframe = useAppSelector(state => state.filters.timeframe);
  const activeTab = useAppSelector(state => state.filters.activeTab);
  const [quickBuyAmount, setQuickBuyAmount] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleTimeframeChange = (timeframe: '5m' | '1h' | '6h' | '24h') => {
    dispatch(setTimeframe(timeframe));
    
    // Force React Query to refetch all token queries
    queryClient.invalidateQueries({ queryKey: tokenQueryKeys.all });
  };

  const handleTabChange = (tab: 'dex-screener' | 'trending' | 'pump-live') => {
    dispatch(setActiveTab(tab));
    
    // Force React Query to refetch data for the new tab
    queryClient.invalidateQueries({ queryKey: tokenQueryKeys.all });
  };

  const handleQuickBuyAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuickBuyAmount(e.target.value);
  };

  return (
    <div className="flex flex-col sm:flex-row w-full min-h-[32px] mb-[16px] gap-[12px] sm:gap-[24px] justify-center items-stretch sm:items-center">
      {/* Navigation Section */}
      <div className="flex flex-row flex-1 gap-[12px] sm:gap-[24px] justify-start items-center text-nowrap overflow-x-auto">
        <Button
          variant="ghost"
          onClick={() => handleTabChange('dex-screener')}
          className="flex flex-row h-[32px] gap-[24px] justify-start items-center p-0 hover:bg-transparent"
          aria-label="Switch to DEX Screener tab"
        >
          <span className={cn(
            "text-[14px] sm:text-[20px] font-medium tracking-[-0.02em] transition-colors duration-150",
            activeTab === 'dex-screener' ? "text-textPrimary" : "text-textTertiary hover:text-textPrimary"
          )}>
            DEX Screener
          </span>
        </Button>
        
        <Button
          variant="ghost"
          onClick={() => handleTabChange('trending')}
          className="flex flex-row h-[32px] gap-[24px] justify-start items-center p-0 hover:bg-transparent"
          aria-label="Switch to Trending tab"
        >
          <span className={cn(
            "text-[16px] sm:text-[20px] font-medium tracking-[-0.02em] transition-colors duration-150",
            activeTab === 'trending' ? "text-textPrimary" : "text-textTertiary hover:text-textPrimary"
          )}>
            Trending
          </span>
        </Button>
        
        <Button
          variant="ghost"
          onClick={() => handleTabChange('pump-live')}
          className="flex flex-row h-[32px] gap-[24px] justify-start items-center p-0 hover:bg-transparent"
          aria-label="Switch to Pump Live tab"
        >
          <span className={cn(
            "text-[16px] sm:text-[20px] font-medium tracking-[-0.02em] transition-colors duration-150",
            activeTab === 'pump-live' ? "text-textPrimary" : "text-textTertiary hover:text-textPrimary"
          )}>
            Pump Live
          </span>
        </Button>
      </div>

      {/* Controls Section */}
      <div className="relative flex flex-row gap-[12px] sm:gap-[24px] min-w-[0px] justify-start items-center text-nowrap">
        <div className="flex flex-row gap-[8px] sm:gap-[24px] min-w-[0px] justify-start items-center text-nowrap overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          {/* Timeframe Buttons */}
          <div className="flex flex-row gap-[4px] justify-end items-center">
            {timeframes.map((timeframe) => (
              <Button
                key={timeframe.id}
                variant="ghost"
                onClick={() => handleTimeframeChange(timeframe.id)}
                className={cn(
                  "flex flex-row h-[32px] text-nowrap px-[8px]",
                  "justify-start items-center",
                  "[transition:none] duration-0",
                  "hover:bg-primaryBlue/20 hover:text-primaryBlue hover:[transition:background-color_135ms_ease-in-out,color_135ms_ease-in-out] rounded-[4px]",
                  activeTimeframe === timeframe.id ? "text-primaryBlue" : "text-textPrimary"
                )}
                aria-label={`Set timeframe to ${timeframe.label}`}
                aria-pressed={activeTimeframe === timeframe.id}
              >
                <span className="text-[14px] font-medium">{timeframe.label}</span>
              </Button>
            ))}
          </div>

          {/* Filter Panel */}
          <FilterPanel 
            isOpen={isFilterOpen}
            onOpenChange={setIsFilterOpen}
          />

          {/* Right Controls */}
          <div className="flex flex-row h-full gap-[8px] items-center justify-start">
            {/* Settings Button */}
            <Button
              variant="ghost"
              onClick={() => console.log('Settings clicked')}
              className="group flex flex-row p-[4px] min-w-[32px] max-w-[32px] w-[32px] h-[32px] justify-center items-center hover:bg-secondaryStroke/30 transition-opacity duration-150 ease-in-out cursor-pointer rounded-full"
              aria-label="Open settings menu"
            >
              <i className="ri-settings-3-line text-[18px] text-textSecondary group-hover:text-textPrimary transition-colors duration-150 ease-in-out cursor-pointer" />
            </Button>

            {/* Wallet Button */}
            <div className="relative flex">
              <div data-state="closed" className="w-full">
                <Button
                  variant="ghost"
                  className="flex border border-primaryStroke group flex-row p-[4px] pr-[12px] pl-[12px] h-[32px] gap-[8px] justify-center items-center hover:bg-primaryStroke/35 transition-colors duration-125 cursor-pointer rounded-full"
                  aria-label="Open wallet menu - 1 wallet connected with 0 balance"
                >
                  <div className="flex flex-row gap-[4px] justify-center items-center">
                    <i className="ri-wallet-line text-[18px] text-textSecondary group-hover:text-textPrimary transition-colors duration-150 ease-in-out cursor-pointer" />
                    <span className="text-[14px] text-textSecondary font-medium group-hover:text-textPrimary transition-colors duration-150 ease-in-out cursor-pointer">
                      1
                    </span>
                  </div>
                  <div className="flex flex-row gap-[4px] justify-center items-center">
                    <div className="w-4 h-4 bg-purple-500 rounded-full flex-shrink-0"></div>
                    <span className="text-[14px] text-textPrimary font-medium group-hover:text-textPrimary transition-colors duration-150 ease-in-out cursor-pointer">
                      <span>0</span>
                    </span>
                  </div>
                  <i className="ri-arrow-down-s-line text-[18px] text-textSecondary group-hover:text-textPrimary transition-colors duration-150 ease-in-out cursor-pointer" />
                </Button>
              </div>
            </div>

            {/* Quick Buy */}
            <div className="overflow-hidden whitespace-nowrap border-primaryStroke font-normal border-[1px] flex flex-row min-w-[216px] h-[32px] pl-[12px] gap-[8px] justify-start items-center rounded-full hover:bg-primaryStroke/35 transition-colors duration-125 cursor-pointer">
              <span className="flex text-[14px] text-textTertiary font-medium">Quick Buy</span>
              <div className="flex flex-1 sm:max-w-[60px] min-w-[0px]">
                <input
                  placeholder="0.0"
                  className="text-[14px] w-full text-textPrimary placeholder:text-textTertiary font-medium outline-none bg-transparent text-left"
                  type="text"
                  value={quickBuyAmount}
                  onChange={handleQuickBuyAmountChange}
                  aria-label="Quick buy amount"
                />
              </div>
              <div className="w-4 h-4 bg-purple-500 rounded-full flex-shrink-0"></div>
              <div className="border-primaryStroke border-l-[1px] flex h-full pr-[3px] pl-[3px] gap-[6px] justify-center items-center cursor-pointer">
                <Button
                  variant="ghost"
                  className="group w-[24px] h-[24px] flex flex-row gap-[4px] rounded-[4px] justify-center items-center transition-colors ease-in-out duration-125 hover:bg-primaryBlueHover/10 p-0"
                  aria-label="Quick buy preset 1"
                >
                  <span className="text-[13px] gap-[4px] flex flex-row justify-center items-center font-medium transition-colors ease-in-out duration-125 text-primaryBlue hover:text-primaryBlueHover">
                    P1
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  className="group w-[24px] h-[24px] flex flex-row gap-[4px] rounded-[4px] justify-center items-center transition-colors ease-in-out duration-125 hover:bg-primaryStroke/60 p-0"
                  aria-label="Quick buy preset 2"
                >
                  <span className="text-[13px] gap-[4px] flex flex-row justify-center items-center font-medium transition-colors ease-in-out duration-125 text-textSecondary">
                    P2
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  className="group w-[24px] h-[24px] flex flex-row gap-[4px] rounded-r-full rounded-l-[4px] justify-center items-center transition-colors ease-in-out duration-125 hover:bg-primaryStroke/60 p-0"
                  aria-label="Quick buy preset 3"
                >
                  <span className="text-[13px] gap-[4px] flex flex-row justify-center items-center font-medium transition-colors ease-in-out duration-125 text-textSecondary">
                    P3
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 