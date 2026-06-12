# StellarTip Backend API

The NestJS backend for [StellarTip](https://stellartip.com) — a decentralized micro-tipping platform for creators on the Stellar ecosystem.

[![CI](https://github.com/StellarTips/StellarTip-Backend/actions/workflows/ci.yml/badge.svg)](https://github.com/StellarTips/StellarTip-Backend/actions/workflows/ci.yml)

## Overview

This API powers creator profiles, tip transactions, and Stellar blockchain interactions.

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Auth**: JWT + Stellar wallet (Freighter)
- **Blockchain**: Stellar (via Horizon SDK)
- **Logging**: Winston (structured JSON)
- **Docs**: Swagger / OpenAPI

## Features

### Auth
- Stellar wallet (Freighter) authentication with signature verification
- Email/password authentication with JWT + refresh token rotation
- Wallet nonce signing verification

### Profiles
- Creator profiles with username, display name, bio, and avatar
- Avatar upload with validation (JPEG, PNG, WEBP, max 5MB)
- Social links (Twitter/X, GitHub, YouTube, Website)
- Tip links per creator (stellartip.com/{username})
- Creator analytics dashboard with time-series data
- Profile search

### Tips
- Instant tip recording (XLM/USDC)
- Tip history with filtering, sorting, and pagination
- Transaction verification via Stellar Horizon
- Tip statistics and analytics

### Notifications
- In-app notifications for tip receipts
- Unread count badge support
- Mark as read functionality

### Stellar
- Balance checking (XLM + USDC)
- Transaction verification via Horizon
- Account info lookup

### DevOps
- Docker & Docker Compose for local development
- Health check endpoints (liveness, readiness, remote)
- Rate limiting with configurable thresholds
- GitHub Actions CI/CD pipeline
- Structured JSON logging with sensitive data redaction

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL (local or Docker)

### Installation

```bash
# Clone the repository
git clone https://github.com/StellarTips/StellarTip-Backend.git
cd StellarTip-Backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run start:dev

# Open API docs
open http://localhost:3000/api/docs
```

### Docker

```bash
docker compose up -d
```

## Scripts

| Command            | Description                        |
|--------------------|------------------------------------|
| `npm run start:dev`| Start development server (watch)   |
| `npm run build`    | Build for production               |
| `npm run start`    | Start production server            |
| `npm test`         | Run unit tests                     |
| `npm run test:e2e` | Run end-to-end tests               |
| `npm run lint`     | Lint and auto-fix code             |

## API Endpoints

### Auth
| Method | Path                    | Auth     | Description                     |
|--------|-------------------------|----------|---------------------------------|
| POST   | `/auth/signup`          | Public   | Register with email/password    |
| POST   | `/auth/login`           | Public   | Login with email/password       |
| POST   | `/auth/stellar/login`   | Public   | Login with Stellar wallet       |
| POST   | `/auth/refresh`         | Public   | Refresh access token            |
| GET    | `/auth/nonce`           | Public   | Get signing nonce for wallet    |
| GET    | `/auth/profile`         | Bearer   | Get current user profile        |

### Profiles
| Method | Path                           | Auth     | Description                      |
|--------|--------------------------------|----------|----------------------------------|
| GET    | `/profiles/:username`          | Public   | Get creator public profile       |
| GET    | `/profiles/:username/tipping-info` | Public | Get creator tipping page data   |
| GET    | `/profiles?q=query`            | Public   | Search creators                  |
| PUT    | `/profiles/me`                 | Bearer   | Update own profile               |
| PATCH  | `/profiles/me/social-links`    | Bearer   | Update social links              |
| POST   | `/profiles/me/avatar`          | Bearer   | Upload avatar (multipart)        |
| GET    | `/profiles/me/analytics`       | Bearer   | Creator analytics dashboard      |

### Tips
| Method | Path                      | Auth   | Description                    |
|--------|---------------------------|--------|--------------------------------|
| POST   | `/tips`                   | Public | Create a new tip               |
| GET    | `/tips/:id`               | Public | Get tip details                |
| GET    | `/tips/my/received`       | Bearer | My received tips (paginated)   |
| GET    | `/tips/my/sent`           | Bearer | My sent tips (paginated)       |
| GET    | `/tips/my/stats`          | Bearer | My tip statistics              |
| GET    | `/tips/wallet/:address`   | Public | Tips by wallet address         |
| POST   | `/tips/:id/confirm`       | Bearer | Confirm a tip with tx hash     |

### Notifications
| Method | Path                         | Auth   | Description                 |
|--------|------------------------------|--------|-----------------------------|
| GET    | `/notifications`             | Bearer | Get notifications (paginated)|
| GET    | `/notifications/unread-count`| Bearer | Get unread count            |
| PATCH  | `/notifications/:id/read`    | Bearer | Mark notification as read   |

### Stellar
| Method | Path                        | Auth   | Description              |
|--------|-----------------------------|--------|--------------------------|
| GET    | `/stellar/balance`          | Public | Get wallet balance       |
| GET    | `/stellar/account`          | Public | Get account info         |
| POST   | `/stellar/verify-payment`   | Public | Verify a transaction     |

### Health
| Method | Path             | Auth   | Description              |
|--------|------------------|--------|--------------------------|
| GET    | `/health`        | Public | Liveness check           |
| GET    | `/health/ready`  | Public | Readiness (DB check)     |
| GET    | `/health/remote` | Public | Remote (Stellar Horizon) |

## Analytics Endpoint

`GET /profiles/me/analytics` returns:

- **summary**: total tips received, total amount, average tip, largest tip
- **byAsset**: breakdown by XLM/USDC with counts and amounts
- **timeSeries**: daily breakdown of tips with date, count, and amount
- **topSupporters**: top 5 supporters by total amount

Query Parameters:
| Param   | Type   | Default | Description                              |
|---------|--------|---------|------------------------------------------|
| `period`| string | `30d`   | Time period: `7d`, `30d`, `90d`, `365d`, `all` |
| `asset` | string | —       | Filter by asset: `XLM` or `USDC`         |

## Environment Variables

| Variable                      | Description                  | Default                                      |
|-------------------------------|------------------------------|----------------------------------------------|
| `PORT`                        | Server port                  | `3000`                                       |
| `CORS_ORIGIN`                 | Allowed CORS origin(s)       | `*`                                          |
| `NODE_ENV`                    | Environment                  | `development`                                |
| `DB_HOST`                     | Database host                | `localhost`                                  |
| `DB_PORT`                     | Database port                | `5432`                                       |
| `DB_USERNAME`                 | Database username            | `postgres`                                   |
| `DB_PASSWORD`                 | Database password            | `postgres`                                   |
| `DB_NAME`                     | Database name                | `stellartip`                                 |
| `JWT_SECRET`                  | JWT signing secret           | —                                            |
| `JWT_ACCESS_EXPIRATION`       | Access token TTL             | `15m`                                        |
| `JWT_REFRESH_EXPIRATION_DAYS` | Refresh token TTL            | `30`                                         |
| `STELLAR_NODE_URL`            | Stellar Horizon URL          | `https://horizon-testnet.stellar.org`        |
| `STELLAR_NETWORK`             | Stellar network              | `TESTNET`                                    |
| `USDC_ISSUER`                 | USDC asset issuer address    | —                                            |
| `THROTTLE_TTL`                | Rate limit window (ms)       | `60000`                                      |
| `THROTTLE_LIMIT`              | Rate limit max requests      | `100`                                        |

## API Documentation

Interactive Swagger UI is available at `/api/docs` when the server is running.

## License

MIT
