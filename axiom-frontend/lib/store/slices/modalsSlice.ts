import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Token, ModalState } from '@/lib/types';

interface ModalsState extends ModalState {
  quickBuy: {
    isOpen: boolean;
    token: Token | null;
    amount: string;
    slippage: number;
  };
  tokenAnalytics: {
    isOpen: boolean;
    tokenId: string | null;
  };
  portfolio: {
    isOpen: boolean;
  };
  notifications: {
    isOpen: boolean;
  };
}

const initialState: ModalsState = {
  tokenDetails: {
    isOpen: false,
    tokenId: null,
  },
  filters: {
    isOpen: false,
  },
  settings: {
    isOpen: false,
  },
  buy: {
    isOpen: false,
    token: null,
  },
  quickBuy: {
    isOpen: false,
    token: null,
    amount: '',
    slippage: 1,
  },
  tokenAnalytics: {
    isOpen: false,
    tokenId: null,
  },
  portfolio: {
    isOpen: false,
  },
  notifications: {
    isOpen: false,
  },
};

const modalsSlice = createSlice({
  name: 'modals',
  initialState,
  reducers: {
    openTokenDetails: (state, action: PayloadAction<string>) => {
      state.tokenDetails.isOpen = true;
      state.tokenDetails.tokenId = action.payload;
    },
    
    closeTokenDetails: (state) => {
      state.tokenDetails.isOpen = false;
      state.tokenDetails.tokenId = null;
    },
    
    openFilters: (state) => {
      state.filters.isOpen = true;
    },
    
    closeFilters: (state) => {
      state.filters.isOpen = false;
    },
    
    openSettings: (state) => {
      state.settings.isOpen = true;
    },
    
    closeSettings: (state) => {
      state.settings.isOpen = false;
    },
    
    openBuy: (state, action: PayloadAction<Token>) => {
      state.buy.isOpen = true;
      state.buy.token = action.payload;
    },
    
    closeBuy: (state) => {
      state.buy.isOpen = false;
      state.buy.token = null;
    },
    
    openQuickBuy: (state, action: PayloadAction<{ token: Token; amount?: string }>) => {
      state.quickBuy.isOpen = true;
      state.quickBuy.token = action.payload.token;
      state.quickBuy.amount = action.payload.amount || '';
    },
    
    closeQuickBuy: (state) => {
      state.quickBuy.isOpen = false;
      state.quickBuy.token = null;
      state.quickBuy.amount = '';
    },
    
    setQuickBuyAmount: (state, action: PayloadAction<string>) => {
      state.quickBuy.amount = action.payload;
    },
    
    setQuickBuySlippage: (state, action: PayloadAction<number>) => {
      state.quickBuy.slippage = action.payload;
    },
    
    openTokenAnalytics: (state, action: PayloadAction<string>) => {
      state.tokenAnalytics.isOpen = true;
      state.tokenAnalytics.tokenId = action.payload;
    },
    
    closeTokenAnalytics: (state) => {
      state.tokenAnalytics.isOpen = false;
      state.tokenAnalytics.tokenId = null;
    },
    
    openPortfolio: (state) => {
      state.portfolio.isOpen = true;
    },
    
    closePortfolio: (state) => {
      state.portfolio.isOpen = false;
    },
    
    openNotifications: (state) => {
      state.notifications.isOpen = true;
    },
    
    closeNotifications: (state) => {
      state.notifications.isOpen = false;
    },
    
    closeAllModals: (state) => {
      state.tokenDetails.isOpen = false;
      state.tokenDetails.tokenId = null;
      state.filters.isOpen = false;
      state.settings.isOpen = false;
      state.buy.isOpen = false;
      state.buy.token = null;
      state.quickBuy.isOpen = false;
      state.quickBuy.token = null;
      state.quickBuy.amount = '';
      state.tokenAnalytics.isOpen = false;
      state.tokenAnalytics.tokenId = null;
      state.portfolio.isOpen = false;
      state.notifications.isOpen = false;
    },
  },
});

export const {
  openTokenDetails,
  closeTokenDetails,
  openFilters,
  closeFilters,
  openSettings,
  closeSettings,
  openBuy,
  closeBuy,
  openQuickBuy,
  closeQuickBuy,
  setQuickBuyAmount,
  setQuickBuySlippage,
  openTokenAnalytics,
  closeTokenAnalytics,
  openPortfolio,
  closePortfolio,
  openNotifications,
  closeNotifications,
  closeAllModals,
} = modalsSlice.actions;

export default modalsSlice.reducer; 