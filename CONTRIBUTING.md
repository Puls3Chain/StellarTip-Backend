# Contributing to StellarTip Backend

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-org/stellartip-backend.git`
3. Install dependencies: `npm install`
4. Copy environment variables: `cp .env.example .env`
5. Start the dev server: `npm run start:dev`

## Code Quality

### Linting

This project uses ESLint with TypeScript strict rules and Prettier for code formatting.

- **Check linting**: `npm run lint`
- **Auto-fix issues**: ESLint runs with `--fix` by default via `npm run lint`

### Pre-commit Hook

Linting is run on staged files before commits. Make sure your code passes lint before pushing:

```bash
npm run lint
```

### Rules

- `@typescript-eslint/no-explicit-any`: error — use proper types
- `@typescript-eslint/no-unsafe-argument`: error — ensure type safety
- `@typescript-eslint/no-unused-vars`: error — remove unused variables
- `@typescript-eslint/explicit-function-return-type`: warn — specify return types
- `prettier/prettier`: error — consistent formatting

### TypeScript

Run the TypeScript compiler to check for type errors:

```bash
npx tsc --noEmit
```

## Testing

- **Unit tests**: `npm test`
- **Watch mode**: `npm run test:watch`
- **Coverage**: `npm run test:cov`
- **End-to-end tests**: `npm run test:e2e`

All new features should include unit tests. Aim for >85% coverage on service files.

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run `npm run lint` and fix any issues
4. Run `npm test` and ensure all tests pass
5. Commit with a descriptive message
6. Push and create a pull request

## Project Structure

```
src/
├── auth/           # Authentication (JWT, Stellar wallet, guards)
├── config/         # Database and app configuration
├── entities/       # TypeORM entities (User, Tip, Notification, RefreshToken)
├── health/         # Health check endpoints
├── notifications/  # In-app notification system
├── profiles/       # Creator profile management
├── stellar/        # Stellar blockchain interaction
├── tips/           # Tip transactions and history
├── app.module.ts   # Root application module
└── main.ts         # Application entrypoint
```

## License

MIT
