import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { updateTokenPrice, addTokens } from '@/lib/store/slices/tokensSlice';
import { WSMessage, WSPriceUpdate, WSTokenUpdate, WSNewToken } from '@/lib/types';

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
  
  const socketRef = useRef<Socket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
  const connect = useCallback(() => {
    if (socketRef.current?.connected || !enabled) return;

    try {
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
        
        // Subscribe to token updates
        socket.emit('subscribe', { channel: 'tokens' });
      });

      socket.on('disconnect', (reason) => {
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

      socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        setConnectionError(error.message);
        setIsConnected(false);
        
        if (reconnectCountRef.current < reconnectAttempts) {
          scheduleReconnect();
        }
      });

      // Token data event handlers
      socket.on('price_update', handleMessage);
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
    if (reconnectTimeoutRef.current) return;
    
    reconnectCountRef.current += 1;
    setReconnectCount(reconnectCountRef.current);
    
    const delay = reconnectDelay * Math.pow(2, reconnectCountRef.current - 1); // Exponential backoff
    
    console.log(`🔄 Scheduling reconnect attempt ${reconnectCountRef.current}/${reconnectAttempts} in ${delay}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      disconnect();
      connect();
    }, delay);
  }, [reconnectDelay, reconnectAttempts, connect, disconnect]);

  /**
   * Effect to handle connection lifecycle
   */
  useEffect(() => {
    if (enabled && isRealTimeEnabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, isRealTimeEnabled, connect, disconnect]);

  /**
   * Cleanup on unmount
   */
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
 * Hook for price simulation (fallback when WebSocket is not available)
 */
export function usePriceSimulation(enabled = false) {
  const dispatch = useAppDispatch();
  const tokens = useAppSelector(state => state.tokens.tokens);
  const isRealTimeEnabled = useAppSelector(state => state.tokens.isRealTimeEnabled);
  
  useEffect(() => {
    if (!enabled || !isRealTimeEnabled || tokens.length === 0) return;
    
    const interval = setInterval(() => {
      // Simulate price updates for a random subset of tokens
      const tokensToUpdate = tokens
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(tokens.length * 0.1)) // Update 10% of tokens
        .slice(0, 5); // Max 5 tokens per update
      
      tokensToUpdate.forEach(token => {
        // Generate realistic price movement (-5% to +5%)
        const changePercent = (Math.random() - 0.5) * 10;
        const newPrice = token.priceData.current * (1 + changePercent / 100);
        const newVolume = token.volume24h * (0.8 + Math.random() * 0.4); // ±20% volume change
        
        dispatch(updateTokenPrice({
          tokenId: token.id,
          price: newPrice,
          change: changePercent,
          volume: newVolume,
        }));
      });
    }, 2000 + Math.random() * 3000); // Random interval between 2-5 seconds
    
    return () => clearInterval(interval);
  }, [enabled, isRealTimeEnabled, tokens, dispatch]);
}

/**
 * Combined hook that uses WebSocket with fallback to simulation
 */
export function useRealTimeUpdates(options: UseWebSocketOptions = {}) {
  const wsResult = useWebSocket(options);
  const isRealTimeEnabled = useAppSelector(state => state.tokens.isRealTimeEnabled);
  
  // Use price simulation as fallback when WebSocket is not connected
  usePriceSimulation(!wsResult.isConnected && isRealTimeEnabled);
  
  return {
    ...wsResult,
    // Indicate if we're using simulation as fallback
    isSimulating: !wsResult.isConnected && isRealTimeEnabled,
  };
} 