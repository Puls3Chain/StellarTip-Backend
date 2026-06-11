# StellarTip Backend — Issue Tracker

> 20 quality issues organized by priority and area. Each issue includes acceptance criteria, technical notes, and labels.

---

## Priority Legend

| Tag | Meaning |
|-----|---------|
| P0 | Critical — blocks launch |
| P1 | High — should be done before public launch |
| P2 | Medium — important but not blocking |
| P3 | Low — nice to have |

---

## Issue 1: Implement Stellar Wallet Signature Verification

**Labels:** `auth`, `blockchain`, `stellar`, `P0`
**Area:** Authentication

### Description
The `StellarStrategy` (`src/auth/strategies/stellar.strategy.ts`) currently has a TODO placeholder for signature verification. The `verifyStellarSignature` method always returns `true`. This must be replaced with proper cryptographic verification using `@stellar/stellar-sdk` so that wallet-based logins are secure.

> **STATUS: ✅ RESOLVED** (PR #50 by Xhristin3 — Stellar wallet signature verification with @stellar/stellar-sdk)

### Acceptance Criteria
- [x] Install `@stellar/stellar-sdk` and add to `package.json`
- [x] Replace the TODO in `verifyStellarSignature` with proper `Keypair.fromPublicKey(address).verify()` logic
- [x] The signed message from Freighter wallet is verified against the Stellar public key
- [x] Invalid signatures return `false` and trigger `UnauthorizedException`
- [x] Add unit tests for `verifyStellarSignature` with valid and invalid signatures
- [x] All existing auth tests continue to pass

### Technical Notes
- Use `Keypair.fromPublicKey()` to reconstruct the signer's public key
- The message should be verified as `Buffer.from(message)` against the signature
- Reference: [Stellar SDK Keypair docs](https://stellar.github.io/js-stellar-sdk/Keypair.html)

---

## Issue 2: Add Rate Limiting Middleware

**Labels:** `auth`, `security`, `infrastructure`, `P0`
**Area:** API Security

### Description
The API currently has no rate limiting, making it vulnerable to brute-force attacks on auth endpoints and DoS on tip creation endpoints. Implement global and per-endpoint rate limiting.

> **STATUS: ✅ RESOLVED** (PR #41 by dzekojohn4 — @nestjs/throttler rate limiting middleware)

### Acceptance Criteria
- [x] Install and configure `@nestjs/throttler` package
- [x] Apply global rate limit: 100 requests per minute per IP
- [x] Apply stricter limits on auth endpoints: 10 requests per minute per IP for `/auth/login` and `/auth/stellar/login`
- [x] Apply moderate limits on tip creation: 30 requests per minute per IP for `POST /tips`
- [x] Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) are returned in responses
- [x] Exceeded limits return `429 Too Many Requests` with a clear error message
- [x] Rate limiting is configurable via environment variables
- [x] Add unit tests for throttler configuration

---

## Issue 3: Implement JWT Refresh Token Mechanism

**Labels:** `auth`, `security`, `P1`
**Area:** Authentication

### Description
JWT tokens currently expire after 7 days with no refresh mechanism. Users must re-authenticate when tokens expire. Implement a refresh token flow for better UX.

> **STATUS: ✅ RESOLVED** (PR #43 by Alqku — JWT refresh token mechanism with rotation)

### Acceptance Criteria
- [x] Add a `refreshTokens` table/entity to store refresh tokens linked to users
- [x] Add `POST /auth/refresh` endpoint that accepts a refresh token and returns a new access token + new refresh token
- [x] Access tokens expire in 15 minutes; refresh tokens expire in 30 days
- [x] Refresh tokens are single-use (rotated on each refresh)
- [x] Old refresh tokens are invalidated on password change
- [x] Add unit tests for refresh token creation, rotation, and expiry
- [x] Update API documentation in README

---

## Issue 4: Implement Stellar Horizon SDK Integration

**Labels:** `blockchain`, `stellar`, `P0`
**Area:** Stellar Module

### Description
The `StellarService` (`src/stellar/stellar.service.ts`) is entirely stubbed with TODO placeholders. The service must be integrated with the Stellar Horizon API using `@stellar/stellar-sdk` to provide real blockchain interaction.

> **STATUS: ✅ RESOLVED** (PR #42 by Xuccessor — Stellar Horizon SDK integration)

### Acceptance Criteria
- [x] Install `@stellar/stellar-sdk` and add to `package.json`
- [x] Initialize `Server` instance connected to the configured Horizon URL (testnet/mainnet)
- [x] `getAccountBalance()` returns real XLM and USDC balances from the Stellar network
- [x] `verifyPayment()` checks the transaction on Horizon, returns `from`, `to`, `amount`, `asset`
- [x] `getAccountInfo()` returns account existence, sequence number, and subentry count
- [x] Network selection (TESTNET vs PUBLIC) is driven by `STELLAR_NETWORK` env var
- [x] Errors from Horizon are gracefully handled and logged
- [x] Add unit tests with mocked Horizon responses

---

## Issue 5: Support USDC Tip Asset

**Labels:** `tips`, `blockchain`, `stellar`, `P1`
**Area:** Tips

### Description
The `TipAsset` enum supports both `XLM` and `USDC`, but the service and validation don't properly differentiate between them. USDC tipping requires proper Stellar asset notation (issuer, code) and balance validation.

> **STATUS: ✅ RESOLVED** (PR #44 by YaronZaki — USDC tip asset support with issuer validation)

### Acceptance Criteria
- [x] Add `USDC_ISSUER` environment variable to `.env.example` pointing to the Stellar network's USDC issuer
- [x] Validate USDC asset includes the issuer account address from `USDC_ISSUER` env var
- [x] `POST /tips` rejects unsupported asset types with a clear error message
- [x] Tip creation stores the asset issuer for USDC in a new `assetIssuer` column
- [x] Tip stats (`getTipStats`) correctly groups by both asset type and issuer
- [x] Add `assetIssuer` column to `Tip` entity
- [x] Update `CreateTipDto` with optional `assetIssuer` field
- [x] Write unit tests for USDC tip creation flow

---

## Issue 6: Implement Creator Tip Link / Public Profile Endpoint

**Labels:** `profiles`, `tips`, `P1`
**Area:** Creator Experience

### Description
The README mentions "tip links per creator (stellartip.com/{username})", but there's no dedicated endpoint that returns a creator's public tipping page data (profile info + tipping instructions + recent tip highlights).

> **STATUS: ✅ RESOLVED** (PR #45 by kilodesodiq-arch — Creator tipping info public endpoint)

### Acceptance Criteria
- [x] Add `GET /profiles/:username/tipping-info` endpoint
- [x] Response includes: creator display name, bio, avatar, wallet address, total tips received, top supporter, recent tip messages
- [x] Public endpoint — no auth required
- [x] Add unit tests for the new endpoint
- [x] Update README with new endpoint documentation

---

## Issue 7: Improve Tip Pagination, Filtering, and Sorting

**Labels:** `tips`, `enhancement`, `P2`
**Area:** Tips

### Description
The tip history endpoints (`GET /tips/my/received`, `GET /tips/my/sent`) support basic pagination but lack filtering by date range, asset type, amount range, and sorting direction.

> **STATUS: ✅ RESOLVED** (PR #46 by Kabi3si — Tip filtering, sorting, and improved pagination)

### Acceptance Criteria
- [x] Add query parameters: `startDate`, `endDate`, `asset`, `minAmount`, `maxAmount`, `sortBy`, `sortOrder`
- [x] `sortBy` supports: `createdAt` (default), `amount`
- [x] `sortOrder` supports: `ASC`, `DESC` (default)
- [x] Date filters use ISO 8601 format
- [x] Amount filters are validated (> 0)
- [x] Invalid filter values return `400 Bad Request` with a clear message
- [x] Pagination metadata includes `hasNextPage` and `hasPreviousPage`
- [x] Add unit tests for filtered queries
- [x] Update README with new query parameters

---

## Issue 8: Implement Tip Receipt / Notification System

**Labels:** `tips`, `notifications`, `P2`
**Area:** Notifications

### Description
Creators currently have no way to know when they receive a tip unless they manually check the dashboard. Implement a notification system (in-app + email) for tip receipts.

> **STATUS: ✅ RESOLVED** (PR #49 by snowrugar-beep — Tip receipt notification system)

### Acceptance Criteria
- [x] Create a `notifications` module with a `Notification` entity
- [x] On tip completion, create an in-app notification for the creator
- [x] Add `GET /notifications` endpoint returning unread notifications (paginated)
- [x] Add `PATCH /notifications/:id/read` to mark a notification as read
- [x] Add `GET /notifications/unread-count` for badge display
- [x] Add unit tests for notification creation and read status
- [x] Update README with new endpoints

---

## Issue 9: Add Avatar Upload Endpoint

**Labels:** `profiles`, `media`, `P1`
**Area:** Profiles

### Description
Creators can set an `avatarUrl` but there's no upload mechanism — they must provide an external URL. Implement a file upload endpoint that accepts images, validates them, stores them, and returns the URL.

> **STATUS: ✅ RESOLVED** (PR #48 by Icahbod — Avatar upload endpoint with validation)

### Acceptance Criteria
- [x] Add `POST /profiles/me/avatar` endpoint accepting multipart/form-data
- [x] Supported formats: JPEG, PNG, WEBP
- [x] Max file size: 5MB
- [x] Store files in a `uploads/avatars/` directory with UUID-based filenames
- [x] Serve static files via NestJS (`ServeStaticModule`)
- [x] Old avatar is deleted when a new one is uploaded
- [x] Add unit tests for file validation and upload logic
- [x] Update README with new endpoint

---

## Issue 10: Add Social Links to Creator Profiles

**Labels:** `profiles`, `enhancement`, `P3`
**Area:** Profiles

### Description
Creators should be able to link their social media accounts (Twitter/X, GitHub, YouTube, Website) to their profile for discoverability and trust.

> **STATUS: ✅ RESOLVED** (PR #47 by merlik787-droi — Social links to creator profiles)

### Acceptance Criteria
- [x] Add a `socialLinks` JSON column to the `User` entity
- [x] Schema: `{ twitter?: string, github?: string, youtube?: string, website?: string }`
- [x] Add `PATCH /profiles/me/social-links` endpoint
- [x] Validate URLs are properly formatted (must start with https://)
- [x] Social links are returned in the public profile response
- [x] Add unit tests for social link update and validation

---

## Issue 11: Implement Creator Analytics Dashboard Endpoint

**Labels:** `analytics`, `dashboard`, `P1`
**Area:** Analytics

### Description
The current `GET /tips/my/stats` is minimal. Creators need a rich analytics endpoint with time series data, top supporters, and trends to understand their tipping activity.

### Acceptance Criteria
- [ ] Create `GET /profiles/me/analytics` endpoint
- [ ] Response includes:
  - Total tips received (all-time)
  - Total XLM/USDC received (all-time, grouped)
  - Tips over time (daily breakdown, last 30 days)
  - Top 5 supporters by total amount
  - Average tip amount
  - Largest single tip
- [ ] Time series data returns an array of `{ date, count, totalAmount, asset }` objects
- [ ] Supporters data returns `{ walletAddress, totalAmount, tipCount, lastTipAt }`
- [ ] Data is cached for 5 minutes (DB query is expensive)
- [ ] Add unit tests for analytics computation
- [ ] Update README with new endpoint

---

## Issue 12: Add Health Check and Readiness Endpoints

**Labels:** `infrastructure`, `observability`, `P1`
**Area:** DevOps

### Description
The API lacks health check endpoints needed for container orchestration (Kubernetes liveness/readiness probes) and monitoring.

> **STATUS: ✅ RESOLVED** (Issue 12 — Health check and readiness endpoints implemented)

### Acceptance Criteria
- [x] Add `GET /health` endpoint
- [x] Add `GET /health/ready` endpoint that checks database connectivity (runs `SELECT 1`)
- [x] Add `GET /health/remote` endpoint that checks Stellar Horizon connectivity
- [x] Create a `HealthModule` with custom health checks
- [x] New endpoints are NOT rate-limited (`@SkipApiThrottle()`)
- [x] DB failure on `/health/ready` returns `503 Service Unavailable`

---

## Issue 13: Set Up Docker and Docker Compose for Local Development

**Labels:** `infrastructure`, `devops`, `docker`, `P0`
**Area:** DevOps

### Description
The project has no Docker setup. Developers must install PostgreSQL manually. Create a Docker Compose configuration that runs PostgreSQL and the backend together for a seamless local development experience.

> **STATUS: ✅ RESOLVED** (Issue 13 — Docker and Docker Compose setup)

### Acceptance Criteria
- [x] Create `Dockerfile` for the NestJS backend (multi-stage build)
- [x] Create `docker-compose.yml` with api + db services
- [x] Add `.dockerignore` to exclude `node_modules`, `dist`, `.env`
- [x] Docker Compose uses the `.env` file for configuration
- [x] App hot-reloads in dev mode via volume mounts
- [x] Ensure `npm ci` runs inside the container on first build

---

## Issue 14: Configure GitHub Actions CI/CD Pipeline

**Labels:** `infrastructure`, `devops`, `ci-cd`, `P1`
**Area:** DevOps

### Description
There is no CI/CD pipeline. Every push should trigger linting, type checking, unit tests, and optionally e2e tests to maintain code quality.

### Acceptance Criteria
- [ ] Create `.github/workflows/ci.yml` with:
  - Trigger on push to `main` and on all PRs
  - Job 1: Lint (`npm run lint`)
  - Job 2: TypeScript check (`npx tsc --noEmit`)
  - Job 3: Unit tests (`npm test`)
  - Job 4: Build (`npm run build`)
- [ ] Jobs run in parallel where possible
- [ ] Use Node.js 20 and PostgreSQL service container for e2e tests
- [ ] Add a status badge to README
- [ ] CI should complete in under 5 minutes
- [ ] Test the pipeline by pushing a branch and verifying checks pass

---

## Issue 15: Set Up Structured Logging

**Labels:** `infrastructure`, `observability`, `P2`
**Area:** Logging

### Description
The app uses NestJS's built-in `Logger`, which outputs plain text to stdout. For production debugging and monitoring, structured JSON logging is essential.

### Acceptance Criteria
- [ ] Install and configure Winston or Pino as the logging provider
- [ ] Configure NestJS to use the custom logger globally
- [ ] Log format is JSON with fields: `timestamp`, `level`, `context`, `message`, `requestId`, `duration`
- [ ] HTTP request logging middleware logs method, URL, status code, and response time
- [ ] `NODE_ENV=development` uses human-readable format (colorized)
- [ ] `NODE_ENV=production` uses JSON format
- [ ] Sensitive data (passwords, tokens, wallet addresses) are redacted from logs
- [ ] Add `requestId` to every log line via middleware (correlation ID)
- [ ] Add unit tests for log formatting and redaction

---

## Issue 16: Add Comprehensive Unit Tests for AuthService

**Labels:** `testing`, `auth`, `P0`
**Area:** Quality

### Description
The auth module has no dedicated unit tests for `AuthService`. The service handles critical security logic — wallet validation, password hashing, JWT generation — that must be tested.

### Acceptance Criteria
- [ ] Create `src/auth/auth.service.spec.ts` with test suites for:
  - `validateStellarUser()` — new wallet creates user, existing wallet returns user, invalid address throws
  - `login()` — returns valid JWT with correct payload structure
  - `signup()` — creates user, rejects duplicate email, rejects duplicate username
  - `loginWithEmail()` — valid credentials return token, invalid password throws, deactivated user throws
  - `getNonce()` — returns nonce and message with correct wallet address
- [ ] Use `@nestjs/testing` `Test.createTestingModule` with mocked `Repository` and `JwtService`
- [ ] Test both success and error paths
- [ ] Coverage target: >90% for `AuthService`
- [ ] All tests are deterministic (no random-value assertions)

---

## Issue 17: Add Comprehensive Unit Tests for TipsService

**Labels:** `testing`, `tips`, `P0`
**Area:** Quality

### Description
The `TipsService` has no unit tests. Tip creation involves multiple entities and business rules that must be verified.

### Acceptance Criteria
- [ ] Create `src/tips/tips.service.spec.ts` with test suites for:
  - `createTip()` — creates tip with valid data, throws on unknown wallet, throws on zero amount
  - `getTipById()` — returns tip, throws on missing tip
  - `getTipsByCreator()` — paginates correctly, returns tips in descending order
  - `getTipsBySupporter()` — returns only tips from that supporter
  - `getTipsByWallet()` — matches both sender and receiver wallets
  - `confirmTip()` — updates status and tx hash
  - `getTipStats()` — returns correct aggregation by asset
- [ ] Mock both `TipRepository` and `UserRepository`
- [ ] Test edge cases: no tips returns empty array, pagination boundary values
- [ ] Coverage target: >85% for `TipsService`

---

## Issue 18: Add Comprehensive Unit Tests for ProfilesService

**Labels:** `testing`, `profiles`, `P1`
**Area:** Quality

### Description
The `ProfilesService` has no unit tests. Profile retrieval, updates, wallet management, and search need coverage.

### Acceptance Criteria
- [ ] Create `src/profiles/profiles.service.spec.ts` with test suites for:
  - `getProfile()` — returns profile by username, throws on inactive user, throws on missing username
  - `getProfileById()` — returns profile by ID, throws on missing ID
  - `updateProfile()` — updates allowed fields, ignores non-allowed fields
  - `updateWalletAddress()` — links wallet, rejects duplicate wallet on different user
  - `searchProfiles()` — matches by username and displayName, limited to 20 results
- [ ] Use mocked `UserRepository`
- [ ] Test that sensitive fields (password, email) are not returned
- [ ] Coverage target: >85% for `ProfilesService`

---

## Issue 19: Add End-to-End Tests for All API Endpoints

**Labels:** `testing`, `e2e`, `P1`
**Area:** Quality

### Description
Only a basic smoke test exists (`test/app.e2e-spec.ts`). Add comprehensive E2E tests that validate the full request-response cycle for all modules.

### Acceptance Criteria
- [ ] Create test files for each module:
  - `test/auth.e2e-spec.ts` — signup, login, stellar login, get profile
  - `test/profiles.e2e-spec.ts` — get profile, update profile, search
  - `test/tips.e2e-spec.ts` — create tip, get tips, confirm tip, stats
  - `test/stellar.e2e-spec.ts` — balance, account info, verify payment
- [ ] Use a test database (separate from development)
- [ ] Clean up test data after each test (database rollback or truncation)
- [ ] Test authentication: unauthenticated requests return 401 on protected routes
- [ ] Test validation: invalid bodies return 400 with error details
- [ ] E2E tests can be run with `npm run test:e2e`
- [ ] Update `test/jest-e2e.json` if needed

---

## Issue 20: Set Up ESLint Strict Rules and Fix Lint Issues

**Labels:** `quality`, `tooling`, `P3`
**Area:** Code Quality

### Description
The current ESLint config disables `no-explicit-any` and `no-unsafe-argument`. Enable stricter TypeScript lint rules and fix all violations to improve code quality and catch bugs at lint time.

> **STATUS: ✅ RESOLVED** (Issue 20 — ESLint strict rules enabled, all errors fixed 161→0, CONTRIBUTING.md created)

### Acceptance Criteria
- [x] Update `eslint.config.mjs` to enable stricter rules
- [x] `@typescript-eslint/no-explicit-any`: error (with inline exceptions documented)
- [x] `@typescript-eslint/no-unsafe-argument`: error
- [x] `@typescript-eslint/no-unused-vars`: error
- [x] `@typescript-eslint/explicit-function-return-type`: warn
- [x] `prettier/prettier`: error
- [x] Run `npm run lint` and fix all errors (0 errors remaining)
- [x] Verify `npm run lint` exits with code 0
- [x] Document the linting setup in `CONTRIBUTING.md`
- [ ] Add `lint-staged` to run ESLint on staged files before commit
