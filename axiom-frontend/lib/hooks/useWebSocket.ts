import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { updateTokenPrice, addTokens, setTokens } from '@/lib/store/slices/tokensSlice';

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
 * Simple WebSocket hook for real-time token updates
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
          return;
        }
        
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

      // Handle price updates - create tokens directly from WebSocket data
      socket.on('price_update', (message: any) => {
        console.log('📈 Raw WebSocket message:', message);
        
        if (message.data?.updates && Array.isArray(message.data.updates)) {
          const tokensFromWS = message.data.updates.map((update: any) => ({
            id: update.pairAddress, // Use pair address as ID
            name: update.name || update.symbol,
            symbol: update.symbol,
            imageUrl: `https://ui-avatars.com/api/?name=${update.symbol}&size=64&background=4ECDC4&color=FFFFFF&bold=true&format=png`,
            pairInfo: {
              baseToken: {
                id: update.token_address,
                symbol: update.symbol,
                name: update.name || update.symbol,
                image: `https://ui-avatars.com/api/?name=${update.symbol}&size=64&background=4ECDC4&color=FFFFFF&bold=true&format=png`,
                chainId: 101,
                address: update.token_address,
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
              pairAddress: update.pairAddress,
              dexId: 'dexscreener',
              url: `https://dexscreener.com/solana/${update.pairAddress}`,
            },
            priceData: {
              current: update.new_price || 0,
              change24h: update.price_change_24h || 0,
              change1h: update.price_change_percent || 0,
              change5m: 0,
              high24h: 0,
              low24h: 0,
            },
            volumeData: {
              h24: update.new_volume_h24 || 0,
              h6: 0,
              h1: update.new_volume_h1 || 0,
              m5: update.new_volume_m5 || 0,
            },
            transactionData: {
              buys24h: update.new_txns_h1_buys || 0,
              sells24h: update.new_txns_h1_sells || 0,
              total24h: (update.new_txns_h1_buys || 0) + (update.new_txns_h1_sells || 0),
              makers: 0,
              swaps: (update.new_txns_h1_buys || 0) + (update.new_txns_h1_sells || 0),
            },
            liquidityData: {
              usd: update.new_liquidity || 0,
              base: 0,
              quote: 0,
            },
            marketCap: update.new_marketCap || 0,
            liquidity: update.new_liquidity || 0,
            volume24h: update.new_volume_h24 || 0,
            transactions24h: (update.new_txns_h1_buys || 0) + (update.new_txns_h1_sells || 0),
            buys24h: update.new_txns_h1_buys || 0,
            sells24h: update.new_txns_h1_sells || 0,
            priceChange24h: update.price_change_24h || 0,
            fdv: update.new_marketCap || 0,
            audit: {
              honeypot: false,
              isVerified: false,
              isScam: false,
              rugRisk: 'low' as const,
              liquidityLocked: false,
              mintDisabled: false,
              riskScore: 10,
              burnPercentage: 0,
              isPaid: false,
            },
            socialLinks: {
              website: `https://${update.symbol.toLowerCase()}.com`,
              twitter: `https://twitter.com/${update.symbol.toLowerCase()}`,
              telegram: `https://t.me/${update.symbol.toLowerCase()}`,
            },
            age: '1h',
            communityUrl: `https://t.me/${update.symbol.toLowerCase()}`,
            isPumpFun: false,
            isGraduated: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));

          console.log('🚀 Created tokens from WebSocket:', tokensFromWS.length);
          
          // Replace all tokens with WebSocket data
          dispatch(setTokens(tokensFromWS));
          
          // Also dispatch individual price updates for animations
          tokensFromWS.forEach((token: any) => {
            dispatch(updateTokenPrice({
              tokenId: token.id,
              price: token.priceData.current,
              change: token.priceData.change24h,
              volume: token.volume24h,
              liquidity: token.liquidity,
            }));
          });
        }
      });

      // Handle new tokens
      socket.on('new_token', (message: any) => {
        console.log('🆕 New token received:', message);
        if (message.data?.token) {
          const token = message.data.token;
          const newToken = {
            id: token.pairAddress || token.id,
            name: token.name || token.symbol,
            symbol: token.symbol,
            imageUrl: `https://ui-avatars.com/api/?name=${token.symbol}&size=64&background=96CEB4&color=FFFFFF&bold=true&format=png`,
            pairInfo: {
              baseToken: {
                id: token.id,
                symbol: token.symbol,
                name: token.name || token.symbol,
                image: `https://ui-avatars.com/api/?name=${token.symbol}&size=64&background=96CEB4&color=FFFFFF&bold=true&format=png`,
                chainId: 101,
                address: token.id,
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
              pairAddress: token.pairAddress || token.id,
              dexId: 'dexscreener',
              url: `https://dexscreener.com/solana/${token.pairAddress || token.id}`,
            },
            priceData: {
              current: token.priceData?.current || 0,
              change24h: token.priceData?.change24h || 0,
              change1h: token.priceData?.change1h || 0,
              change5m: 0,
              high24h: 0,
              low24h: 0,
            },
            volumeData: {
              h24: token.volume24h || 0,
              h6: 0,
              h1: 0,
              m5: 0,
            },
            transactionData: {
              buys24h: 0,
              sells24h: 0,
              total24h: 0,
              makers: 0,
              swaps: 0,
            },
            liquidityData: {
              usd: token.liquidity || 0,
              base: 0,
              quote: 0,
            },
            marketCap: token.marketCap || 0,
            liquidity: token.liquidity || 0,
            volume24h: token.volume24h || 0,
            transactions24h: 0,
            buys24h: 0,
            sells24h: 0,
            priceChange24h: token.priceData?.change24h || 0,
            fdv: token.marketCap || 0,
            audit: {
              honeypot: false,
              isVerified: false,
              isScam: false,
              rugRisk: 'low' as const,
              liquidityLocked: false,
              mintDisabled: false,
              riskScore: 10,
              burnPercentage: 0,
              isPaid: false,
            },
            socialLinks: {
              website: `https://${token.symbol.toLowerCase()}.com`,
              twitter: `https://twitter.com/${token.symbol.toLowerCase()}`,
              telegram: `https://t.me/${token.symbol.toLowerCase()}`,
            },
            age: '1h',
            communityUrl: `https://t.me/${token.symbol.toLowerCase()}`,
            isPumpFun: false,
            isGraduated: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          dispatch(addTokens([newToken]));
        }
      });

      socketRef.current = socket;
      socket.connect();
      
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setConnectionError('Failed to create WebSocket connection');
    }
  }, [enabled, reconnectAttempts, dispatch]);

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

  // Auto-connect when enabled
  useEffect(() => {
    if (enabled && isRealTimeEnabled && typeof window !== 'undefined') {
      const timeout = setTimeout(() => {
        connect();
      }, 1000);
      
      return () => {
        clearTimeout(timeout);
        disconnect();
      };
    } else {
      disconnect();
    }
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