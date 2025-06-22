# Axiom Backend - Real-time Meme Coin Data Aggregation Service

A high-performance Node.js service that aggregates real-time meme coin data from DexScreener and Jupiter APIs with efficient caching and WebSocket-based live updates.

## 🎯 **Overview**

This service replicates the data flow pattern seen in axiom.trade's discover page, providing:
- **Multi-source data aggregation** from DexScreener and Jupiter
- **Real-time WebSocket updates** for price changes and volume spikes
- **Intelligent caching** with configurable TTL (30s default)
- **Advanced filtering & sorting** with cursor-based pagination
- **Rate limiting with exponential backoff** for external APIs
- **Comprehensive error handling** and recovery mechanisms

## 🏗️ **Architecture & Design Decisions**

### **Service Architecture**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   DexScreener   │    │      Jupiter     │    │   Client Apps   │
│      API        │    │       API        │    │  (Frontend/WS)  │
└─────────┬───────┘    └─────────┬────────┘    └─────────┬───────┘
          │                      │                       │
          └──────────┬───────────┘                       │
                     │                                   │
            ┌────────▼─────────┐                         │
            │ Token Aggregation │                         │
            │     Service      │                         │
            │   (Caching +     │                         │
            │   Deduplication) │                         │
            └────────┬─────────┘                         │
                     │                                   │
            ┌────────▼─────────┐                         │
            │  REST API +      │◄────────────────────────┘
            │  WebSocket       │
            │   Server         │
            └──────────────────┘
```

### **Key Design Decisions**

1. **Two-API Architecture**: Originally planned for 3 APIs, simplified to DexScreener + Jupiter after removing GeckoTerminal due to price change data limitations
2. **WebSocket for Real-time**: Socket.io for initial data load + live price updates pattern
3. **Redis Caching**: Production-ready Redis caching with ioredis client, falls back gracefully if Redis unavailable
4. **Rate Limiting**: Exponential backoff with configurable retries for external API stability
5. **Cursor Pagination**: Efficient pagination for large datasets using cursor-based approach
6. **Error Recovery**: Graceful degradation when one API fails, service continues with available data

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ 
- npm/yarn package manager

### **Installation & Setup**
```bash
# Clone and navigate
cd axiom-backend

# Install dependencies
npm install

# Environment setup
cp .env.example .env
# Edit .env with your configuration

# Build and start
npm run build
npm start

# Development mode (with auto-reload)
npm run dev

# Run tests
npm test
npm run test:coverage
```

### **Environment Variables**
```env
NODE_ENV=development
PORT=5000
LOG_LEVEL=info

# DexScreener API Configuration
DEXSCREENER_BASE_URL=https://api.dexscreener.com
DEXSCREENER_TIMEOUT=10000
DEXSCREENER_RETRIES=3
DEXSCREENER_RETRY_DELAY=1000
DEXSCREENER_RATE_LIMIT=300

# Jupiter API Configuration  
JUPITER_BASE_URL=https://lite-api.jup.ag
JUPITER_TIMEOUT=5000
JUPITER_RETRIES=2
JUPITER_RETRY_DELAY=500
JUPITER_RATE_LIMIT=100

# Cache Configuration
CACHE_TTL_SECONDS=30
CACHE_MAX_SIZE=1000

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=your_redis_password
REDIS_DB=0
REDIS_KEY_PREFIX=axiom:

# WebSocket Configuration
WS_CORS_ORIGIN=http://localhost:3000
WS_PING_INTERVAL=25000
WS_PING_TIMEOUT=20000
```

## 📡 **API Documentation**

### **Base URL**: `http://localhost:5000/api`

### **Core Endpoints**

#### **Health Check**
```http
GET /health
```
Returns service health status including API connectivity.

#### **Token Listing with Filters**
```http
GET /tokens?min_volume=1000&timeframe=24h&sort_by=volume&limit=20
```

**Query Parameters:**
- `min_volume` (number): Minimum 24h volume in USD
- `min_market_cap` (number): Minimum market cap in USD  
- `min_liquidity` (number): Minimum liquidity in USD
- `timeframe` (string): `1h`, `24h`, `7d` - filter by update recency
- `protocols` (string): Comma-separated protocol names (`raydium,orca`)
- `sort_by` (string): `volume`, `market_cap`, `price_change`, `liquidity`, `created_at`
- `sort_direction` (string): `asc`, `desc`
- `limit` (number): Results per page (max 100)
- `cursor` (string): Pagination cursor

#### **Token Search**
```http
GET /tokens/search?q=BONK&sort_by=market_cap&limit=10
```

#### **Trending Tokens**
```http
GET /tokens/trending?limit=50
```

#### **Cache Management**
```http
POST /tokens/cache/clear
GET /tokens/cache/stats
```

### **Response Format**
```json
{
  "success": true,
  "data": {
    "tokens": [...],
    "total": 150,
    "has_next": true,
    "next_cursor": "cursor_string"
  },
  "timestamp": 1640995200000,
  "request_id": "uuid"
}
```

### **Token Data Structure**
```json
{
  "token_address": "576P1t7XsRL4ZVj38LV2eYWxXRPguBADA8BxcNz1xo8y",
  "token_name": "PIPE CTO", 
  "token_ticker": "PIPE",
  "price_sol": 4.4141209798877615e-7,
  "price_usd": 0.128,
  "market_cap_sol": 441.41209798877617,
  "market_cap_usd": 128000,
  "volume_sol": 1322.4350391679925,
  "volume_usd": 640000,
  "liquidity_sol": 149.359428555,
  "liquidity_usd": 25600,
  "transaction_count": 2205,
  "price_1hr_change": 120.61,
  "price_24hr_change": -18.75,
  "protocol": "Raydium CLMM",
  "updated_at": 1640995200000,
  "source": "dexscreener"
}
```

## 🔄 **WebSocket API**

### **Connection**
```javascript
const socket = io('ws://localhost:5000');
```

### **Events**

#### **Client → Server**
```javascript
// Subscribe to token updates  
socket.emit('subscribe_tokens', ['token1', 'token2']);

// Get specific token data
socket.emit('get_token', 'token_address', (response) => {
  console.log(response.data);
});

// Health check
socket.emit('ping', (response) => {
  console.log(response); // 'pong'
});
```

#### **Server → Client**
```javascript
// Initial data on connection
socket.on('initial_data', (message) => {
  console.log(message.data.tokens);
});

// Real-time price updates
socket.on('price_update', (message) => {
  console.log(message.data.updates);
});
```

### **Price Update Message Format**
```json
{
  "type": "price_update",
  "data": {
    "updates": [
      {
        "token_address": "address",
        "new_price": 0.128,
        "change_percent": 5.5
      }
    ],
    "timestamp": 1640995200000
  },
  "timestamp": 1640995200000
}
```

## 🧪 **Testing**

### **Test Suite Coverage**
- **Unit Tests**: Service layer logic, HTTP client, caching
- **Integration Tests**: API endpoints, WebSocket connections
- **Edge Cases**: Rate limiting, API failures, invalid data

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- dexscreener.service.test.ts

# Watch mode for development
npm run test:watch
```

### **Test Categories**
- ✅ **HTTP Client**: Exponential backoff, rate limiting, error handling (2 tests)
- ✅ **DexScreener Service**: Token search, trending data, API integration (8 tests)
- ✅ **Redis Cache**: Get/set operations, error handling, cache-aside pattern (8 tests)
- ✅ **Total**: **18 comprehensive tests** covering happy path and edge cases

## 🔧 **Performance & Optimization**

### **Caching Strategy**
- **Redis cache** with ioredis client for production scalability
- **Graceful fallback** - service continues if Redis unavailable
- **Configurable TTL** (default 30s) with automatic expiration
- **Cache-aside pattern** with intelligent warming for trending tokens
- **Comprehensive monitoring** via `/tokens/cache/stats` including memory usage and key counts

### **Rate Limiting**
- **DexScreener**: 300 requests/minute with exponential backoff
- **Jupiter**: 100 requests/minute with retry logic
- **Automatic request batching** for bulk operations

### **WebSocket Optimizations**
- **5-second price update intervals** for real-time feel
- **30-second cache refresh cycles** for data freshness
- **Connection pooling** and room-based subscriptions

## 📦 **Deployment**

### **Production Build**
```bash
npm run build
npm start
```

### **Docker Support** (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 5000
CMD ["npm", "start"]
```

### **Environment Variables for Production**
```env
NODE_ENV=production
PORT=5000
LOG_LEVEL=warn
# ... other production configs
```

## 🔍 **Monitoring & Observability**

### **Health Monitoring**
- `/api/health` - Service health check
- Service uptime and API connectivity status
- Cache performance metrics

### **Logging**
- Structured JSON logging via Winston
- Request/response logging with correlation IDs
- Error tracking with stack traces

### **Metrics Available**
- WebSocket connection count
- Cache hit/miss ratios  
- API response times
- Error rates by service

## 📋 **API Testing with Postman**

Import the provided `Axiom-API.postman_collection.json` file into Postman for comprehensive API testing. The collection includes:

- **Health checks** and service status
- **Token filtering** with various parameters
- **Search functionality** with sorting
- **Pagination examples** with cursors
- **Cache management** operations
- **Pre-request scripts** for request ID generation
- **Automated test scripts** for response validation

## 🚧 **Development Roadmap**

### **Completed Features** ✅
- Multi-API data aggregation (DexScreener + Jupiter)
- WebSocket real-time updates  
- Advanced filtering and sorting
- Cursor-based pagination
- Rate limiting and error handling
- Comprehensive test suite
- Postman collection


