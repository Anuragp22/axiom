'use client';

import { memo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Skeleton components for different loading states
export const Skeleton = memo(({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-primaryStroke/30",
        className
      )}
      {...props}
    />
  );
});
Skeleton.displayName = "Skeleton";

// Shimmer effect component
export const Shimmer = memo(({ 
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-primaryStroke/20",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r",
        "before:from-transparent before:via-white/10 before:to-transparent",
        className
      )}
      {...props}
    />
  );
});
Shimmer.displayName = "Shimmer";

// Token row skeleton
export const TokenRowSkeleton = memo(() => {
  return (
    <div className="whitespace-nowrap border-primaryStroke/50 border-b-[1px] bg-backgroundSecondary flex flex-row flex-grow w-full max-w-[1420px] min-w-[980px] sm:min-w-[1164px] h-[72px] sm:h-[88px] min-h-[72px] sm:min-h-[88px] max-h-[72px] sm:max-h-[88px] px-0 sm:px-[12px] justify-start items-center rounded-b-[0px]">
      <div className="flex flex-row flex-grow w-full h-full items-center">
        
        {/* Pair Info Skeleton */}
        <div className="min-w-0 flex flex-row w-[224px] sm:w-[320px] px-[12px] gap-[12px] justify-start items-center">
          <Shimmer className="w-[40px] sm:w-[62px] h-[40px] sm:h-[62px] rounded-[4px]" />
          <div className="flex flex-col gap-[4px] justify-start items-start">
            <div className="flex flex-row gap-[4px] justify-start items-center">
              <Shimmer className="h-[16px] sm:h-[20px] w-[80px] sm:w-[100px]" />
              <Shimmer className="h-[16px] sm:h-[20px] w-[40px] sm:w-[60px]" />
            </div>
            <div className="flex flex-row gap-[8px] justify-start items-center">
              <Shimmer className="h-[12px] sm:h-[14px] w-[30px]" />
              <Shimmer className="h-[12px] sm:h-[14px] w-[16px]" />
              <Shimmer className="h-[12px] sm:h-[14px] w-[16px]" />
            </div>
          </div>
        </div>

        {/* Market Cap Skeleton */}
        <div className="min-w-0 flex flex-1 flex-row px-[12px] justify-start items-center">
          <div className="flex flex-col gap-[4px] justify-start items-start">
            <Shimmer className="h-[14px] w-[60px] sm:w-[80px]" />
            <Shimmer className="h-[12px] w-[40px] sm:w-[50px]" />
          </div>
        </div>

        {/* Liquidity Skeleton */}
        <div className="min-w-0 flex flex-1 flex-row px-[12px] justify-start items-center">
          <Shimmer className="h-[14px] w-[60px] sm:w-[80px]" />
        </div>

        {/* Volume Skeleton */}
        <div className="min-w-0 flex flex-1 flex-row px-[12px] justify-start items-center">
          <Shimmer className="h-[14px] w-[60px] sm:w-[80px]" />
        </div>

        {/* TXNS Skeleton */}
        <div className="min-w-0 flex flex-1 flex-row px-[12px] justify-start items-center">
          <div className="flex flex-col gap-[4px] justify-start items-start">
            <Shimmer className="h-[14px] w-[40px] sm:w-[50px]" />
            <div className="flex flex-row gap-[4px] justify-start items-center">
              <Shimmer className="h-[12px] w-[20px]" />
              <Shimmer className="h-[12px] w-[8px]" />
              <Shimmer className="h-[12px] w-[20px]" />
            </div>
          </div>
        </div>

        {/* Audit Skeleton */}
        <div className="min-w-0 flex flex-1 flex-row px-[12px] justify-start items-center">
          <div className="flex flex-row gap-[8px] justify-start items-center">
            <Shimmer className="h-[20px] w-[60px] rounded-full" />
            <Shimmer className="h-[16px] w-[40px]" />
          </div>
        </div>

        {/* Action Skeleton */}
        <div className="min-w-0 flex flex-row w-[120px] sm:w-[140px] px-[12px] gap-[8px] justify-end items-center">
          <Shimmer className="h-[32px] w-[80px] rounded-[4px]" />
        </div>
      </div>
    </div>
  );
});
TokenRowSkeleton.displayName = "TokenRowSkeleton";

// Table skeleton for multiple rows
export const TokenTableSkeleton = memo(({ rows = 10 }: { rows?: number }) => {
  return (
    <div className="w-full">
      {Array.from({ length: rows }, (_, i) => (
        <TokenRowSkeleton key={i} />
      ))}
    </div>
  );
});
TokenTableSkeleton.displayName = "TokenTableSkeleton";

// Progressive loading indicator
export const ProgressiveLoader = memo(({ 
  progress = 0,
  className 
}: { 
  progress?: number;
  className?: string;
}) => {
  return (
    <div className={cn("w-full bg-primaryStroke/20 rounded-full h-1", className)}>
      <div 
        className="bg-primaryGreen h-1 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
});
ProgressiveLoader.displayName = "ProgressiveLoader";

// Spinner component
export const Spinner = memo(({ 
  size = "md", 
  className 
}: { 
  size?: "sm" | "md" | "lg";
  className?: string;
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-primaryStroke/30 border-t-primaryGreen",
        sizeClasses[size],
        className
      )}
    />
  );
});
Spinner.displayName = "Spinner";

// Pulse animation for price updates
export const PulseAnimation = memo(({ 
  children,
  isAnimating = false,
  variant = "green"
}: {
  children: React.ReactNode;
  isAnimating?: boolean;
  variant?: "green" | "red";
}) => {
  const pulseClass = variant === "green" 
    ? "animate-pulse bg-primaryGreen/20" 
    : "animate-pulse bg-decrease/20";

  return (
    <div 
      className={cn(
        "transition-all duration-200",
        isAnimating && pulseClass
      )}
    >
      {children}
    </div>
  );
});
PulseAnimation.displayName = "PulseAnimation";

// Loading overlay
export const LoadingOverlay = memo(({ 
  isVisible = false,
  message = "Loading...",
  className
}: {
  isVisible?: boolean;
  message?: string;
  className?: string;
}) => {
  if (!isVisible) return null;

  return (
    <div className={cn(
      "absolute inset-0 bg-backgroundPrimary/80 backdrop-blur-sm",
      "flex items-center justify-center z-50",
      className
    )}>
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-textSecondary text-sm">{message}</p>
      </div>
    </div>
  );
});
LoadingOverlay.displayName = "LoadingOverlay";

// Refresh indicator
export const RefreshIndicator = memo(({ 
  isRefreshing = false,
  onRefresh,
  className
}: {
  isRefreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
}) => {
  return (
    <button
      onClick={onRefresh}
      disabled={isRefreshing}
      className={cn(
        "p-2 rounded-md hover:bg-primaryStroke/50 transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      aria-label="Refresh data"
    >
      <div className={cn(
        "w-4 h-4 transition-transform duration-200",
        isRefreshing && "animate-spin"
      )}>
        <i className="ri-refresh-line text-textSecondary" />
      </div>
    </button>
  );
});
RefreshIndicator.displayName = "RefreshIndicator";

// Data status indicator
export const DataStatusIndicator = memo(({ 
  isConnected = false,
  isSimulating = false,
  lastUpdated,
  className
}: {
  isConnected?: boolean;
  isSimulating?: boolean;
  lastUpdated?: number;
  className?: string;
}) => {
  const [clientTime, setClientTime] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  // Fix hydration error by only showing time on client
  useEffect(() => {
    setMounted(true);
    if (lastUpdated) {
      setClientTime(new Date(lastUpdated).toLocaleTimeString());
    }
  }, [lastUpdated]);

  const statusColor = isConnected 
    ? "text-primaryGreen" 
    : isSimulating 
    ? "text-yellow-500" 
    : "text-textTertiary";

  const statusText = isConnected 
    ? "Live" 
    : isSimulating 
    ? "Simulated" 
    : "Offline";

  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      <div className={cn("w-2 h-2 rounded-full", statusColor.replace("text-", "bg-"))} />
      <span className={statusColor}>{statusText}</span>
      {mounted && lastUpdated && clientTime && (
        <span className="text-textTertiary">
          {clientTime}
        </span>
      )}
    </div>
  );
});
DataStatusIndicator.displayName = "DataStatusIndicator"; 