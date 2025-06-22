'use client';

import { Header } from '@/components/trading/Header';
import { TokenTable } from '@/components/trading/TokenTable';

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-backgroundPrimary p-4 sm:p-6">
      <div className="max-w-[1420px] mx-auto">
        <Header />
        
        {/* Main Content Area */}
        <div className="w-full mt-4">
          {/* Token Table - Connect to real API by calling useGetTokensQuery() in TokenTable component */}
          <div className="bg-backgroundSecondary rounded-lg overflow-hidden">
            <TokenTable />
          </div>
        </div>
      </div>
    </div>
  );
}
