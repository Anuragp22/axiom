import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { updateTokenPrice, addTokens } from '@/lib/store/slices/tokensSlice';
import { WSMessage, WSPriceUpdate, WSTokenUpdate, WSNewToken } from '@/lib/types';

// Lazy load socket.io to reduce initial bundle size
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

/**
 * Custom hook for WebSocket connection with real-time token updates
 */
export function useWebSocket(options: UseWebSocketOptions = {}): WebSocketHookReturn {
  const {
    enabled = true,
    reconnectAttempts = 5,
    reconnectDelay = 2000,
  } = options;

  const dispatch = useAppDispatch();
  const isRealTimeEnabled = useAppSelector(state => state.tokens.isRealTimeEnabled);
  
  const socketRef = useRef<any | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ioRef = useRef<any | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);

  /**
   * Handle incoming WebSocket messages
   */
  const handleMessage = useCallback((message: WSMessage) => {
    if (!isRealTimeEnabled) return;

    try {
      switch (message.type) {
        case 'PRICE_UPDATE': {
          const priceUpdate = message as WSPriceUpdate;
          dispatch(updateTokenPrice({
            tokenId: priceUpdate.tokenId,
            price: priceUpdate.price,
            change: priceUpdate.change,
            volume: priceUpdate.volume,
          }));
          break;
        }
        
        case 'TOKEN_UPDATE': {
          const tokenUpdate = message as WSTokenUpdate;
          // Update existing token with new data
          if (tokenUpdate.token.id) {
            dispatch(updateTokenPrice({
              tokenId: tokenUpdate.token.id,
              price: tokenUpdate.token.priceData?.current || 0,
              change: tokenUpdate.token.priceData?.change24h || 0,
              volume: tokenUpdate.token.volume24h,
            }));
          }
          break;
        }
        
        case 'NEW_TOKEN': {
          const newToken = message as WSNewToken;
          dispatch(addTokens([newToken.token]));
          break;
        }
        
        default: {
          // TypeScript exhaustiveness check
          const _exhaustiveCheck: never = message;
          console.warn('Unknown WebSocket message type:', (_exhaustiveCheck as any).type);
          break;
        }
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }, [dispatch, isRealTimeEnabled]);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(async () => {
    if (socketRef.current?.connected || !enabled) return;

    try {
      // Lazy load socket.io
      if (!ioRef.current) {
        ioRef.current = await loadSocketIO();
      }
      
      const io = ioRef.current;
      const socket = io(WS_URL, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
        autoConnect: false,
      });

      // Connection event handlers
      socket.on('connect', () => {
        console.log('🔗 WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectCountRef.current = 0;
        setReconnectCount(0);
        
        // Subscribe to token updates room
        socket.emit('subscribe_tokens', []);
        console.log('📡 Subscribed to token updates');
      });

      socket.on('disconnect', (reason: string) => {
        console.log('🔌 WebSocket disconnected:', reason);
        setIsConnected(false);
        
        // Auto-reconnect for certain disconnect reasons
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, don't auto-reconnect
          return;
        }
        
        // Client initiated or network issues, attempt reconnect
        if (reconnectCountRef.current < reconnectAttempts) {
          scheduleReconnect();
        }
      });

      socket.on('connect_error', (error: any) => {
        console.error('❌ WebSocket connection error:', error);
        setConnectionError(error.message);
        setIsConnected(false);
        
        if (reconnectCountRef.current < reconnectAttempts) {
          scheduleReconnect();
        }
      });

      // Token data event handlers - Backend format
      socket.on('price_update', (backendMessage: any) => {
        console.log('📈 Received price updates:', backendMessage);
        if (backendMessage.data?.updates && Array.isArray(backendMessage.data.updates)) {
          backendMessage.data.updates.forEach((update: any) => {
            dispatch(updateTokenPrice({
              tokenId: update.token_address,
              price: update.new_price,
              change: update.price_change_percent,
              volume: update.new_volume,
              liquidity: update.new_liquidity,
            }));
          });
        }
      });
      
      socket.on('token_update', handleMessage);
      socket.on('new_token', handleMessage);
      
      // Generic message handler
      socket.on('message', handleMessage);

      socketRef.current = socket;
      socket.connect();
      
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setConnectionError('Failed to create WebSocket connection');
    }
  }, [enabled, reconnectAttempts, handleMessage]);

  /**
   * Disconnect from WebSocket server
   */
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

  /**
   * Schedule reconnection attempt
   */
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectCountRef.current += 1;
    setReconnectCount(reconnectCountRef.current);
    
    const delay = Math.min(reconnectDelay * Math.pow(2, reconnectCountRef.current - 1), 30000);
    
    console.log(`🔄 Scheduling reconnect attempt ${reconnectCountRef.current}/${reconnectAttempts} in ${delay}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [reconnectDelay, reconnectAttempts, connect]);

  // Auto-connect when enabled and page is visible
  useEffect(() => {
    if (enabled && isRealTimeEnabled && typeof window !== 'undefined') {
      // Only connect if page is visible to improve bfcache compatibility
      const isVisible = !document.hidden;
      
      if (isVisible) {
        // Delay initial connection to not block initial render
        const timeout = setTimeout(() => {
          connect();
        }, 1000); // Increased delay for better performance
        
        return () => {
          clearTimeout(timeout);
          disconnect();
        };
      }
    } else {
      disconnect();
    }
  }, [enabled, isRealTimeEnabled, connect, disconnect]);

  // Handle page visibility changes for bfcache
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, disconnect WebSocket to improve bfcache
        disconnect();
      } else if (enabled && isRealTimeEnabled) {
        // Page is visible, reconnect if needed
        const timeout = setTimeout(() => {
          connect();
        }, 500);
        return () => clearTimeout(timeout);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, isRealTimeEnabled, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    connectionError,
    reconnectCount,
    disconnect,
    connect,
  };
}

/**
 * Hook for real-time token updates
 */
export function useRealTimeUpdates(options: UseWebSocketOptions = {}) {
  const isRealTimeEnabled = useAppSelector(state => state.tokens.isRealTimeEnabled);
  
  return useWebSocket({
    enabled: isRealTimeEnabled,
    ...options,
  });
} 