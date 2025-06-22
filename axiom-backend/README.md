# Axiom Backend - Real-time Token Data Aggregation Service

A high-performance Node.js backend service that aggregates real-time meme coin data from multiple DEX sources with efficient caching and real-time WebSocket updates.

## 🚀 Features

- **Multi-Source Data Aggregation**: Fetches token data from DexScreener, Jupiter, and GeckoTerminal APIs
- **Real-time WebSocket Updates**: Live price updates and new token discoveries
- **Intelligent Token Merging**: Deduplicates and merges token data from multiple sources
- **Advanced Filtering & Sorting**: Filter by volume, market cap, liquidity, and time periods
- **Cursor-based Pagination**: Efficient pagination for large token lists
- **Rate Limiting & Caching**: Built-in rate limiting with exponential backoff and TTL-based caching
- **Health Monitoring**: Comprehensive health checks for all external services
- **TypeScript**: Fully typed for better development experience

## 🏗️ Architecture

```
├── src/
│   ├── config/           # Configuration management
│   ├── middleware/       # Express middleware (validation, error handling)
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic and external API integrations
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions (logger, errors, HTTP client)
│   ├── websocket/       # WebSocket server implementation
│   └── server.ts        # Main application entry point
```

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Web Framework**: Express.js
- **WebSocket**: Socket.io
- **HTTP Client**: Axios with retry logic
- **Validation**: Joi
- **Logging**: Winston
- **Task Scheduling**: node-cron
- **Security**: Helmet, CORS, Rate Limiting

## 📋 Prerequisites

- Node.js 18 or higher
- npm or yarn package manager

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd axiom-backend
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Development Server

```bash
# Start in development mode with auto-reload
npm run dev

# Or start in production mode
npm run build
npm start
```

The server will start on `http://localhost:5000` (configurable via `PORT` environment variable).

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Endpoints

#### 1. Get Tokens
```http
GET /tokens
```

**Query Parameters:**
- `timeframe` (optional): `1h`, `24h`, `7d`
- `min_volume` (optional): Minimum volume filter
- `min_market_cap` (optional): Minimum market cap filter
- `min_liquidity` (optional): Minimum liquidity filter
- `protocols` (optional): Comma-separated protocol names
- `sort_by` (optional): `volume`, `market_cap`, `price_change`, `liquidity`, `created_at`
- `sort_direction` (optional): `asc`, `desc`
- `limit` (optional): Number of results (1-100, default: 20)
- `cursor` (optional): Pagination cursor

**Example Response:**
```json
{
  "success": true,
  "data": {
    "tokens": [
      {
        "token_address": "576P1t7XsRL4ZVj38LV2eYWxXRPguBADA8BxcNz1xo8y",
        "token_name": "PIPE CTO",
        "token_ticker": "PIPE",
        "price_sol": 4.4141209798877615e-7,
        "price_usd": 0.00004414,
        "market_cap_sol": 441.41209798877617,
        "market_cap_usd": 44141.21,
        "volume_sol": 1322.4350391679925,
        "volume_usd": 132243.50,
        "liquidity_sol": 149.359428555,
        "liquidity_usd": 14935.94,
        "transaction_count": 2205,
        "price_1hr_change": 120.61,
        "price_24hr_change": 89.32,
        "protocol": "Raydium CLMM",
        "updated_at": 1704067200000,
        "source": "dexscreener"
      }
    ],
    "pagination": {
      "next_cursor": "eyJvZmZzZXQiOjIwfQ==",
      "has_more": true,
      "total": 1250
    }
  },
  "timestamp": 1704067200000
}
```

#### 2. Search Tokens
```http
GET /tokens/search?q=PIPE
```

**Query Parameters:**
- `q` (required): Search query (minimum 2 characters)
- Plus all filtering and sorting parameters from `/tokens`

#### 3. Trending Tokens
```http
GET /tokens/trending?limit=50
```

#### 4. Health Check
```http
GET /health
GET /health/detailed
```

#### 5. Cache Management
```http
POST /tokens/cache/clear
GET /tokens/cache/stats
```

## 🔌 WebSocket API

Connect to: `ws://localhost:5000`

### Events

#### Client → Server
- `subscribe_tokens`: Subscribe to token updates
- `unsubscribe_tokens`: Unsubscribe from updates
- `get_token`: Request specific token data
- `ping`: Health check

#### Server → Client
- `initial_data`: Initial token data on connection
- `price_update`: Real-time price changes
- `new_tokens`: New token discoveries
- `volume_update`: Volume spike alerts

**Example WebSocket Usage:**
```javascript
const socket = io('ws://localhost:5000');

// Subscribe to token updates
socket.emit('subscribe_tokens', ['token_address_1', 'token_address_2']);

// Listen for price updates
socket.on('price_update', (data) => {
  console.log('Price updates:', data.updates);
});

// Listen for new tokens
socket.on('new_tokens', (data) => {
  console.log('New tokens discovered:', data.tokens);
});
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `CACHE_TTL_SECONDS` | Cache TTL | `30` |
| `CACHE_MAX_SIZE` | Max cache entries | `1000` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `WS_CORS_ORIGIN` | WebSocket CORS origin | `http://localhost:3000` |
| `LOG_LEVEL` | Logging level | `info` |

### API Rate Limits

The service respects external API rate limits:
- **DexScreener**: 300 requests/minute
- **Jupiter**: No strict limit (best effort)
- **GeckoTerminal**: No strict limit (best effort)

## 🔍 Monitoring & Health

### Health Check Endpoints

1. **Basic Health**: `GET /api/health`
   - Returns server status and uptime

2. **Detailed Health**: `GET /api/health/detailed`
   - Checks all external API services
   - Returns latency and status for each service

### Metrics

- Cache hit/miss rates
- API call counts by source
- WebSocket connection metrics
- Rate limiting statistics

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📦 Production Deployment

### Build

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

### Environment Recommendations

- Set `NODE_ENV=production`
- Configure appropriate log levels
- Set up process monitoring (PM2, systemd)
- Configure reverse proxy (nginx)
- Set up SSL/TLS termination

## 🔧 Development

### Scripts

```bash
npm run dev          # Start development server with auto-reload
npm run build        # Build TypeScript to JavaScript
npm start            # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm test             # Run tests
```

### Code Style

- TypeScript with strict mode
- ESLint for code quality
- Prettier for formatting (if configured)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run linting and tests
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Check the health endpoints for service status
- Review logs for error details
- Ensure all environment variables are properly configured
- Verify external API connectivity

## 🔄 Data Flow

1. **Data Aggregation**: Fetches from multiple DEX APIs in parallel
2. **Data Merging**: Intelligently combines data from different sources
3. **Price Enrichment**: Enhances data with Jupiter price information
4. **Caching**: Stores processed data with TTL-based expiration
5. **WebSocket Broadcasting**: Pushes real-time updates to connected clients
6. **API Serving**: Provides REST endpoints with filtering and pagination

## 📊 Performance

- **Response Time**: < 500ms for cached data
- **Throughput**: 100+ requests/second
- **Memory Usage**: < 512MB typical
- **Cache Hit Rate**: ~80% typical 