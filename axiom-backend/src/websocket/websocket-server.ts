import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import axios from 'axios';
import config from '@/config';
import logger from '@/utils/logger';

type DexBoost = {
  chainId: string;
  tokenAddress: string;
};

type DexPair = {
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceUsd: string;
  volume?: { h1?: number; h24?: number; m5?: number };
  txns?: { m5?: { buys?: number; sells?: number }; h1?: { buys?: number; sells?: number } };
  liquidity?: { usd?: number; base?: number; quote?: number };
  fdv?: number;
  marketCap?: number;
  priceChange?: { h1?: number; h24?: number };
};

export class WebSocketServer {
  private io: SocketIOServer;
  private connectedClients: Set<string> = new Set();
  private pollInterval: NodeJS.Timeout | null = null;
  private refreshBoostsInterval: NodeJS.Timeout | null = null;
  private trackedAddresses: Set<string> = new Set();
  private lastPairsByAddress: Map<string, DexPair> = new Map();

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingInterval: 25000,
      pingTimeout: 5000,
    });

    this.setupHandlers();
    this.schedule();
  }

  private setupHandlers() {
    this.io.on('connection', (socket) => {
      this.connectedClients.add(socket.id);
      logger.info('WebSocket client connected', { clientId: socket.id, total: this.connectedClients.size });

      socket.on('disconnect', (reason) => {
        this.connectedClients.delete(socket.id);
        logger.info('WebSocket client disconnected', { clientId: socket.id, reason, total: this.connectedClients.size });
      });

      socket.on('subscribe_tokens', () => {
        socket.join('token_updates');
      });
      socket.on('unsubscribe_tokens', () => {
        socket.leave('token_updates');
      });
    });
  }

  private schedule() {
    // Refresh boosts (source of trending addresses) every 60s
    this.refreshBoosts();
    this.refreshBoostsInterval = setInterval(() => this.refreshBoosts(), 60000);

    // Poll pair data frequently for price/volume changes
    this.poll();
    this.pollInterval = setInterval(() => this.poll(), 5000);
  }

  private async refreshBoosts() {
    try {
      const top = await this.fetchDexBoosts('top');
      const latest = await this.fetchDexBoosts('latest');

      const all = [...top, ...latest]
        .filter((b) => (b.chainId || '').toLowerCase().includes('sol'));

      for (const b of all) {
        if (b.tokenAddress) this.trackedAddresses.add(b.tokenAddress);
      }

      // Avoid unbounded growth
      if (this.trackedAddresses.size > 200) {
        this.trackedAddresses = new Set(Array.from(this.trackedAddresses).slice(-200));
      }

      logger.info('Refreshed trending token addresses from DexScreener boosts', {
        addressCount: this.trackedAddresses.size,
      });
    } catch (e: any) {
      logger.warn('Failed to refresh boosts', { error: e?.message });
    }
  }

  private async fetchDexBoosts(kind: 'top' | 'latest'): Promise<DexBoost[]> {
    const url = kind === 'top'
      ? 'https://api.dexscreener.com/token-boosts/top/v1'
      : 'https://api.dexscreener.com/token-boosts/latest/v1';
    const { data } = await axios.get(url, { timeout: 10000 });
    if (!Array.isArray(data)) return [];
    return data.map((x: any) => ({ chainId: x.chainId, tokenAddress: x.tokenAddress }));
  }

  private async poll() {
    try {
      if (this.connectedClients.size === 0 || this.trackedAddresses.size === 0) return;

      const addresses = Array.from(this.trackedAddresses).slice(0, 30); // DexScreener batch limit
      const endpoint = `https://api.dexscreener.com/latest/dex/tokens/${addresses.join(',')}`;
      const { data } = await axios.get(endpoint, { timeout: 15000 });
      const pairs: DexPair[] = Array.isArray(data?.pairs) ? data.pairs : [];

      const updates: any[] = [];

      for (const pair of pairs) {
        const key = pair.pairAddress;
        const prev = this.lastPairsByAddress.get(key);
        this.lastPairsByAddress.set(key, pair);

        if (!prev) {
          const token = this.transformPairToBackendToken(pair);
          this.io.emit('new_token', { type: 'new_token', data: { token }, timestamp: Date.now() });
          continue;
        }

        if (this.hasMeaningfulChange(prev, pair)) {
          updates.push({
            token_address: pair.baseToken?.address,
            pairAddress: pair.pairAddress,
            symbol: pair.baseToken?.symbol,
            name: pair.baseToken?.name,
            old_price: prev.priceUsd ? Number(prev.priceUsd) : 0,
            new_price: pair.priceUsd ? Number(pair.priceUsd) : 0,
            price_change_percent: pair.priceChange?.h1 || 0,
            price_change_24h: pair.priceChange?.h24 || 0,
            old_marketCap: prev.fdv || 0,
            new_marketCap: pair.fdv || 0,
            old_liquidity: prev.liquidity?.usd || 0,
            new_liquidity: pair.liquidity?.usd || 0,
            old_volume_h24: prev.volume?.h24 || 0,
            new_volume_h24: pair.volume?.h24 || 0,
            old_volume_h1: prev.volume?.h1 || 0,
            new_volume_h1: pair.volume?.h1 || 0,
          });
        }
      }

      if (updates.length > 0) {
        this.io.emit('price_update', { type: 'price_update', data: { updates }, timestamp: Date.now() });
      }
    } catch (e: any) {
      logger.warn('Polling error', { error: e?.message });
    }
  }

  private hasMeaningfulChange(a: DexPair, b: DexPair): boolean {
    const ap = a.priceUsd ? Number(a.priceUsd) : 0;
    const bp = b.priceUsd ? Number(b.priceUsd) : 0;
    if (ap !== bp) return true;
    if ((a.volume?.h24 || 0) !== (b.volume?.h24 || 0)) return true;
    if ((a.liquidity?.usd || 0) !== (b.liquidity?.usd || 0)) return true;
    if ((a.fdv || 0) !== (b.fdv || 0)) return true;
    return false;
  }

  private transformPairToBackendToken(pair: DexPair) {
    const nowSec = Math.floor(Date.now() / 1000);
    return {
      token_address: pair?.baseToken?.address,
      token_name: pair?.baseToken?.name || pair?.baseToken?.symbol,
      token_ticker: pair?.baseToken?.symbol,
      price_sol: Number(pair?.priceUsd) || 0,
      price_usd: Number(pair?.priceUsd) || 0,
      market_cap_sol: pair?.fdv || 0,
      market_cap_usd: pair?.fdv || 0,
      volume_sol: pair?.volume?.h24 || 0,
      volume_usd: pair?.volume?.h24 || 0,
      liquidity_sol: pair?.liquidity?.usd || 0,
      liquidity_usd: pair?.liquidity?.usd || 0,
      transaction_count: (pair?.txns?.h1?.buys || 0) + (pair?.txns?.h1?.sells || 0),
      price_1hr_change: pair?.priceChange?.h1 || 0,
      price_24hr_change: pair?.priceChange?.h24 || 0,
      price_7d_change: 0,
      protocol: 'dexscreener',
      dex_id: 'dexscreener',
      pair_address: pair?.pairAddress,
      created_at: undefined,
      updated_at: nowSec,
      source: 'dexscreener',
    };
  }

  public getStats() {
    return {
      connectedClients: this.connectedClients.size,
      rooms: Array.from(this.io.sockets.adapter.rooms.keys()),
      uptime: process.uptime(),
    };
  }

  public stop() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.refreshBoostsInterval) clearInterval(this.refreshBoostsInterval);
    this.io.close();
  }
}


