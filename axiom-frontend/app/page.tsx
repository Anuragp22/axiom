'use client';

import { Suspense, lazy } from 'react';
import { Header } from '@/components/trading/Header';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { TokenTableSkeleton } from '@/components/ui/loading-states';

// Lazy load heavy components to reduce initial bundle size
const TokenTable = lazy(() => import('@/components/trading/TokenTable').then(module => ({
  default: module.TokenTable
})));

const MobileSearchBar = lazy(() => import('@/components/trading/FilterPanel').then(module => ({
  default: module.MobileSearchBar
})));

export default function Home() {
  return (
    <ErrorBoundary level="page">
      <div className="min-h-screen w-full bg-backgroundPrimary p-4 sm:p-6">
        <div className="max-w-[1420px] mx-auto">
          <Header />
          
          {/* Main Content Area */}
          <div className="w-full mt-4">
            {/* Mobile Search Bar - Lazy loaded */}
            <Suspense fallback={<div className="h-12 bg-backgroundSecondary rounded-lg animate-pulse mb-4 lg:hidden" />}>
              <MobileSearchBar />
            </Suspense>
            
            {/* Token Table - Lazy loaded with proper fallback */}
            <div className="bg-backgroundSecondary rounded-lg overflow-hidden">
              <Suspense fallback={<TokenTableSkeleton rows={10} />}>
                <TokenTable />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
