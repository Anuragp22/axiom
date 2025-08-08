import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { updateTokenPrice, addTokens } from '@/lib/store/slices/tokensSlice';

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

const WS_URL = (() => {
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (process.env.NODE_ENV === 'development') {
    return envUrl || 'ws://localhost:5000';
  }
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${window.location.host}`;
  }
  return 'ws://localhost:5000';
})();

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
      socket.on('pair_update', (message: any) => {
        const updates = message?.data?.updates || [];
        updates.forEach((u: any) => {
          dispatch(updateTokenPrice({
            tokenId: u.pairAddress || u.token_address,
            price: u.new_price ?? u.priceUsd ?? 0,
            change: u.price_change_24h ?? u.priceChange?.h24 ?? u.price_change_percent ?? 0,
            volume: u.new_volume_h24 ?? u.volume?.h24 ?? u.new_volume_h1,
            liquidity: u.new_liquidity ?? u.liquidity?.usd,
          }));
        });
      });

      socket.on('new_token', async (message: any) => {
        const token = message?.data?.token;
        if (!token) return;
        dispatch(addTokens([token] as any));
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


