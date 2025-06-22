'use client';

import { Header } from '@/components/trading/Header';
import { TokenTable } from '@/components/trading/TokenTable';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { MobileSearchBar } from '@/components/trading/FilterPanel';

export default function Home() {
  return (
    <ErrorBoundary level="page">
      <div className="min-h-screen w-full bg-backgroundPrimary p-4 sm:p-6">
        <div className="max-w-[1420px] mx-auto">
          <Header />
          
          {/* Main Content Area */}
          <div className="w-full mt-4">
            {/* Mobile Search Bar */}
            <MobileSearchBar />
            
            {/* Token Table - Now connected to real API with Redux and React Query */}
            <div className="bg-backgroundSecondary rounded-lg overflow-hidden">
              <TokenTable />
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
