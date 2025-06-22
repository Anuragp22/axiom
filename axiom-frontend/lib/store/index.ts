import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import tokensSlice from './slices/tokensSlice';
import filtersSlice from './slices/filtersSlice';
import modalsSlice from './slices/modalsSlice';
import preferencesSlice from './slices/preferencesSlice';

export const store = configureStore({
  reducer: {
    tokens: tokensSlice,
    filters: filtersSlice,
    modals: modalsSlice,
    preferences: preferencesSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store; 