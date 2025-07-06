// --- ws-server.ts ---
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import axios from 'axios';
import Redis from 'ioredis';

const server = http.createServer();
const wss = new WebSocketServer({ server });
const redis = new Redis();

const PORT = process.env.PORT || 3001;
const TOKEN_ADDR = 'So11111111111111111111111111111111111111112';
const API_URL = `https://api.dexscreener.com/latest/dex/tokens/${TOKEN_ADDR}`;

const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('🟢 Client connected');

  ws.on('close', () => {
    clients.delete(ws);
    console.log('🔴 Client disconnected');
  });
});

async function fetchPairs() {
  const { data } = await axios.get(API_URL);
  return data.pairs;
}

function hasChanged(oldPair: any, newPair: any): boolean {
  return (
    oldPair?.priceUsd !== newPair.priceUsd ||
    oldPair?.volume?.h1 !== newPair.volume?.h1 ||
    oldPair?.txns?.m5?.buys !== newPair.txns?.m5?.buys
  );
}

async function pollAndEmit() {
  try {
    const newPairs = await fetchPairs();

    for (const pair of newPairs) {
      const cacheKey = `pair:${pair.pairAddress}`;
      const cached = await redis.get(cacheKey);
      const oldPair = cached ? JSON.parse(cached) : null;

      if (!oldPair || hasChanged(oldPair, pair)) {
        const updatePayload = JSON.stringify({
          pairAddress: pair.pairAddress,
          priceUsd: pair.priceUsd,
          marketCap: pair.fdv,
          liquidity: pair.liquidity?.usd,
          volume: {
            h1: pair.volume?.h1,
            h24: pair.volume?.h24,
          },
          txns: {
            m5: pair.txns?.m5,
            h1: pair.txns?.h1,
          },
          baseToken: {
            symbol: pair.baseToken?.symbol,
            name: pair.baseToken?.name,
          },
          quoteToken: {
            symbol: pair.quoteToken?.symbol,
          }
        });

        for (const client of clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(updatePayload);
          }
        }

        console.log(`[UPDATED] ${pair.baseToken.symbol}/${pair.quoteToken.symbol} → $${pair.priceUsd}`);
      }

      await redis.set(cacheKey, JSON.stringify(pair), 'EX', 30);
    }
  } catch (err) {
    console.error('Polling error:', err);
  }
}

setInterval(pollAndEmit, 10000);

server.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on ws://localhost:${PORT}`);
});
