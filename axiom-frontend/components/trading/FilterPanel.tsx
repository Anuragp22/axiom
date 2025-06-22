'use client';

import React from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/store';
import { 
  setSearchQuery, 
  setSortBy, 
  setSortDirection, 
  setMinMarketCap, 
  setMaxMarketCap,
  setMinLiquidity,
  setMaxLiquidity,
  setMinVolume,
  setMaxVolume,
  setQuickFilter,
  resetFilters 
} from '@/lib/store/slices/filtersSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ isOpen, onOpenChange }) => {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(state => state.filters.filters);
  const searchQuery = useAppSelector(state => state.filters.searchQuery);
  const quickFilter = useAppSelector(state => state.filters.quickFilter);
  
  const quickFilters = [
    { id: 'all', label: 'All Tokens' },
    { id: 'trending', label: 'Trending' },
    { id: 'new', label: 'New Tokens' },
    { id: 'gainers', label: 'Top Gainers' },
    { id: 'losers', label: 'Top Losers' },
    { id: 'volume', label: 'High Volume' },
  ];

  const sortOptions = [
    { value: 'marketCap', label: 'Market Cap' },
    { value: 'liquidity', label: 'Liquidity' },
    { value: 'volume', label: 'Volume 24h' },
    { value: 'priceChange', label: 'Price Change' },
    { value: 'transactions', label: 'Transactions' },
    { value: 'age', label: 'Age' },
  ];

  const handleReset = () => {
    dispatch(resetFilters());
  };

  const activeFiltersCount = [
    searchQuery,
    filters.minMarketCap,
    filters.maxMarketCap,
    filters.minLiquidity,
    filters.maxLiquidity,
    filters.minVolume,
    filters.maxVolume,
    quickFilter !== 'all' ? quickFilter : null,
  ].filter(Boolean).length;

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          className="bg-primaryStroke flex flex-row h-[32px] px-[12px] gap-[8px] justify-center items-center rounded-full hover:bg-secondaryStroke/80 transition-all duration-150 ease-in-out relative"
        >
          <div className="relative">
            <i className="ri-equalizer-3-line text-[18px] text-textPrimary" />
            {activeFiltersCount > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-primaryBlue text-white text-xs rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </div>
            )}
          </div>
          <div className="whitespace-nowrap flex flex-row gap-[4px] justify-start items-center">
            <span className="text-[14px] font-bold text-textPrimary">Filter</span>
          </div>
          <i className={cn(
            "ri-arrow-down-s-line text-[18px] text-textPrimary transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-80 p-0 bg-backgroundSecondary border-primaryStroke/50" 
        align="end"
        sideOffset={8}
      >
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-textPrimary">Filters</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="text-textSecondary hover:text-textPrimary"
            >
              Reset All
            </Button>
          </div>

          <Separator className="bg-primaryStroke/30" />

          <div className="space-y-2">
            <label className="text-sm font-medium text-textSecondary">Search</label>
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-textSecondary text-sm" />
              <Input
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch(setSearchQuery(e.target.value))}
                className="pl-9 bg-backgroundPrimary border-primaryStroke/50 text-textPrimary placeholder:text-textSecondary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-textSecondary">Quick Filters</label>
            <div className="flex flex-wrap gap-2">
              {quickFilters.map((filter) => (
                <Badge
                  key={filter.id}
                  variant={quickFilter === filter.id ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-colors",
                    quickFilter === filter.id 
                      ? "bg-primaryBlue text-white hover:bg-primaryBlueHover" 
                      : "border-primaryStroke/50 text-textSecondary hover:text-textPrimary hover:border-primaryStroke"
                  )}
                  onClick={() => dispatch(setQuickFilter(filter.id as any))}
                >
                  {filter.label}
                </Badge>
              ))}
            </div>
          </div>

          <Separator className="bg-primaryStroke/30" />

          <div className="space-y-2">
            <label className="text-sm font-medium text-textSecondary">Sort By</label>
            <div className="flex gap-2">
              <Select value={filters.sortBy} onValueChange={(value) => dispatch(setSortBy(value as any))}>
                <SelectTrigger className="flex-1 bg-backgroundPrimary border-primaryStroke/50 text-textPrimary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-backgroundSecondary border-primaryStroke/50">
                  {sortOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      className="text-textPrimary hover:bg-primaryStroke/30"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => dispatch(setSortDirection(filters.sortDirection === 'asc' ? 'desc' : 'asc'))}
                className="px-3 border-primaryStroke/50 text-textPrimary hover:bg-primaryStroke/30"
              >
                <i className={cn(
                  "text-sm",
                  filters.sortDirection === 'asc' ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"
                )} />
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Mobile-friendly search bar component
export const MobileSearchBar: React.FC = () => {
  const dispatch = useAppDispatch();
  const searchQuery = useAppSelector(state => state.filters.searchQuery);

  return (
    <div className="w-full mb-4 md:hidden">
      <div className="relative">
        <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-textSecondary text-sm" />
        <Input
          placeholder="Search tokens..."
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch(setSearchQuery(e.target.value))}
          className="pl-9 bg-backgroundSecondary border-primaryStroke/50 text-textPrimary placeholder:text-textSecondary"
        />
      </div>
    </div>
  );
}; 