import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { updateTokenPrice, addTokens, setTokens } from '@/lib/store/slices/tokensSlice';

const loadSocketIO = () => import('socket.io-client').then(module => module.io);

interface UseWebSocketOptions {
  enabled?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

interface WebSocketHookReturn {
  isConnected: boolean;
  connectionError: string | null;
  reconnectCount: number;
  disconnect: () => void;
  connect: () => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000';

export function useWebSocket(options: UseWebSocketOptions = {}): WebSocketHookReturn {
  const { enabled = true, reconnectAttempts = 5, reconnectDelay = 2000 } = options;

  const dispatch = useAppDispatch();
  const isRealTimeEnabled = useAppSelector(state => state.tokens.isRealTimeEnabled);

  const socketRef = useRef<any | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ioRef = useRef<any | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);

  const connect = useCallback(async () => {
    if (socketRef.current?.connected || !enabled) return;
    try {
      if (!ioRef.current) ioRef.current = await loadSocketIO();
      const socket = ioRef.current(WS_URL, { transports: ['websocket', 'polling'], timeout: 10000, forceNew: true, autoConnect: false });

      socket.on('connect', () => {
        setIsConnected(true);
        setConnectionError(null);
        reconnectCountRef.current = 0;
        setReconnectCount(0);
        socket.emit('subscribe_tokens');
      });

      socket.on('disconnect', (reason: string) => {
        setIsConnected(false);
        if (reason !== 'io server disconnect' && reconnectCountRef.current < reconnectAttempts) scheduleReconnect();
      });

      socket.on('connect_error', (error: any) => {
        setConnectionError(error.message);
        setIsConnected(false);
        if (reconnectCountRef.current < reconnectAttempts) scheduleReconnect();
      });

      socket.on('price_update', (message: any) => {
        const updates = message?.data?.updates || [];
        updates.forEach((u: any) => {
          dispatch(updateTokenPrice({
            tokenId: u.pairAddress || u.token_address,
            price: u.new_price,
            change: u.price_change_24h ?? u.price_change_percent ?? 0,
            volume: u.new_volume_h24 ?? u.new_volume_h1,
            liquidity: u.new_liquidity,
          }));
        });
      });

      socket.on('new_token', (message: any) => {
        const token = message?.data?.token;
        if (!token) return;
        // The server emits backend token shape; the frontend expects transformed shape via REST normally.
        // Here we synthesize minimal fields to render until next REST refresh.
        const synthetic = {
          id: token.pair_address || token.token_address,
          name: token.token_name || token.token_ticker,
          symbol: token.token_ticker,
          imageUrl: `https://ui-avatars.com/api/?name=${token.token_ticker}&size=64&background=4ECDC4&color=FFFFFF&bold=true&format=png`,
          pairInfo: {
            baseToken: {
              id: token.token_address,
              symbol: token.token_ticker,
              name: token.token_name || token.token_ticker,
              image: `https://ui-avatars.com/api/?name=${token.token_ticker}&size=64&background=4ECDC4&color=FFFFFF&bold=true&format=png`,
              chainId: 101,
              address: token.token_address,
              decimals: 9,
            },
            quoteToken: {
              id: 'So11111111111111111111111111111111111111112',
              symbol: 'SOL',
              name: 'Solana',
              image: '/images/solana.png',
              chainId: 101,
              address: 'So11111111111111111111111111111111111111112',
              decimals: 9,
            },
            pairAddress: token.pair_address || token.token_address,
            dexId: 'dexscreener',
            url: `https://dexscreener.com/solana/${token.pair_address || token.token_address}`,
          },
          priceData: {
            current: token.price_usd ?? token.price_sol ?? 0,
            change24h: token.price_24hr_change ?? token.price_1hr_change ?? 0,
            change1h: token.price_1hr_change ?? 0,
            change5m: 0,
            high24h: 0,
            low24h: 0,
          },
          volumeData: { h24: token.volume_usd ?? token.volume_sol ?? 0, h6: 0, h1: 0, m5: 0 },
          transactionData: { buys24h: 0, sells24h: 0, total24h: token.transaction_count ?? 0, makers: 0, swaps: 0 },
          liquidityData: { usd: token.liquidity_usd ?? token.liquidity_sol ?? 0, base: 0, quote: 0 },
          marketCap: token.market_cap_usd ?? token.market_cap_sol ?? 0,
          liquidity: token.liquidity_usd ?? token.liquidity_sol ?? 0,
          volume24h: token.volume_usd ?? token.volume_sol ?? 0,
          transactions24h: token.transaction_count ?? 0,
          buys24h: 0,
          sells24h: 0,
          priceChange24h: token.price_24hr_change ?? token.price_1hr_change ?? 0,
          fdv: token.market_cap_usd ?? token.market_cap_sol ?? 0,
          audit: { honeypot: false, isVerified: false, isScam: false, rugRisk: 'low', liquidityLocked: false, mintDisabled: false, riskScore: 0, burnPercentage: 0, isPaid: false },
          socialLinks: { website: undefined, twitter: undefined, telegram: undefined },
          age: '1h',
          communityUrl: undefined,
          isPumpFun: false,
          isGraduated: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any;
        dispatch(addTokens([synthetic]));
      });

      socketRef.current = socket;
      socket.connect();
    } catch (e) {
      setConnectionError('Failed to create WebSocket connection');
    }
  }, [enabled, reconnectAttempts, dispatch]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setConnectionError(null);
    reconnectCountRef.current = 0;
    setReconnectCount(0);
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    reconnectCountRef.current += 1;
    setReconnectCount(reconnectCountRef.current);
    const delay = Math.min(reconnectDelay * Math.pow(2, reconnectCountRef.current - 1), 30000);
    reconnectTimeoutRef.current = setTimeout(() => { connect(); }, delay);
  }, [reconnectDelay, connect]);

  useEffect(() => {
    if (enabled && isRealTimeEnabled && typeof window !== 'undefined') {
      const t = setTimeout(() => connect(), 500);
      return () => { clearTimeout(t); disconnect(); };
    } else {
      disconnect();
    }
  }, [enabled, isRealTimeEnabled, connect, disconnect]);

  useEffect(() => () => { disconnect(); }, [disconnect]);

  return { isConnected, connectionError, reconnectCount, disconnect, connect };
}

export function useRealTimeUpdates(options: UseWebSocketOptions = {}) {
  const isRealTimeEnabled = useAppSelector(state => state.tokens.isRealTimeEnabled);
  return useWebSocket({ enabled: isRealTimeEnabled, ...options });
}


